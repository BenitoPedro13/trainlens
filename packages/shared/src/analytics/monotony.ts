/** Training monotony = mean daily TSS / standard deviation (recent load days). */
export function computeMonotony(dailyTss: number[]): number {
  const active = dailyTss.filter((t) => t > 0);
  if (active.length < 2) return 0;
  const mean = active.reduce((s, t) => s + t, 0) / active.length;
  const variance = active.reduce((s, t) => s + (t - mean) ** 2, 0) / active.length;
  const std = Math.sqrt(variance);
  if (std <= 0) return 0;
  return Math.round((mean / std) * 100) / 100;
}

/** Acute:chronic workload ratio (ATL / CTL). */
export function computeAcuteChronicRatio(atl: number, ctl: number): number {
  if (ctl <= 0) return 0;
  return Math.round((atl / ctl) * 100) / 100;
}
