/**
 * Field - Miller Heiman Qualification Engine
 * Stakeholder role classification and value driver detection
 */

import {
  StakeholderRole,
  StakeholderSignal,
  ValueDriverType,
  ValueDriverSignal,
  ConversationTurn,
} from '../types/index.js';

// ============================================================================
// Stakeholder Role Detection
// ============================================================================

interface RolePattern {
  role: StakeholderRole;
  patterns: RegExp[];
  weight: number;
}

const STAKEHOLDER_PATTERNS: RolePattern[] = [
  {
    role: 'economic_buyer',
    patterns: [
      /i('ll| will)\s+(need\s+to\s+)?(sign\s+off|approve|authorize|decide)/i,
      /budget\s+(is\s+)?(approved|available|allocated|set\s+aside)/i,
      /i('ll| will)\s+(be\s+)?(the\s+)?(sign|final)\s+(off|approval)/i,
      /we\s+have\s+([$\d,]+|budget)\s+(available|approved|for\s+this)/i,
      /cost\s+(is\s+)?(approved|within\s+budget)/i,
      /i('m| am)\s+(the\s+)?(budget\s+)?(owner|holder|decision[- ]maker)/i,
      /need\s+to\s+(get\s+)?(buy[- ]?in|approval)\s+from\s+(me|management)/i,
      /i('ll| will)\s+(take\s+)?(this\s+)?(to|before)\s+(leadership|management|exec)/i,
    ],
    weight: 1.0,
  },
  {
    role: 'user_buyer',
    patterns: [
      /we('ve| have| had)\s+been\s+(struggling|having\s+issues|working\s+with)/i,
      /our\s+(team|people|staff|users)\s+(need|want|require)/i,
      /people\s+(on\s+the\s+)?ground\s+(need|want|will\s+use)/i,
      /i('m| am)\s+(the\s+)?(end[- ]?user|direct\s+user)/i,
      /this\s+will\s+(help|affect|impact)\s+(our\s+)?(team|dept|people)/i,
      /the\s+(users|team|people)\s+(here|internally)\s+(will|would)\s+benefit/i,
      /we\s+(need|want)\s+something\s+(to\s+)?(help|fix|solve)/i,
      /it('s| is)\s+(hard|difficult|tough)\s+(for\s+)?(us|me|our\s+team)/i,
      /our\s+(current|existing)\s+(process|system|solution)\s+(is\s+)?(broken|not\s+working)/i,
    ],
    weight: 1.0,
  },
  {
    role: 'technical_buyer',
    patterns: [
      /need\s+to\s+(go\s+through|get)\s+(security\s+review|compliance|approval\s+process)/i,
      /our\s+(it|security|tech)\s+(team|dept|department)\s+(will|needs?\s+to|has\s+to)/i,
      /vendor\s+(approval|assessment|review|evaluation)/i,
      /rfi|rfp|rfq|security\s+questionnaire|due\s+diligence/i,
      /it\s+(security|compliance|governance)\s+(policy|requirements|process)/i,
      /procurement\s+(process|requirements|approval)/i,
      /data\s+(security|privacy|compliance)\s+(requirements|needs)/i,
      /technical\s+(evaluation|assessment|review|architecture)/i,
      /security\s+(posture|audit|assessment|review)/i,
      /we('ll| will)\s+(need\s+to\s+)?(vet|evaluate|assess)\s+(this|vendor|solution)/i,
    ],
    weight: 1.0,
  },
  {
    role: 'coach',
    patterns: [
      /i('ve| have)\s+been\s+(trying|working)\s+to\s+(get|implement|approve)/i,
      /i\s+really\s+(think|believe|feel)\s+(this|it|we)\s+(could|would)\s+help/i,
      /i('ve| have)\s+been\s+(advocating|pushing|championing)\s+for/i,
      /we\s+need\s+this\s+(because|to|for)/i,
      /i\s+(can|will)\s+(help|push|advocate)\s+(for|with)/i,
      /i('m| am)\s+(on\s+your\s+)?(side|team|behalf)/i,
      /let\s+me\s+(help|try)\s+(to\s+)?(sell|push|get)\s+(this|in)/i,
      /internal\s+(buy[- ]?in|stakeholder|support|commitment)/i,
      /i\s+(know|think)\s+we\s+can\s+(get|make)\s+this\s+(happen|work)/i,
      /the\s+(challenge|problem|issue)\s+(here|we\s+have)\s+(is|around)/i,
    ],
    weight: 1.2, // Coach signals are weighted higher as they're more valuable
  },
];

/**
 * Detect stakeholder roles from conversation text
 */
export function detectStakeholderRoles(
  text: string,
  existingSignals: StakeholderSignal[] = []
): StakeholderSignal[] {
  const signals: StakeholderSignal[] = [...existingSignals];
  void text; // text is used for pattern matching below

  for (const rolePattern of STAKEHOLDER_PATTERNS) {
    for (const pattern of rolePattern.patterns) {
      const match = text.match(pattern);
      if (match) {
        // Check if we already have a signal for this role
        const existingIndex = signals.findIndex((s) => s.role === rolePattern.role);

        if (existingIndex >= 0) {
          // Update existing signal
          const existingSignal = signals[existingIndex];
          if (existingSignal) {
            existingSignal.confidence = Math.min(
              1,
              existingSignal.confidence + 0.15 * rolePattern.weight
            );
            existingSignal.evidence.push(match[0]);
            existingSignal.detectedAt = new Date();
          }
        } else {
          // Add new signal
          signals.push({
            role: rolePattern.role,
            confidence: 0.5 * rolePattern.weight,
            evidence: [match[0]],
            detectedAt: new Date(),
          });
        }
        break; // Only count first match per pattern group
      }
    }
  }

  // Normalize confidences
  return signals.map((s) => ({
    ...s,
    confidence: Math.min(1, s.confidence),
  }));
}

/**
 * Classify stakeholder from conversation context
 * Returns a summary of detected stakeholders
 */
export function classifyStakeholders(signals: StakeholderSignal[]): {
  detected: StakeholderRole[];
  primaryBuyer: StakeholderRole | null;
  hasCoach: boolean;
  confidence: number;
} {
  const detected = signals.map((s) => s.role);

  // Find primary economic buyer (highest confidence)
  const economicBuyers = signals.filter((s) => s.role === 'economic_buyer');
  const primaryBuyer =
    economicBuyers.length > 0
      ? economicBuyers.reduce((a, b) => (a.confidence > b.confidence ? a : b)).role
      : null;

  // Check for coach
  const hasCoach = signals.some((s) => s.role === 'coach' && s.confidence > 0.5);

  // Overall confidence based on signal strength
  const avgConfidence =
    signals.length > 0
      ? signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length
      : 0;

  return {
    detected,
    primaryBuyer,
    hasCoach,
    confidence: avgConfidence,
  };
}

// ============================================================================
// Value Driver Detection
// ============================================================================

interface ValueDriverPattern {
  type: ValueDriverType;
  patterns: RegExp[];
  synonyms: string[];
}

const VALUE_DRIVER_PATTERNS: ValueDriverPattern[] = [
  {
    type: 'risk_reduction',
    patterns: [
      /security\s+(breach|incident|attack|threat|vulnerability|risk)/i,
      /compliance\s+(requirement|issue|audit|failure|gap)/i,
      /data\s+(breach|leak|exposure|theft|loss)/i,
      /cyber\s+(risk|threat|attack|incident)/i,
      /risk\s+(of|to|from)\s+(security|cyber|data|compliance)/i,
      /exposure\s+(to|in)\s+(risk|threat|attack|breach)/i,
      /vulnerability\s+(management|assessment|scan|patch)/i,
      /incident\s+(response|management|recovery)/i,
      /business\s+(continuity|disruption|resilience)/i,
      /regulatory\s+(requirement|compliance|penalty|fine)/i,
    ],
    synonyms: [
      'breach',
      'incident',
      'attack',
      'threat',
      'vulnerability',
      'compliance',
      'audit',
      'exposure',
      'risk',
      'security',
    ],
  },
  {
    type: 'speed',
    patterns: [
      /faster\s+(than|then|our)/i,
      /quick(er|ly)?\s+(than|to|with)/i,
      /accelerate\s+(our|the)/i,
      /reduce\s+(time|manual|effort)/i,
      /automate[d]?\s+(our|the|process)/i,
      /efficiency\s+(gain|improvement|increase)/i,
      /speed\s+(up|of|to|our)/i,
      /faster\s+(delivery|implementation|results?|turnaround)/i,
      /time\s+(to\s+)?(market|value|productivity)/i,
      /productivity\s+(gain|increase|improvement)/i,
      /streamline\s+(our|the)/i,
    ],
    synonyms: [
      'faster',
      'quicker',
      'automate',
      'efficiency',
      'speed',
      'accelerate',
      'reduce manual',
      'streamline',
    ],
  },
  {
    type: 'cost_certainty',
    patterns: [
      /predictable\s+(cost|price|pricing|expense)/i,
      /fixed\s+(cost|price|fee|pricing)/i,
      /budget\s+(certainty|clarity|predictability)/i,
      /roi\s+(analysis|calculation|improvement)/i,
      /cost\s+(of\s+)?(doing\s+)?nothing?|cost\s+delay/i,
      /total\s+(cost|price)\s+(of\s+)?ownership/i,
      /reduce\s+(cost|expense|spend)/i,
      /cost\s+(saving|reduction|optimization|efficiency)/i,
      /business\s+case\s+(for|to|that)/i,
      /justify\s+(cost|expense|investment|spend)/i,
      /afford(able)?\s+(solution|option|price)/i,
    ],
    synonyms: [
      'predictable cost',
      'fixed price',
      'budget',
      'ROI',
      'cost savings',
      'TCO',
      'cost of doing nothing',
      'justify',
    ],
  },
  {
    type: 'capability_building',
    patterns: [
      /upskill(ing)?\s+(our|the|team)/i,
      /build\s+(internal|in-house)\s+(capability|competency|skill)/i,
      /learn\s+(from|how|skills)/i,
      /knowledge\s+(transfer|development|building)/i,
      /train(ing|ed)?\s+(our|the|team)/i,
      /capability\s+(building|development|improvement)/i,
      /internal\s+(expertise|knowledge|skill|competency)/i,
      /not\s+(just|only)\s+(buying|outsourcing)\s+(but|we)/i,
      /build\s+(vs|versus|vs\.)\s+buy/i,
      /long[- ]?term\s+(capability|sustainability|independence)/i,
      /self[- ]?sufficient\s+(in|with|for)/i,
    ],
    synonyms: [
      'upskill',
      'build capability',
      'internal capability',
      'knowledge transfer',
      'training',
      'build vs buy',
    ],
  },
];

/**
 * Detect value drivers from conversation text
 */
export function detectValueDrivers(
  text: string,
  existingDrivers: ValueDriverSignal[] = []
): ValueDriverSignal[] {
  const drivers: ValueDriverSignal[] = [...existingDrivers];
  const textLower = text.toLowerCase();

  for (const driverPattern of VALUE_DRIVER_PATTERNS) {
    let matched = false;

    // Check patterns
    for (const pattern of driverPattern.patterns) {
      const match = text.match(pattern);
      if (match) {
        const existingIndex = drivers.findIndex((d) => d.type === driverPattern.type);

        if (existingIndex >= 0) {
          const existingDriver = drivers[existingIndex];
          if (existingDriver) {
            existingDriver.confidence = Math.min(1, existingDriver.confidence + 0.2);
            existingDriver.evidence.push(match[0]);
            existingDriver.detectedAt = new Date();
          }
        } else {
          drivers.push({
            type: driverPattern.type,
            confidence: 0.6,
            evidence: [match[0]],
            detectedAt: new Date(),
          });
        }
        matched = true;
        break;
      }
    }

    // Also check synonyms for additional signals
    if (!matched) {
      for (const synonym of driverPattern.synonyms) {
        if (textLower.includes(synonym.toLowerCase())) {
          const existingIndex = drivers.findIndex((d) => d.type === driverPattern.type);

          if (existingIndex >= 0) {
            const existingDriver = drivers[existingIndex];
            if (existingDriver) {
              existingDriver.confidence = Math.min(1, existingDriver.confidence + 0.1);
            }
          } else {
            drivers.push({
              type: driverPattern.type,
              confidence: 0.4,
              evidence: [`Found synonym: ${synonym}`],
              detectedAt: new Date(),
            });
          }
          break;
        }
      }
    }
  }

  return drivers;
}

/**
 * Rank value drivers by confidence
 */
export function rankValueDrivers(drivers: ValueDriverSignal[]): ValueDriverSignal[] {
  return [...drivers].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get primary value driver
 */
export function getPrimaryValueDriver(drivers: ValueDriverSignal[]): ValueDriverSignal | null {
  if (drivers.length === 0) return null;
  const ranked = rankValueDrivers(drivers);
  return ranked[0] ?? null;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract key phrases from conversation for qualification
 */
export function extractKeyPhrases(turn: ConversationTurn): string[] {
  if (turn.role !== 'prospect') return [];

  const phrases: string[] = [];

  // Extract sentences
  const sentences = turn.content.split(/[.!?]+/).filter((s) => s.trim().length > 10);

  for (const sentence of sentences.slice(0, 3)) {
    // Take first 3 meaningful sentences
    const cleaned = sentence.trim();
    if (cleaned.length > 20) {
      phrases.push(cleaned);
    }
  }

  return phrases;
}

/**
 * Check if conversation contains disqualifying signals
 */
export function containsDisqualifyingSignals(text: string): {
  isDisqualifying: boolean;
  reason: string | null;
} {
  const lowerText = text.toLowerCase();

  // Already chose a competitor
  if (/\b(already\s+)?chose|selected|picked|contracted\s+with\b/.test(lowerText)) {
    if (/\b(competitor|vendor|alternative|other\s+company|another\s+vendor)\b/.test(lowerText)) {
      return { isDisqualifying: true, reason: 'Prospect has already selected a competitor' };
    }
  }

  // No budget
  if (/no\s+budget|can('t| not)\s+afford|budget\s+cuts?|frozen\s+budget/.test(lowerText)) {
    return { isDisqualifying: true, reason: 'No budget available' };
  }

  // Wrong company size
  if (/too\s+small|too\s+large|not\s+the\s+right\s+fit|don('t| not)\s+need\s+this/.test(lowerText)) {
    return { isDisqualifying: true, reason: 'Company not a fit for our services' };
  }

  // Timeline too far
  if (/not\s+(in\s+)?(the\s+)?(near|foreseeable)\s+(future|term)|maybe\s+next\s+year|sometime\s+later/.test(lowerText)) {
    return { isDisqualifying: true, reason: 'Decision timeline too far out' };
  }

  return { isDisqualifying: false, reason: null };
}

/**
 * Detect human handoff request
 */
export function detectHumanHandoffRequest(text: string): boolean {
  const patterns = [
    /talk\s+to\s+a?\s+human/i,
    /speak\s+to\s+(a|someone|real)\s+(person|human|agent)/i,
    /let\s+me\s+(speak|talk)\s+to\s+(someone|someone\s+else)/i,
    /prefer\s+(to\s+)?(talk|speak)\s+to\s+a?\s+person/i,
    /want\s+to\s+(talk|speak)\s+(to|with)\s+(a|an)?\s*human/i,
    /real\s+person|actual\s+human/i,
    /customer\s+service|support\s+(rep|team|agent)/i,
    /i\s+(want|need)\s+to\s+(talk|speak)\s+to\s+(a|someone)/i,
    /can\s+i\s+(talk|speak)\s+to\s+(a|an)\s*(human|person|agent)/i,
  ];

  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Detect off-topic conversation
 */
export function isOffTopic(text: string): boolean {
  const onTopicKeywords = [
    'security',
    'cyber',
    'data',
    'ai',
    'compliance',
    'risk',
    'audit',
    'protection',
    'breach',
    'threat',
    'vulnerability',
    'platform',
    'siem',
    'mdr',
    'cloud',
    'infrastructure',
    'cloud',
    'software',
    'vendor',
    'solution',
    'consulting',
    'service',
  ];

  const lowerText = text.toLowerCase();
  const wordCount = lowerText.split(/\s+/).length;

  // Check for any on-topic keyword
  const hasOnTopic = onTopicKeywords.some((keyword) => lowerText.includes(keyword));

  // If no on-topic keywords and text is long enough, likely off-topic
  if (!hasOnTopic && wordCount > 20) {
    return true;
  }

  // Check for clearly off-topic phrases
  const offTopicPhrases = [
    'what is the weather',
    'play a game',
    'tell me a joke',
    'who is the president',
    'what time is it',
    'how old are you',
    'what is your name',
    'where are you located',
  ];

  return offTopicPhrases.some((phrase) => lowerText.includes(phrase));
}

/**
 * Format stakeholder summary for prompts
 */
export function formatStakeholderSummary(signals: StakeholderSignal[]): string {
  if (signals.length === 0) {
    return 'No stakeholders detected yet.';
  }

  const lines: string[] = [];
  const sorted = [...signals].sort((a, b) => b.confidence - a.confidence);

  for (const signal of sorted) {
    const confidencePct = (signal.confidence * 100).toFixed(0);
    const topEvidence = signal.evidence[0] || '';
    lines.push(`- ${signal.role.replace('_', ' ')}: ${confidencePct}% confidence (e.g., "${topEvidence}")`);
  }

  return lines.join('\n');
}

/**
 * Format value driver summary for prompts
 */
export function formatValueDriverSummary(drivers: ValueDriverSignal[]): string {
  if (drivers.length === 0) {
    return 'No value drivers detected yet.';
  }

  const lines: string[] = [];
  const sorted = [...drivers].sort((a, b) => b.confidence - a.confidence);

  for (const driver of sorted) {
    const confidencePct = (driver.confidence * 100).toFixed(0);
    lines.push(`- ${driver.type.replace('_', ' ')}: ${confidencePct}% confidence`);
  }

  return lines.join('\n');
}