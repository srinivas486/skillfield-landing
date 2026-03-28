"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { matchIntent, INITIAL_QUICK_REPLIES, WELCOME_MESSAGE } from "../lib/chatbot-knowledge";

/**
 * Parse **bold** markdown into JSX.
 */
function renderMarkdown(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

/**
 * A single message bubble in the thread.
 */
function Message({ role, text, action }) {
  const isBot = role === "bot";
  return (
    <div className={`chatbot-message chatbot-message--${role}`}>
      <div className="chatbot-bubble">
        <p>{renderMarkdown(text)}</p>
        {action && (
          <a
            href={action.href}
            className="chatbot-action-link"
            target={action.href.startsWith("http") ? "_blank" : undefined}
            rel={action.href.startsWith("http") ? "noopener noreferrer" : undefined}
          >
            {action.label} →
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Animated typing indicator (three bouncing dots).
 */
function TypingIndicator() {
  return (
    <div className="chatbot-message chatbot-message--bot">
      <div className="chatbot-bubble chatbot-typing">
        <span className="chatbot-dot" />
        <span className="chatbot-dot" />
        <span className="chatbot-dot" />
      </div>
    </div>
  );
}

/**
 * Main ChatBot widget — floating bubble + panel.
 */
export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState(INITIAL_QUICK_REPLIES);
  const [initialized, setInitialized] = useState(false);

  const threadRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll thread to bottom on new messages
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Show welcome message once on first open
  useEffect(() => {
    if (open && !initialized) {
      setInitialized(true);
      setMessages([{ role: "bot", text: WELCOME_MESSAGE }]);
      setQuickReplies(INITIAL_QUICK_REPLIES);
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, initialized]);

  // Escape key closes the panel
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  const sendMessage = useCallback(
    (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
      setInput("");
      setQuickReplies([]);
      setIsTyping(true);

      // Simulate a short thinking delay
      setTimeout(() => {
        const result = matchIntent(trimmed);
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: result.response, action: result.action },
        ]);
        if (result.quickReplies) setQuickReplies(result.quickReplies);
      }, 600 + Math.random() * 400);
    },
    []
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        className="chatbot-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chatbot" : "Open Skillfield chatbot"}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      <div
        className={`chatbot-panel${open ? " chatbot-panel--open" : ""}`}
        role="dialog"
        aria-label="Skillfield chatbot"
        aria-modal="true"
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-info">
            <span className="chatbot-avatar" aria-hidden="true">🤖</span>
            <div>
              <div className="chatbot-header-name">Skillfield Assistant</div>
              <div className="chatbot-header-status">
                <span className="chatbot-status-dot" aria-hidden="true" />
                Online
              </div>
            </div>
          </div>
          <button
            className="chatbot-close"
            onClick={() => setOpen(false)}
            aria-label="Close chatbot"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Message thread */}
        <div
          className="chatbot-thread"
          ref={threadRef}
          aria-live="polite"
          aria-label="Chat messages"
        >
          {messages.map((msg, i) => (
            <Message key={i} role={msg.role} text={msg.text} action={msg.action} />
          ))}
          {isTyping && <TypingIndicator />}
        </div>

        {/* Quick replies */}
        {quickReplies.length > 0 && (
          <div className="chatbot-quick-replies" aria-label="Suggested questions">
            {quickReplies.map((qr) => (
              <button
                key={qr}
                className="chatbot-quick-reply"
                onClick={() => sendMessage(qr)}
              >
                {qr}
              </button>
            ))}
          </div>
        )}

        {/* Input form */}
        <form className="chatbot-form" onSubmit={handleSubmit} aria-label="Send a message">
          <input
            ref={inputRef}
            className="chatbot-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything…"
            aria-label="Message input"
            autoComplete="off"
          />
          <button
            className="chatbot-send"
            type="submit"
            disabled={!input.trim()}
            aria-label="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );
}
