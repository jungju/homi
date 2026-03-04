import dayjs, { type Dayjs } from 'dayjs';

export type ScheduleType = 'daily' | 'hourly' | 'once';

export interface ScheduleItem {
  id: string;
  label: string;
  type: ScheduleType;
  enabled: boolean;
  time?: string;
  datetime?: string;
}

export interface TriggeredEvent {
  schedule: ScheduleItem;
  triggerAt: Dayjs;
}

export interface NextEvent {
  schedule: ScheduleItem;
  runAt: Dayjs;
}

const MAX_TIMEOUT_MS = 2_147_483_647;

export function getDefaultSchedules(now: Dayjs): ScheduleItem[] {
  return [
    {
      id: 'wake-up',
      label: '기상 알림',
      type: 'daily',
      time: '07:00',
      enabled: true,
    },
    {
      id: 'check-today',
      label: '오늘 일정 확인',
      type: 'daily',
      time: '09:00',
      enabled: true,
    },
    {
      id: 'hourly-chime',
      label: '정각 알림',
      type: 'hourly',
      enabled: true,
    },
    {
      id: 'boot-once',
      label: '초기 점검',
      type: 'once',
      datetime: now.add(10, 'minute').toISOString(),
      enabled: false,
    },
  ];
}

export function formatSchedule(schedule: ScheduleItem): string {
  if (schedule.type === 'daily') {
    return `${schedule.time ?? '--:--'} ${schedule.label}`;
  }
  if (schedule.type === 'hourly') {
    return `매시간 정각 ${schedule.label}`;
  }
  return `${schedule.datetime ?? '-'} ${schedule.label}`;
}

export function findNextEvent(schedules: ScheduleItem[], now: Dayjs): NextEvent | null {
  let best: NextEvent | null = null;

  for (const schedule of schedules) {
    if (!schedule.enabled) {
      continue;
    }

    const runAt = computeNextRun(schedule, now);
    if (!runAt) {
      continue;
    }

    if (!best || runAt.valueOf() < best.runAt.valueOf()) {
      best = { schedule, runAt };
    }
  }

  return best;
}

function computeNextRun(schedule: ScheduleItem, now: Dayjs): Dayjs | null {
  if (schedule.type === 'hourly') {
    const thisHour = now.startOf('hour');
    if (now.isSame(thisHour)) {
      return now;
    }
    return thisHour.add(1, 'hour');
  }

  if (schedule.type === 'daily') {
    if (!schedule.time) {
      return null;
    }

    const [hour, minute] = schedule.time.split(':').map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return null;
    }

    let candidate = now.hour(hour).minute(minute).second(0).millisecond(0);
    if (candidate.valueOf() < now.valueOf()) {
      candidate = candidate.add(1, 'day');
    }
    return candidate;
  }

  if (!schedule.datetime) {
    return null;
  }

  const at = dayjs(schedule.datetime);
  if (!at.isValid() || at.valueOf() < now.valueOf()) {
    return null;
  }
  return at;
}

export class SchedulerEngine {
  private readonly getNow: () => Dayjs;
  private readonly getSchedules: () => ScheduleItem[];
  private readonly onTrigger: (event: TriggeredEvent) => void;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;

  constructor(
    getNow: () => Dayjs,
    getSchedules: () => ScheduleItem[],
    onTrigger: (event: TriggeredEvent) => void,
  ) {
    this.getNow = getNow;
    this.getSchedules = getSchedules;
    this.onTrigger = onTrigger;
  }

  start() {
    if (this.running) {
      return;
    }
    this.running = true;
    this.planNext();
  }

  stop() {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  refresh() {
    if (!this.running) {
      return;
    }
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.planNext();
  }

  private planNext() {
    if (!this.running) {
      return;
    }

    const now = this.getNow();
    const nextEvent = findNextEvent(this.getSchedules(), now);

    if (!nextEvent) {
      this.timer = undefined;
      return;
    }

    const delay = Math.max(nextEvent.runAt.valueOf() - now.valueOf(), 0);
    const chunkDelay = Math.min(delay, MAX_TIMEOUT_MS);

    this.timer = setTimeout(() => {
      if (!this.running) {
        return;
      }

      const currentNow = this.getNow();
      const latestNext = findNextEvent(this.getSchedules(), currentNow);

      if (!latestNext) {
        this.planNext();
        return;
      }

      if (latestNext.runAt.valueOf() > currentNow.valueOf()) {
        this.planNext();
        return;
      }

      this.onTrigger({ schedule: latestNext.schedule, triggerAt: currentNow });
      this.planNext();
    }, chunkDelay);
  }
}
