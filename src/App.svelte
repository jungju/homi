<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import dayjs from 'dayjs';
  import utc from 'dayjs/plugin/utc';
  import timezone from 'dayjs/plugin/timezone';
  import {
    SchedulerEngine,
    findNextEvent,
    formatSchedule,
    getDefaultSchedules,
    type ScheduleItem
  } from './lib/scheduler';

  dayjs.extend(utc);
  dayjs.extend(timezone);

  const TZ = 'Asia/Seoul';
  const BUILD_VERSION = 'unknown';

  interface LogItem {
    id: string;
    text: string;
  }

  interface VersionInfo {
    buildTime: string;
    commit: string;
  }

  let now = dayjs().tz(TZ);
  let online = true;
  let buildVersion = BUILD_VERSION;
  let versionInfo: VersionInfo | null = null;

  let schedules: ScheduleItem[] = [];
  let nextScheduleText = '-';
  let logs: LogItem[] = [];
  let hasPendingSound = false;

  let clockTimer: ReturnType<typeof setTimeout> | undefined;
  let versionTimer: ReturnType<typeof setTimeout> | undefined;
  let scheduler: SchedulerEngine | undefined;

  function getNow() {
    return dayjs().tz(TZ);
  }

  function appendLog(text: string) {
    const stamp = getNow().format('YYYY-MM-DD HH:mm:ss');
    logs = [{ id: crypto.randomUUID(), text: `[${stamp}] ${text}` }, ...logs].slice(0, 120);
  }

  function updateNextSchedule() {
    const nextEvent = findNextEvent(schedules, getNow());
    nextScheduleText = nextEvent
      ? `${nextEvent.runAt.tz(TZ).format('MM-DD HH:mm')} · ${nextEvent.schedule.label}`
      : '활성 스케줄 없음';
  }

  async function fetchVersion() {
    try {
      const res = await fetch(`version.json?ts=${Date.now()}`);
      if (!res.ok) return;
      const payload = (await res.json()) as VersionInfo;

      if (payload.commit && versionInfo?.commit && payload.commit !== versionInfo.commit) {
        location.reload();
        return;
      }

      versionInfo = payload;
      buildVersion = payload.commit?.slice(0, 7) || BUILD_VERSION;
    } catch {
      // ignore
    }
  }

  async function pollVersionLoop() {
    await fetchVersion();
    versionTimer = setTimeout(pollVersionLoop, 60_000);
  }

  function tickClock() {
    now = getNow();
    updateNextSchedule();
    clockTimer = setTimeout(tickClock, 1000);
  }

  function handleOnline() {
    online = navigator.onLine;
  }

  onMount(() => {
    online = navigator.onLine;
    schedules = getDefaultSchedules(getNow());

    updateNextSchedule();
    tickClock();
    pollVersionLoop();

    scheduler = new SchedulerEngine(
      () => getNow(),
      () => schedules,
      ({ schedule, triggerAt }) => {
        appendLog(`${schedule.label} 이벤트 발생 (${triggerAt.tz(TZ).format('HH:mm:ss')})`);
        hasPendingSound = true;

        if (schedule.type === 'once') {
          schedules = schedules.map((s) => (s.id === schedule.id ? { ...s, enabled: false } : s));
          updateNextSchedule();
        }
      }
    );

    scheduler.start();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOnline);
  });

  onDestroy(() => {
    if (clockTimer) clearTimeout(clockTimer);
    if (versionTimer) clearTimeout(versionTimer);
    scheduler?.stop();
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOnline);
  });
</script>

<main class="kiosk">
  <header class="topbar">
    <h1>Homi</h1>
    <div class="status-row">
      <span class="time">{now.format('YYYY-MM-DD HH:mm:ss')} KST</span>
      <span class:online class="badge">{online ? 'Online' : 'Offline'}</span>
      <span class="badge">build {buildVersion}</span>
    </div>
  </header>

  <section class="robot-face" aria-label="robot face dashboard">
    <div class="eye left">
      <h2>오늘 일정</h2>
      <p class="muted">다음: {nextScheduleText}</p>
      <ul>
        {#each schedules as item}
          <li>{formatSchedule(item)}</li>
        {/each}
      </ul>
    </div>

    <div class="eye right">
      <h2>알림 로그</h2>
      {#if logs.length === 0}
        <p class="muted">아직 기록 없음</p>
      {:else}
        <ul class="log-list">
          {#each logs as entry (entry.id)}
            <li>{entry.text}</li>
          {/each}
        </ul>
      {/if}
    </div>

    <div class="mouth {hasPendingSound ? 'active' : ''}">
      <span class="mouth-label">SOUND</span>
      <strong>{hasPendingSound ? 'PENDING' : 'IDLE'}</strong>
      <small>자동 재생 없음 · 수동 재생 연결 전용</small>
    </div>
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    min-height: 100vh;
    background: radial-gradient(circle at top, #1f2937 0%, #0b0f16 65%);
    color: #eaf2ff;
    overflow: hidden;
  }

  :global(#app) {
    min-height: 100vh;
  }

  .kiosk {
    min-height: 100vh;
    padding: 1.2rem;
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 1rem;
    font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif;
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid #2c3b52;
    border-radius: 14px;
    padding: 0.85rem 1rem;
    background: rgba(13, 18, 24, 0.9);
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  .status-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .time {
    font-size: 0.9rem;
    color: #99a8bd;
  }

  .badge {
    border: 1px solid #3f4f68;
    border-radius: 999px;
    font-size: 0.75rem;
    padding: 0.2rem 0.55rem;
    color: #d7e3f4;
  }

  .online {
    color: #8ef8b6;
    border-color: #2f8057;
  }

  .robot-face {
    position: relative;
    border: 1px solid #2d3a4e;
    border-radius: 24px;
    background: linear-gradient(160deg, rgba(17, 24, 39, 0.94), rgba(10, 14, 22, 0.96));
    padding: 1rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr auto;
    gap: 1rem;
    min-height: 0;
    box-shadow: inset 0 0 40px rgba(64, 117, 255, 0.12);
  }

  .eye {
    border: 1px solid #3b4d68;
    border-radius: 18px;
    background: radial-gradient(circle at top, rgba(38, 78, 143, 0.28), rgba(16, 26, 40, 0.95));
    padding: 0.9rem;
    display: grid;
    align-content: start;
    gap: 0.6rem;
    min-height: 0;
  }

  .mouth {
    grid-column: 1 / -1;
    border: 1px solid #3b4d68;
    border-radius: 14px;
    padding: 0.8rem 1rem;
    display: grid;
    gap: 0.2rem;
    justify-items: center;
    background: rgba(9, 14, 22, 0.9);
    color: #9eb0c8;
  }

  .mouth.active {
    border-color: #8c5a22;
    color: #ffdca5;
    box-shadow: inset 0 0 24px rgba(255, 169, 56, 0.2);
  }

  .mouth-label {
    font-size: 0.72rem;
    letter-spacing: 0.12em;
  }

  ul {
    margin: 0;
    padding-left: 1rem;
    display: grid;
    gap: 0.4rem;
  }

  li {
    font-size: 0.9rem;
    color: #d6e4ff;
  }

  .log-list {
    max-height: 44vh;
    overflow: auto;
    padding-right: 0.4rem;
  }

  .muted {
    color: #8ea0b8;
    font-size: 0.88rem;
  }

  @media (max-width: 960px) {
    .robot-face {
      grid-template-columns: 1fr;
    }

    .topbar {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.6rem;
    }

    .status-row {
      justify-content: flex-start;
    }
  }
</style>
