import { extractBestEfforts } from './best-efforts.js';

describe('extractBestEfforts', () => {
  it('picks fastest scaled time at 5K', () => {
    const efforts = extractBestEfforts([
      {
        id: 'a1',
        activityType: 'Run',
        startedAt: new Date('2024-06-01'),
        durationSeconds: 1500,
        distanceMeters: 5000,
      },
      {
        id: 'a2',
        activityType: 'Run',
        startedAt: new Date('2024-06-02'),
        durationSeconds: 1600,
        distanceMeters: 5100,
      },
    ]);

    const fiveK = efforts.find((e) => e.label === '5K');
    expect(fiveK?.activityId).toBe('a1');
    expect(fiveK?.durationSeconds).toBe(1500);
  });
});
