import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initDb, getDb } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const DIFY_BASE_URL = process.env.DIFY_BASE_URL;
const DIFY_API_KEY = process.env.DIFY_API_KEY;

app.use(cors());
app.use(express.json());

function normalizeRecordObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const cleaned = {};

  for (const [key, rawValue] of Object.entries(value)) {
    const trimmedKey = String(key).trim();
    const trimmedValue = String(rawValue ?? "").trim();

    if (!trimmedKey || !trimmedValue) continue;
    cleaned[trimmedKey] = trimmedValue;
  }

  return cleaned;
}

function formatObjectEntries(obj) {
  const entries = Object.entries(obj || {});
  if (!entries.length) return "none";

  return entries.map(([key, value]) => `- ${key}: ${value}`).join("\n");
}

function formatExperimentsForPrompt(items) {
  if (!items.length) {
    return "No experiments are available yet.";
  }

  return items
    .map((exp, index) =>
      [
        `${index + 1}. ${exp.id}`,
        `task: ${exp.task || "unknown"}`,
        `dataset: ${exp.dataset || "unknown"}`,
        `model: ${exp.model || "unknown"}`,
        `strategy: ${exp.strategy || "unknown"}`,
        `variables:`,
        `${formatObjectEntries(exp.variables)}`,
        `results:`,
        `${formatObjectEntries(exp.results)}`,
        `outcome: ${exp.outcome || "unknown"}`,
        `notes: ${exp.notes || "none"}`
      ].join("\n")
    )
    .join("\n\n");
}

function parseExperimentRow(row) {
  return {
    id: row.id,
    task: row.task,
    dataset: row.dataset,
    model: row.model,
    strategy: row.strategy,
    variables: JSON.parse(row.variables_json || "{}"),
    results: JSON.parse(row.results_json || "{}"),
    outcome: row.outcome,
    notes: row.notes,
    createdAt: row.created_at
  };
}

async function listExperiments() {
  const db = getDb();
  const rows = await db.all(
    `SELECT * FROM experiments ORDER BY created_at ASC, id ASC`
  );
  return rows.map(parseExperimentRow);
}

async function createExperiment({
  task,
  dataset,
  model,
  strategy,
  variables,
  results,
  outcome,
  notes
}) {
  const db = getDb();

  const countRow = await db.get(`SELECT COUNT(*) as count FROM experiments`);
  const nextId = `exp_${String((countRow?.count || 0) + 1).padStart(3, "0")}`;

  const experiment = {
    id: nextId,
    task: String(task).trim(),
    dataset: String(dataset).trim(),
    model: String(model).trim(),
    strategy: String(strategy).trim(),
    variables: normalizeRecordObject(variables),
    results: normalizeRecordObject(results),
    outcome: String(outcome).trim(),
    notes: String(notes || "").trim(),
    createdAt: new Date().toISOString()
  };

  await db.run(
    `
      INSERT INTO experiments (
        id,
        task,
        dataset,
        model,
        strategy,
        variables_json,
        results_json,
        outcome,
        notes,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      experiment.id,
      experiment.task,
      experiment.dataset,
      experiment.model,
      experiment.strategy,
      JSON.stringify(experiment.variables),
      JSON.stringify(experiment.results),
      experiment.outcome,
      experiment.notes,
      experiment.createdAt
    ]
  );

  return experiment;
}

async function seedInitialExperiments() {
  const db = getDb();
  const row = await db.get(`SELECT COUNT(*) as count FROM experiments`);

  if ((row?.count || 0) > 0) return;

  const initialExperiments = [
    {
      task: "image classification",
      dataset: "microscopy-v2",
      model: "ResNet50",
      strategy: "transfer learning",
      variables: {
        freeze_backbone: "true",
        learning_rate: "1e-4"
      },
      results: {
        val_accuracy: "0.78",
        f1: "0.74"
      },
      outcome: "abandoned",
      notes: "Validation plateaued early."
    },
    {
      task: "image classification",
      dataset: "microscopy-v2",
      model: "EfficientNet",
      strategy: "transfer learning",
      variables: {
        freeze_backbone: "false",
        learning_rate: "5e-5"
      },
      results: {
        val_accuracy: "0.83",
        f1: "0.79"
      },
      outcome: "promising",
      notes: "Better generalization but slower training."
    }
  ];

  for (const exp of initialExperiments) {
    await createExperiment(exp);
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "ExperimentEcho server is running" });
});

app.get("/api/experiments", async (_req, res) => {
  try {
    const experiments = await listExperiments();

    res.json({
      ok: true,
      experiments
    });
  } catch (error) {
    console.error("Failed to load experiments:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to load experiments."
    });
  }
});

app.post("/api/experiments", async (req, res) => {
  try {
    const {
      task,
      dataset,
      model,
      strategy,
      variables,
      results,
      outcome,
      notes
    } = req.body;

    if (!task || !dataset || !model || !strategy || !outcome) {
      return res.status(400).json({
        ok: false,
        error: "task, dataset, model, strategy, and outcome are required."
      });
    }

    const experiment = await createExperiment({
      task,
      dataset,
      model,
      strategy,
      variables,
      results,
      outcome,
      notes
    });

    res.status(201).json({
      ok: true,
      experiment
    });
  } catch (error) {
    console.error("Failed to add experiment:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to add experiment."
    });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        ok: false,
        error: "A message string is required."
      });
    }

    if (!DIFY_BASE_URL || !DIFY_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Missing Dify configuration. Check server/.env"
      });
    }

    const experiments = await listExperiments();
    const experimentsContext = formatExperimentsForPrompt(experiments);

    console.log("=== experimentsContext being sent to Dify ===");
    console.log(experimentsContext);
    console.log("===========================================");

    const response = await fetch(`${DIFY_BASE_URL}/chat-messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DIFY_API_KEY}`
      },
      body: JSON.stringify({
        inputs: {
          experiments_context: experimentsContext
        },
        query: message,
        response_mode: "blocking",
        conversation_id: conversationId || "",
        user: "experimentecho-local-user"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Dify error response:", data);
      return res.status(response.status).json({
        ok: false,
        error: data.message || "Dify request failed.",
        details: data
      });
    }

    res.json({
      ok: true,
      reply: data.answer,
      conversationId: data.conversation_id || "",
      messageId: data.message_id || ""
    });
  } catch (error) {
    console.error("Server chat error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to contact Dify."
    });
  }
});

async function start() {
  try {
    await initDb();
    await seedInitialExperiments();

    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();