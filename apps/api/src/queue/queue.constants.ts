export const QUEUE_NAMES = {
  BULK_IMPORT: 'bulk-import',
  ACTIVITY_SYNC: 'activity-sync',
  WEBHOOK_INGEST: 'webhook-ingest',
  ANALYTICS_RECALC: 'analytics-recalc',
  DATA_EXPORT: 'data-export',
  SEGMENT_METADATA_SYNC: 'segment-metadata-sync',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ── Job data shapes ───────────────────────────────────────────────────────────

export interface BulkImportJobData {
  userId: string;
  /** Unix timestamp — import activities after this date (optional, defaults to all-time) */
  afterTimestamp?: number;
}

export interface ActivitySyncJobData {
  userId: string;
  stravaActivityId: number;
  action: 'create' | 'update' | 'delete';
  webhookEventId: string;
}

export interface WebhookIngestJobData {
  webhookEventId: string;
}

export interface AnalyticsRecalcJobData {
  userId: string;
  /** ISO date string (YYYY-MM-DD) — recalculate from this date forward */
  fromDate: string;
}

export interface DataExportJobData {
  userId: string;
  exportJobId: string;
}

export interface SegmentMetadataSyncJobData {
  segmentExternalId: string;
  userId: string;
}
