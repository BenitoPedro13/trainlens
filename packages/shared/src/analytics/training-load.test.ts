import { computeTrainingLoadSeries, fillDailyTssTimeline } from './training-load.js';

describe('computeTrainingLoadSeries', () => {
  it('builds CTL/ATL/TSB for a 30-day constant load', () => {
    const daily = Array.from({ length: 30 }, (_, i) => {
      const d = new Date('2024-01-01T00:00:00.000Z');
      d.setUTCDate(d.getUTCDate() + i);
      return { date: d.toISOString().slice(0, 10), tss: 100 };
    });

    const series = computeTrainingLoadSeries(daily);
    const last = series[series.length - 1]!;

    expect(last.tss).toBe(100);
    expect(last.ctl).toBeGreaterThan(50);
    expect(last.atl).toBeGreaterThan(90);
    expect(last.tsb).toBeCloseTo(last.ctl - last.atl, 0);
    expect(series[series.length - 1]!.ctl).toBeGreaterThan(series[0]!.ctl);
  });

  it('decays load on rest days in timeline filler', () => {
    const map = new Map([
      ['2024-01-01', 100],
      ['2024-01-02', 0],
      ['2024-01-03', 0],
    ]);
    const timeline = fillDailyTssTimeline(map, '2024-01-01', '2024-01-03');
    const series = computeTrainingLoadSeries(timeline);

    expect(series).toHaveLength(3);
    expect(series[2]!.ctl).toBeLessThan(series[0]!.ctl);
  });
});
