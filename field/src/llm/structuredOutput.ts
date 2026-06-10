/**
 * Field - Structured Output
 * Extracts and manages structured qualification data from conversations
 */

import {
  FieldSession,
  StructuredLLMResponse,
  StakeholderSignal,
  ValueDriverSignal,
  ArchetypeScore,
  Archetype,
} from '../types/index.js';
import { detectHumanHandoffRequest, isOffTopic } from '../qualification/millerHeiman.js';

// ============================================================================
// Structured Data Extraction
// ============================================================================

export interface ExtractedStructuredData {
  newStakeholders: StakeholderSignal[];
  newValueDrivers: ValueDriverSignal[];
  archetypeScores: ArchetypeScore[];
  selectedArchetype: Archetype | null;
  escalationTriggered: boolean;
  escalationType?: 'human_request' | 'off_topic' | 'limitation';
  qualificationUpdate?: {
    overall: 'green' | 'amber' | 'red';
    compositeScore: number;
  };
}

/**
 * Extract structured data from a Field session
 * This is called after processing a message to update qualification state
 */
export function extractStructuredData(session: FieldSession): ExtractedStructuredData {
  const result: ExtractedStructuredData = {
    newStakeholders: [],
    newValueDrivers: [],
    archetypeScores: session.archetypeScores,
    selectedArchetype: session.selectedArchetype || null,
    escalationTriggered: false,
  };

  // Check last prospect message for triggers
  const lastProspectTurn = [...session.conversationHistory]
    .reverse()
    .find((t) => t.role === 'prospect');

  if (lastProspectTurn) {
    if (detectHumanHandoffRequest(lastProspectTurn.content)) {
      result.escalationTriggered = true;
      result.escalationType = 'human_request';
    } else if (isOffTopic(lastProspectTurn.content)) {
      result.escalationTriggered = true;
      result.escalationType = 'off_topic';
    }
  }

  // Add qualification update if significant change
  if (session.qualificationScore) {
    result.qualificationUpdate = {
      overall: session.qualificationScore.overall,
      compositeScore: session.qualificationScore.compositeScore,
    };
  }

  return result;
}

/**
 * Build structured response from session state
 */
export function buildStructuredResponse(session: FieldSession): StructuredLLMResponse {
  const structured = extractStructuredData(session);

  return {
    conversationalText: '', // Caller fills this
    structuredData: {
      newStakeholders: structured.newStakeholders,
      newValueDrivers: structured.newValueDrivers,
      archetypeScores: structured.archetypeScores,
      selectedArchetype: structured.selectedArchetype ?? undefined,
      escalationTriggered: structured.escalationTriggered,
      escalationType: structured.escalationType,
    },
    tokenUsage: { input: 0, output: 0, total: 0 },
  };
}

// ============================================================================
// JSON Schema for Structured Extraction
// ============================================================================

export const QUALIFICATION_SCHEMA = {
  type: 'object',
  properties: {
    stakeholderSignals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          role: {
            type: 'string',
            enum: ['economic_buyer', 'user_buyer', 'technical_buyer', 'coach'],
          },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          evidence: { type: 'array', items: { type: 'string' } },
        },
        required: ['role', 'confidence', 'evidence'],
      },
    },
    valueDrivers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['risk_reduction', 'speed', 'cost_certainty', 'capability_building'],
          },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          evidence: { type: 'array', items: { type: 'string' } },
        },
        required: ['type', 'confidence', 'evidence'],
      },
    },
    archetypeScores: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          archetype: {
            type: 'string',
            enum: [
              'security_posture_assessment',
              'data_platform_build',
              'ai_platform_build',
              'siem',
              'mdr',
            ],
          },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          reasoning: { type: 'string' },
        },
        required: ['archetype', 'confidence', 'reasoning'],
      },
    },
    decisionTimeline: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['explicit', 'vague', 'none'] },
        value: { type: ['string', 'null'] },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
    coachDetected: {
      type: 'object',
      properties: {
        present: { type: 'boolean' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        evidence: { type: 'array', items: { type: 'string' } },
      },
    },
    redFlags: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          description: { type: 'string' },
        },
      },
    },
    qualificationStatus: {
      type: 'string',
      enum: ['green', 'amber', 'red'],
    },
    compositeScore: {
      type: 'number',
      minimum: 0,
      maximum: 100,
    },
  },
  required: [
    'stakeholderSignals',
    'valueDrivers',
    'archetypeScores',
    'qualificationStatus',
    'compositeScore',
  ],
};

// ============================================================================
// Response Formatting
// ============================================================================

/**
 * Format structured data as JSON string
 */
export function formatStructuredDataAsJson(data: ExtractedStructuredData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Parse JSON response from LLM
 */
export function parseJsonResponse(response: string): ExtractedStructuredData | null {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate structured data against schema
 */
export function validateStructuredData(data: unknown): data is ExtractedStructuredData {
  if (typeof data !== 'object' || data === null) return false;

  const obj = data as Record<string, unknown>;

  // Check required fields
  if (!Array.isArray(obj.archetypeScores)) return false;
  if (typeof obj.selectedArchetype !== 'string' && obj.selectedArchetype !== null) return false;
  if (typeof obj.escalationTriggered !== 'boolean') return false;

  return true;
}

// ============================================================================
// Session State Aggregation
// ============================================================================

/**
 * Aggregate all structured data from conversation history
 * Used for generating comprehensive session summaries
 */
export function aggregateSessionData(session: FieldSession): {
  allStakeholders: StakeholderSignal[];
  allValueDrivers: ValueDriverSignal[];
  archetypeJourney: ArchetypeScore[];
  qualificationTrend: 'improving' | 'stable' | 'declining';
} {
  const allStakeholders: Map<string, StakeholderSignal> = new Map();
  const allValueDrivers: Map<string, ValueDriverSignal> = new Map();

  // Aggregate from conversation metadata
  for (const turn of session.conversationHistory) {
    if (turn.metadata?.stakeholderUpdate) {
      for (const signal of turn.metadata.stakeholderUpdate) {
        const key = signal.role;
        const existing = allStakeholders.get(key);
        if (!existing || existing.confidence < signal.confidence) {
          allStakeholders.set(key, signal);
        }
      }
    }
  }

  // Add from qualification data
  for (const signal of session.qualificationData.stakeholderMap) {
    const key = signal.role;
    const existing = allStakeholders.get(key);
    if (!existing || existing.confidence < signal.confidence) {
      allStakeholders.set(key, signal);
    }
  }

  // Value drivers
  for (const driver of session.qualificationData.valueDrivers) {
    const key = driver.type;
    const existing = allValueDrivers.get(key);
    if (!existing || existing.confidence < driver.confidence) {
      allValueDrivers.set(key, driver);
    }
  }

  // Archetype journey (snapshots from turns)
  const archetypeJourney = session.archetypeScores;

  // Determine trend
  let qualificationTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (session.conversationHistory.length >= 3) {
    // This is a simplified heuristic - in production you'd track scores over time
    if (session.qualificationScore.overall === 'green') {
      qualificationTrend = 'improving';
    } else if (session.qualificationScore.overall === 'red') {
      qualificationTrend = 'declining';
    }
  }

  return {
    allStakeholders: Array.from(allStakeholders.values()),
    allValueDrivers: Array.from(allValueDrivers.values()),
    archetypeJourney,
    qualificationTrend,
  };
}