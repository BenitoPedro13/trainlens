import { extractBestEfforts, estimateBestEffortSeconds } from './best-efforts.js';

describe('estimateBestEffortSeconds', () => {
  it('uses actual duration for near-exact distance', () => {
    expect(estimateBestEffortSeconds(5000, 3600, 5000)).toEqual({
      seconds: 3600,
      isEstimated: false,
    });
  });

  it('scales from longer activities', () => {
    expect(estimateBestEffortSeconds(5000, 3600, 1000)).toEqual({
      seconds: 720,
      isEstimated: true,
    });
  });

  it('rejects activities shorter than target', () => {
    expect(estimateBestEffortSeconds(800, 400, 1000)).toBeNull();
  });
});

describe('extractBestEfforts', () => {
  it('picks fastest actual 5K time', () => {
    const efforts = extractBestEfforts([
      {
        id: 'a1',
        activityType: 'Run',
        startedAt: new Date('2024-06-01T10:00:00.000Z'),
        localDateKey: '2024-06-01',
        durationSeconds: 1500,
        distanceMeters: 5000,
      },
      {
        id: 'a2',
        activityType: 'Run',
        startedAt: new Date('2024-06-02T10:00:00.000Z'),
        localDateKey: '2024-06-02',
        durationSeconds: 1600,
        distanceMeters: 5100,
      },
    ]);

    const fiveK = efforts.find((e) => e.label === '5K');
    expect(fiveK?.activityId).toBe('a1');
    expect(fiveK?.durationSeconds).toBe(1500);
    expect(fiveK?.isEstimated).toBe(false);
    expect(fiveK?.achievedOnLocal).toBe('2024-06-01');
  });

  it('assigns 1K and 5K PRs to different local days when sourced from different runs', () => {
    const efforts = extractBestEfforts([
      {
        id: 'run-19',
        name: 'Night Run',
        activityType: 'Run',
        startedAt: new Date('2026-05-20T01:30:00.000Z'),
        localDateKey: '2026-05-19',
        durationSeconds: 3600,
        distanceMeters: 5000,
      },
      {
        id: 'run-20',
        name: 'Afternoon Run',
        activityType: 'Run',
        startedAt: new Date('2026-05-20T17:00:00.000Z'),
        localDateKey: '2026-05-20',
        durationSeconds: 480,
        distanceMeters: 1000,
      },
    ]);

    const oneK = efforts.find((e) => e.label === '1K');
    const fiveK = efforts.find((e) => e.label === '5K');

    expect(oneK?.activityId).toBe('run-20');
    expect(oneK?.achievedOnLocal).toBe('2026-05-20');
    expect(oneK?.durationSeconds).toBe(480);
    expect(oneK?.isEstimated).toBe(false);

    expect(fiveK?.activityId).toBe('run-19');
    expect(fiveK?.achievedOnLocal).toBe('2026-05-19');
    expect(fiveK?.durationSeconds).toBe(3600);
    expect(fiveK?.isEstimated).toBe(false);

    expect(oneK?.achievedOnLocal).not.toBe(fiveK?.achievedOnLocal);
  });

  it('prefers a real 1K run over a scaled 1K from a longer run on another day', () => {
    const efforts = extractBestEfforts([
      {
        id: 'long',
        activityType: 'Run',
        startedAt: new Date('2026-05-19T22:00:00.000Z'),
        localDateKey: '2026-05-19',
        durationSeconds: 3600,
        distanceMeters: 5000,
      },
      {
        id: 'short',
        activityType: 'Run',
        startedAt: new Date('2026-05-20T14:00:00.000Z'),
        localDateKey: '2026-05-20',
        durationSeconds: 300,
        distanceMeters: 1000,
      },
    ]);

    const oneK = efforts.find((e) => e.label === '1K');
    expect(oneK?.activityId).toBe('short');
    expect(oneK?.durationSeconds).toBe(300);
    expect(oneK?.isEstimated).toBe(false);
    expect(oneK?.achievedOnLocal).toBe('2026-05-20');
  });

  it('when only one 5K run exists, 1K is estimated from that same activity and day', () => {
    const efforts = extractBestEfforts([
      {
        id: 'only',
        activityType: 'Run',
        startedAt: new Date('2026-05-20T17:00:00.000Z'),
        localDateKey: '2026-05-20',
        durationSeconds: 3600,
        distanceMeters: 5000,
      },
    ]);

    const oneK = efforts.find((e) => e.label === '1K');
    const fiveK = efforts.find((e) => e.label === '5K');

    expect(oneK?.activityId).toBe('only');
    expect(fiveK?.activityId).toBe('only');
    expect(oneK?.achievedOnLocal).toBe('2026-05-20');
    expect(fiveK?.achievedOnLocal).toBe('2026-05-20');
    expect(oneK?.durationSeconds).toBe(720);
    expect(oneK?.isEstimated).toBe(true);
    expect(fiveK?.isEstimated).toBe(false);
  });
});
