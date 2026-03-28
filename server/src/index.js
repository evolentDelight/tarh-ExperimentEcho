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

    if (!DIFY_BASE_URL || !DIFY_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Missing Dify configuration in server environment."
      });
    }

    const difyResponse = await fetch(`${DIFY_BASE_URL}/chat-messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DIFY_API_KEY}`
      },
      body: JSON.stringify({
        inputs: {},
        query: message,
        response_mode: "blocking",
        conversation_id: conversationId || "",
        user: "local-dev-user"
      })
    });

    const data = await difyResponse.json();

    if (!difyResponse.ok) {
      return res.status(difyResponse.status).json({
        ok: false,
        error: data?.message || "Dify request failed.",
        details: data
      });
    }

    return res.json({
      ok: true,
      reply: data.answer,
      conversationId: data.conversation_id,
      messageId: data.message_id,
      metadata: data.metadata || null
    });
  } catch (error) {
    console.error("Chat error:", error);

    return res.status(500).json({
      ok: false,
      error: "Failed to contact Dify."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});