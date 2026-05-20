import { auth } from '@/auth';
import { getAnalyticsSummary, getHeatmap } from '@/lib/api-client';
import { StatCard } from '@/components/stat-card';
import { WeeklyVolumeChart } from '@/components/weekly-volume-chart';
import { SportChart } from '@/components/sport-chart';
import { ActivityHeatmap } from '@/components/activity-heatmap';
import { formatDistance, formatDuration } from '@/lib/format';

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const email = session!.user!.email;

  const [summary, heatmap] = await Promise.all([
    getAnalyticsSummary(userId, email),
    getHeatmap(userId, new Date().getUTCFullYear(), email),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Resumo das suas atividades sincronizadas.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Atividades" value={String(summary.totalActivities)} />
        <StatCard label="Distância total" value={formatDistance(summary.totalDistanceMeters)} />
        <StatCard
          label="Tempo total"
          value={formatDuration(summary.totalDurationSeconds)}
        />
        <StatCard
          label="Sequência atual"
          value={`${summary.currentStreakDays} dias`}
          sub={`Recorde: ${summary.longestStreakDays} dias`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Volume semanal (12 semanas)</h2>
          <WeeklyVolumeChart data={summary.weeklyVolume} />
        </section>
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Por modalidade</h2>
          <SportChart data={summary.sportDistribution} />
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Mapa de atividade</h2>
        <ActivityHeatmap data={heatmap} year={new Date().getUTCFullYear()} />
      </section>
    </div>
  );
}
