/**
 * Field - Session Schema
 * PostgreSQL schema for session storage
 */

import { FieldSession, ConversationTurn, ArchetypeScore, QualificationScore } from '../types/index.js';

// ============================================================================
// PostgreSQL Schema Definitions
// ============================================================================

export const SESSION_TABLE_NAME = 'field_sessions';

export const CREATE_SESSION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ${SESSION_TABLE_NAME} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id VARCHAR(255),
  prospect_email VARCHAR(255),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  channel VARCHAR(20) DEFAULT 'web',
  status VARCHAR(50) DEFAULT 'active',
  handoff_requested_at TIMESTAMP WITH TIME ZONE,
  
  -- Conversation
  conversation_history JSONB DEFAULT '[]',
  
  -- Qualification Data (extracted)
  qualification_data JSONB DEFAULT '{
    "prospectName": null,
    "prospectTitle": null,
    "companyName": null,
    "companySize": null,
    "industry": null,
    "painPoints": [],
    "currentSolutions": null,
    "decisionTimeline": null,
    "budgetSignals": [],
    "stakeholderMap": [],
    "valueDrivers": []
  }',
  
  -- Archetype
  archetype_scores JSONB DEFAULT '[]',
  selected_archetype VARCHAR(100),
  
  -- Qualification Score
  qualification_score JSONB DEFAULT '{
    "overall": "amber",
    "decisionTimeline": { "status": "none", "value": null, "confidence": 0 },
    "coachDetected": { "present": false, "confidence": 0, "evidence": [] },
    "redFlags": [],
    "compositeScore": 50
  }',
  
  -- Document State
  document_state JSONB DEFAULT '{
    "miniBusinessCase": { "generated": false },
    "stakeholderBrief": { "generated": false },
    "opportunityBrief": { "generated": false }
  }',
  
  -- Meeting Booking
  meeting_booking JSONB DEFAULT '{
    "requested": false,
    "scheduledAt": null,
    "confirmed": false,
    "calendarLink": null
  }',
  
  -- Escalation
  escalation_triggered JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_prospect_id ON ${SESSION_TABLE_NAME}(prospect_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON ${SESSION_TABLE_NAME}(status);
CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON ${SESSION_TABLE_NAME}(last_active DESC);
`;

// ============================================================================
// Serialization Helpers
// ============================================================================

export function serializeSessionForDb(session: FieldSession): Record<string, unknown> {
  return {
    id: session.id,
    prospect_id: session.metadata.prospectId,
    prospect_email: session.metadata.prospectEmail,
    started_at: session.metadata.startedAt,
    last_active: session.metadata.lastActive,
    channel: session.metadata.channel,
    status: session.metadata.status,
    handoff_requested_at: session.metadata.handoffRequestedAt,
    conversation_history: JSON.stringify(session.conversationHistory),
    qualification_data: JSON.stringify(session.qualificationData),
    archetype_scores: JSON.stringify(session.archetypeScores),
    selected_archetype: session.selectedArchetype,
    qualification_score: JSON.stringify(session.qualificationScore),
    document_state: JSON.stringify(session.documentState),
    meeting_booking: JSON.stringify(session.meetingBooking),
    escalation_triggered: session.escalationTriggered ? JSON.stringify(session.escalationTriggered) : null,
  };
}

export function deserializeSessionFromDb(row: Record<string, unknown>): FieldSession {
  return {
    id: row.id as string,
    metadata: {
      id: row.id as string,
      prospectId: row.prospect_id as string | undefined,
      prospectEmail: row.prospect_email as string | undefined,
      startedAt: new Date(row.started_at as string),
      lastActive: new Date(row.last_active as string),
      channel: (row.channel as 'web' | 'api' | 'chat') || 'web',
      status: (row.status as 'active' | 'pending_handoff' | 'completed' | 'disqualified') || 'active',
      handoffRequestedAt: row.handoff_requested_at ? new Date(row.handoff_requested_at as string) : undefined,
    },
    conversationHistory: typeof row.conversation_history === 'string'
      ? JSON.parse(row.conversation_history)
      : (row.conversation_history as ConversationTurn[] || []),
    qualificationData: typeof row.qualification_data === 'string'
      ? JSON.parse(row.qualification_data)
      : (row.qualification_data as Parameters<typeof deserializeSessionFromDb>[0]['qualificationData']),
    archetypeScores: typeof row.archetype_scores === 'string'
      ? JSON.parse(row.archetype_scores)
      : (row.archetype_scores as ArchetypeScore[] || []),
    selectedArchetype: row.selected_archetype as FieldSession['selectedArchetype'],
    qualificationScore: typeof row.qualification_score === 'string'
      ? JSON.parse(row.qualification_score)
      : (row.qualification_score as QualificationScore),
    documentState: typeof row.document_state === 'string'
      ? JSON.parse(row.document_state)
      : (row.document_state as FieldSession['documentState']),
    meetingBooking: typeof row.meeting_booking === 'string'
      ? JSON.parse(row.meeting_booking)
      : (row.meeting_booking as FieldSession['meetingBooking']),
    escalationTriggered: row.escalation_triggered
      ? (typeof row.escalation_triggered === 'string'
        ? JSON.parse(row.escalation_triggered)
        : row.escalation_triggered) as FieldSession['escalationTriggered']
      : undefined,
  };
}

// ============================================================================
// Session Factory
// ============================================================================

export function createEmptySession(id: string, channel: 'web' | 'api' | 'chat' = 'web'): FieldSession {
  return {
    id,
    metadata: {
      id,
      startedAt: new Date(),
      lastActive: new Date(),
      channel,
      status: 'active',
    },
    conversationHistory: [],
    qualificationData: {
      painPoints: [],
      stakeholderMap: [],
      valueDrivers: [],
    },
    archetypeScores: [],
    qualificationScore: {
      overall: 'amber',
      decisionTimeline: { status: 'none', value: null, confidence: 0 },
      coachDetected: { present: false, confidence: 0, evidence: [] },
      redFlags: [],
      compositeScore: 50,
    },
    documentState: {
      miniBusinessCase: { generated: false },
      stakeholderBrief: { generated: false },
      opportunityBrief: { generated: false },
    },
    meetingBooking: {
      requested: false,
      confirmed: false,
    },
  };
}