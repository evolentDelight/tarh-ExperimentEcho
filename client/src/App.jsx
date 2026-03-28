import { useState } from "react";
import "./App.css";

const API_BASE_URL = "http://localhost:3001";

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Hi, I’m ExperimentEcho. Ask me about your past experiments, such as why you stopped pursuing transfer learning."
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async (event) => {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setError("");

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
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
          messages: nextMessages
        })
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        retrievedExperiments: data.retrievedExperiments || []
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err.message || "Failed to contact server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="chat-container">
        <header className="chat-header">
          <h1>ExperimentEcho</h1>
          <p>Conversational memory for experiments</p>
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

                {message.role === "assistant" &&
                  Array.isArray(message.retrievedExperiments) &&
                  message.retrievedExperiments.length > 0 && (
                    <div className="retrieved-box">
                      <div className="retrieved-title">Referenced experiments</div>
                      <ul>
                        {message.retrievedExperiments.map((exp) => (
                          <li key={exp.id}>
                            <strong>{exp.id}</strong> — {exp.model}, {exp.strategy},{" "}
                            {exp.outcome}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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