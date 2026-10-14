/**
 * src/utils/analytics.js
 * 
 * NOTICE: Frontend client-side analytics aggregation has been deprecated
 * and migrated to the PostgreSQL REST backend service layer (Phase 3).
 * 
 * Real-time aggregated statistics (average ratings, weekly satisfaction trends,
 * sentiment insights, leaderboard, and feedback breakdowns) are now computed
 * authoritative on PostgreSQL via /api/v1/analytics/overview.
 */

export const ANALYTICS_CONFIG = Object.freeze({});
