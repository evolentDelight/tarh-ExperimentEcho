import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "ExperimentEcho server is running" });
});

app.post("/api/chat", (req, res) => {
  const { message, messages } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({
      ok: false,
      error: "A message string is required."
    });
  }

  const mockExperiments = [
    {
      id: "exp_001",
      model: "ResNet50",
      strategy: "transfer learning",
      outcome: "abandoned",
      note: "Validation plateaued early."
    },
    {
      id: "exp_002",
      model: "EfficientNet",
      strategy: "transfer learning",
      outcome: "promising",
      note: "Better generalization but slower training."
    },
    {
      id: "exp_003",
      model: "ViT-B16",
      strategy: "fine-tuning",
      outcome: "abandoned",
      note: "Training cost increased without meaningful gains."
    }
  ];

  let reply =
    "Mock reply: based on your previous runs, transfer learning gave mixed results. ResNet50 plateaued early, while EfficientNet improved generalization but added training cost.";

  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("which runs")) {
    reply =
      "Mock reply: I’m mainly basing that on exp_001 (ResNet50 transfer learning), exp_002 (EfficientNet transfer learning), and exp_003 (ViT-B16 fine-tuning).";
  } else if (lowerMessage.includes("what should i try next")) {
    reply =
      "Mock reply: a reasonable next step would be partial unfreezing with EfficientNet, since it showed the best promise but may need a better cost-performance balance.";
  } else if (lowerMessage.includes("why did i stop")) {
    reply =
      "Mock reply: you appear to have moved away from transfer learning because gains were inconsistent. One run plateaued early, and another improved quality but was slower and likely not worth the tradeoff.";
  }

  return res.json({
    ok: true,
    reply,
    retrievedExperiments: mockExperiments,
    messageCount: Array.isArray(messages) ? messages.length : 0
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});