/**
 * Field - Shared Types
 * Core type definitions for the Field AI sales agent
 */

// ============================================================================
// Stakeholder Types (Miller Heiman)
// ============================================================================

export type StakeholderRole = 'economic_buyer' | 'user_buyer' | 'technical_buyer' | 'coach';

export interface StakeholderSignal {
  role: StakeholderRole;
  confidence: number; // 0-1
  evidence: string[]; // Conversational cues that triggered this
  detectedAt: Date;
}

// ============================================================================
// Value Driver Types
// ============================================================================

export type ValueDriverType = 'risk_reduction' | 'speed' | 'cost_certainty' | 'capability_building';

export interface ValueDriverSignal {
  type: ValueDriverType;
  confidence: number; // 0-1
  evidence: string[]; // Phrases that triggered this
  detectedAt: Date;
}

// ============================================================================
// Archetype Types
// ============================================================================

export type Archetype =
  | 'security_posture_assessment'
  | 'data_platform_build'
  | 'ai_platform_build'
  | 'siem'
  | 'mdr';

export interface ArchetypeScore {
  archetype: Archetype;
  confidence: number; // 0-1
  reasoning: string; // Why this archetype was matched
  signals: string[]; // Key signals that contributed to this score
}

// ============================================================================
// Qualification Types
// ============================================================================

export type QualificationStatus = 'green' | 'amber' | 'red';

export interface QualificationScore {
  overall: QualificationStatus;
  decisionTimeline: {
    status: 'explicit' | 'vague' | 'none';
    value: string | null;
    confidence: number;
  };
  coachDetected: {
    present: boolean;
    confidence: number;
    evidence: string[];
  };
  redFlags: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }[];
  compositeScore: number; // 0-100
}

// ============================================================================
// Session Types
// ============================================================================

export interface ConversationTurn {
  id: string;
  role: 'field' | 'prospect';
  content: string;
  timestamp: Date;
  metadata?: {
    archetypeScores?: ArchetypeScore[];
    qualificationUpdate?: Partial<QualificationScore>;
    stakeholderUpdate?: StakeholderSignal[];
  };
}

export interface ExtractedQualificationData {
  prospectName?: string;
  prospectTitle?: string;
  companyName?: string;
  companySize?: string;
  industry?: string;
  painPoints: string[];
  currentSolutions?: string;
  decisionTimeline?: string;
  budgetSignals?: string[];
  stakeholderMap: StakeholderSignal[];
  valueDrivers: ValueDriverSignal[];
}

export interface DocumentGenerationState {
  miniBusinessCase?: {
    generated: boolean;
    generatedAt?: Date;
    content?: string;
  };
  stakeholderBrief?: {
    generated: boolean;
    generatedAt?: Date;
    content?: string;
  };
  opportunityBrief?: {
    generated: boolean;
    generatedAt?: Date;
    content?: string;
  };
}

export interface MeetingBookingState {
  requested: boolean;
  scheduledAt?: Date;
  confirmed: boolean;
  calendarLink?: string;
}

export interface SessionMetadata {
  id: string;
  prospectId?: string;
  prospectEmail?: string;
  startedAt: Date;
  lastActive: Date;
  channel: 'web' | 'api' | 'chat';
  status: 'active' | 'pending_handoff' | 'completed' | 'disqualified';
  handoffRequestedAt?: Date;
}

export interface FieldSession {
  id: string;
  metadata: SessionMetadata;
  conversationHistory: ConversationTurn[];
  qualificationData: ExtractedQualificationData;
  archetypeScores: ArchetypeScore[];
  selectedArchetype?: Archetype;
  qualificationScore: QualificationScore;
  documentState: DocumentGenerationState;
  meetingBooking: MeetingBookingState;
  escalationTriggered?: {
    type: 'human_request' | 'off_topic' | 'limitation';
    triggeredAt: Date;
    details?: string;
  };
}

// ============================================================================
// LLM Types
// ============================================================================

export interface StructuredLLMResponse {
  conversationalText: string;
  structuredData: {
    newStakeholders?: StakeholderSignal[];
    newValueDrivers?: ValueDriverSignal[];
    updatedQualification?: Partial<QualificationScore>;
    archetypeScores?: ArchetypeScore[];
    selectedArchetype?: Archetype;
    escalationTriggered?: boolean;
    escalationType?: 'human_request' | 'off_topic' | 'limitation';
  };
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
}

export interface TokenBudgetConfig {
  maxTokensPerSession: number;
  warningThreshold: number; // Percentage (0-1) at which to warn
  cutoffThreshold: number; // Percentage (0-1) at which to stop generating
}

// ============================================================================
// Field Configuration
// ============================================================================

export interface FieldConfig {
  anthropicApiKey: string;
  model: 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514';
  tokenBudget: TokenBudgetConfig;
  redisUrl: string;
  postgresUrl: string;
  successStoriesBaseUrl: string;
}

// ============================================================================
// Prompt Types
// ============================================================================

export interface FieldPromptContext {
  session: FieldSession;
  archetypeReasoning: string;
  qualificationStatus: string;
  stakeholderMap: string;
  valueDrivers: string;
}

// ============================================================================
// Success Stories
// ============================================================================

export interface SuccessStory {
  id: string;
  title: string;
  client: string;
  industry: string;
  archetype: Archetype;
  challenge: string;
  solution: string;
  result: string;
  url?: string;
}