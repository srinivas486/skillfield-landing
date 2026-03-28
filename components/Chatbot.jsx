"use client";

import { useState, useRef, useEffect } from "react";

const TYPING_DELAY_MS = 600;
const MAX_INPUT_LENGTH = 500;
const BLOG_PATH = "/blog/";

const KNOWLEDGE_BASE = [
  {
    patterns: ["hello", "hi", "hey", "good morning", "good afternoon", "howdy", "greetings"],
    response:
      "Hi there! 👋 I'm Skillfield's AI assistant. I can answer questions about our Cyber Security, AI & Data Services. What would you like to know?",
  },
  {
    patterns: ["what do you do", "what is skillfield", "who are you", "about skillfield", "tell me about skillfield"],
    response:
      "Skillfield is a Melbourne-based technology services firm specialising in Cyber Security, AI and Data Services. We help Australian organisations secure their environments, harness the power of data, and build intelligent automation.",
  },
  {
    patterns: ["services", "what services", "offerings", "what do you offer", "what can you do"],
    response:
      "Skillfield offers three main service areas:\n\n🔹 **Data & AI Services** — Data platforms, AI/ML models, automation & dashboards\n🔹 **Cyber Security Services** — EDR, SIEM, SOAR and end-to-end detection & response\n🔹 **Managed Services** — Proactive ongoing management of your security and data platforms\n\nWould you like to know more about any specific area?",
  },
  {
    patterns: ["ai", "machine learning", "ml", "artificial intelligence", "data platform", "cloud migration", "automation", "data services", "analytics"],
    response:
      "Our Data & AI Services include:\n\n• **Data Platform & Cloud** — Architecture, migration and cloud optimisation\n• **AI & Machine Learning** — Custom models, feature stores and predictive analytics\n• **Automation & Insights** — Data pipeline automation, dashboards and business intelligence\n\nReady to turn your data into a strategic asset? Contact us at info@skillfield.com.au",
  },
  {
    patterns: ["security", "cyber", "cybersecurity", "edr", "siem", "soar", "endpoint", "threat", "attack", "vulnerability", "incident"],
    response:
      "Our Cyber Security Services follow a proven five-layer approach:\n\n🛡️ **EDR** — Endpoint Detection & Response to proactively detect attacks\n👁️ **SIEM & Visibility** — Real-time centralised event data for attack detection\n⚡ **SOAR** — Security Orchestration, Automation & Response for faster incident handling\n\nWe customise solutions to your real threat areas — not one-size-fits-all. Get in touch at info@skillfield.com.au",
  },
  {
    patterns: ["managed services", "managed", "ongoing support", "ongoing management", "proactive"],
    response:
      "Skillfield's managed services provide proactive, ongoing management of your security and data platforms. Our team stays on top of threats and performance so you can focus on growing your business.\n\nContact us at info@skillfield.com.au to learn more.",
  },
  {
    patterns: ["price", "pricing", "cost", "how much", "rates", "fees", "quote", "budget"],
    response:
      "Every organisation is different, so we tailor our pricing to your specific needs and scope. We'd love to discuss your requirements and provide a customised proposal.\n\n📧 Reach out at **info@skillfield.com.au** and we'll get back to you promptly!",
  },
  {
    patterns: ["contact", "email", "get in touch", "reach out", "speak to", "talk to", "phone"],
    response:
      "We'd love to hear from you! 📬\n\n**Email:** info@skillfield.com.au\n**Location:** Melbourne, Australia\n\nOr scroll to the Contact section at the bottom of this page.",
  },
  {
    patterns: ["location", "where are you", "based", "australia", "melbourne", "office"],
    response:
      "Skillfield is based in Melbourne, Australia. 🇦🇺 Being Australian-based means we're local, accountable, and deeply familiar with the Australian regulatory landscape — which is essential for security peace of mind.",
  },
  {
    patterns: ["certified", "certification", "credentials", "partner", "iso", "iso 27001", "elastic", "aisa", "accredited"],
    response:
      "Skillfield holds impressive credentials:\n\n🏆 **Elastic Premium Partner** — APAC Region since 2019\n🔒 **ISO 27001 Certified** — Information Security Management\n🤝 **AISA Corporate Partner** — Australian Information Security Association\n📈 **Financial Times High-Growth** — Asia-Pacific, two consecutive years",
  },
  {
    patterns: ["why skillfield", "why choose", "different", "unique", "better", "what makes", "advantages"],
    response:
      "What makes Skillfield different:\n\n🇦🇺 **Australian Based** — Local, accountable, understands Australian regulations\n🎯 **Not Recruiters** — We solve business problems, not staff augmentation\n🧠 **Deep Expertise** — Certified specialists in both data and cyber security\n🤝 **Genuine Partner** — Your success matters more than the sale\n🏆 **Unbeatable Team** — Certified professionals with depth across AI, data & security\n📋 **End-to-End Accountability** — Dedicated project team from kick-off to delivery",
  },
  {
    patterns: ["blog", "articles", "insights", "posts", "news", "resources"],
    response:
      `Check out our Insights blog for the latest thinking on cyber security, AI, and data services! You can find it in the navigation menu above or visit ${BLOG_PATH} directly.`,
  },
  {
    patterns: ["thank", "thanks", "thank you", "cheers", "appreciate"],
    response:
      "You're welcome! 😊 Is there anything else you'd like to know about Skillfield's services? We're here to help!",
  },
  {
    patterns: ["bye", "goodbye", "see you", "farewell", "done", "that's all"],
    response:
      "Thanks for chatting! Don't hesitate to reach out if you have more questions. You can also contact us at info@skillfield.com.au. Have a great day! 👋",
  },
];

const WELCOME_MESSAGE = {
  role: "bot",
  text: "👋 Hi! I'm Skillfield's AI assistant. I can answer questions about our Cyber Security, AI & Data Services. How can I help you today?",
};

function findResponse(input) {
  const lower = input.toLowerCase().trim();
  for (const entry of KNOWLEDGE_BASE) {
    if (entry.patterns.some((p) => lower.includes(p))) {
      return entry.response;
    }
  }
  return "I'm not sure about that, but I'd love to connect you with our team! Please reach out at **info@skillfield.com.au** and we'll be happy to help. Is there anything else I can assist with?";
}

function renderText(text) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        )}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  function handleToggle() {
    setIsOpen((prev) => !prev);
  }

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      const response = findResponse(trimmed);
      setMessages((prev) => [...prev, { role: "bot", text: response }]);
      setIsTyping(false);
    }, TYPING_DELAY_MS);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="chatbot-wrapper">
      {isOpen && (
        <div
          className="chatbot-panel"
          role="dialog"
          aria-label="Skillfield AI Assistant"
          aria-modal="false"
        >
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar" aria-hidden="true">SF</div>
              <div>
                <div className="chatbot-title">Skillfield Assistant</div>
                <div className="chatbot-status">
                  <span className="chatbot-status-dot" aria-hidden="true"></span>
                  Online
                </div>
              </div>
            </div>
            <button
              className="chatbot-close"
              onClick={handleToggle}
              aria-label="Close chat"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" width="16" height="16">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="chatbot-messages" role="log" aria-label="Chat messages" aria-live="polite">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chatbot-message chatbot-message--${msg.role}`}
              >
                <div className="chatbot-bubble">{renderText(msg.text)}</div>
              </div>
            ))}
            {isTyping && (
              <div className="chatbot-message chatbot-message--bot">
                <div className="chatbot-bubble chatbot-bubble--typing" aria-label="Skillfield Assistant is typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-area">
            <input
              ref={inputRef}
              className="chatbot-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me about Skillfield…"
              aria-label="Chat message input"
              maxLength={MAX_INPUT_LENGTH}
            />
            <button
              className="chatbot-send"
              onClick={handleSend}
              aria-label="Send message"
              disabled={!input.trim()}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" width="18" height="18">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <button
        className={`chatbot-toggle${isOpen ? " chatbot-toggle--active" : ""}`}
        onClick={handleToggle}
        aria-label={isOpen ? "Close Skillfield Assistant" : "Open Skillfield Assistant"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" width="22" height="22">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" width="22" height="22">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>
    </div>
  );
}
