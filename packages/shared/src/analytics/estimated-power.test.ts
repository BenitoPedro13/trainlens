import { estimateActivityPower } from './estimated-power.js';

describe('estimateActivityPower', () => {
  it('returns null when real power exists', () => {
    expect(
      estimateActivityPower({
        activityType: 'Ride',
        durationSeconds: 3600,
        distanceMeters: 40_000,
        averagePowerWatts: 200,
      }),
    ).toBeNull();
  });

  it('estimates running power from pace and distance', () => {
    const watts = estimateActivityPower({
      activityType: 'Run',
      durationSeconds: 3600,
      distanceMeters: 10_000,
      weightKg: 70,
    });
    expect(watts).not.toBeNull();
    expect(watts!).toBeGreaterThan(100);
    expect(watts!).toBeLessThan(500);
  });

  it('estimates cycling power on flat ride', () => {
    const watts = estimateActivityPower({
      activityType: 'Ride',
      durationSeconds: 3600,
      distanceMeters: 30_000,
      elevationGainMeters: 100,
      weightKg: 75,
    });
    expect(watts).not.toBeNull();
    expect(watts!).toBeGreaterThan(50);
  });
});
