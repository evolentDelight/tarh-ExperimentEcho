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

app.post("/api/ask", (req, res) => {
  const { question } = req.body;

  if (!question || typeof question !== "string") {
    return res.status(400).json({
      ok: false,
      error: "A question string is required."
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
    }
  ];

  return res.json({
    ok: true,
    question,
    answer:
      "Mock response: across prior attempts, transfer learning showed mixed results. ResNet50 plateaued early, while EfficientNet generalized better but increased training cost.",
    retrievedExperiments: mockExperiments
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});