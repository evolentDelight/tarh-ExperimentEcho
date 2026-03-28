import { useEffect, useState } from "react";
import "./App.css";

const API_BASE_URL = "http://localhost:3001";

function App() {
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Hi, I’m ExperimentEcho. Add a few experiments, then ask me what patterns you see."
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [experiments, setExperiments] = useState([]);

  const [form, setForm] = useState({
    task: "",
    dataset: "",
    model: "",
    strategy: "",
    changedVariables: "",
    valAccuracy: "",
    f1: "",
    outcome: "abandoned",
    notes: ""
  });

  useEffect(() => {
    fetchExperiments();
  }, []);

  async function fetchExperiments() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/experiments`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to load experiments.");
      }

      setExperiments(data.experiments);
    } catch (err) {
      setError(err.message || "Failed to load experiments.");
    }
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleAddExperiment(event) {
    event.preventDefault();
    setError("");

    try {
      const changedVariables = form.changedVariables
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const metrics = {};
      if (form.valAccuracy.trim()) metrics.val_accuracy = Number(form.valAccuracy);
      if (form.f1.trim()) metrics.f1 = Number(form.f1);

      const res = await fetch(`${API_BASE_URL}/api/experiments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          task: form.task,
          dataset: form.dataset,
          model: form.model,
          strategy: form.strategy,
          changedVariables,
          metrics,
          outcome: form.outcome,
          notes: form.notes
        })
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to add experiment.");
      }

      setExperiments((prev) => [...prev, data.experiment]);

      setForm({
        task: "",
        dataset: "",
        model: "",
        strategy: "",
        changedVariables: "",
        valAccuracy: "",
        f1: "",
        outcome: "abandoned",
        notes: ""
      });
    } catch (err) {
      setError(err.message || "Failed to add experiment.");
    }
  }

  async function handleSend(event) {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setError("");

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: trimmed,
          conversationId
        })
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply || "No reply returned."
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err.message || "Failed to contact server.");
    } finally {
      setLoading(false);
    }
  }

  function handleResetChat() {
    console.log("Resetting chat. Old conversationId was:", conversationId);
    setInput("");
    setConversationId("");
    setError("");
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Hi, I’m ExperimentEcho. Add a few experiments, then ask me what patterns you see."
      }
    ]);
  }

  return (
    <div className="app-shell two-column">
      <aside className="sidebar">
        <h2>Add experiment</h2>

        <form className="experiment-form" onSubmit={handleAddExperiment}>
          <input name="task" value={form.task} onChange={handleFormChange} placeholder="Task" />
          <input name="dataset" value={form.dataset} onChange={handleFormChange} placeholder="Dataset" />
          <input name="model" value={form.model} onChange={handleFormChange} placeholder="Model" />
          <input name="strategy" value={form.strategy} onChange={handleFormChange} placeholder="Strategy" />
          <input
            name="changedVariables"
            value={form.changedVariables}
            onChange={handleFormChange}
            placeholder="Changed variables, comma-separated"
          />
          <input
            name="valAccuracy"
            value={form.valAccuracy}
            onChange={handleFormChange}
            placeholder="val_accuracy"
          />
          <input name="f1" value={form.f1} onChange={handleFormChange} placeholder="f1" />
          <select name="outcome" value={form.outcome} onChange={handleFormChange}>
            <option value="abandoned">abandoned</option>
            <option value="promising">promising</option>
            <option value="used">used</option>
          </select>
          <textarea
            name="notes"
            rows={4}
            value={form.notes}
            onChange={handleFormChange}
            placeholder="Notes"
          />
          <button type="submit">Add experiment</button>
        </form>

        <div className="experiment-list">
          <h3>Experiments</h3>
          {experiments.map((exp) => (
            <div key={exp.id} className="experiment-card">
              <strong>{exp.id}</strong>
              <div>{exp.model} · {exp.strategy}</div>
              <div>{exp.dataset}</div>
              <div>{exp.outcome}</div>
            </div>
          ))}
        </div>
      </aside>

      <div className="chat-container">
        <header className="chat-header">
          <div>
            <h1>ExperimentEcho</h1>
            <p>Conversational memory for experiments</p>
          </div>
          <button type="button" className="reset-button" onClick={handleResetChat}>
            New chat
          </button>
        </header>

        <main className="chat-thread">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message-row ${message.role === "user" ? "user" : "assistant"}`}
            >
              <div className={`message-bubble ${message.role}`}>
                <div className="message-role">
                  {message.role === "user" ? "You" : "ExperimentEcho"}
                </div>
                <div>{message.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-row assistant">
              <div className="message-bubble assistant">
                <div className="message-role">ExperimentEcho</div>
                <div>Thinking...</div>
              </div>
            </div>
          )}
        </main>

        <form className="chat-form" onSubmit={handleSend}>
          <textarea
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Why did I stop pursuing transfer learning?"
          />
          <button type="submit" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>

        {error && <div className="error-banner">{error}</div>}
      </div>
    </div>
  );
}

export default App;