/**
 * Field - Qualification Tests
 * Tests for Miller Heiman engine and scoring
 */

import { describe, it, expect } from '@jest/globals';
import {
  detectStakeholderRoles,
  detectValueDrivers,
  detectHumanHandoffRequest,
  isOffTopic,
  classifyStakeholders,
} from '../src/qualification/millerHeiman.js';
import {
  computeFullQualificationScore,
  detectDecisionTimeline,
  detectRedFlags,
  interpretScore,
} from '../src/qualification/scoring.js';
import { StakeholderSignal, ValueDriverSignal, ConversationTurn } from '../src/types/index.js';

// ============================================================================
// Miller Heiman Tests
// ============================================================================

describe('Stakeholder Detection', () => {
  it('should detect economic buyer signals', () => {
    const text = "I'll need to sign off on this purchase and we have budget approved for it.";
    const signals = detectStakeholderRoles(text);

    expect(signals.some((s) => s.role === 'economic_buyer')).toBe(true);
    const eb = signals.find((s) => s.role === 'economic_buyer');
    expect(eb!.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('should detect user buyer signals', () => {
    const text = "We've been struggling with our current security tools. The team needs something that actually works.";
    const signals = detectStakeholderRoles(text);

    expect(signals.some((s) => s.role === 'user_buyer')).toBe(true);
  });

  it('should detect technical buyer signals', () => {
    const text = "Our IT security team will need to review this and we'll have to go through a security assessment.";
    const signals = detectStakeholderRoles(text);

    expect(signals.some((s) => s.role === 'technical_buyer')).toBe(true);
  });

  it('should detect coach signals', () => {
    const text = "I've been trying to get this approved for months. I really think this could help us.";
    const signals = detectStakeholderRoles(text);

    expect(signals.some((s) => s.role === 'coach')).toBe(true);
    const coach = signals.find((s) => s.role === 'coach');
    expect(coach!.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('should accumulate confidence with multiple signals', () => {
    const text = "I'll need to sign off and I really think this could help us.";
    const signals = detectStakeholderRoles(text);

    const eb = signals.find((s) => s.role === 'economic_buyer');
    const coach = signals.find((s) => s.role === 'coach');

    expect(eb).toBeDefined();
    expect(coach).toBeDefined();
    expect(eb!.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('should not duplicate signals if role already exists', () => {
    const existingSignals: StakeholderSignal[] = [
      {
        role: 'economic_buyer',
        confidence: 0.7,
        evidence: ['budget approved'],
        detectedAt: new Date(),
      },
    ];

    const text = "I need to sign off on this.";
    const signals = detectStakeholderRoles(text, existingSignals);

    const eb = signals.find((s) => s.role === 'economic_buyer');
    expect(eb!.evidence.length).toBeGreaterThanOrEqual(1);
    expect(eb!.confidence).toBeGreaterThanOrEqual(0.7);
  });
});

describe('Value Driver Detection', () => {
  it('should detect risk reduction signals', () => {
    const text = "We're worried about security breaches and compliance audits. We need to reduce our exposure.";
    const drivers = detectValueDrivers(text);

    const risk = drivers.find((d) => d.type === 'risk_reduction');
    expect(risk).toBeDefined();
    expect(risk!.confidence).toBeGreaterThan(0.5);
  });

  it('should detect speed signals', () => {
    const text = "We need to automate our security monitoring. Everything is too manual and slow.";
    const drivers = detectValueDrivers(text);

    const speed = drivers.find((d) => d.type === 'speed');
    expect(speed).toBeDefined();
  });

  it('should detect cost certainty signals', () => {
    const text = "We need a predictable cost model. Our current expenses are all over the place and we need ROI.";
    const drivers = detectValueDrivers(text);

    const cost = drivers.find((d) => d.type === 'cost_certainty');
    expect(cost).toBeDefined();
  });

  it('should detect capability building signals', () => {
    const text = "We want to upskill our team and build internal capability rather than rely on vendors.";
    const drivers = detectValueDrivers(text);

    const capability = drivers.find((d) => d.type === 'capability_building');
    expect(capability).toBeDefined();
  });

  it('should accumulate evidence across messages', () => {
    const existingDrivers: ValueDriverSignal[] = [
      {
        type: 'risk_reduction',
        confidence: 0.5,
        evidence: ['security breach'],
        detectedAt: new Date(),
      },
    ];

    const text = "We're also worried about compliance requirements.";
    const drivers = detectValueDrivers(text, existingDrivers);

    const risk = drivers.find((d) => d.type === 'risk_reduction');
    expect(risk!.evidence.length).toBeGreaterThan(1);
  });
});

describe('Escalation Triggers', () => {
  it('should detect human handoff request', () => {
    const phrases = [
      "I want to talk to a human",
      "Let me speak to a real person",
      "Can I talk to a human agent?",
      "I want to speak to someone",
    ];

    for (const phrase of phrases) {
      expect(detectHumanHandoffRequest(phrase)).toBe(true);
    }
  });

  it('should not trigger on normal phrases', () => {
    const phrases = [
      "I was talking to a human once",
      "Humans make mistakes",
      "The human resources team",
    ];

    for (const phrase of phrases) {
      expect(detectHumanHandoffRequest(phrase)).toBe(false);
    }
  });

  it('should detect off-topic conversation', () => {
    const offTopicPhrases = [
      "What is the weather like today?",
      "Tell me a joke",
      "Who is the president?",
    ];

    for (const phrase of offTopicPhrases) {
      expect(isOffTopic(phrase)).toBe(true);
    }
  });

  it('should not flag short messages as off-topic', () => {
    const shortMessages = [
      "Hi",
      "Thanks",
      "Maybe",
    ];

    for (const msg of shortMessages) {
      expect(isOffTopic(msg)).toBe(false);
    }
  });
});

describe('Stakeholder Classification', () => {
  it('should classify with coach detected', () => {
    const signals: StakeholderSignal[] = [
      {
        role: 'economic_buyer',
        confidence: 0.8,
        evidence: ['budget approved'],
        detectedAt: new Date(),
      },
      {
        role: 'coach',
        confidence: 0.7,
        evidence: ["I've been trying to get this approved"],
        detectedAt: new Date(),
      },
    ];

    const classification = classifyStakeholders(signals);

    expect(classification.hasCoach).toBe(true);
    expect(classification.primaryBuyer).toBe('economic_buyer');
    expect(classification.detected).toContain('economic_buyer');
    expect(classification.detected).toContain('coach');
  });

  it('should handle no signals', () => {
    const classification = classifyStakeholders([]);

    expect(classification.hasCoach).toBe(false);
    expect(classification.primaryBuyer).toBeNull();
    expect(classification.detected).toHaveLength(0);
  });
});

// ============================================================================
// Scoring Tests
// ============================================================================

describe('Decision Timeline Detection', () => {
  it('should detect explicit timeline', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We need this by Q3 this year.",
        timestamp: new Date(),
      },
    ];

    const timeline = detectDecisionTimeline(turns);

    expect(timeline.status).toBe('explicit');
    expect(timeline.value?.toLowerCase()).toContain('q3');
  });

  it('should detect vague timeline', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We're looking at this sometime next year.",
        timestamp: new Date(),
      },
    ];

    const timeline = detectDecisionTimeline(turns);

    expect(timeline.status).toBe('vague');
  });

  it('should return none for no timeline', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We haven't really thought about timing yet.",
        timestamp: new Date(),
      },
    ];

    const timeline = detectDecisionTimeline(turns);

    expect(timeline.status).toBe('none');
  });
});

describe('Red Flag Detection', () => {
  it('should detect competitor already selected', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We've already selected another vendor for this project.",
        timestamp: new Date(),
      },
    ];

    const flags = detectRedFlags(turns, [], []);

    expect(flags.some((f) => f.type === 'competitor_selected')).toBe(true);
  });

  it('should detect no budget signal after many turns', () => {
    const turns: ConversationTurn[] = Array(5).fill(null).map((_, i) => ({
      id: String(i),
      role: 'prospect' as const,
      content: "We're interested in security services.",
      timestamp: new Date(),
    }));

    const flags = detectRedFlags(turns, [], []);

    expect(flags.some((f) => f.type === 'no_budget_signal')).toBe(true);
  });

  it('should not flag early conversations', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "Hi, we're interested in your services.",
        timestamp: new Date(),
      },
    ];

    const flags = detectRedFlags(turns, [], []);

    expect(flags.some((f) => f.type === 'no_budget_signal')).toBe(false);
  });
});

describe('Qualification Score Computation', () => {
  it('should compute green score for strong signals', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We need this by Q3 and I've been trying to get approval for months. Budget is approved.",
        timestamp: new Date(),
      },
    ];

    const stakeholders: StakeholderSignal[] = [
      {
        role: 'economic_buyer',
        confidence: 0.9,
        evidence: ['budget approved'],
        detectedAt: new Date(),
      },
      {
        role: 'coach',
        confidence: 0.8,
        evidence: ["I've been trying to get this approved"],
        detectedAt: new Date(),
      },
    ];

    const valueDrivers: ValueDriverSignal[] = [
      {
        type: 'risk_reduction',
        confidence: 0.8,
        evidence: ['security breach'],
        detectedAt: new Date(),
      },
    ];

    const score = computeFullQualificationScore(turns, stakeholders, valueDrivers, [
      { archetype: 'security_posture_assessment', confidence: 0.8 },
    ]);

    expect(score.overall).toBe('green');
    expect(score.compositeScore).toBeGreaterThanOrEqual(70);
    expect(score.coachDetected.present).toBe(true);
  });

  it('should compute red score for weak signals', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "Maybe we'll look at this sometime.",
        timestamp: new Date(),
      },
    ];

    const score = computeFullQualificationScore(turns, [], [], []);

    // With weak signals, should be amber or red (not green)
    expect(score.overall).not.toBe('green');
    expect(score.compositeScore).toBeLessThan(60);
  });

  it('should compute amber score for mixed signals', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We're interested in learning more about security.",
        timestamp: new Date(),
      },
    ];

    const stakeholders: StakeholderSignal[] = [
      {
        role: 'user_buyer',
        confidence: 0.6,
        evidence: ['team needs'],
        detectedAt: new Date(),
      },
    ];

    const score = computeFullQualificationScore(turns, stakeholders, [], []);

    expect(score.overall).toBe('amber');
  });
});

describe('Score Interpretation', () => {
  it('should generate appropriate interpretation for green', () => {
    const score = {
      overall: 'green' as const,
      decisionTimeline: { status: 'explicit' as const, value: 'Q3', confidence: 0.9 },
      coachDetected: { present: true, confidence: 0.8, evidence: ['test'] },
      redFlags: [],
      compositeScore: 85,
    };

    const interpretation = interpretScore(score);

    expect(interpretation.status).toBe('green');
    expect(interpretation.keyStrengths.length).toBeGreaterThan(0);
  });

  it('should generate appropriate interpretation for red', () => {
    const score = {
      overall: 'red' as const,
      decisionTimeline: { status: 'none' as const, value: null, confidence: 0 },
      coachDetected: { present: false, confidence: 0, evidence: [] },
      redFlags: [{ type: 'competitor_selected', severity: 'high' as const, description: 'Competitor selected' }],
      compositeScore: 25,
    };

    const interpretation = interpretScore(score);

    expect(interpretation.status).toBe('red');
    expect(interpretation.keyConcerns.length).toBeGreaterThan(0);
  });
});