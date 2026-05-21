/**
 * Development seed script — generates realistic training data for testing.
 *
 * Usage (from repo root):
 *   dotenv -e .env -- node_modules/.pnpm/node_modules/.bin/tsx scripts/seed-dev.ts
 *   OR (easier):
 *   pnpm seed:dev
 *
 * Targets the FIRST non-deleted user in the DB. Run after logging in once via the web app.
 * Safe to run multiple times — uses upsert on all records.
 */

import { PrismaClient, type ActivityType } from '@prisma/client';
import { encryptToken } from '@trainlens/shared';

const prisma = new PrismaClient({ log: ['warn', 'error'] });

// ── helpers ───────────────────────────────────────────────────────────────────

const rng = (min: number, max: number) => min + Math.random() * (max - min);
const rngInt = (min: number, max: number) => Math.round(rng(min, max));
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

// ── segment definitions ───────────────────────────────────────────────────────

interface SegDef {
  externalId: string;
  name: string;
  activityType: ActivityType;
  distanceMeters: number;
  averageGrade?: number;
  maximumGrade?: number;
  elevationHigh?: number;
  elevationLow?: number;
  climbCategory?: number;
  city: string;
  country: string;
  /** baseline PR seconds — effort times will vary ±15% around this */
  basePrSeconds: number;
}

const SEGMENTS: SegDef[] = [
  { externalId: 'seg-001', name: 'Subida do Parque Central', activityType: 'Run', distanceMeters: 650, averageGrade: 6.2, maximumGrade: 12, elevationHigh: 85, elevationLow: 45, climbCategory: 1, city: 'Lisboa', country: 'Portugal', basePrSeconds: 165 },
  { externalId: 'seg-002', name: 'Sprint da Avenida da Liberdade', activityType: 'Run', distanceMeters: 420, averageGrade: 0.4, city: 'Lisboa', country: 'Portugal', basePrSeconds: 75 },
  { externalId: 'seg-003', name: 'Volta ao Lago', activityType: 'Run', distanceMeters: 2100, averageGrade: 1.1, city: 'Lisboa', country: 'Portugal', basePrSeconds: 570 },
  { externalId: 'seg-004', name: 'Rampa da Tapada', activityType: 'Run', distanceMeters: 380, averageGrade: 9.8, maximumGrade: 18, elevationHigh: 120, elevationLow: 83, climbCategory: 1, city: 'Lisboa', country: 'Portugal', basePrSeconds: 120 },
  { externalId: 'seg-005', name: 'Promenade do Tejo', activityType: 'Run', distanceMeters: 3200, averageGrade: -0.2, city: 'Lisboa', country: 'Portugal', basePrSeconds: 820 },
  { externalId: 'seg-006', name: 'Corte do Monsanto KOM', activityType: 'Run', distanceMeters: 1100, averageGrade: 5.5, maximumGrade: 14, elevationHigh: 230, elevationLow: 170, climbCategory: 1, city: 'Lisboa', country: 'Portugal', basePrSeconds: 310 },
  { externalId: 'seg-007', name: 'Baixa Pombalina Sprint', activityType: 'Run', distanceMeters: 280, averageGrade: 0.1, city: 'Lisboa', country: 'Portugal', basePrSeconds: 49 },
  { externalId: 'seg-008', name: 'Parque das Nações Loop', activityType: 'Run', distanceMeters: 4500, averageGrade: 0.3, city: 'Lisboa', country: 'Portugal', basePrSeconds: 1170 },
  { externalId: 'seg-009', name: 'Calçada do Combro', activityType: 'Run', distanceMeters: 520, averageGrade: 7.4, maximumGrade: 15, city: 'Lisboa', country: 'Portugal', basePrSeconds: 148 },
  { externalId: 'seg-010', name: 'Estrada de Sintra Climb', activityType: 'Ride', distanceMeters: 5800, averageGrade: 4.1, maximumGrade: 9, elevationHigh: 410, elevationLow: 170, climbCategory: 2, city: 'Sintra', country: 'Portugal', basePrSeconds: 980 },
  { externalId: 'seg-011', name: 'Descida da Serra de Sintra', activityType: 'Ride', distanceMeters: 6200, averageGrade: -3.8, city: 'Sintra', country: 'Portugal', basePrSeconds: 630 },
  { externalId: 'seg-012', name: 'Costa de Caparica Sprint', activityType: 'Ride', distanceMeters: 2400, averageGrade: 0.5, city: 'Caparica', country: 'Portugal', basePrSeconds: 280 },
  { externalId: 'seg-013', name: 'Arrábida Col', activityType: 'Ride', distanceMeters: 3900, averageGrade: 6.8, maximumGrade: 13, elevationHigh: 380, elevationLow: 120, climbCategory: 1, city: 'Setúbal', country: 'Portugal', basePrSeconds: 780 },
  { externalId: 'seg-014', name: 'Avenida Marginal Sprint', activityType: 'Ride', distanceMeters: 1800, averageGrade: 0.2, city: 'Cascais', country: 'Portugal', basePrSeconds: 195 },
  { externalId: 'seg-015', name: 'Campo Grande Boulevard', activityType: 'Run', distanceMeters: 890, averageGrade: 0.8, city: 'Lisboa', country: 'Portugal', basePrSeconds: 220 },
];

// ── activity type definitions ─────────────────────────────────────────────────

type WorkoutType = 'easy_run' | 'tempo_run' | 'long_run' | 'intervals' | 'recovery_run' | 'easy_ride' | 'tempo_ride' | 'long_ride';

interface WorkoutDef {
  type: ActivityType;
  workoutType: WorkoutType;
  distanceMin: number;
  distanceMax: number;
  paceMin: number;  // seconds/km
  paceMax: number;
  hrMin: number;
  hrMax: number;
  tssMin: number;
  tssMax: number;
  powerMin?: number;
  powerMax?: number;
}

const WORKOUT_DEFS: WorkoutDef[] = [
  { type: 'Run', workoutType: 'easy_run',     distanceMin: 7000,  distanceMax: 14000, paceMin: 310, paceMax: 380, hrMin: 128, hrMax: 148, tssMin: 45,  tssMax: 75 },
  { type: 'Run', workoutType: 'tempo_run',    distanceMin: 6000,  distanceMax: 12000, paceMin: 255, paceMax: 300, hrMin: 158, hrMax: 173, tssMin: 60,  tssMax: 90 },
  { type: 'Run', workoutType: 'long_run',     distanceMin: 16000, distanceMax: 32000, paceMin: 320, paceMax: 370, hrMin: 138, hrMax: 155, tssMin: 100, tssMax: 165 },
  { type: 'Run', workoutType: 'intervals',    distanceMin: 7000,  distanceMax: 11000, paceMin: 240, paceMax: 270, hrMin: 165, hrMax: 180, tssMin: 70,  tssMax: 100 },
  { type: 'Run', workoutType: 'recovery_run', distanceMin: 4000,  distanceMax: 8000,  paceMin: 370, paceMax: 420, hrMin: 115, hrMax: 132, tssMin: 25,  tssMax: 45 },
  { type: 'Ride', workoutType: 'easy_ride',   distanceMin: 35000, distanceMax: 60000, paceMin: 90,  paceMax: 110, hrMin: 125, hrMax: 145, tssMin: 55,  tssMax: 85,  powerMin: 155, powerMax: 195 },
  { type: 'Ride', workoutType: 'tempo_ride',  distanceMin: 50000, distanceMax: 80000, paceMin: 75,  paceMax: 90,  hrMin: 150, hrMax: 170, tssMin: 90,  tssMax: 130, powerMin: 205, powerMax: 255 },
  { type: 'Ride', workoutType: 'long_ride',   distanceMin: 80000, distanceMax: 140000,paceMin: 85,  paceMax: 100, hrMin: 138, hrMax: 158, tssMin: 140, tssMax: 210, powerMin: 175, powerMax: 215 },
];

// Run segments to assign to run activities
const RUN_SEGS = SEGMENTS.filter(s => s.activityType === 'Run');
const RIDE_SEGS = SEGMENTS.filter(s => s.activityType === 'Ride');

// ── generate a year of workout schedule ──────────────────────────────────────

interface PlannedWorkout {
  daysFromStart: number;
  def: WorkoutDef;
}

function generateSchedule(totalDays: number): PlannedWorkout[] {
  const schedule: PlannedWorkout[] = [];
  let day = 0;

  while (day < totalDays) {
    const weekType = Math.random() < 0.15 ? 'rest' : Math.random() < 0.2 ? 'peak' : 'normal';

    if (weekType === 'rest') {
      // Rest week: only 2-3 easy runs
      const restDays = [1, 3, 5].slice(0, rngInt(2, 3));
      for (const d of restDays) {
        if (day + d < totalDays) {
          schedule.push({ daysFromStart: day + d, def: WORKOUT_DEFS[0]! }); // easy run
        }
      }
    } else {
      // Normal / peak week: 4-6 workouts (80% run, 20% ride)
      const numWorkouts = weekType === 'peak' ? rngInt(5, 6) : rngInt(3, 5);
      const usedDays = new Set<number>();

      for (let i = 0; i < numWorkouts; i++) {
        let d: number;
        let attempts = 0;
        do { d = rngInt(0, 6); attempts++; } while (usedDays.has(d) && attempts < 20);
        usedDays.add(d);

        if (day + d >= totalDays) continue;

        // Workout selection based on position in week
        let def: WorkoutDef;
        if (d === 6 && weekType === 'peak') {
          def = WORKOUT_DEFS[2]!; // long run on "sunday" in peak weeks
        } else if (i === 0 && Math.random() < 0.25) {
          def = pick(WORKOUT_DEFS.slice(5)); // ride
        } else if (Math.random() < 0.15) {
          def = WORKOUT_DEFS[3]!; // intervals
        } else if (Math.random() < 0.2) {
          def = WORKOUT_DEFS[1]!; // tempo
        } else {
          def = WORKOUT_DEFS[0]!; // easy run
        }

        schedule.push({ daysFromStart: day + d, def });
      }
    }

    day += 7;
  }

  return schedule.sort((a, b) => a.daysFromStart - b.daysFromStart);
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Find target user
  const user = await prisma.user.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  if (!user) {
    console.error('No user found in DB. Log in via the web app first, then run this script.');
    process.exit(1);
  }
  console.log(`Seeding data for user: ${user.email} (${user.id})`);

  // 2. Upsert FTP/HR/weight if not set
  await prisma.user.update({
    where: { id: user.id },
    data: {
      ftpWatts: user.ftpWatts ?? 230,
      maxHeartRate: user.maxHeartRate ?? 183,
      weightKg: user.weightKg ?? 72,
      thresholdPaceSecondsPerKm: user.thresholdPaceSecondsPerKm ?? 270,
    },
  });

  // 3. Upsert a fake Strava connection (so the UI shows as connected)
  const fakeToken = encryptToken('seed_access_token_placeholder');
  const fakeRefresh = encryptToken('seed_refresh_token_placeholder');
  const connection = await prisma.connection.upsert({
    where: { userId_provider: { userId: user.id, provider: 'strava' } },
    update: { lastSyncedAt: new Date(), status: 'active' },
    create: {
      userId: user.id,
      provider: 'strava',
      externalAthleteId: '99999999',
      status: 'active',
      scope: 'activity:read_all',
      encryptedAccessToken: fakeToken,
      encryptedRefreshToken: fakeRefresh,
      tokenExpiresAt: new Date(Date.now() + 86_400_000 * 365),
      lastSyncedAt: new Date(),
    },
  });
  console.log(`Connection: ${connection.id}`);

  // 4. Upsert segments
  console.log('Upserting segments…');
  const segmentIds: Record<string, string> = {};
  for (const s of SEGMENTS) {
    const seg = await prisma.segment.upsert({
      where: { externalId: s.externalId },
      update: { name: s.name },
      create: {
        externalId: s.externalId,
        provider: 'strava',
        name: s.name,
        activityType: s.activityType,
        distanceMeters: s.distanceMeters,
        averageGrade: s.averageGrade ?? null,
        maximumGrade: s.maximumGrade ?? null,
        elevationHigh: s.elevationHigh ?? null,
        elevationLow: s.elevationLow ?? null,
        climbCategory: s.climbCategory ?? 0,
        city: s.city,
        country: s.country,
      },
    });
    segmentIds[s.externalId] = seg.id;
  }
  console.log(`  ${SEGMENTS.length} segments ready`);

  // 5. Generate activities over 12 months
  const TOTAL_DAYS = 365;
  const startDate = daysAgo(TOTAL_DAYS);
  const schedule = generateSchedule(TOTAL_DAYS);
  console.log(`Generating ${schedule.length} activities…`);

  type EffortEntry = {
    segExternalId: string;
    activityExternalId: string;
    date: Date;
    elapsedSeconds: number;
    averageHR?: number;
    averageWatts?: number;
    prRank?: number;
  };
  const segEffortsToCreate: EffortEntry[] = [];

  // fitness improvement factor over time (earlier = slower)
  const fitnessProgress = (dayIdx: number) => 0.85 + 0.15 * (dayIdx / TOTAL_DAYS);

  let activityCounter = 0;
  for (const { daysFromStart, def } of schedule) {
    activityCounter++;
    const actDate = addDays(startDate, daysFromStart);
    const externalId = `seed-${activityCounter}-${daysFromStart}`;
    const fitness = fitnessProgress(daysFromStart);

    const distance = rng(def.distanceMin, def.distanceMax);
    const pace = rng(def.paceMin * (2 - fitness), def.paceMax * (2 - fitness));
    const duration = Math.round(distance / 1000 * pace);
    const hr = rngInt(def.hrMin, def.hrMax);
    const tss = rng(def.tssMin, def.tssMax);
    const elevGain = def.type === 'Run' ? rng(20, 180) : rng(100, 800);

    const speedMs = 1000 / pace;
    const avgPace = Math.round(pace);

    await prisma.activity.upsert({
      where: { userId_provider_externalId_startedAt: {
        userId: user.id,
        provider: 'strava',
        externalId,
        startedAt: actDate,
      }},
      update: {},
      create: {
        userId: user.id,
        connectionId: connection.id,
        provider: 'strava',
        externalId,
        name: activityName(def),
        activityType: def.type,
        startedAt: actDate,
        durationSeconds: duration,
        timezone: 'Europe/Lisbon',
        distanceMeters: distance,
        elevationGainMeters: elevGain,
        averageHeartRate: hr,
        maxHeartRate: Math.min(def.hrMax + rngInt(5, 20), 185),
        averagePaceSecondsPerKm: def.type === 'Run' ? avgPace : null,
        averagePowerWatts: def.powerMin ? rng(def.powerMin, def.powerMax!) : null,
        tss,
        manual: false,
      },
    });

    // Assign 1-3 segment efforts to this activity
    const eligibleSegs = def.type === 'Run' ? RUN_SEGS : RIDE_SEGS;
    const numSegs = Math.random() < 0.3 ? 0 : rngInt(1, Math.min(3, eligibleSegs.length));
    const chosenSegs = [...eligibleSegs].sort(() => Math.random() - 0.5).slice(0, numSegs);

    for (const seg of chosenSegs) {
      // Faster over time (fitness improves), with ±8% noise
      const noise = 1 + (Math.random() - 0.5) * 0.16;
      const elapsed = Math.round(seg.basePrSeconds * (2 - fitness) * noise);
      const effortEntry: EffortEntry = {
        segExternalId: seg.externalId,
        activityExternalId: externalId,
        date: actDate,
        elapsedSeconds: elapsed,
        averageHR: hr + rngInt(-10, 10),
      };
      if (def.powerMin) effortEntry.averageWatts = rng(def.powerMin, def.powerMax!);
      segEffortsToCreate.push(effortEntry);
    }
  }

  // 6. Upsert segment efforts
  console.log(`Upserting ${segEffortsToCreate.length} segment efforts…`);
  // Compute PR rank per segment (1 = fastest)
  const bySegment = new Map<string, typeof segEffortsToCreate>();
  for (const e of segEffortsToCreate) {
    const arr = bySegment.get(e.segExternalId) ?? [];
    arr.push(e);
    bySegment.set(e.segExternalId, arr);
  }

  let effortIdx = 0;
  for (const [segExternalId, efforts] of bySegment) {
    const sorted = [...efforts].sort((a, b) => a.elapsedSeconds - b.elapsedSeconds);
    for (const effort of efforts) {
      effortIdx++;
      const rank = sorted.findIndex(e => e === effort) + 1;
      const segId = segmentIds[segExternalId]!;
      const effortExtId = `seed-effort-${segExternalId}-${effort.activityExternalId}`;

      await prisma.segmentEffort.upsert({
        where: { externalEffortId: effortExtId },
        update: { elapsedSeconds: effort.elapsedSeconds, prRank: rank },
        create: {
          userId: user.id,
          segmentId: segId,
          activityExternalId: effort.activityExternalId,
          externalEffortId: effortExtId,
          elapsedSeconds: effort.elapsedSeconds,
          movingSeconds: Math.round(effort.elapsedSeconds * 0.98),
          startDate: effort.date,
          averageHeartRate: effort.averageHR ?? null,
          averageWatts: effort.averageWatts ?? null,
          prRank: rank === 1 ? 1 : null,
        },
      });
    }
  }
  console.log(`  ${effortIdx} efforts upserted`);

  // 7. Compute daily metrics
  console.log('Computing daily metrics…');
  const activities = await prisma.activity.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { startedAt: 'asc' },
  });

  const dailyMap = new Map<string, {
    totalActivities: number;
    totalDistanceMeters: number;
    totalDurationSeconds: number;
    totalElevationGainMeters: number;
    totalCalories: number;
    tss: number;
  }>();

  for (const act of activities) {
    const key = act.startedAt.toISOString().slice(0, 10);
    const existing = dailyMap.get(key) ?? { totalActivities: 0, totalDistanceMeters: 0, totalDurationSeconds: 0, totalElevationGainMeters: 0, totalCalories: 0, tss: 0 };
    existing.totalActivities++;
    existing.totalDistanceMeters += act.distanceMeters ?? 0;
    existing.totalDurationSeconds += act.durationSeconds;
    existing.totalElevationGainMeters += act.elevationGainMeters ?? 0;
    existing.tss += act.tss ?? 0;
    dailyMap.set(key, existing);
  }

  // CTL/ATL rolling averages
  const CTL_K = 2 / (42 + 1);
  const ATL_K = 2 / (7 + 1);
  let ctl = 0;
  let atl = 0;

  const sortedDays = [...dailyMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [dateStr, metrics] of sortedDays) {
    ctl = metrics.tss * CTL_K + ctl * (1 - CTL_K);
    atl = metrics.tss * ATL_K + atl * (1 - ATL_K);
    const tsb = ctl - atl;
    const date = new Date(dateStr + 'T12:00:00.000Z');

    await prisma.dailyMetrics.upsert({
      where: { userId_date: { userId: user.id, date } },
      update: { ...metrics, ctl, atl, tsb },
      create: { userId: user.id, date, ...metrics, ctl, atl, tsb },
    });
  }
  console.log(`  ${sortedDays.length} daily metric rows`);

  // Final summary
  const actCount = await prisma.activity.count({ where: { userId: user.id, deletedAt: null } });
  const segCount = await prisma.segment.count();
  const effortCount = await prisma.segmentEffort.count({ where: { userId: user.id } });
  console.log('\n✅ Seed complete:');
  console.log(`   Activities:      ${actCount}`);
  console.log(`   Segments:        ${segCount}`);
  console.log(`   Segment efforts: ${effortCount}`);
}

function activityName(def: WorkoutDef): string {
  const runNames: Record<WorkoutType, string[]> = {
    easy_run: ['Corrida suave', 'Easy run', 'Treino leve', 'Manhã tranquila', 'Jog matinal'],
    tempo_run: ['Tempo run', 'Ritmo limiar', 'Treino de ritmo', 'Corrida intensa'],
    long_run: ['Long run', 'Saída longa', 'Corrida longa', 'Domingo longo'],
    intervals: ['Intervalos', 'Série de pista', 'Treino de velocidade', 'Fartlek'],
    recovery_run: ['Recuperação ativa', 'Corrida de recuperação', 'Descongestão'],
    easy_ride: ['Pedalada suave', 'Easy ride', 'Volta tranquila', 'Bicicleta matinal'],
    tempo_ride: ['Tempo ride', 'Pedalada de ritmo', 'Treino ciclismo'],
    long_ride: ['Saída longa de bicicleta', 'Long ride', 'Grande fundo'],
  };
  return pick(runNames[def.workoutType]);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
