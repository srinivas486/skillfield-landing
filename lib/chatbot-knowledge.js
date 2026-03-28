/**
 * Skillfield Chatbot Knowledge Base
 * Rule-based Q&A engine for the Skillfield Assistant widget.
 *
 * matchIntent(userInput) → { response: string, action?: { label, href } }
 */

const KNOWLEDGE = [
  // ── Services ─────────────────────────────────────────────────────────────
  {
    patterns: [/\bservices?\b/i, /\bwhat do you (do|offer)\b/i, /\bofferings?\b/i],
    response:
      "Skillfield offers three core service pillars: **Cyber Security**, **AI & Data Services**, and **Managed IT Services**. Each is tailored to modern Australian businesses. Which area would you like to know more about?",
    quickReplies: ["Cyber Security", "AI & Data", "Managed Services"],
  },

  // ── AI & Data ─────────────────────────────────────────────────────────────
  {
    patterns: [
      /\bai\b/i,
      /\bartificial intelligence\b/i,
      /\bmachine learning\b/i,
      /\bdata (services?|analytics|strategy)\b/i,
      /\bllm\b/i,
      /\bagentic\b/i,
    ],
    response:
      "Our **AI & Data Services** help businesses unlock value from their data — from AI strategy and roadmaps through to deploying agentic workflows, LLM integrations, and custom analytics solutions. We work with you to make AI practical and safe.",
    action: { label: "Learn More", href: "/#ai-data" },
  },

  // ── Cyber Security ────────────────────────────────────────────────────────
  {
    patterns: [
      /\bcyber( ?security)?\b/i,
      /\bsecurity\b/i,
      /\bsiem\b/i,
      /\bsoar\b/i,
      /\bzero.?trust\b/i,
      /\bpenetration (testing|test)\b/i,
      /\bpen.?test\b/i,
      /\bvulnerabilit(y|ies)\b/i,
      /\bcompliance\b/i,
    ],
    response:
      "Our **Cyber Security** practice covers threat detection, SIEM/SOAR implementation, zero-trust architecture, penetration testing, and compliance frameworks (ISO 27001, Essential Eight). We protect what matters most to your business.",
    action: { label: "Learn More", href: "/#cyber" },
  },

  // ── Managed Services ─────────────────────────────────────────────────────
  {
    patterns: [
      /\bmanaged (services?|it|support)\b/i,
      /\bit support\b/i,
      /\binfrastructure\b/i,
      /\bcloud\b/i,
      /\bnetwork\b/i,
      /\bmonitoring\b/i,
    ],
    response:
      "Our **Managed IT Services** provide proactive monitoring, cloud infrastructure management, network support, and end-user helpdesk — so your team can focus on the business, not the tech.",
    action: { label: "Learn More", href: "/#managed" },
  },

  // ── Pricing ───────────────────────────────────────────────────────────────
  {
    patterns: [
      /\bpric(e|ing|es)\b/i,
      /\bcost(s)?\b/i,
      /\bhow much\b/i,
      /\bquote\b/i,
      /\bpackage(s)?\b/i,
      /\bplan(s)?\b/i,
    ],
    response:
      "Pricing depends on the scope and scale of your needs. We offer flexible engagements — from project-based to ongoing retainers. Reach out and we'll put together a tailored proposal at no obligation.",
    action: { label: "Get a Quote", href: "/#contact" },
  },

  // ── Contact ───────────────────────────────────────────────────────────────
  {
    patterns: [
      /\bcontact\b/i,
      /\bget in touch\b/i,
      /\breach (you|out|us)\b/i,
      /\bemail\b/i,
      /\bphone\b/i,
      /\bcall\b/i,
      /\bspeak (to|with) someone\b/i,
    ],
    response:
      "You can reach the Skillfield team at **info@skillfield.com.au** or via the contact form on our website. We typically respond within one business day.",
    action: { label: "Contact Us", href: "/#contact" },
  },

  // ── Location ─────────────────────────────────────────────────────────────
  {
    patterns: [
      /\bwhere (are you|is skillfield)\b/i,
      /\blocation\b/i,
      /\bmelbourne\b/i,
      /\baustralia\b/i,
      /\boffice\b/i,
      /\bbased\b/i,
    ],
    response:
      "Skillfield is headquartered in **Melbourne, Australia**. We work with clients nationally and can deliver services remotely or on-site.",
  },

  // ── About / Company ───────────────────────────────────────────────────────
  {
    patterns: [
      /\bwho (are|is) (you|skillfield)\b/i,
      /\babout (you|skillfield|the company)\b/i,
      /\btell me about\b/i,
      /\bcompany\b/i,
    ],
    response:
      "**Skillfield** is a Melbourne-based technology services firm specialising in Cyber Security, AI & Data Services, and Managed IT. We partner with Australian businesses to build secure, intelligent, and resilient technology foundations.",
    action: { label: "About Us", href: "/#about" },
  },

  // ── Blog / Insights ───────────────────────────────────────────────────────
  {
    patterns: [
      /\bblog\b/i,
      /\binsights?\b/i,
      /\barticles?\b/i,
      /\bresources?\b/i,
      /\blearn\b/i,
      /\bnews\b/i,
    ],
    response:
      "Check out our **Blog & Insights** for articles on AI strategy, cyber security best practices, and IT leadership topics written by the Skillfield team.",
    action: { label: "Read the Blog", href: "/blog" },
  },

  // ── Greetings ─────────────────────────────────────────────────────────────
  {
    patterns: [/^\s*(hi|hello|hey|g'?day|howdy|sup)\b/i, /^(good\s)?(morning|afternoon|evening)\b/i],
    response:
      "Hey there! 👋 I'm the Skillfield Assistant. I can help you with information about our services, pricing, contact details, and more. What can I help you with today?",
    quickReplies: ["Our Services", "Get in Touch", "About Skillfield"],
  },

  // ── Thanks ────────────────────────────────────────────────────────────────
  {
    patterns: [/\b(thanks?|thank you|cheers|appreciate)\b/i],
    response:
      "You're welcome! Is there anything else I can help you with? 😊",
  },
];

/**
 * Quick-reply suggestions shown when the chat first opens.
 */
export const INITIAL_QUICK_REPLIES = [
  "What services do you offer?",
  "Cyber Security",
  "AI & Data",
  "Contact Skillfield",
];

/**
 * Welcome message shown on first open.
 */
export const WELCOME_MESSAGE =
  "Hi there! 👋 I'm the **Skillfield Assistant**. How can I help you today?";

/**
 * Fallback when no pattern matches.
 */
const FALLBACK = {
  response:
    "I'm not sure about that — you can reach us at **info@skillfield.com.au** and a team member will be happy to help.",
  action: { label: "Email Us", href: "mailto:info@skillfield.com.au" },
};

/**
 * Match the user's input against the knowledge base.
 *
 * @param {string} userInput
 * @returns {{ response: string, action?: { label: string, href: string }, quickReplies?: string[] }}
 */
export function matchIntent(userInput) {
  if (!userInput || typeof userInput !== "string") return FALLBACK;

  const trimmed = userInput.trim();

  for (const entry of KNOWLEDGE) {
    if (entry.patterns.some((re) => re.test(trimmed))) {
      return {
        response: entry.response,
        ...(entry.action ? { action: entry.action } : {}),
        ...(entry.quickReplies ? { quickReplies: entry.quickReplies } : {}),
      };
    }
  }

  return FALLBACK;
}
