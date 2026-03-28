import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const DIFY_BASE_URL = process.env.DIFY_BASE_URL;
const DIFY_API_KEY = process.env.DIFY_API_KEY;

app.use(cors());
app.use(express.json());

const experiments = [
  {
    id: "exp_001",
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
    id: "exp_002",
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
    .map((exp, index) => {
      return [
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
      ].join("\n");
    })
    .join("\n\n");
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "ExperimentEcho server is running" });
});

app.get("/api/experiments", (_req, res) => {
  res.json({
    ok: true,
    experiments
  });
});

app.post("/api/experiments", (req, res) => {
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

  const newExperiment = {
    id: `exp_${String(experiments.length + 1).padStart(3, "0")}`,
    task: String(task).trim(),
    dataset: String(dataset).trim(),
    model: String(model).trim(),
    strategy: String(strategy).trim(),
    variables: normalizeRecordObject(variables),
    results: normalizeRecordObject(results),
    outcome: String(outcome).trim(),
    notes: String(notes || "").trim()
  };

  experiments.push(newExperiment);

  return res.status(201).json({
    ok: true,
    experiment: newExperiment
  });
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

    return res.json({
      ok: true,
      reply: data.answer,
      conversationId: data.conversation_id || "",
      messageId: data.message_id || ""
    });
  } catch (error) {
    console.error("Server chat error:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to contact Dify."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});