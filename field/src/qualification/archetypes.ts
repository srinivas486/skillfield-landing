/**
 * Field - Archetype Mapper
 * Maps prospect situations to the 5 engagement archetypes
 */

import { Archetype, ArchetypeScore, ConversationTurn, StakeholderSignal, ValueDriverSignal } from '../types/index.js';

// ============================================================================
// Archetype Definitions
// ============================================================================

interface ArchetypeDefinition {
  id: Archetype;
  name: string;
  description: string;
  keySignals: string[];
  antiSignals: string[];
  typicalPainPoints: string[];
}

export const ARCHETYPE_DEFINITIONS: Record<Archetype, ArchetypeDefinition> = {
  security_posture_assessment: {
    id: 'security_posture_assessment',
    name: 'Security Posture Assessment',
    description:
      'Organization wants to understand their current security posture, identify gaps, and prioritize improvements. Often triggered by a recent incident, audit finding, or board directive.',
    keySignals: [
      'security posture',
      'gap assessment',
      'audit',
      'risk assessment',
      'maturity model',
      'baseline',
      'current state',
      'where are we',
      'understand our security',
      'evaluation',
      'review',
    ],
    antiSignals: ['already have siem', 'already working with mdr', 'need implementation'],
    typicalPainPoints: [
      'Don\'t know where they stand',
      'Recent audit revealed gaps',
      'Board asking for security report',
      'Compliance requirements increasing',
    ],
  },
  data_platform_build: {
    id: 'data_platform_build',
    name: 'Data Platform Build',
    description:
      'Organization is building or modernizing their data infrastructure. Could be cloud migration, data lake implementation, or unified data platform for analytics and AI.',
    keySignals: [
      'data platform',
      'data lake',
      'data warehouse',
      'cloud migration',
      'modernize',
      'unified data',
      'analytics',
      'bi',
      'data infrastructure',
      'data governance',
      'data quality',
    ],
    antiSignals: ['need security monitoring', 'compliance urgent'],
    typicalPainPoints: [
      'Siloed data across departments',
      'Can\'t get a single view of operations',
      'Planning AI/ML initiatives but data isn\'t ready',
      'Cloud migration complexity',
    ],
  },
  ai_platform_build: {
    id: 'ai_platform_build',
    name: 'AI Platform Build',
    description:
      'Organization is developing AI capabilities — either building AI products, implementing AI-driven processes, or establishing an AI center of excellence.',
    keySignals: [
      'ai platform',
      'machine learning',
      'ml platform',
      'llm',
      'ai strategy',
      'ai capability',
      'ai roadmap',
      'generative ai',
      'ai center of excellence',
      'ai initiative',
      'ai transformation',
      'ai ops',
    ],
    antiSignals: ['data security', 'compliance focused', 'not thinking about ai'],
    typicalPainPoints: [
      'Want to implement AI but unsure where to start',
      'Building ML platform for the first time',
      'Need to scale AI experiments to production',
      'Looking for AI governance framework',
    ],
  },
  siem: {
    id: 'siem',
    name: 'SIEM (Security Information and Event Management)',
    description:
      'Organization needs a SIEM solution for security monitoring, threat detection, and compliance logging. Often driven by compliance requirements or security team expansion.',
    keySignals: [
      'siem',
      'security monitoring',
      'log management',
      'log analysis',
      'threat detection',
      'security operations',
      'soc',
      'security events',
      'splunk',
      'microsoft sentinel',
      'qradar',
      'log correlation',
    ],
    antiSignals: ['data platform', 'ai platform', 'cloud migration'],
    typicalPainPoints: [
      'Growing security team, need better visibility',
      'Compliance requires log retention and analysis',
      'Current manual processes don\'t scale',
      'Too many alerts, can\'t keep up',
    ],
  },
  mdr: {
    id: 'mdr',
    name: 'MDR (Managed Detection and Response)',
    description:
      'Organization needs managed security services — 24/7 monitoring, threat response, and security expertise without building an in-house SOC.',
    keySignals: [
      'mdr',
      'managed detection',
      'managed security',
      '24/7 monitoring',
      'threat response',
      'security operations',
      'soc',
      ' outsourced security',
      'security team',
      'detection and response',
      'continuous monitoring',
    ],
    antiSignals: ['already have mdr', 'want to build in-house siem'],
    typicalPainPoints: [
      'Don\'t have 24/7 security coverage',
      'Security team too small to monitor around the clock',
      'Too many alerts, need help triaging',
      'Want expert response without building team',
    ],
  },
};

// ============================================================================
// Scoring Keywords and Weights
// ============================================================================

interface SignalCategory {
  keywords: string[];
  weight: number;
  archetype: Archetype;
}

// Keywords mapped to archetypes with weights
const SIGNAL_MAP: SignalCategory[] = [
  // Security Posture Assessment
  {
    archetype: 'security_posture_assessment',
    weight: 0.9,
    keywords: [
      'security posture',
      'risk assessment',
      'gap assessment',
      'audit findings',
      'maturity model',
      'baseline security',
      'security review',
      'current security state',
      'where we stand',
      'security evaluation',
      'compliance assessment',
      'security audit',
    ],
  },
  // Data Platform Build
  {
    archetype: 'data_platform_build',
    weight: 0.9,
    keywords: [
      'data platform',
      'data lake',
      'data warehouse',
      'cloud migration',
      'data infrastructure',
      'modernize data',
      'unified data',
      'analytics platform',
      'bi platform',
      'data governance',
      'data quality',
      'master data',
      'etl',
      'data integration',
    ],
  },
  // AI Platform Build
  {
    archetype: 'ai_platform_build',
    weight: 0.9,
    keywords: [
      'ai platform',
      'machine learning',
      'ml platform',
      'ml ops',
      'ai ops',
      'ai roadmap',
      'ai strategy',
      'ai capability',
      'center of excellence',
      'generative ai',
      'llm',
      'natural language',
      'computer vision',
      'predictive analytics',
      'ai initiative',
      'ai transformation',
    ],
  },
  // SIEM
  {
    archetype: 'siem',
    weight: 0.85,
    keywords: [
      'siem',
      'security information',
      'event management',
      'log management',
      'log analysis',
      'splunk',
      'sentinel',
      'qradar',
      'arcsight',
      'security monitoring',
      'threat detection',
      'security operations',
      'soc',
      'correlation rules',
      'siem solution',
      'security events',
    ],
  },
  // MDR
  {
    archetype: 'mdr',
    weight: 0.85,
    keywords: [
      'managed detection',
      'managed security',
      'mdr',
      '24/7 monitoring',
      'security operations',
      'outsourced soc',
      'soc as a service',
      'threat response',
      'detection and response',
      'continuous monitoring',
      'managed threat',
      'security team',
      'security expertise',
      'security coverage',
    ],
  },
];

// Additional context signals (lower weight but important)
const CONTEXT_SIGNALS: { archetype: Archetype; keywords: string[]; weight: number }[] = [
  {
    archetype: 'security_posture_assessment',
    keywords: ['board', 'executive', 'compliance', 'audit', 'ciso', 'risk', 'governance'],
    weight: 0.3,
  },
  {
    archetype: 'data_platform_build',
    keywords: ['cloud', 'aws', 'azure', 'gcp', 'snowflake', 'databricks', 'pipeline', 'engineering'],
    weight: 0.3,
  },
  {
    archetype: 'ai_platform_build',
    keywords: ['python', 'jupyter', 'model training', 'feature store', 'experiment tracking'],
    weight: 0.3,
  },
  {
    archetype: 'siem',
    keywords: ['logs', 'events', 'alerts', 'correlation', 'detection', 'siem', 'soc analyst'],
    weight: 0.3,
  },
  {
    archetype: 'mdr',
    keywords: ['coverage', 'availability', '24x7', 'response time', 'sla', 'analyst'],
    weight: 0.3,
  },
];

// ============================================================================
// Archetype Scoring Functions
// ============================================================================

export interface ArchetypeAnalysis {
  scores: ArchetypeScore[];
  selectedArchetype: Archetype | null;
  reasoning: string;
}

/**
 * Score all archetypes based on conversation context
 */
export function scoreArchetypes(
  conversationHistory: ConversationTurn[],
  stakeholderSignals: StakeholderSignal[],
  valueDrivers: ValueDriverSignal[]
): ArchetypeScore[] {
  const prospectText = conversationHistory
    .filter((t) => t.role === 'prospect')
    .map((t) => t.content)
    .join(' ')
    .toLowerCase();

  const scores: Map<Archetype, { score: number; signals: string[]; reasoning: string[] }> = new Map();

  // Initialize all archetypes
  for (const archetype of Object.keys(ARCHETYPE_DEFINITIONS) as Archetype[]) {
    scores.set(archetype, { score: 0, signals: [], reasoning: [] });
  }

  // Score primary signals
  for (const category of SIGNAL_MAP) {
    for (const keyword of category.keywords) {
      if (prospectText.includes(keyword.toLowerCase())) {
        const current = scores.get(category.archetype)!;
        current.score += category.weight;
        current.signals.push(keyword);
      }
    }
  }

  // Score context signals
  for (const context of CONTEXT_SIGNALS) {
    for (const keyword of context.keywords) {
      if (prospectText.includes(keyword.toLowerCase())) {
        const current = scores.get(context.archetype)!;
        current.score += context.weight;
        current.signals.push(keyword);
      }
    }
  }

  // Factor in value drivers
  for (const driver of valueDrivers) {
    if (driver.type === 'risk_reduction') {
      // Risk reduction strongly correlates with security posture and SIEM/MDR
      const spa = scores.get('security_posture_assessment')!;
      spa.score += 0.3 * driver.confidence;
      const siem = scores.get('siem')!;
      siem.score += 0.2 * driver.confidence;
      const mdr = scores.get('mdr')!;
      mdr.score += 0.2 * driver.confidence;
    }
  }

  // Factor in stakeholder signals
  for (const stakeholder of stakeholderSignals) {
    if (stakeholder.role === 'technical_buyer') {
      // Technical buyers often discuss implementation, which maps to SIEM/AI/Data platforms
      const siem = scores.get('siem')!;
      siem.score += 0.2;
      const ai = scores.get('ai_platform_build')!;
      ai.score += 0.15;
      const data = scores.get('data_platform_build')!;
      data.score += 0.15;
    }
    if (stakeholder.role === 'economic_buyer') {
      // Economic buyers focus on risk/cost — security posture, MDR
      const spa = scores.get('security_posture_assessment')!;
      spa.score += 0.2;
      const mdr = scores.get('mdr')!;
      mdr.score += 0.15;
    }
  }

  // Normalize scores and build results
  const maxScore = Math.max(...Array.from(scores.values()).map((s) => s.score));

  return Array.from(scores.entries()).map(([archetype, data]) => {
    const definition = ARCHETYPE_DEFINITIONS[archetype];
    const normalizedScore = maxScore > 0 ? data.score / maxScore : 0;

    // Generate reasoning
    const reasoningParts: string[] = [];
    if (data.signals.length > 0) {
      reasoningParts.push(
        `Matched on: ${data.signals.slice(0, 3).join(', ')}${data.signals.length > 3 ? ` and ${data.signals.length - 3} more` : ''}`
      );
    }
    reasoningParts.push(definition.description);

    return {
      archetype,
      confidence: Math.min(1, normalizedScore),
      reasoning: reasoningParts.join('. '),
      signals: data.signals,
    };
  });
}

/**
 * Rank archetypes by confidence and select the top one
 */
export function rankArchetypes(scores: ArchetypeScore[]): ArchetypeAnalysis {
  // Sort by confidence descending
  const ranked = [...scores].sort((a, b) => b.confidence - a.confidence);

  // Select top archetype if confidence is above threshold
  const threshold = 0.3;
  const topScore = ranked[0];
  const selectedArchetype =
    ranked.length > 0 && topScore && topScore.confidence >= threshold ? topScore.archetype : null;

  // Generate overall reasoning
  let reasoning: string;
  if (selectedArchetype) {
    const def = ARCHETYPE_DEFINITIONS[selectedArchetype];
    reasoning = `Based on the conversation, this prospect aligns with "${def.name}". ${def.description}`;
  } else {
    reasoning =
      'The conversation does not clearly map to a single archetype. More qualification needed to determine the best fit.';
  }

  return {
    scores: ranked,
    selectedArchetype,
    reasoning,
  };
}

/**
 * Map conversation to archetype
 * Main entry point for archetype mapping
 */
export function mapArchetype(
  conversationHistory: ConversationTurn[],
  stakeholderSignals: StakeholderSignal[],
  valueDrivers: ValueDriverSignal[]
): ArchetypeAnalysis {
  const scores = scoreArchetypes(conversationHistory, stakeholderSignals, valueDrivers);
  return rankArchetypes(scores);
}

/**
 * Get archetype definition by ID
 */
export function getArchetypeDefinition(archetype: Archetype): ArchetypeDefinition {
  return ARCHETYPE_DEFINITIONS[archetype];
}

/**
 * Format archetype for display
 */
export function formatArchetype(archetype: Archetype): string {
  return ARCHETYPE_DEFINITIONS[archetype].name;
}

/**
 * Check if archetype selection changed
 */
export function didArchetypeChange(
  previousArchetype: Archetype | undefined,
  newArchetype: Archetype | null
): boolean {
  if (!previousArchetype && !newArchetype) return false;
  if (!previousArchetype || !newArchetype) return true;
  return previousArchetype !== newArchetype;
}

/**
 * Get archetype confidence band
 */
export function getConfidenceBand(
  confidence: number
): 'high' | 'medium' | 'low' | 'unclear' {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.5) return 'medium';
  if (confidence >= 0.3) return 'low';
  return 'unclear';
}

/**
 * Generate archetype comparison for prompt context
 */
export function generateArchetypeComparison(scores: ArchetypeScore[]): string {
  const lines: string[] = ['=== ARCHETYPE ANALYSIS ===', ''];

  for (const score of scores) {
    const def = ARCHETYPE_DEFINITIONS[score.archetype];
    const band = getConfidenceBand(score.confidence);
    const pct = (score.confidence * 100).toFixed(0);

    lines.push(`[${band.toUpperCase()}] ${def.name} (${pct}% confidence)`);
    lines.push(`  ${score.reasoning}`);
    if (score.signals.length > 0) {
      lines.push(`  Key signals: ${score.signals.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}