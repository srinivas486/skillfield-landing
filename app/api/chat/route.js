import { NextResponse } from "next/server";

// Knowledge base for Skillfield
const KNOWLEDGE_BASE = {
  services: {
    "Cyber Security": "Skillfield offers comprehensive cyber security services including penetration testing, vulnerability assessments, security audits, and incident response. We help businesses protect their digital assets through advanced threat detection and mitigation strategies.",
    "AI Solutions": "Our AI services include custom machine learning models, natural language processing, computer vision, and intelligent automation. We build AI-powered solutions tailored to your business needs, from chatbots to predictive analytics.",
    "Data Services": "Skillfield provides data engineering, analytics, and visualization services. We help organizations transform raw data into actionable insights through modern data pipelines, dashboards, and business intelligence solutions.",
  },
  pricing: {
    general: "Our pricing varies based on project scope and requirements. We offer flexible engagement models including fixed-price projects and retainer agreements. Contact us for a free consultation and custom quote.",
    "cyber security": "Cyber security pricing depends on your organization size and security needs. Services range from $5,000-$50,000+ for comprehensive assessments. We offer packages starting at $2,000 for basic security audits.",
    "ai development": "AI development projects typically start at $10,000 for proof-of-concepts and range from $25,000-$150,000+ for production systems. We also offer AI consulting at $200/hour.",
  },
  contact: {
    email: "hello@skillfield.ai",
    phone: "Available upon request",
    location: "Melbourne, Australia",
    hours: "Business hours: Monday-Friday, 9AM-6PM AEST",
  },
  company: {
    about: "Skillfield is a Melbourne-based technology company specializing in cyber security, AI solutions, and data services. We help businesses transform their operations through innovative technology.",
    team: "Our team consists of experienced security experts, AI engineers, and data scientists with decades of combined experience in their respective fields.",
    vision: "We believe in making advanced technology accessible to businesses of all sizes, combining cutting-edge AI with robust security practices.",
  },
};

const SYSTEM_PROMPT = `You are Skillfield's AI assistant, a professional, knowledgeable, and friendly chatbot for a Melbourne-based technology company.

About Skillfield:
- Company: Skillfield
- Location: Melbourne, Australia
- Services: Cyber Security, AI Solutions, Data Services
- Contact: hello@skillfield.ai

Your role:
- Help visitors learn about Skillfield's services
- Answer questions about pricing (provide ranges, suggest consultation for exact quotes)
- Share company information
- Be friendly, professional, and concise

Guidelines:
- Keep responses under 150 words
- If you don't know something, suggest contacting hello@skillfield.ai
- Stay within your knowledge scope - politely redirect off-topic questions
- Never make up information
- For pricing questions, provide general ranges and recommend getting a custom quote

Knowledge Base:
${JSON.stringify(KNOWLEDGE_BASE, null, 2)}

Remember: You represent Skillfield. Be helpful, accurate, and professional.`;

// Build conversation context for the API
function buildMessages(history, userMessage) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  // Add last 6 messages from history for context
  const recentHistory = history.slice(-6);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add current user message
  messages.push({ role: "user", content: userMessage });

  return messages;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, history } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get API key from environment
    const apiKey = process.env.NVIDIA_API_KEY;
    const apiEndpoint = process.env.NIM_API_ENDPOINT || "https://integrate.api.nvidia.com/v1/chat/completions";

    if (!apiKey) {
      console.error("NVIDIA_API_KEY not configured");
      return NextResponse.json(
        { error: "Chat service not configured. Please contact the administrator." },
        { status: 503 }
      );
    }

    // Build messages
    const messages = buildMessages(history || [], message);

    // Make request to NVIDIA NIM
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-70b-instruct",
        messages: messages,
        temperature: 0.7,
        max_tokens: 512,
        top_p: 0.9,
      }),
    });

    // Handle different error cases
    if (response.status === 401) {
      return NextResponse.json(
        { error: "Invalid API key. Please check configuration." },
        { status: 503 }
      );
    }

    if (response.status === 429) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again in a moment." },
        { status: 503 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NIM API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again." },
        { status: 503 }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      console.error("No response content from NIM API");
      return NextResponse.json(
        { error: "Failed to get a response. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ response: assistantMessage });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
