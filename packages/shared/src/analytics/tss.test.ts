import { calculateActivityTss, DEFAULT_FTP_WATTS } from './tss.js';

describe('calculateActivityTss', () => {
  it('computes power-based TSS for cycling', () => {
    const tss = calculateActivityTss({
      durationSeconds: 3600,
      activityType: 'Ride',
      averagePowerWatts: DEFAULT_FTP_WATTS,
      normalizedPowerWatts: DEFAULT_FTP_WATTS,
    });
    expect(tss).toBe(100);
  });

  it('computes HR-based TSS when heart rate is present', () => {
    const tss = calculateActivityTss({
      durationSeconds: 3600,
      activityType: 'Run',
      averageHeartRate: 170,
      maxHeartRate: 190,
    });
    expect(tss).toBeGreaterThan(50);
    expect(tss).toBeLessThan(150);
  });

  it('computes pace-based TSS for runs', () => {
    const tss = calculateActivityTss({
      durationSeconds: 1800,
      activityType: 'Run',
      averagePaceSecondsPerKm: 300,
    });
    expect(tss).toBe(50);
  });

  it('uses duration fallback for other sports', () => {
    const tss = calculateActivityTss({
      durationSeconds: 3600,
      activityType: 'Yoga',
    });
    expect(tss).toBe(40);
  });
});
