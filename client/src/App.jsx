import { useState } from "react";
import "./App.css";

const API_BASE_URL = "http://localhost:3001";

function App() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAsk = async (event) => {
    event.preventDefault();
    setError("");
    setResponse(null);

    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/api/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question })
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setResponse(data);
    } catch (err) {
      setError(err.message || "Failed to contact server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 24 }}>
      <h1>ExperimentEcho</h1>
      <p>Ask what your past experiments might be telling you.</p>

      <form onSubmit={handleAsk} style={{ display: "grid", gap: 12 }}>
        <textarea
          rows={4}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Why did I stop pursuing transfer learning?"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 20, color: "crimson" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div style={{ marginTop: 24 }}>
          <h2>Answer</h2>
          <p>{response.answer}</p>

          <h3>Retrieved Experiments</h3>
          <ul>
            {response.retrievedExperiments.map((exp) => (
              <li key={exp.id}>
                <strong>{exp.id}</strong> - {exp.model} / {exp.strategy} /{" "}
                {exp.outcome}
                <br />
                <span>{exp.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;