/**
 * Field - Session Resume Logic
 * Handles session resume with full context restoration
 */

import { FieldSession } from '../types/index.js';
import { SessionManager } from './manager.js';

export interface ResumeResult {
  session: FieldSession;
  isResumed: boolean;
  contextSummary: string;
  lastTurnIndex: number;
}

/**
 * Resume a session by prospect email
 * Returns the most recent active session for this prospect
 */
export async function resumeByEmail(
  sessionManager: SessionManager,
  email: string
): Promise<ResumeResult | null> {
  const session = await sessionManager.getSessionByProspectEmail(email);

  if (!session) {
    return null;
  }

  return buildResumeResult(session);
}

/**
 * Resume a session by session ID
 */
export async function resumeById(
  sessionManager: SessionManager,
  sessionId: string
): Promise<ResumeResult | null> {
  const session = await sessionManager.getSession(sessionId);

  if (!session) {
    return null;
  }

  return buildResumeResult(session);
}

/**
 * Build a resume result with context summary
 */
function buildResumeResult(session: FieldSession): ResumeResult {
  const contextSummary = generateContextSummary(session);
  const lastTurnIndex = session.conversationHistory.length - 1;

  return {
    session,
    isResumed: session.conversationHistory.length > 0,
    contextSummary,
    lastTurnIndex: lastTurnIndex >= 0 ? lastTurnIndex : 0,
  };
}

/**
 * Generate a human-readable context summary for the session
 */
function generateContextSummary(session: FieldSession): string {
  const parts: string[] = [];

  // Basic info
  if (session.qualificationData.prospectName) {
    parts.push(`Prospect: ${session.qualificationData.prospectName}`);
  }
  if (session.qualificationData.companyName) {
    parts.push(`Company: ${session.qualificationData.companyName}`);
  }

  // Conversation stats
  const turnCount = session.conversationHistory.length;
  parts.push(`Turns: ${turnCount}`);

  // Selected archetype
  if (session.selectedArchetype) {
    parts.push(`Archetype: ${formatArchetype(session.selectedArchetype)}`);
  }

  // Qualification status
  parts.push(`Qualification: ${session.qualificationScore.overall.toUpperCase()}`);

  // Stakeholder map
  if (session.qualificationData.stakeholderMap.length > 0) {
    const roles = session.qualificationData.stakeholderMap.map((s) => formatRole(s.role));
    parts.push(`Stakeholders: ${roles.join(', ')}`);
  }

  // Value drivers
  if (session.qualificationData.valueDrivers.length > 0) {
    const drivers = session.qualificationData.valueDrivers.map((d) => formatValueDriver(d.type));
    parts.push(`Value drivers: ${drivers.join(', ')}`);
  }

  // Last active
  const lastActive = session.metadata.lastActive.toLocaleString();
  parts.push(`Last active: ${lastActive}`);

  // Escalation
  if (session.escalationTriggered) {
    parts.push(`⚠️ ESCALATION: ${session.escalationTriggered.type}`);
  }

  return parts.join(' | ');
}

/**
 * Format archetype ID for display
 */
function formatArchetype(archetype: string): string {
  return archetype
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format stakeholder role for display
 */
function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format value driver type for display
 */
function formatValueDriver(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Build conversation context for LLM prompt
 * Returns formatted conversation history with key extraction
 */
export function buildConversationContext(session: FieldSession): string {
  if (session.conversationHistory.length === 0) {
    return 'No previous conversation.';
  }

  const lines: string[] = [];

  for (const turn of session.conversationHistory) {
    const role = turn.role === 'field' ? 'Field' : 'Prospect';
    lines.push(`[${turn.timestamp.toISOString()}] ${role}: ${turn.content}`);
  }

  return lines.join('\n');
}

/**
 * Build qualification context for LLM prompt
 */
export function buildQualificationContext(session: FieldSession): string {
  const parts: string[] = [];

  parts.push('=== QUALIFICATION STATUS ===');
  parts.push(`Overall: ${session.qualificationScore.overall.toUpperCase()}`);
  parts.push(`Score: ${session.qualificationScore.compositeScore}/100`);

  parts.push('\n=== DECISION TIMELINE ===');
  const dt = session.qualificationScore.decisionTimeline;
  parts.push(`Status: ${dt.status}`);
  if (dt.value) {
    parts.push(`Value: ${dt.value}`);
  }

  parts.push('\n=== COACH DETECTION ===');
  const coach = session.qualificationScore.coachDetected;
  parts.push(`Present: ${coach.present ? 'Yes' : 'No'}`);
  if (coach.evidence.length > 0) {
    parts.push(`Evidence: ${coach.evidence.join('; ')}`);
  }

  if (session.qualificationScore.redFlags.length > 0) {
    parts.push('\n=== RED FLAGS ===');
    for (const flag of session.qualificationScore.redFlags) {
      parts.push(`- [${flag.severity.toUpperCase()}] ${flag.description}`);
    }
  }

  return parts.join('\n');
}

/**
 * Build archetype context for LLM prompt
 */
export function buildArchetypeContext(session: FieldSession): string {
  if (session.archetypeScores.length === 0) {
    return 'Archetype not yet determined.';
  }

  const lines: string[] = ['=== ARCHETYPE RANKING ==='];

  const sorted = [...session.archetypeScores].sort((a, b) => b.confidence - a.confidence);

  for (let i = 0; i < sorted.length; i++) {
    const score = sorted[i];
    if (!score) continue;
    const marker = score.archetype === session.selectedArchetype ? '→ ' : '  ';
    lines.push(
      `${marker}${i + 1}. ${formatArchetype(score.archetype)} (${(score.confidence * 100).toFixed(0)}%)`
    );
    lines.push(`   Reasoning: ${score.reasoning}`);
  }

  return lines.join('\n');
}

/**
 * Check if session can be resumed (not too old)
 */
export function isSessionResumable(session: FieldSession, maxAgeHours: number = 72): boolean {
  const ageMs = Date.now() - session.metadata.lastActive.getTime();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  return ageMs < maxAgeMs;
}

/**
 * Generate a session resume message
 * This is what Field says when resuming a conversation
 */
export function generateResumeMessage(session: FieldSession): string {
  const parts: string[] = [];

  if (session.conversationHistory.length === 0) {
    return '';
  }

  parts.push("Welcome back. I remember our conversation.");

  // Briefly acknowledge key context
  if (session.selectedArchetype) {
    parts.push(`We've been discussing ${formatArchetype(session.selectedArchetype)}.`);
  }

  // Qualification status
  if (session.qualificationScore.overall === 'green') {
    parts.push("You seem like a strong fit for what we do.");
  } else if (session.qualificationScore.overall === 'red') {
    parts.push("There are some questions I still need to explore with you.");
  }

  // Coach
  const coach = session.qualificationScore.coachDetected;
  if (coach.present) {
    parts.push("You also mentioned you're trying to get this approved internally — I remember that.");
  }

  parts.push("Where would you like to pick up?");

  return parts.join(' ');
}