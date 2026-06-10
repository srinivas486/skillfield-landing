/**
 * Field - Session Manager
 * Handles session CRUD operations with PostgreSQL + Redis caching
 */

import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { FieldSession, ConversationTurn } from '../types/index.js';
import {
  createEmptySession,
  serializeSessionForDb,
  deserializeSessionFromDb,
  CREATE_SESSION_TABLE_SQL,
  SESSION_TABLE_NAME,
} from './schema.js';

const REDIS_SESSION_PREFIX = 'field:session:';
const REDIS_TTL_SECONDS = 3600; // 1 hour cache

export class SessionManager {
  private pg: Pool;
  private redis: Redis;
  private isInitialized: boolean = false;

  constructor(pgPool: Pool, redisClient: Redis) {
    this.pg = pgPool;
    this.redis = redisClient;
  }

  /**
   * Initialize the database schema
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.pg.query(CREATE_SESSION_TABLE_SQL);
    this.isInitialized = true;
  }

  /**
   * Create a new session
   */
  async createSession(channel: 'web' | 'api' | 'chat' = 'web'): Promise<FieldSession> {
    await this.initialize();

    const session = createEmptySession(crypto.randomUUID(), channel);
    const dbRow = serializeSessionForDb(session);

    const result = await this.pg.query(
      `INSERT INTO ${SESSION_TABLE_NAME} (id, prospect_id, prospect_email, started_at, last_active, channel, status, conversation_history, qualification_data, archetype_scores, qualification_score, document_state, meeting_booking)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        dbRow.id,
        dbRow.prospect_id,
        dbRow.prospect_email,
        dbRow.started_at,
        dbRow.last_active,
        dbRow.channel,
        dbRow.status,
        dbRow.conversation_history,
        dbRow.qualification_data,
        dbRow.archetype_scores,
        dbRow.qualification_score,
        dbRow.document_state,
        dbRow.meeting_booking,
      ]
    );

    const savedSession = deserializeSessionFromDb(result.rows[0]);
    await this.cacheSession(savedSession);
    return savedSession;
  }

  /**
   * Get session by ID (checks Redis first, then PostgreSQL)
   */
  async getSession(sessionId: string): Promise<FieldSession | null> {
    // Try Redis cache first
    const cached = await this.redis.get(`${REDIS_SESSION_PREFIX}${sessionId}`);
    if (cached) {
      return JSON.parse(cached) as FieldSession;
    }

    // Fall back to PostgreSQL
    await this.initialize();
    const result = await this.pg.query(
      `SELECT * FROM ${SESSION_TABLE_NAME} WHERE id = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const session = deserializeSessionFromDb(result.rows[0]);
    await this.cacheSession(session);
    return session;
  }

  /**
   * Get session by prospect email (for resume)
   */
  async getSessionByProspectEmail(email: string): Promise<FieldSession | null> {
    await this.initialize();
    const result = await this.pg.query(
      `SELECT * FROM ${SESSION_TABLE_NAME} 
       WHERE prospect_email = $1 AND status = 'active'
       ORDER BY last_active DESC
       LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const session = deserializeSessionFromDb(result.rows[0]);
    await this.cacheSession(session);
    return session;
  }

  /**
   * Update session (writes to both PostgreSQL and Redis)
   */
  async updateSession(session: FieldSession): Promise<FieldSession> {
    await this.initialize();

    // Update last_active
    session.metadata.lastActive = new Date();

    const dbRow = serializeSessionForDb(session);

    await this.pg.query(
      `UPDATE ${SESSION_TABLE_NAME} SET
        prospect_id = $2,
        prospect_email = $3,
        last_active = $4,
        status = $5,
        handoff_requested_at = $6,
        conversation_history = $7,
        qualification_data = $8,
        archetype_scores = $9,
        selected_archetype = $10,
        qualification_score = $11,
        document_state = $12,
        meeting_booking = $13,
        escalation_triggered = $14,
        updated_at = NOW()
       WHERE id = $1`,
      [
        dbRow.id,
        dbRow.prospect_id,
        dbRow.prospect_email,
        dbRow.last_active,
        dbRow.status,
        dbRow.handoff_requested_at,
        dbRow.conversation_history,
        dbRow.qualification_data,
        dbRow.archetype_scores,
        dbRow.selected_archetype,
        dbRow.qualification_score,
        dbRow.document_state,
        dbRow.meeting_booking,
        dbRow.escalation_triggered,
      ]
    );

    // Update Redis cache
    await this.cacheSession(session);
    return session;
  }

  /**
   * Add a conversation turn to the session
   */
  async addTurn(
    sessionId: string,
    turn: Omit<ConversationTurn, 'id'>
  ): Promise<FieldSession | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    const fullTurn: ConversationTurn = {
      ...turn,
      id: crypto.randomUUID(),
    };

    session.conversationHistory.push(fullTurn);
    return this.updateSession(session);
  }

  /**
   * Cache session in Redis
   */
  private async cacheSession(session: FieldSession): Promise<void> {
    await this.redis.setex(
      `${REDIS_SESSION_PREFIX}${session.id}`,
      REDIS_TTL_SECONDS,
      JSON.stringify(session)
    );
  }

  /**
   * Invalidate session cache
   */
  async invalidateCache(sessionId: string): Promise<void> {
    await this.redis.del(`${REDIS_SESSION_PREFIX}${sessionId}`);
  }

  /**
   * Flag session for human handoff
   */
  async flagForHandoff(sessionId: string): Promise<FieldSession | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    session.metadata.status = 'pending_handoff';
    session.metadata.handoffRequestedAt = new Date();

    return this.updateSession(session);
  }

  /**
   * Complete a session
   */
  async completeSession(sessionId: string): Promise<FieldSession | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    session.metadata.status = 'completed';
    return this.updateSession(session);
  }

  /**
   * Disqualify a session
   */
  async disqualifySession(sessionId: string, _reason: string): Promise<FieldSession | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    session.metadata.status = 'disqualified';
    return this.updateSession(session);
  }

  /**
   * List active sessions (for monitoring)
   */
  async listActiveSessions(limit: number = 50): Promise<FieldSession[]> {
    await this.initialize();
    const result = await this.pg.query(
      `SELECT * FROM ${SESSION_TABLE_NAME} 
       WHERE status = 'active'
       ORDER BY last_active DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(deserializeSessionFromDb);
  }
}

// ============================================================================
// Redis Client Factory
// ============================================================================

export function createRedisClient(url: string): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
}

// ============================================================================
// PostgreSQL Pool Factory
// ============================================================================

export function createPgPool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}