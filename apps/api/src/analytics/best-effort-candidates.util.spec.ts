import { extractBestEfforts } from '@trainlens/shared';
import { toBestEffortCandidates } from './best-effort-candidates.util.js';

describe('best effort local dates (integration logic)', () => {
  it('maps Strava start_date_local to distinct PR days', async () => {
    const rows = [
      {
        id: 'a1',
        name: 'Night Run',
        activityType: 'Run',
        startedAt: new Date('2026-05-20T01:30:00.000Z'),
        timezone: null,
        durationSeconds: 3600,
        distanceMeters: 5000,
      },
      {
        id: 'a2',
        name: 'Afternoon Run',
        activityType: 'Run',
        startedAt: new Date('2026-05-20T17:00:00.000Z'),
        timezone: null,
        durationSeconds: 480,
        distanceMeters: 1000,
      },
    ];

    const db = {
      client: {
        activityRawPayload: {
          findMany: async () => [
            {
              activityId: 'a1',
              payload: { summary: { start_date_local: '2026-05-19T22:30:00Z' } },
            },
            {
              activityId: 'a2',
              payload: { summary: { start_date_local: '2026-05-20T14:00:00Z' } },
            },
          ],
        },
      },
    } as never;

    const candidates = await toBestEffortCandidates(db, rows);
    const efforts = extractBestEfforts(candidates);

    const oneK = efforts.find((e) => e.label === '1K');
    const fiveK = efforts.find((e) => e.label === '5K');

    expect(oneK?.achievedOnLocal).toBe('2026-05-20');
    expect(fiveK?.achievedOnLocal).toBe('2026-05-19');
    expect(oneK?.achievedOnLocal).not.toBe(fiveK?.achievedOnLocal);
  });
});
