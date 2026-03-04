import { z } from 'zod';
import type { Dayjs } from 'dayjs';
import type { ScheduleItem, ScheduleType } from './scheduler';

const STORAGE_KEY = 'homi:schedules:v1';

const Schema = z
  .object({
    id: z.string(),
    label: z.string().min(1),
    type: z.enum(['daily', 'hourly', 'once']),
    enabled: z.boolean(),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    datetime: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'daily' && !v.time) {
      ctx.addIssue({ code: 'custom', message: 'daily 타입은 HH:mm이 필요합니다.' });
    }
    if (v.type === 'once' && !v.datetime) {
      ctx.addIssue({ code: 'custom', message: 'once 타입은 datetime 값이 필요합니다.' });
    }
  });

const ArrSchema = z.array(Schema);

export function loadSchedules(fallback: ScheduleItem[]): ScheduleItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const result = ArrSchema.safeParse(parsed);
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}

export function saveSchedules(schedules: ScheduleItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
}

export function buildSchedule(params: {
  label: string;
  type: ScheduleType;
  enabled: boolean;
  time?: string;
  datetime?: string;
}): { ok: true; value: ScheduleItem } | { ok: false; message: string } {
  const candidate: ScheduleItem = {
    id: crypto.randomUUID(),
    label: params.label.trim() || '새 알림',
    type: params.type,
    enabled: params.enabled,
    time: params.type === 'daily' ? params.time : undefined,
    datetime: params.type === 'once' ? params.datetime : undefined,
  };

  const result = Schema.safeParse(candidate);
  if (!result.success) {
    return { ok: false, message: result.error.issues[0]?.message ?? '잘못된 입력' };
  }

  return { ok: true, value: candidate };
}

export function normalizeOnceDatetimeInput(now: Dayjs) {
  return now.add(1, 'hour').format('YYYY-MM-DDTHH:mm');
}
