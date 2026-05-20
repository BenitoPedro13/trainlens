import { aggregateActivitiesByDay, computeStreaks } from './daily-metrics.utils.js';

describe('aggregateActivitiesByDay', () => {
  it('groups multiple activities on the same UTC day', () => {
    const map = aggregateActivitiesByDay([
      {
        startedAt: new Date('2024-06-01T08:00:00.000Z'),
        distanceMeters: 5000,
        durationSeconds: 1800,
        elevationGainMeters: 50,
        calories: 400,
        tss: 50,
      },
      {
        startedAt: new Date('2024-06-01T18:00:00.000Z'),
        distanceMeters: 3000,
        durationSeconds: 1200,
        elevationGainMeters: 20,
        calories: 250,
        tss: 30,
      },
    ]);

    expect(map.size).toBe(1);
    const agg = map.get('2024-06-01');
    expect(agg).toEqual({
      totalActivities: 2,
      totalDistanceMeters: 8000,
      totalDurationSeconds: 3000,
      totalElevationGainMeters: 70,
      totalCalories: 650,
      tss: 80,
    });
  });

  it('buckets by activity timezone instead of UTC midnight', () => {
    const map = aggregateActivitiesByDay([
      {
        startedAt: new Date('2026-05-20T01:30:00.000Z'),
        timezone: 'America/Sao_Paulo',
        distanceMeters: 5000,
        durationSeconds: 3600,
        elevationGainMeters: 50,
        calories: 400,
        tss: 50,
      },
      {
        startedAt: new Date('2026-05-20T17:00:00.000Z'),
        timezone: 'America/Sao_Paulo',
        distanceMeters: 13000,
        durationSeconds: 3600,
        elevationGainMeters: 100,
        calories: 500,
        tss: 60,
      },
    ]);

    expect(map.get('2026-05-19')?.totalActivities).toBe(1);
    expect(map.get('2026-05-20')?.totalActivities).toBe(1);
  });

  it('treats null distance and calories as zero', () => {
    const map = aggregateActivitiesByDay([
      {
        startedAt: new Date('2024-06-02T10:00:00.000Z'),
        distanceMeters: null,
        durationSeconds: 600,
        elevationGainMeters: null,
        calories: null,
        tss: null,
      },
    ]);

    expect(map.get('2024-06-02')).toEqual({
      totalActivities: 1,
      totalDistanceMeters: 0,
      totalDurationSeconds: 600,
      totalElevationGainMeters: 0,
      totalCalories: 0,
      tss: 0,
    });
  });
});

describe('computeStreaks', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-05T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns zeros for no active dates', () => {
    expect(computeStreaks([])).toEqual({ current: 0, longest: 0 });
  });

  it('counts current streak ending today', () => {
    const dates = [
      new Date('2024-06-03T00:00:00.000Z'),
      new Date('2024-06-04T00:00:00.000Z'),
      new Date('2024-06-05T00:00:00.000Z'),
    ];
    expect(computeStreaks(dates)).toEqual({ current: 3, longest: 3 });
  });

  it('resets current streak when today is inactive', () => {
    const dates = [
      new Date('2024-06-01T00:00:00.000Z'),
      new Date('2024-06-02T00:00:00.000Z'),
    ];
    expect(computeStreaks(dates)).toEqual({ current: 0, longest: 2 });
  });

  it('tracks longest streak across a gap', () => {
    const dates = [
      new Date('2024-05-01T00:00:00.000Z'),
      new Date('2024-05-02T00:00:00.000Z'),
      new Date('2024-05-10T00:00:00.000Z'),
      new Date('2024-05-11T00:00:00.000Z'),
      new Date('2024-05-12T00:00:00.000Z'),
    ];
    expect(computeStreaks(dates).longest).toBe(3);
  });
});
