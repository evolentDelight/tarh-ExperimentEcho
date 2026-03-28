import { useState } from "react";
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
        content: data.reply
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err.message || "Failed to contact server.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setConversationId("");
    setError("");
    setInput("");
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Hi, I’m ExperimentEcho. Ask me about your past experiments, such as why you stopped pursuing transfer learning."
      }
    ]);
  };

  return (
    <div className="app-shell">
      <div className="chat-container">
        <header className="chat-header">
          <div>
            <h1>ExperimentEcho</h1>
            <p>Conversational memory for experiments</p>
          </div>
          <button className="reset-button" onClick={handleResetChat} type="button">
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