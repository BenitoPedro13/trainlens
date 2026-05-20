/** Strava push event (POST body). https://developers.strava.com/docs/webhooks/ */
export interface StravaWebhookEvent {
  aspect_type: 'create' | 'update' | 'delete';
  event_time: number;
  object_id: number;
  object_type: 'activity' | 'athlete';
  owner_id: number;
  subscription_id: number;
  updates?: Record<string, unknown>;
}

export interface StravaWebhookVerifyQuery {
  'hub.mode'?: string;
  'hub.challenge'?: string;
  'hub.verify_token'?: string;
  hub?: {
    mode?: string;
    challenge?: string;
    verify_token?: string;
  };
}

export function buildStravaIdempotencyKey(event: StravaWebhookEvent): string {
  return `strava:${event.object_type}:${event.aspect_type}:${event.object_id}:${event.event_time}`;
}

export function mapAspectToAction(
  aspect: StravaWebhookEvent['aspect_type'],
): 'create' | 'update' | 'delete' {
  return aspect;
}
