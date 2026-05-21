import nock from 'nock';
import { Test } from '@nestjs/testing';
import { StravaAdapter, StravaRateLimitError, StravaUnauthorizedError } from './strava.adapter';

const STRAVA_BASE = 'https://www.strava.com';
const ACCESS_TOKEN = 'test-access-token';
const TOKENS = { accessToken: ACCESS_TOKEN };

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SUMMARY_ACTIVITY = {
  id: 12345,
  name: 'Morning Run',
  type: 'Run',
  sport_type: 'Run',
  start_date: '2026-01-15T07:00:00Z',
  start_date_local: '2026-01-15T04:00:00Z',
  timezone: '(GMT-03:00) America/Sao_Paulo',
  elapsed_time: 3600,
  moving_time: 3500,
  distance: 10000,
  total_elevation_gain: 50,
  average_heartrate: 155,
  max_heartrate: 175,
  average_speed: 2.78,
  max_speed: 3.5,
  average_cadence: 172,
  calories: 650,
  start_latlng: [-23.55, -46.63],
  end_latlng: [-23.56, -46.64],
  map: { id: 'a12345', summary_polyline: 'abc123', resource_state: 2 },
  device_name: 'Garmin Forerunner 255',
  manual: false,
  trainer: false,
};

const DETAIL_ACTIVITY = {
  ...SUMMARY_ACTIVITY,
  laps: [
    {
      id: 1,
      lap_index: 1,
      distance: 5000,
      elapsed_time: 1800,
      moving_time: 1780,
      average_heartrate: 150,
      average_speed: 2.78,
    },
    {
      id: 2,
      lap_index: 2,
      distance: 5000,
      elapsed_time: 1800,
      moving_time: 1720,
      average_heartrate: 160,
      average_speed: 2.78,
    },
  ],
};

const STREAM_RESPONSE = {
  heartrate: { data: [140, 150, 160, 155, 145] },
  time: { data: [0, 60, 120, 180, 240] },
  distance: { data: [0, 166, 333, 500, 666] },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StravaAdapter', () => {
  let adapter: StravaAdapter;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [StravaAdapter],
    }).compile();
    adapter = module.get(StravaAdapter);
  });

  beforeEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('getActivities', () => {
    it('returns normalized activities from a single page', async () => {
      nock(STRAVA_BASE)
        .get('/api/v3/athlete/activities')
        .query({ per_page: '200', page: '1' })
        .matchHeader('authorization', `Bearer ${ACCESS_TOKEN}`)
        .reply(200, [SUMMARY_ACTIVITY]);

      nock(STRAVA_BASE)
        .get('/api/v3/athlete/activities')
        .query({ per_page: '200', page: '2' })
        .reply(200, []);

      const activities = await adapter.getActivities(TOKENS);

      expect(activities).toHaveLength(1);
      expect(activities[0].externalId).toBe('12345');
      expect(activities[0].activityType).toBe('Run');
      expect(activities[0].distanceMeters).toBe(10000);
      expect(activities[0].averageHeartRate).toBe(155);
    });

    it('throws StravaRateLimitError on 429', async () => {
      nock(STRAVA_BASE)
        .get('/api/v3/athlete/activities')
        .query(true)
        .reply(429, 'Rate limit exceeded', { 'x-ratelimit-usage': '100,1000' });

      await expect(adapter.getActivities(TOKENS)).rejects.toThrow(StravaRateLimitError);
    });

    it('throws StravaUnauthorizedError on 401', async () => {
      nock(STRAVA_BASE)
        .get('/api/v3/athlete/activities')
        .query(true)
        .reply(401, 'Unauthorized');

      await expect(adapter.getActivities(TOKENS)).rejects.toThrow(StravaUnauthorizedError);
    });
  });

  describe('getActivityDetail', () => {
    it('returns normalized activity with laps and streams', async () => {
      nock(STRAVA_BASE)
        .get('/api/v3/activities/12345')
        .matchHeader('authorization', `Bearer ${ACCESS_TOKEN}`)
        .reply(200, DETAIL_ACTIVITY);

      nock(STRAVA_BASE)
        .get('/api/v3/activities/12345/streams')
        .query(true)
        .reply(200, STREAM_RESPONSE);

      const activity = await adapter.getActivityDetail(TOKENS, '12345');

      expect(activity.externalId).toBe('12345');
      expect(activity.laps).toHaveLength(2);
      expect(activity.laps![0].distanceMeters).toBe(5000);
      expect(activity.streams?.heartrate).toEqual([140, 150, 160, 155, 145]);
    });

    it('returns activity without streams if streams request fails', async () => {
      nock(STRAVA_BASE)
        .get('/api/v3/activities/12345')
        .reply(200, DETAIL_ACTIVITY);

      nock(STRAVA_BASE)
        .get('/api/v3/activities/12345/streams')
        .query(true)
        .reply(500, 'Server error');

      const activity = await adapter.getActivityDetail(TOKENS, '12345');

      expect(activity.externalId).toBe('12345');
      expect(activity.streams).toBeUndefined();
    });
  });

  describe('refreshTokens', () => {
    it('exchanges refresh token for new tokens', async () => {
      process.env['STRAVA_CLIENT_ID'] = 'client123';
      process.env['STRAVA_CLIENT_SECRET'] = 'secret456';

      nock(STRAVA_BASE)
        .post('/oauth/token', (body) => body.grant_type === 'refresh_token')
        .reply(200, {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'Bearer',
        });

      const tokens = await adapter.refreshTokens({
        accessToken: 'old-token',
        refreshToken: 'old-refresh',
      });

      expect(tokens.accessToken).toBe('new-access-token');
      expect(tokens.refreshToken).toBe('new-refresh-token');
    });
  });
});
