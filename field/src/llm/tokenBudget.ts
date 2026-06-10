/**
 * Field - Token Budget Manager
 * Enforces per-session token limits to prevent runaway costs
 */

import { TokenBudgetConfig } from '../types/index.js';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<TokenBudgetConfig> = {
  maxTokensPerSession: 2000,
  warningThreshold: 0.8, // 80%
  cutoffThreshold: 1.0, // 100%
};

// ============================================================================
// Token Budget Manager
// ============================================================================

export class TokenBudgetManager {
  private config: Required<TokenBudgetConfig>;
  private usage: Map<string, number> = new Map();
  private warnings: Map<string, boolean> = new Map();

  constructor(config: TokenBudgetConfig = DEFAULT_CONFIG) {
    this.config = {
      maxTokensPerSession: config.maxTokensPerSession ?? DEFAULT_CONFIG.maxTokensPerSession,
      warningThreshold: config.warningThreshold ?? DEFAULT_CONFIG.warningThreshold,
      cutoffThreshold: config.cutoffThreshold ?? DEFAULT_CONFIG.cutoffThreshold,
    };
  }

  /**
   * Track token usage for a session
   */
  trackUsage(sessionId: string, tokens: number): void {
    const current = this.usage.get(sessionId) || 0;
    this.usage.set(sessionId, current + tokens);
  }

  /**
   * Get current usage for a session
   */
  getUsage(sessionId: string): { used: number; budget: number; remaining: number; percentUsed: number } {
    const used = this.usage.get(sessionId) || 0;
    const budget = this.config.maxTokensPerSession;
    const remaining = Math.max(0, budget - used);
    const percentUsed = budget > 0 ? used / budget : 0;

    return { used, budget, remaining, percentUsed };
  }

  /**
   * Check if session has exhausted its token budget
   */
  isExhausted(sessionId: string): boolean {
    const { percentUsed } = this.getUsage(sessionId);
    return percentUsed >= this.config.cutoffThreshold;
  }

  /**
   * Check if session is approaching its token budget limit
   */
  isNearLimit(sessionId: string): boolean {
    const { percentUsed } = this.getUsage(sessionId);
    return percentUsed >= this.config.warningThreshold;
  }

  /**
   * Check if session should receive a warning
   */
  shouldWarn(sessionId: string): boolean {
    if (this.isNearLimit(sessionId)) {
      const alreadyWarned = this.warnings.get(sessionId) || false;
      if (!alreadyWarned) {
        this.warnings.set(sessionId, true);
        return true;
      }
    }
    return false;
  }

  /**
   * Get remaining tokens for a session
   */
  getRemaining(sessionId: string): number {
    return this.getUsage(sessionId).remaining;
  }

  /**
   * Estimate tokens for a message
   * Simple heuristic: ~4 characters per token for English
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if a message can be processed within budget
   */
  canProcess(sessionId: string, estimatedTokens: number): boolean {
    const remaining = this.getRemaining(sessionId);
    return remaining >= estimatedTokens;
  }

  /**
   * Reserve tokens for a message (before processing)
   */
  reserveTokens(sessionId: string, tokens: number): boolean {
    if (!this.canProcess(sessionId, tokens)) {
      return false;
    }
    // Don't actually reserve until completion
    return true;
  }

  /**
   * Reset usage for a session
   */
  reset(sessionId: string): void {
    this.usage.delete(sessionId);
    this.warnings.delete(sessionId);
  }

  /**
   * Get budget status for all tracked sessions
   */
  getAllUsage(): Map<string, { used: number; budget: number; remaining: number }> {
    const result = new Map();
    for (const [sessionId, used] of this.usage.entries()) {
      const budget = this.config.maxTokensPerSession;
      result.set(sessionId, {
        used,
        budget,
        remaining: Math.max(0, budget - used),
      });
    }
    return result;
  }

  /**
   * Get sessions that are near or at their limit
   */
  getExhaustedSessions(): string[] {
    return Array.from(this.usage.entries())
      .filter(([, used]) => used >= this.config.maxTokensPerSession * this.config.warningThreshold)
      .map(([sessionId]) => sessionId);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TokenBudgetConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<TokenBudgetConfig> {
    return { ...this.config };
  }
}

// ============================================================================
// Token Budget Middleware
// ============================================================================

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
}

/**
 * Check if a message can be processed before sending to LLM
 */
export function checkBudget(
  manager: TokenBudgetManager,
  sessionId: string,
  messageLength: number
): BudgetCheckResult {
  // Estimate tokens from message length (4 chars per token heuristic)
  const estimatedTokens = Math.ceil(messageLength / 4);

  if (manager.isExhausted(sessionId)) {
    return {
      allowed: false,
      reason: 'Token budget exhausted',
      remaining: 0,
    };
  }

  if (!manager.canProcess(sessionId, estimatedTokens)) {
    return {
      allowed: false,
      reason: 'Message would exceed token budget',
      remaining: manager.getRemaining(sessionId),
    };
  }

  return {
    allowed: true,
    remaining: manager.getRemaining(sessionId) - estimatedTokens,
  };
}

/**
 * Generate warning message when approaching budget limit
 */
export function generateBudgetWarning(sessionId: string, manager: TokenBudgetManager): string {
  const usage = manager.getUsage(sessionId);
  const percent = (usage.percentUsed * 100).toFixed(0);

  return `Warning: You've used approximately ${percent}% of this conversation's token budget (${usage.used} of ${usage.budget} tokens). ` +
    `This conversation may be transferred to a human team member soon.`;
}