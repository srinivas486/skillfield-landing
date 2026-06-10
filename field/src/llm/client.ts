/**
 * Field - Claude API Client
 * Handles communication with Anthropic's Claude API
 */

import { Anthropic } from '@anthropic-ai/sdk';

export interface ClaudeClientConfig {
  apiKey: string;
  model?: 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514';
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  sessionId?: string;
}

export class ClaudeClient {
  private client: Anthropic;
  private defaultModel: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;

  constructor(config: ClaudeClientConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.defaultModel = config.model || 'claude-sonnet-4-20250514';
    this.defaultMaxTokens = config.maxTokens || 1024;
    this.defaultTemperature = config.temperature || 0.7;
  }

  /**
   * Generate a text response from Claude
   */
  async generate(
    systemPrompt: string,
    userPrompt: string,
    _sessionId?: string
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: this.defaultModel,
      max_tokens: this.defaultMaxTokens,
      temperature: this.defaultTemperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract text from response
    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return text;
  }

  /**
   * Generate with conversation history
   */
  async generateWithHistory(
    systemPrompt: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[],
    newMessage: string,
    _sessionId?: string
  ): Promise<{ text: string; tokenUsage: TokenUsage }> {
    const messages = conversationHistory.map((turn) => ({
      role: turn.role as 'user' | 'assistant',
      content: turn.content,
    }));

    messages.push({
      role: 'user',
      content: newMessage,
    });

    const response = await this.client.messages.create({
      model: this.defaultModel,
      max_tokens: this.defaultMaxTokens,
      temperature: this.defaultTemperature,
      system: systemPrompt,
      messages: messages as Anthropic.MessageParam[],
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const tokenUsage: TokenUsage = {
      inputTokens: response.usage.input_tokens || 0,
      outputTokens: response.usage.output_tokens || 0,
      totalTokens: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0),
    };

    return { text, tokenUsage };
  }

  /**
   * Generate with structured output (JSON)
   */
  async generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    _responseSchema: Record<string, unknown>,
    _sessionId?: string
  ): Promise<{ text: string; structured: T; tokenUsage: TokenUsage }> {
    // For now, we generate text and let the caller parse it
    // In production, you'd use Claude's structured output feature
    const text = await this.generate(systemPrompt, userPrompt, _sessionId);

    // Attempt to extract JSON from response
    let structured: T;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structured = JSON.parse(jsonMatch[0]) as T;
      } else {
        structured = {} as T;
      }
    } catch {
      structured = {} as T;
    }

    return {
      text,
      structured,
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  }
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

// ============================================================================
// Client Factory
// ============================================================================

let globalClient: ClaudeClient | null = null;

export function getClaudeClient(config: ClaudeClientConfig): ClaudeClient {
  if (!globalClient) {
    globalClient = new ClaudeClient(config);
  }
  return globalClient;
}

export function resetClaudeClient(): void {
  globalClient = null;
}