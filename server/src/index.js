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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "ExperimentEcho server is running" });
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

    const experimentsContext = `
1. exp_001
task: image classification
dataset: microscopy-v2
model: ResNet50
strategy: transfer learning
changed variables: freeze_backbone=true, lr=1e-4
metrics: val_accuracy=0.78, f1=0.74
outcome: abandoned
notes: Validation plateaued early.

2. exp_002
task: image classification
dataset: microscopy-v2
model: EfficientNet
strategy: transfer learning
changed variables: freeze_backbone=false, lr=5e-5
metrics: val_accuracy=0.83, f1=0.79
outcome: promising
notes: Better generalization but slower training.
    `.trim();

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