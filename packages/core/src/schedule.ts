import { DateTime } from "luxon";
import type { Cadence, DcaSchedule, ExecutionOccurrence } from "./types.js";
import { occurrenceId } from "./ids.js";

export function getDueOccurrences(schedule: DcaSchedule, now = new Date()): ExecutionOccurrence[] {
  if (schedule.status !== "active") return [];
  const dueAt = DateTime.fromISO(schedule.nextRunAt, { zone: "utc" });
  if (!dueAt.isValid || dueAt > DateTime.fromJSDate(now, { zone: "utc" })) return [];
  const scheduledFor = toCanonicalIso(dueAt);

  return [
    {
      scheduleId: schedule.id,
      scheduledFor,
      occurrenceId: occurrenceId(schedule.id, scheduledFor),
    },
  ];
}

export function advanceAfterRun(schedule: DcaSchedule, completedAt = new Date()): DcaSchedule {
  const runCount = schedule.runCount + 1;
  const nextRunAt = computeNextRun(schedule.cadence, {
    timezone: schedule.timezone,
    fromIso: completedAt.toISOString(),
    startAtIso: schedule.startAt,
  });

  const shouldPause =
    (schedule.risk.maxRuns !== undefined && runCount >= schedule.risk.maxRuns) ||
    (schedule.risk.endAt !== undefined && DateTime.fromISO(nextRunAt) > DateTime.fromISO(schedule.risk.endAt));

  return {
    ...schedule,
    status: shouldPause ? "paused" : schedule.status,
    runCount,
    lastRunAt: completedAt.toISOString(),
    nextRunAt,
    updatedAt: new Date().toISOString(),
  };
}

export function computeInitialNextRun(cadence: Cadence, timezone: string, startAtIso: string, now = new Date()): string {
  const start = DateTime.fromISO(startAtIso, { zone: "utc" });
  const from = DateTime.max(start, DateTime.fromJSDate(now, { zone: "utc" }));
  return computeNextRun(cadence, {
    timezone,
    fromIso: from.minus({ seconds: 1 }).toISO() ?? from.toISO() ?? startAtIso,
    startAtIso,
  });
}

export function computeNextRun(
  cadence: Cadence,
  options: { timezone: string; fromIso: string; startAtIso: string },
): string {
  const zone = options.timezone;
  const from = DateTime.fromISO(options.fromIso, { zone: "utc" }).setZone(zone);
  const start = DateTime.fromISO(options.startAtIso, { zone: "utc" }).setZone(zone);

  if (!from.isValid) throw new Error("Invalid from date.");
  if (!start.isValid) throw new Error("Invalid schedule start date.");

  const candidate = nextLocalCandidate(cadence, from, start);
  return toCanonicalIso(candidate);
}

function toCanonicalIso(value: DateTime): string {
  return value.toUTC().toISO({ suppressMilliseconds: true }) ?? value.toUTC().toISO() ?? value.toJSDate().toISOString();
}

function nextLocalCandidate(cadence: Cadence, from: DateTime, start: DateTime): DateTime {
  switch (cadence.kind) {
    case "interval": {
      const base = DateTime.max(from, start);
      const elapsed = Math.max(0, Math.floor(base.diff(start, "minutes").minutes));
      const periods = Math.floor(elapsed / cadence.everyMinutes) + 1;
      return start.plus({ minutes: periods * cadence.everyMinutes });
    }
    case "daily": {
      return findNextByDay(from, cadence.time, () => true);
    }
    case "weekly": {
      const daySet = new Set(cadence.daysOfWeek);
      return findNextByDay(from, cadence.time, (candidate) => daySet.has(candidate.weekday));
    }
    case "monthly": {
      const [hour, minute] = parseTime(cadence.time);
      for (let offset = 0; offset < 18; offset += 1) {
        const monthBase = from.plus({ months: offset });
        const day = Math.min(cadence.dayOfMonth, monthBase.daysInMonth ?? cadence.dayOfMonth);
        const candidate = monthBase.set({ day, hour, minute, second: 0, millisecond: 0 });
        if (candidate > from) return candidate;
      }
      throw new Error("Unable to compute next monthly run.");
    }
  }
}

function findNextByDay(from: DateTime, time: string, predicate: (candidate: DateTime) => boolean): DateTime {
  const [hour, minute] = parseTime(time);
  for (let offset = 0; offset < 370; offset += 1) {
    const candidate = from.plus({ days: offset }).set({ hour, minute, second: 0, millisecond: 0 });
    if (candidate > from && predicate(candidate)) return candidate;
  }
  throw new Error("Unable to compute next run.");
}

function parseTime(time: string): [number, number] {
  const [hour, minute] = time.split(":").map(Number);
  if (hour === undefined || minute === undefined || Number.isNaN(hour) || Number.isNaN(minute)) {
    throw new Error("Invalid HH:mm time.");
  }
  return [hour, minute];
}
