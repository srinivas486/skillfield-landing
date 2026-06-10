/**
 * Field - Qualification Scoring
 * Computes overall qualification score based on Miller Heiman signals
 */

import {
  QualificationScore,
  QualificationStatus,
  StakeholderSignal,
  ValueDriverSignal,
  ConversationTurn,
} from '../types/index.js';

// ============================================================================
// Scoring Configuration
// ============================================================================

interface ScoringWeights {
  decisionTimeline: number;
  coachDetection: number;
  stakeholderMap: number;
  valueDrivers: number;
  redFlags: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  decisionTimeline: 25,
  coachDetection: 20,
  stakeholderMap: 20,
  valueDrivers: 20,
  redFlags: 15,
};

interface ScoringConfig {
  weights: ScoringWeights;
  timelineExplicitBonus: number;
  timelineVaguePenalty: number;
  coachBonus: number;
  strongStakeholderMapBonus: number;
  valueDriverBonus: number;
  redFlagPenalty: Record<string, number>; // severity -> penalty
}

const DEFAULT_CONFIG: ScoringConfig = {
  weights: DEFAULT_WEIGHTS,
  timelineExplicitBonus: 15,
  timelineVaguePenalty: -10,
  coachBonus: 15,
  strongStakeholderMapBonus: 10,
  valueDriverBonus: 10,
  redFlagPenalty: {
    high: -30,
    medium: -15,
    low: -5,
  },
};

// ============================================================================
// Decision Timeline Detection
// ============================================================================

interface TimelineSignal {
  status: 'explicit' | 'vague' | 'none';
  value: string | null;
  confidence: number;
}

export function detectDecisionTimeline(
  conversationHistory: ConversationTurn[]
): TimelineSignal {
  const prospectText = conversationHistory
    .filter((t) => t.role === 'prospect')
    .map((t) => t.content)
    .join(' ')
    .toLowerCase();

  // Explicit timeline patterns
  const explicitPatterns = [
    /by\s+(january|february|march|april|may|june|july|august|september|october|november|december|q[1-4])/i,
    /by\s+(end\s+of\s+)?(this|next)\s+(year|quarter|month)/i,
    /need\s+this\s+(by|before)\s+/i,
    /\d+\s+(weeks?|months?)\s+(from\s+now|time|away)/i,
    /urgently|asap|quick(ly)?\s+(need|turnaround)/i,
    /deadline\s+(is\s+)?/i,
    /when\s+(we|we'll|we\s+will)\s+(decide|go|lanch|implement)/i,
    /decision\s+(by|expected|in)\s+/i,
    /next\s+(fiscal|financial)\s+(year|quarter|period)/i,
    /first\s+(quarter|half|half)/i,
    /\b(q[1-4]|q1|q2|q3|q4)\s+\d{4}/i,
    /\b20\d{2}\b/, // Year mention like 2025, 2026
  ];

  // Vague timeline patterns
  const vaguePatterns = [
    /some\s+time\s+(away|from\s+now)/i,
    /eventually|sometime\s+(later|next|year)/i,
    /when\s+we\s+(can|are\s+ready|have\s+budget)/i,
    /no\s+(urgent|pressing)\s+(need|timeline|deadline)/i,
    /not\s+sure\s+(yet|when)/i,
    /looking\s+(around|at\s+options)/i,
    /exploring\s+(options|possibilities|ideas)/i,
    /just\s+(starting|beginning)\s+to\s+think/i,
    /we('ll| will)\s+(figure|see|decide)\s+later/i,
  ];

  // Check explicit patterns first
  for (const pattern of explicitPatterns) {
    const match = prospectText.match(pattern);
    if (match) {
      return {
        status: 'explicit',
        value: match[0],
        confidence: 0.9,
      };
    }
  }

  // Check vague patterns
  for (const pattern of vaguePatterns) {
    const match = prospectText.match(pattern);
    if (match) {
      return {
        status: 'vague',
        value: match[0],
        confidence: 0.6,
      };
    }
  }

  // Check for any timeline mention
  const anyTimelinePatterns = [
    /timeline|deadline|when|schedule|by\s+(the|end)/i,
    /plan(ning|ned)?\s+(to|for|around)/i,
    /will\s+(do|get|start|take)\s+(this|it|that)/i,
  ];

  for (const pattern of anyTimelinePatterns) {
    if (pattern.test(prospectText)) {
      return {
        status: 'vague',
        value: 'Implicit timeline mentioned',
        confidence: 0.4,
      };
    }
  }

  return {
    status: 'none',
    value: null,
    confidence: 0,
  };
}

// ============================================================================
// Red Flag Detection
// ============================================================================

export interface RedFlag {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export function detectRedFlags(
  conversationHistory: ConversationTurn[],
  stakeholderSignals: StakeholderSignal[],
  archetypeScores: { archetype: string; confidence: number }[]
): RedFlag[] {
  const flags: RedFlag[] = [];
  const prospectText = conversationHistory
    .filter((t) => t.role === 'prospect')
    .map((t) => t.content)
    .join(' ')
    .toLowerCase();

  // Competitor already chosen
  if (/\b(already\s+)?chose|selected|picked|contracted|engaged\s+with\b/.test(prospectText)) {
    if (
      /\b(competitor|vendor|alternative|other\s+company|another\s+vendor|specific\s+solution)\b/.test(
        prospectText
      )
    ) {
      flags.push({
        type: 'competitor_selected',
        severity: 'high',
        description: 'Prospect has already selected a competitor or alternative solution',
      });
    }
  }

  // No budget signal
  const hasBudgetSignal = /\b(budget|afford|cost|pricing|price|$\d+|thousand|million)\b/.test(
    prospectText
  );
  if (!hasBudgetSignal && conversationHistory.filter((t) => t.role === 'prospect').length > 3) {
    flags.push({
      type: 'no_budget_signal',
      severity: 'medium',
      description: 'No budget discussion after multiple turns — may indicate lack of commitment',
    });
  }

  // No stakeholder map
  if (stakeholderSignals.length === 0 && conversationHistory.length > 5) {
    flags.push({
      type: 'no_stakeholder_map',
      severity: 'medium',
      description: 'No stakeholder roles detected after extended conversation',
    });
  }

  // Very weak archetype confidence
  if (archetypeScores.length > 0) {
    const topConfidence = Math.max(...archetypeScores.map((a) => a.confidence));
    if (topConfidence < 0.4) {
      flags.push({
        type: 'weak_archetype_fit',
        severity: 'medium',
        description: 'Low archetype confidence — may indicate poor fit or unclear situation',
      });
    }
  }

  // Decision maker not identified
  const hasEconomicBuyer = stakeholderSignals.some((s) => s.role === 'economic_buyer');
  if (!hasEconomicBuyer && conversationHistory.length > 7) {
    flags.push({
      type: 'no_economic_buyer',
      severity: 'medium',
      description: 'No economic buyer detected — may be a blocking issue',
    });
  }

  // Very vague timeline after many turns
  const timeline = detectDecisionTimeline(conversationHistory);
  if (timeline.status === 'none' && conversationHistory.length > 8) {
    flags.push({
      type: 'no_timeline',
      severity: 'medium',
      description: 'No timeline mentioned after extensive conversation',
    });
  }

  // Price out of range (too low or too high signals)
  const priceSignals = prospectText.match(/\$\d+|thousand|million|\d+k|\d+m/gi);
  if (priceSignals) {
    // Very rough heuristic — actual implementation would need more nuance
    const hasExtremePrice =
      prospectText.includes('under $5k') ||
      prospectText.includes('more than $1 million') ||
      prospectText.includes('$500k') ||
      prospectText.includes('$500,000');
    if (hasExtremePrice) {
      flags.push({
        type: 'price_out_of_range',
        severity: 'low',
        description: 'Mentioned price appears outside typical range ($10k-$200k AUD)',
      });
    }
  }

  return flags;
}

// ============================================================================
// Coach Detection
// ============================================================================

export function detectCoachPresence(stakeholderSignals: StakeholderSignal[]): {
  present: boolean;
  confidence: number;
  evidence: string[];
} {
  const coachSignals = stakeholderSignals.filter((s) => s.role === 'coach');

  if (coachSignals.length === 0) {
    return { present: false, confidence: 0, evidence: [] };
  }

  const avgConfidence =
    coachSignals.reduce((sum, s) => sum + s.confidence, 0) / coachSignals.length;
  const allEvidence = coachSignals.flatMap((s) => s.evidence);

  return {
    present: avgConfidence > 0.5,
    confidence: avgConfidence,
    evidence: [...new Set(allEvidence)].slice(0, 5), // Dedupe, limit to 5
  };
}

// ============================================================================
// Main Scoring Function
// ============================================================================

export function computeQualificationScore(
  decisionTimeline: TimelineSignal,
  coachDetection: ReturnType<typeof detectCoachPresence>,
  stakeholderSignals: StakeholderSignal[],
  valueDrivers: ValueDriverSignal[],
  redFlags: RedFlag[],
  config: ScoringConfig = DEFAULT_CONFIG
): QualificationScore {
  // Start with base score
  let score = 50;

  // Decision timeline contribution
  const timelineWeight = config.weights.decisionTimeline;
  if (decisionTimeline.status === 'explicit') {
    score += timelineWeight + config.timelineExplicitBonus;
  } else if (decisionTimeline.status === 'vague') {
    score += timelineWeight * 0.5 + config.timelineVaguePenalty;
  }
  // 'none' gets 0 contribution

  // Coach detection contribution
  const coachWeight = config.weights.coachDetection;
  if (coachDetection.present) {
    score += coachWeight * coachDetection.confidence + config.coachBonus;
  }

  // Stakeholder map contribution
  const stakeholderWeight = config.weights.stakeholderMap;
  const uniqueRoles = new Set(stakeholderSignals.map((s) => s.role)).size;
  const stakeholderScore = (uniqueRoles / 4) * stakeholderWeight; // 4 is max roles
  score += stakeholderScore + config.strongStakeholderMapBonus * (uniqueRoles >= 3 ? 1 : 0);

  // Value driver contribution
  const valueDriverWeight = config.weights.valueDrivers;
  const driverScore = Math.min(valueDrivers.length, 3) / 3 * valueDriverWeight;
  score += driverScore + config.valueDriverBonus * (valueDrivers.length >= 2 ? 1 : 0);

  // Red flag penalties
  let totalPenalty = 0;
  for (const flag of redFlags) {
    const penalty = config.redFlagPenalty[flag.severity] || 0;
    totalPenalty += Math.abs(penalty);
  }
  score -= Math.min(totalPenalty, 40); // Cap at -40

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine overall status
  let overall: QualificationStatus;
  if (score >= 70) {
    overall = 'green';
  } else if (score >= 40) {
    overall = 'amber';
  } else {
    overall = 'red';
  }

  return {
    overall,
    decisionTimeline: {
      status: decisionTimeline.status,
      value: decisionTimeline.value,
      confidence: decisionTimeline.confidence,
    },
    coachDetected: coachDetection,
    redFlags,
    compositeScore: Math.round(score),
  };
}

/**
 * Full qualification score computation from session data
 */
export function computeFullQualificationScore(
  conversationHistory: ConversationTurn[],
  stakeholderSignals: StakeholderSignal[],
  valueDrivers: ValueDriverSignal[],
  archetypeScores: { archetype: string; confidence: number }[],
  config: ScoringConfig = DEFAULT_CONFIG
): QualificationScore {
  const timeline = detectDecisionTimeline(conversationHistory);
  const coach = detectCoachPresence(stakeholderSignals);
  const redFlags = detectRedFlags(conversationHistory, stakeholderSignals, archetypeScores);

  return computeQualificationScore(timeline, coach, stakeholderSignals, valueDrivers, redFlags, config);
}

// ============================================================================
// Score Interpretation
// ============================================================================

export interface ScoreInterpretation {
  status: QualificationStatus;
  headline: string;
  keyStrengths: string[];
  keyConcerns: string[];
  recommendedActions: string[];
}

export function interpretScore(score: QualificationScore): ScoreInterpretation {
  const concerns: string[] = [];
  const strengths: string[] = [];
  const actions: string[] = [];

  // Analyze decision timeline
  if (score.decisionTimeline.status === 'explicit') {
    strengths.push(`Clear timeline: "${score.decisionTimeline.value}"`);
  } else if (score.decisionTimeline.status === 'vague') {
    concerns.push('Timeline is vague — need to establish urgency');
    actions.push('Ask about specific deadlines or milestones');
  } else {
    concerns.push('No timeline established yet');
    actions.push('Probe for decision timeline or project start date');
  }

  // Analyze coach
  if (score.coachDetected.present) {
    strengths.push('Coach/champion detected internally');
    actions.push('Leverage coach to navigate internal process');
  } else {
    concerns.push('No internal champion detected');
    actions.push('Identify or cultivate a coach within the organization');
  }

  // Analyze stakeholders
  const hasNoEconomicBuyer = score.redFlags.some((f) => f.type === 'no_economic_buyer');
  if (hasNoEconomicBuyer) {
    concerns.push('Missing economic buyer');
  }

  // Analyze red flags
  for (const flag of score.redFlags) {
    if (flag.severity === 'high') {
      concerns.push(flag.description);
    }
  }

  // Generate headline
  let headline: string;
  if (score.overall === 'green') {
    if (score.coachDetected.present && score.decisionTimeline.status === 'explicit') {
      headline = 'Strong qualification — high confidence close';
    } else {
      headline = 'Good qualification — proceed with engagement';
    }
  } else if (score.overall === 'amber') {
    headline = 'Partial qualification — address gaps';
  } else {
    headline = 'Weak qualification — re-evaluate or refer';
  }

  return {
    status: score.overall,
    headline,
    keyStrengths: strengths,
    keyConcerns: concerns,
    recommendedActions: actions,
  };
}