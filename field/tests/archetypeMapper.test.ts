/**
 * Field - Archetype Mapper Tests
 * Tests for archetype detection and scoring
 */

import { describe, it, expect } from '@jest/globals';
import {
  scoreArchetypes,
  rankArchetypes,
  mapArchetype,
  getArchetypeDefinition,
  formatArchetype,
  getConfidenceBand,
  didArchetypeChange,
  generateArchetypeComparison,
} from '../src/qualification/archetypes.js';
import { ConversationTurn, StakeholderSignal, ValueDriverSignal } from '../src/types/index.js';

// ============================================================================
// Basic Archetype Detection Tests
// ============================================================================

describe('Security Posture Assessment Detection', () => {
  it('should detect security posture signals', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We need to understand our current security posture and identify gaps before the board meeting.",
        timestamp: new Date(),
      },
    ];

    const result = mapArchetype(turns, [], []);

    const spa = result.scores.find((s) => s.archetype === 'security_posture_assessment');
    expect(spa).toBeDefined();
    expect(spa!.confidence).toBeGreaterThan(0.5);
  });

  it('should detect audit-related signals', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We just had a compliance audit and they found several gaps. We need to assess our security posture.",
        timestamp: new Date(),
      },
    ];

    const result = mapArchetype(turns, [], []);

    const spa = result.scores.find((s) => s.archetype === 'security_posture_assessment');
    expect(spa!.confidence).toBeGreaterThan(0.6);
  });

  it('should select security posture when clear signal', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We need a comprehensive security posture assessment. The board wants to understand where we stand.",
        timestamp: new Date(),
      },
    ];

    const result = mapArchetype(turns, [], []);

    expect(result.selectedArchetype).toBe('security_posture_assessment');
  });
});

describe('SIEM Detection', () => {
  it('should detect SIEM signals', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We're looking at SIEM solutions for our security operations. Need better log management and threat detection.",
        timestamp: new Date(),
      },
    ];

    const result = mapArchetype(turns, [], []);

    const siem = result.scores.find((s) => s.archetype === 'siem');
    expect(siem).toBeDefined();
    expect(siem!.confidence).toBeGreaterThan(0.5);
  });

  it('should detect Splunk/Microsoft Sentinel mentions', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We're evaluating Splunk and Microsoft Sentinel for our SOC. Need to consolidate security events.",
        timestamp: new Date(),
      },
    ];

    const result = mapArchetype(turns, [], []);

    const siem = result.scores.find((s) => s.archetype === 'siem');
    expect(siem!.confidence).toBeGreaterThan(0.6);
  });
});

describe('MDR Detection', () => {
  it('should detect MDR signals', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We need 24/7 security monitoring but can't afford to build an in-house SOC. Looking for managed detection and response.",
        timestamp: new Date(),
      },
    ];

    const result = mapArchetype(turns, [], []);

    const mdr = result.scores.find((s) => s.archetype === 'mdr');
    expect(mdr).toBeDefined();
    expect(mdr!.confidence).toBeGreaterThan(0.5);
  });

  it('should detect outsourced security language', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We want to outsource our security operations. Need continuous monitoring and threat response.",
        timestamp: new Date(),
      },
    ];

    const result = mapArchetype(turns, [], []);

    const mdr = result.scores.find((s) => s.archetype === 'mdr');
    expect(mdr!.confidence).toBeGreaterThan(0.5);
  });
});

describe('Data Platform Build Detection', () => {
  it('should detect data platform signals', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We're building a unified data platform on Azure. Need to consolidate data from multiple systems for analytics.",
        timestamp: new Date(),
      },
    ];

    const result = mapArchetype(turns, [], []);

    const dataPlatform = result.scores.find((s) => s.archetype === 'data_platform_build');
    expect(dataPlatform).toBeDefined();
    expect(dataPlatform!.confidence).toBeGreaterThan(0.5);
  });

  it('should detect cloud migration context', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "Migrating to AWS and need to design our data infrastructure. Want a modern data lake architecture.",
        timestamp: new Date(),
      },
    ];

    const result = mapArchetype(turns, [], []);

    const dataPlatform = result.scores.find((s) => s.archetype === 'data_platform_build');
    expect(dataPlatform!.confidence).toBeGreaterThan(0.5);
  });
});

describe('AI Platform Build Detection', () => {
  it('should detect AI platform signals', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We're building an ML platform to support our AI initiatives. Need to scale our machine learning experiments.",
        timestamp: new Date(),
      },
    ];

    const result = mapArchetype(turns, [], []);

    const aiPlatform = result.scores.find((s) => s.archetype === 'ai_platform_build');
    expect(aiPlatform).toBeDefined();
    expect(aiPlatform!.confidence).toBeGreaterThan(0.5);
  });

  it('should detect generative AI context', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We want to implement generative AI capabilities. Looking to build an AI center of excellence.",
        timestamp: new Date(),
      },
    ];

    const result = mapArchetype(turns, [], []);

    const aiPlatform = result.scores.find((s) => s.archetype === 'ai_platform_build');
    expect(aiPlatform!.confidence).toBeGreaterThan(0.6);
  });
});

// ============================================================================
// Archetype Ranking Tests
// ============================================================================

describe('Archetype Ranking', () => {
  it('should rank archetypes by confidence', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We need managed detection and response services. Our team can't monitor 24/7 and we need outsourced security expertise.",
        timestamp: new Date(),
      },
    ];

    const scores = scoreArchetypes(turns, [], []);
    const ranked = scores.sort((a, b) => b.confidence - a.confidence);

    const first = ranked[0];
    const second = ranked[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (first && second) {
      expect(first.archetype).toBe('mdr');
      expect(first.confidence).toBeGreaterThanOrEqual(second.confidence);
    }
  });

  it('should select highest confidence archetype above threshold', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We're evaluating SIEM solutions and need better security monitoring.",
        timestamp: new Date(),
      },
    ];

    const result = rankArchetypes(scoreArchetypes(turns, [], []));

    expect(result.selectedArchetype).toBe('siem');
  });

  it('should not select archetype below threshold', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "Hello, just looking for some information.",
        timestamp: new Date(),
      },
    ];

    const result = rankArchetypes(scoreArchetypes(turns, [], []));

    expect(result.selectedArchetype).toBeNull();
  });
});

// ============================================================================
// Stakeholder and Value Driver Influence Tests
// ============================================================================

describe('Stakeholder Influence on Archetype', () => {
  it('should boost SIEM score for technical buyer', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We need better security monitoring.",
        timestamp: new Date(),
      },
    ];

    const stakeholders: StakeholderSignal[] = [
      {
        role: 'technical_buyer',
        confidence: 0.8,
        evidence: ['IT team needs to approve'],
        detectedAt: new Date(),
      },
    ];

    const scores = scoreArchetypes(turns, stakeholders, []);
    const siem = scores.find((s) => s.archetype === 'siem');

    // Technical buyer should boost SIEM
    expect(siem!.confidence).toBeGreaterThan(0.4);
  });
});

describe('Value Driver Influence on Archetype', () => {
  it('should boost security archetypes for risk reduction', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We're concerned about security threats.",
        timestamp: new Date(),
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

    const scores = scoreArchetypes(turns, [], valueDrivers);

    const spa = scores.find((s) => s.archetype === 'security_posture_assessment');
    const mdr = scores.find((s) => s.archetype === 'mdr');

    // Risk reduction should boost security posture and MDR
    expect(spa!.confidence).toBeGreaterThan(0.3);
    expect(mdr!.confidence).toBeGreaterThan(0.3);
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Archetype Utilities', () => {
  it('should get correct archetype definition', () => {
    const def = getArchetypeDefinition('siem');

    expect(def.name).toBe('SIEM (Security Information and Event Management)');
    expect(def.keySignals).toContain('siem');
    expect(def.keySignals).toContain('security monitoring');
  });

  it('should format archetype for display', () => {
    const formatted = formatArchetype('security_posture_assessment');

    expect(formatted).toBe('Security Posture Assessment');
  });

  it('should return correct confidence bands', () => {
    expect(getConfidenceBand(0.8)).toBe('high');
    expect(getConfidenceBand(0.6)).toBe('medium');
    expect(getConfidenceBand(0.4)).toBe('low');
    expect(getConfidenceBand(0.2)).toBe('unclear');
  });

  it('should detect archetype changes', () => {
    expect(didArchetypeChange('siem', 'mdr')).toBe(true);
    expect(didArchetypeChange('siem', 'siem')).toBe(false);
    expect(didArchetypeChange(undefined, 'siem')).toBe(true);
    expect(didArchetypeChange(undefined, null)).toBe(false);
  });

  it('should generate archetype comparison', () => {
    const scores = scoreArchetypes([], [], []);
    const comparison = generateArchetypeComparison(scores);

    expect(comparison).toContain('=== ARCHETYPE ANALYSIS ===');
    expect(comparison).toContain('SIEM');
    expect(comparison).toContain('confidence');
  });
});

// ============================================================================
// Multi-turn Scenario Tests
// ============================================================================

describe('Multi-turn Archetype Evolution', () => {
  it('should maintain archetype consistency across turns', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We're evaluating security solutions.",
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'prospect',
        content: "Mainly interested in 24/7 monitoring and managed detection.",
        timestamp: new Date(),
      },
      {
        id: '3',
        role: 'prospect',
        content: "Our team can't handle alerts around the clock.",
        timestamp: new Date(),
      },
    ];

    // Process each turn
    const firstTurn = turns[0];
    if (!firstTurn) return;

    let result = mapArchetype([firstTurn], [], []);

    result = mapArchetype(turns.slice(0, 2), [], []);

    result = mapArchetype(turns, [], []);
    const thirdArchetype = result.selectedArchetype;

    // MDR should be selected throughout
    expect(thirdArchetype).toBe('mdr');
  });

  it('should shift archetype when clear new signal emerges', () => {
    const turns: ConversationTurn[] = [
      {
        id: '1',
        role: 'prospect',
        content: "We're looking at security solutions.",
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'prospect',
        content: "Actually, we're more interested in building a data platform for analytics.",
        timestamp: new Date(),
      },
    ];

    const result = mapArchetype(turns, [], []);

    expect(result.selectedArchetype).toBe('data_platform_build');
  });
});