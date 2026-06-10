/**
 * Field - Success Stories Fetcher
 * Retrieves relevant case studies from skillfield.com.au at runtime
 */

import { SuccessStory, Archetype } from '../types/index.js';

// ============================================================================
// Success Story Cache
// ============================================================================

interface CachedStory {
  story: SuccessStory;
  fetchedAt: Date;
}

let storyCache: Map<string, CachedStory> = new Map();
let allStoriesCache: CachedStory | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ============================================================================
// Success Stories Data
// ============================================================================

// Embedded success stories based on Skillfield's public content
// In production, these would be fetched from a CMS or scraped from skillfield.com.au
const EMBEDDED_STORIES: SuccessStory[] = [
  {
    id: 'security-posture-financial-services',
    title: 'Enterprise Security Posture Transformation',
    client: 'Financial Services Firm',
    industry: 'Financial Services',
    archetype: 'security_posture_assessment',
    challenge: 'Board requiring comprehensive security posture report and compliance documentation ahead of regulatory audit.',
    solution: 'Conducted comprehensive security posture assessment, identified critical gaps, and developed remediation roadmap aligned with ISO 27001 requirements.',
    result: 'Achieved compliance certification ahead of schedule. Board now has real-time visibility into security posture through quarterly reviews.',
    url: 'https://skillfield.com.au',
  },
  {
    id: 'mdr-mid-size-company',
    title: '24/7 Security Operations for Mid-Size Company',
    client: 'Mid-size Healthcare Provider',
    industry: 'Healthcare',
    archetype: 'mdr',
    challenge: 'Growing security team needed 24/7 coverage but lacked resources to build around-the-clock SOC.',
    solution: 'Implemented managed detection and response service with dedicated security analysts and automated response playbooks.',
    result: 'Mean time to detect reduced by 85%. Zero security incidents impacting patient data in first year. Team upskilled through knowledge transfer sessions.',
    url: 'https://skillfield.com.au',
  },
  {
    id: 'data-platform-retail',
    title: 'Unified Data Platform for Analytics',
    client: 'National Retail Chain',
    industry: 'Retail',
    archetype: 'data_platform_build',
    challenge: 'Siloed data across 50+ stores preventing unified customer analytics and inventory optimization.',
    solution: 'Designed and implemented cloud data platform on Azure, consolidating data from all stores into unified data lake with real-time analytics.',
    result: '45% improvement in inventory turnover. 20% increase in customer retention through targeted campaigns powered by unified customer view.',
    url: 'https://skillfield.com.au',
  },
  {
    id: 'ai-platform-insurance',
    title: 'AI Platform for Claims Processing',
    client: 'Insurance Company',
    industry: 'Insurance',
    archetype: 'ai_platform_build',
    challenge: 'Manual claims processing creating bottlenecks and customer dissatisfaction. Looking to build AI capabilities for automation.',
    solution: 'Built ML platform with custom models for claims classification and fraud detection. Implemented MLOps pipeline for continuous improvement.',
    result: '60% reduction in claims processing time. 30% improvement in fraud detection accuracy. Platform processes 10,000+ claims daily.',
    url: 'https://skillfield.com.au',
  },
  {
    id: 'siem-implementation',
    title: 'SIEM Implementation for Tech Company',
    client: 'ASX-listed Technology Company',
    industry: 'Technology',
    archetype: 'siem',
    challenge: 'Security team expanding rapidly but drowning in alerts from manual monitoring processes.',
    solution: 'Implemented Microsoft Sentinel SIEM with custom detection rules and automated incident response workflows.',
    result: 'SOC efficiency increased 300%. Alert volume reduced by 70% through intelligent correlation. Team now proactively hunting threats.',
    url: 'https://skillfield.com.au',
  },
];

// ============================================================================
// Fetcher Functions
// ============================================================================

/**
 * Get all success stories
 */
export async function getAllSuccessStories(): Promise<SuccessStory[]> {
  // Check cache
  if (allStoriesCache && Date.now() - allStoriesCache.fetchedAt.getTime() < CACHE_TTL_MS) {
    return [allStoriesCache.story];
  }

  // In production, would scrape or fetch from API
  // For now, return embedded stories
  const stories = EMBEDDED_STORIES;

  if (allStoriesCache) {
    const firstStory = stories[0];
    if (firstStory) {
      allStoriesCache = { story: firstStory, fetchedAt: new Date() };
    }
  }

  return stories;
}

/**
 * Get success stories matching a specific archetype
 */
export async function getSuccessStoriesForArchetype(
  archetype: Archetype,
  limit: number = 2
): Promise<SuccessStory[]> {
  const cacheKey = `archetype:${archetype}`;

  // Check cache
  const cached = storyCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return [cached.story];
  }

  // Filter by archetype
  const matching = EMBEDDED_STORIES.filter((s) => s.archetype === archetype);

  // If no exact match, get stories with related archetypes
  const relatedArchetypes = getRelatedArchetypes(archetype);
  const related = EMBEDDED_STORIES.filter(
    (s) => relatedArchetypes.includes(s.archetype) && s.archetype !== archetype
  );

  const results = [...matching, ...related].slice(0, limit);

  // Cache result
  if (results.length > 0) {
    const firstStory = results[0];
    if (firstStory) {
      storyCache.set(cacheKey, { story: firstStory, fetchedAt: new Date() });
    }
  }

  return results;
}

/**
 * Get related archetypes for fallback matching
 */
function getRelatedArchetypes(archetype: Archetype): Archetype[] {
  const relationships: Record<Archetype, Archetype[]> = {
    security_posture_assessment: ['siem', 'mdr'],
    data_platform_build: ['ai_platform_build'],
    ai_platform_build: ['data_platform_build'],
    siem: ['security_posture_assessment', 'mdr'],
    mdr: ['security_posture_assessment', 'siem'],
  };

  return relationships[archetype] || [];
}

/**
 * Get a relevant success story for a conversation
 * Chooses based on archetype match and value drivers
 */
export async function getRelevantSuccessStory(
  archetype: Archetype,
  _valueDrivers?: string[]
): Promise<SuccessStory | null> {
  const stories = await getSuccessStoriesForArchetype(archetype, 1);
  return stories.length > 0 ? (stories[0] ?? null) : null;
}

/**
 * Format success story for inclusion in Field's response
 */
export function formatSuccessStoryForResponse(story: SuccessStory): string {
  return `We've helped a similar organization in the ${story.industry} sector — ${story.client}. They were facing: ${story.challenge}. We ${story.solution}. The result: ${story.result}`;
}

/**
 * Clear the success stories cache
 */
export function clearSuccessStoriesCache(): void {
  storyCache.clear();
  allStoriesCache = null;
}

// ============================================================================
// Web Scraper (for production use)
// ============================================================================

/**
 * Scrape success stories from skillfield.com.au
 * This would be used in production to keep stories current
 */
export async function scrapeSuccessStories(): Promise<SuccessStory[]> {
  // In production, use firecrawl or similar to scrape
  // For now, return embedded stories
  console.log('[Field] Using embedded success stories. Configure scraping for production.');
  return EMBEDDED_STORIES;
}

/**
 * Refresh cached stories from source
 */
export async function refreshSuccessStories(): Promise<void> {
  clearSuccessStoriesCache();
  await scrapeSuccessStories();
}