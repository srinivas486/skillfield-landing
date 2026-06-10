/**
 * Field - Field Brain
 * Main LangGraph agent that orchestrates all qualification layers
 */

import { FieldSession, ConversationTurn, StructuredLLMResponse } from '../types/index.js';
import { SessionManager } from '../session/manager.js';
import {
  detectStakeholderRoles,
  detectValueDrivers,
  detectHumanHandoffRequest,
  formatStakeholderSummary,
  formatValueDriverSummary,
} from '../qualification/millerHeiman.js';
import {
  computeFullQualificationScore,
  interpretScore,
} from '../qualification/scoring.js';
import { mapArchetype } from '../qualification/archetypes.js';
import { buildConversationContext, buildQualificationContext, buildArchetypeContext } from '../session/resume.js';
import { extractStructuredData } from '../llm/structuredOutput.js';
import { ClaudeClient } from '../llm/client.js';
import { TokenBudgetManager } from '../llm/tokenBudget.js';
import { FieldSystemPrompt, FieldQualificationPrompt } from './prompts/system.js';

// ============================================================================
// Field Brain Configuration
// ============================================================================

export interface FieldBrainConfig {
  anthropicApiKey: string;
  model?: 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514';
  maxTokensPerSession?: number;
  redisUrl: string;
  postgresUrl: string;
}

// ============================================================================
// Field Brain Core
// ============================================================================

export class FieldBrain {
  private sessionManager: SessionManager;
  private claudeClient: ClaudeClient;
  private tokenBudget: TokenBudgetManager;

  constructor(sessionManager: SessionManager, claudeClient: ClaudeClient, tokenBudget: TokenBudgetManager) {
    this.sessionManager = sessionManager;
    this.claudeClient = claudeClient;
    this.tokenBudget = tokenBudget;
  }

  /**
   * Start a new Field conversation session
   */
  async startSession(prospectEmail?: string, channel: 'web' | 'api' | 'chat' = 'web'): Promise<FieldSession> {
    // Check for existing session by email
    if (prospectEmail) {
      const existing = await this.sessionManager.getSessionByProspectEmail(prospectEmail);
      if (existing && existing.metadata.status === 'active') {
        return existing;
      }
    }

    // Create new session
    const session = await this.sessionManager.createSession(channel);
    if (prospectEmail) {
      session.metadata.prospectEmail = prospectEmail;
      await this.sessionManager.updateSession(session);
    }

    return session;
  }

  /**
   * Resume an existing session
   */
  async resumeSession(sessionId: string): Promise<FieldSession | null> {
    return this.sessionManager.getSession(sessionId);
  }

  /**
   * Process a prospect message and return Field's response
   */
  async processMessage(
    sessionId: string,
    prospectMessage: string
  ): Promise<StructuredLLMResponse> {
    // Load session
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Check for escalation triggers
    if (detectHumanHandoffRequest(prospectMessage)) {
      await this.flagForHandoff(session);
      return {
        conversationalText: this.generateHandoffResponse(session),
        structuredData: {
          escalationTriggered: true,
          escalationType: 'human_request',
        },
        tokenUsage: { input: 0, output: 0, total: 0 },
      };
    }

    // Check token budget
    if (this.tokenBudget.isExhausted(sessionId)) {
      return this.generateTokenBudgetExceededResponse(session);
    }

    // Add prospect turn
    const turn: Omit<ConversationTurn, 'id'> = {
      role: 'prospect',
      content: prospectMessage,
      timestamp: new Date(),
    };

    await this.sessionManager.addTurn(sessionId, turn);

    // Update session with latest detection
    const updatedSession = await this.sessionManager.getSession(sessionId);
    if (!updatedSession) {
      throw new Error(`Session not found after update: ${sessionId}`);
    }

    // Detect stakeholders and value drivers from this message
    const existingStakeholders = updatedSession.qualificationData.stakeholderMap;
    const existingValueDrivers = updatedSession.qualificationData.valueDrivers;

    const newStakeholders = detectStakeholderRoles(prospectMessage, existingStakeholders);
    const newValueDrivers = detectValueDrivers(prospectMessage, existingValueDrivers);

    // Update session with new signals
    updatedSession.qualificationData.stakeholderMap = newStakeholders;
    updatedSession.qualificationData.valueDrivers = newValueDrivers;

    // Recompute archetype mapping
    const archetypeAnalysis = mapArchetype(
      updatedSession.conversationHistory,
      newStakeholders,
      newValueDrivers
    );
    updatedSession.archetypeScores = archetypeAnalysis.scores;
    if (archetypeAnalysis.selectedArchetype) {
      updatedSession.selectedArchetype = archetypeAnalysis.selectedArchetype;
    }

    // Recompute qualification score
    const qualificationScore = computeFullQualificationScore(
      updatedSession.conversationHistory,
      newStakeholders,
      newValueDrivers,
      updatedSession.archetypeScores
    );
    updatedSession.qualificationScore = qualificationScore;

    // Generate Field's response
    const response = await this.generateResponse(updatedSession);

    // Add Field's turn
    const fieldTurn: Omit<ConversationTurn, 'id'> = {
      role: 'field',
      content: response.conversationalText,
      timestamp: new Date(),
      metadata: {
        archetypeScores: archetypeAnalysis.scores,
        qualificationUpdate: qualificationScore,
        stakeholderUpdate: newStakeholders,
      },
    };

    await this.sessionManager.addTurn(sessionId, fieldTurn);

    // Update session with final state
    updatedSession.conversationHistory.push({
      ...fieldTurn,
      id: crypto.randomUUID(),
    });

    await this.sessionManager.updateSession(updatedSession);

    // Track token usage
    this.tokenBudget.trackUsage(sessionId, response.tokenUsage.total);

    return response;
  }

  /**
   * Generate Field's response using Claude
   */
  private async generateResponse(session: FieldSession): Promise<StructuredLLMResponse> {
    const context = this.buildPromptContext(session);

    const systemPrompt = FieldSystemPrompt;
    const qualificationPrompt = FieldQualificationPrompt(context);

    const conversationContext = buildConversationContext(session);

    // Check if this is the opening message (no prior turns)
    const isOpening = session.conversationHistory.length === 1; // Just the prospect's first message

    let conversationalText: string;
    let tokenUsage = { input: 0, output: 0, total: 0 };

    if (isOpening && session.conversationHistory.length === 1) {
      // Opening message - use disclosure prompt
      const firstTurn = session.conversationHistory[0];
      conversationalText = await this.claudeClient.generate(
        systemPrompt,
        `${qualificationPrompt}\n\nThis is the FIRST message in the conversation. The prospect just said: "${firstTurn?.content ?? ''}"\n\nGenerate Field's opening response following the system prompt guidelines. Include the AI disclosure.`,
        session.id
      );
    } else {
      // Continuing conversation
      conversationalText = await this.claudeClient.generate(
        systemPrompt,
        `${qualificationPrompt}\n\nCONVERSATION HISTORY:\n${conversationContext}\n\nThe prospect's latest message has already been added to the history above. Generate Field's response that addresses this message while maintaining conversation context.`,
        session.id
      );
    }

    // Extract structured data from response (would be done by Claude in production via tool use)
    // For now, we return the computed data from our qualification engine
    const structuredData = extractStructuredData(session);

    return {
      conversationalText,
      structuredData: {
        newStakeholders: structuredData.newStakeholders,
        newValueDrivers: structuredData.newValueDrivers,
        archetypeScores: structuredData.archetypeScores,
        selectedArchetype: structuredData.selectedArchetype ?? undefined,
        escalationTriggered: structuredData.escalationTriggered,
        escalationType: structuredData.escalationType,
      },
      tokenUsage,
    };
  }

  /**
   * Build the qualification prompt context
   */
  private buildPromptContext(session: FieldSession): string {
    const parts: string[] = [];

    parts.push('=== CURRENT SESSION STATE ===');
    parts.push(`Session ID: ${session.id}`);
    parts.push(`Turn count: ${session.conversationHistory.length}`);

    if (session.selectedArchetype) {
      parts.push(`\n=== SELECTED ARCHETYPE ===`);
      parts.push(`${session.selectedArchetype}`);
    }

    parts.push('\n' + buildArchetypeContext(session));

    parts.push('\n' + formatStakeholderSummary(session.qualificationData.stakeholderMap));

    parts.push('\n' + formatValueDriverSummary(session.qualificationData.valueDrivers));

    parts.push('\n' + buildQualificationContext(session));

    // Add qualification interpretation
    const interpretation = interpretScore(session.qualificationScore);
    parts.push('\n=== QUALIFICATION INTERPRETATION ===');
    parts.push(interpretation.headline);
    if (interpretation.keyConcerns.length > 0) {
      parts.push(`Concerns: ${interpretation.keyConcerns.join('; ')}`);
    }
    if (interpretation.recommendedActions.length > 0) {
      parts.push(`Recommended actions: ${interpretation.recommendedActions.join('; ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Flag session for human handoff
   */
  private async flagForHandoff(session: FieldSession): Promise<void> {
    session.escalationTriggered = {
      type: 'human_request',
      triggeredAt: new Date(),
    };
    await this.sessionManager.flagForHandoff(session.id);
  }

  /**
   * Generate handoff response
   */
  private generateHandoffResponse(session: FieldSession): string {
    const parts: string[] = [];

    parts.push(
      "Absolutely — a human is on the way. I'll hand off this conversation so you can speak with someone directly."
    );

    if (session.selectedArchetype) {
      parts.push(
        `For context, we've been discussing your ${session.selectedArchetype.replace(/_/g, ' ')} needs, and your qualification score is ${session.qualificationScore.compositeScore}/100.`
      );
    }

    parts.push(
      "While you wait, here's a quick summary of what we've covered — it will help our team pick up right where we left off."
    );

    // Generate brief summary
    const summary = this.generateSessionSummary(session);
    parts.push(summary);

    parts.push(
      "\nA team member will be with you shortly. Thank you for your time today."
    );

    return parts.join('\n\n');
  }

  /**
   * Generate session summary for handoff
   */
  private generateSessionSummary(session: FieldSession): string {
    const parts: string[] = [];

    if (session.qualificationData.companyName) {
      parts.push(`Company: ${session.qualificationData.companyName}`);
    }

    if (session.qualificationData.prospectName) {
      parts.push(`Contact: ${session.qualificationData.prospectName}`);
    }

    if (session.selectedArchetype) {
      parts.push(`Primary interest: ${session.selectedArchetype.replace(/_/g, ' ')}`);
    }

    const drivers = session.qualificationData.valueDrivers.map((d) => d.type);
    if (drivers.length > 0) {
      parts.push(`Value drivers: ${drivers.join(', ')}`);
    }

    const stakeholders = session.qualificationData.stakeholderMap.map((s) => s.role);
    if (stakeholders.length > 0) {
      parts.push(`Stakeholders identified: ${stakeholders.join(', ')}`);
    }

    parts.push(`Qualification status: ${session.qualificationScore.overall.toUpperCase()} (${session.qualificationScore.compositeScore}/100)`);

    return parts.join('\n');
  }

  /**
   * Generate token budget exceeded response
   */
  private generateTokenBudgetExceededResponse(session: FieldSession): StructuredLLMResponse {
    return {
      conversationalText: `I've reached the conversation limit for this session. To continue, I'll need to hand off to a team member who can pick up where we left off.\n\nBased on our conversation, you're interested in ${session.selectedArchetype?.replace(/_/g, ' ') || 'a security solution'}. Your qualification score is ${session.qualificationScore.compositeScore}/100.\n\nWould you like me to connect you with someone now?`,
      structuredData: {
        escalationTriggered: true,
        escalationType: 'limitation',
      },
      tokenUsage: { input: 0, output: 0, total: 0 },
    };
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<FieldSession | null> {
    return this.sessionManager.getSession(sessionId);
  }

  /**
   * Check if session is flagged for handoff
   */
  async isHandoffPending(sessionId: string): Promise<boolean> {
    const session = await this.sessionManager.getSession(sessionId);
    return session?.metadata.status === 'pending_handoff';
  }

  /**
   * Get token usage for session
   */
  getTokenUsage(sessionId: string): { used: number; budget: number; remaining: number } {
    return this.tokenBudget.getUsage(sessionId);
  }
}

// ============================================================================
// Factory
// ============================================================================

export async function createFieldBrain(config: FieldBrainConfig): Promise<FieldBrain> {
  const { createRedisClient, createPgPool, SessionManager } = await import('../session/manager.js');

  const redis = createRedisClient(config.redisUrl);
  const pgPool = createPgPool(config.postgresUrl);

  const sessionManager = new SessionManager(pgPool, redis);
  await sessionManager.initialize();

  const claudeClient = new ClaudeClient({
    apiKey: config.anthropicApiKey,
    model: config.model || 'claude-sonnet-4-20250514',
  });

  const tokenBudget = new TokenBudgetManager({
    maxTokensPerSession: config.maxTokensPerSession || 2000,
    warningThreshold: 0.8,
    cutoffThreshold: 1.0,
  });

  return new FieldBrain(sessionManager, claudeClient, tokenBudget);
}