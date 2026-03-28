import { useEffect, useState } from "react";
import "./App.css";

const API_BASE_URL = "http://localhost:3001";

function createPair() {
  return {
    id: crypto.randomUUID(),
    key: "",
    value: ""
  };
}

function pairsToObject(pairs) {
  const obj = {};

  for (const pair of pairs) {
    const trimmedKey = pair.key.trim();
    const trimmedValue = pair.value.trim();

    if (!trimmedKey || !trimmedValue) continue;
    obj[trimmedKey] = trimmedValue;
  }

  return obj;
}

function objectToPairs(obj) {
  const entries = Object.entries(obj || {});
  if (!entries.length) return [createPair()];

  return entries.map(([key, value]) => ({
    id: crypto.randomUUID(),
    key,
    value: String(value)
  }));
}

function clearPairValues(pairs) {
  if (!pairs.length) return [createPair()];

  return pairs.map((pair) => ({
    ...pair,
    value: ""
  }));
}

function ensureAtLeastOnePair(pairs) {
  return pairs.length ? pairs : [createPair()];
}

const emptyForm = {
  task: "",
  dataset: "",
  model: "",
  strategy: "",
  outcome: "abandoned",
  notes: ""
};

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
  const [editingId, setEditingId] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [variablePairs, setVariablePairs] = useState([createPair()]);
  const [resultPairs, setResultPairs] = useState([createPair()]);

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

  function updatePair(setter, id, field, value) {
    setter((prev) =>
      prev.map((pair) =>
        pair.id === id
          ? {
              ...pair,
              [field]: value
            }
          : pair
      )
    );
  }

  function addPair(setter) {
    setter((prev) => [...prev, createPair()]);
  }

  function removePair(setter, id) {
    setter((prev) => {
      if (prev.length === 1) {
        return [createPair()];
      }
      return prev.filter((pair) => pair.id !== id);
    });
  }

  function resetExperimentForm() {
    setEditingId("");
    setForm(emptyForm);
    setVariablePairs([createPair()]);
    setResultPairs([createPair()]);
  }

  function handleEditExperiment(experiment) {
    setEditingId(experiment.id);
    setForm({
      task: experiment.task || "",
      dataset: experiment.dataset || "",
      model: experiment.model || "",
      strategy: experiment.strategy || "",
      outcome: experiment.outcome || "abandoned",
      notes: experiment.notes || ""
    });
    setVariablePairs(objectToPairs(experiment.variables));
    setResultPairs(objectToPairs(experiment.results));
    setError("");
  }

  async function handleDeleteExperiment(id) {
    const confirmed = window.confirm(`Delete ${id}?`);
    if (!confirmed) return;

    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/experiments/${id}`, {
        method: "DELETE"
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to delete experiment.");
      }

      setExperiments((prev) => prev.filter((exp) => exp.id !== id));

      if (editingId === id) {
        resetExperimentForm();
      }
    } catch (err) {
      setError(err.message || "Failed to delete experiment.");
    }
  }

  async function handleSaveExperiment(event) {
    event.preventDefault();
    setError("");

    try {
      const payload = {
        task: form.task,
        dataset: form.dataset,
        model: form.model,
        strategy: form.strategy,
        variables: pairsToObject(variablePairs),
        results: pairsToObject(resultPairs),
        outcome: form.outcome,
        notes: form.notes
      };

      const isEditing = Boolean(editingId);
      const url = isEditing
        ? `${API_BASE_URL}/api/experiments/${editingId}`
        : `${API_BASE_URL}/api/experiments`;

      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(
          data.error || `Failed to ${isEditing ? "update" : "add"} experiment.`
        );
      }

      if (isEditing) {
        setExperiments((prev) =>
          prev.map((exp) => (exp.id === editingId ? data.experiment : exp))
        );
        resetExperimentForm();
      } else {
        setExperiments((prev) => [...prev, data.experiment]);

        setForm((prev) => ({
          ...prev,
          outcome: "abandoned",
          notes: ""
        }));

        setVariablePairs((prev) => ensureAtLeastOnePair(clearPairValues(prev)));
        setResultPairs((prev) => ensureAtLeastOnePair(clearPairValues(prev)));
      }
    } catch (err) {
      setError(err.message || "Failed to save experiment.");
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
        <div className="sidebar-header">
          <h2>{editingId ? `Edit ${editingId}` : "Add experiment"}</h2>
          {editingId && (
            <button
              type="button"
              className="secondary-button"
              onClick={resetExperimentForm}
            >
              Cancel edit
            </button>
          )}
        </div>

        <form className="experiment-form" onSubmit={handleSaveExperiment}>
          <input
            name="task"
            value={form.task}
            onChange={handleFormChange}
            placeholder="Task"
          />
          <input
            name="dataset"
            value={form.dataset}
            onChange={handleFormChange}
            placeholder="Dataset"
          />
          <input
            name="model"
            value={form.model}
            onChange={handleFormChange}
            placeholder="Model"
          />
          <input
            name="strategy"
            value={form.strategy}
            onChange={handleFormChange}
            placeholder="Strategy"
          />

          <div className="pair-section">
            <div className="pair-section-header">
              <h3>Variables</h3>
              <button
                type="button"
                className="secondary-button"
                onClick={() => addPair(setVariablePairs)}
              >
                Add variable
              </button>
            </div>

            {variablePairs.map((pair) => (
              <div key={pair.id} className="pair-row">
                <input
                  value={pair.key}
                  onChange={(e) =>
                    updatePair(setVariablePairs, pair.id, "key", e.target.value)
                  }
                  placeholder="Variable name"
                />
                <input
                  value={pair.value}
                  onChange={(e) =>
                    updatePair(setVariablePairs, pair.id, "value", e.target.value)
                  }
                  placeholder="Value"
                />
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => removePair(setVariablePairs, pair.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="pair-section">
            <div className="pair-section-header">
              <h3>Results</h3>
              <button
                type="button"
                className="secondary-button"
                onClick={() => addPair(setResultPairs)}
              >
                Add result
              </button>
            </div>

            {resultPairs.map((pair) => (
              <div key={pair.id} className="pair-row">
                <input
                  value={pair.key}
                  onChange={(e) =>
                    updatePair(setResultPairs, pair.id, "key", e.target.value)
                  }
                  placeholder="Result name"
                />
                <input
                  value={pair.value}
                  onChange={(e) =>
                    updatePair(setResultPairs, pair.id, "value", e.target.value)
                  }
                  placeholder="Value"
                />
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => removePair(setResultPairs, pair.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

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

          <button type="submit">
            {editingId ? "Save changes" : "Add experiment"}
          </button>
        </form>

        <div className="experiment-list">
          <h3>Experiments</h3>
          {experiments.map((exp) => (
            <div key={exp.id} className="experiment-card">
              <div className="experiment-card-top">
                <strong>{exp.id}</strong>
                <div className="experiment-card-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleEditExperiment(exp)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => handleDeleteExperiment(exp.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div>{exp.model} · {exp.strategy}</div>
              <div>{exp.dataset}</div>
              <div>{exp.outcome}</div>

              <div className="experiment-card-section">
                <div className="experiment-card-label">Variables</div>
                {Object.keys(exp.variables || {}).length ? (
                  <ul className="compact-list">
                    {Object.entries(exp.variables).map(([key, value]) => (
                      <li key={key}>
                        {key}: {value}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="muted-text">None</div>
                )}
              </div>

              <div className="experiment-card-section">
                <div className="experiment-card-label">Results</div>
                {Object.keys(exp.results || {}).length ? (
                  <ul className="compact-list">
                    {Object.entries(exp.results).map(([key, value]) => (
                      <li key={key}>
                        {key}: {value}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="muted-text">None</div>
                )}
              </div>
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
            placeholder="What patterns do you see across my experiments?"
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