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
    type ScheduleItem,
    type ScheduleType
  } from './lib/scheduler';
  import {
    buildSchedule,
    loadSchedules,
    normalizeOnceDatetimeInput,
    saveSchedules
  } from './lib/settings';

  dayjs.extend(utc);
  dayjs.extend(timezone);

  const TZ = 'Asia/Seoul';
  const BUILD_VERSION = 'unknown';

  interface LogItem {
    id: string;
    text: string;
  }

  let now = dayjs().tz(TZ);
  let online = true;
  let clockTimer: ReturnType<typeof setTimeout> | undefined;
  let scheduler: SchedulerEngine | undefined;

  let schedules: ScheduleItem[] = [];
  let nextScheduleText = '-';
  let logs: LogItem[] = [];
  let hasPendingSound = false;
  let alertAudio: HTMLAudioElement | null = null;

  let settingsOpen = false;
  let formLabel = '';
  let formType: ScheduleType = 'daily';
  let formTime = '07:00';
  let formDatetime = '';
  let formEnabled = true;

  function getNow() {
    return dayjs().tz(TZ);
  }

  function appendLog(text: string) {
    const stamp = getNow().format('YYYY-MM-DD HH:mm:ss');
    const nextItem = {
      id: crypto.randomUUID(),
      text: `[${stamp}] ${text}`
    };
    logs = [nextItem, ...logs].slice(0, 120);
  }

  function updateNextSchedule() {
    const nextEvent = findNextEvent(schedules, getNow());
    nextScheduleText = nextEvent
      ? `${nextEvent.runAt.tz(TZ).format('MM-DD HH:mm')} · ${nextEvent.schedule.label}`
      : '활성 스케줄 없음';
  }

  function syncSchedules(next: ScheduleItem[]) {
    schedules = next;
    saveSchedules(schedules);
    updateNextSchedule();
    scheduler?.refresh();
  }

  function addSchedule() {
    const result = buildSchedule({
      label: formLabel,
      type: formType,
      enabled: formEnabled,
      time: formTime,
      datetime: formDatetime
    });

    if (!result.ok) {
      alert(result.message);
      return;
    }

    syncSchedules([result.value, ...schedules]);
    formLabel = '';
    formType = 'daily';
    formTime = '07:00';
    formDatetime = normalizeOnceDatetimeInput(getNow());
    formEnabled = true;
  }

  function toggleSchedule(id: string) {
    syncSchedules(schedules.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  }

  function removeSchedule(id: string) {
    syncSchedules(schedules.filter((s) => s.id !== id));
  }

  async function playPendingSound() {
    if (!hasPendingSound || !alertAudio) {
      return;
    }

    try {
      alertAudio.currentTime = 0;
      await alertAudio.play();
      hasPendingSound = false;
      appendLog('사운드 수동 재생');
    } catch {
      appendLog('사운드 재생 실패 (브라우저 권한 확인 필요)');
    }
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

    const defaults = getDefaultSchedules(getNow());
    schedules = loadSchedules(defaults);
    formDatetime = normalizeOnceDatetimeInput(getNow());

    updateNextSchedule();
    tickClock();

    scheduler = new SchedulerEngine(
      () => getNow(),
      () => schedules,
      ({ schedule, triggerAt }) => {
        appendLog(`${schedule.label} 이벤트 발생 (${triggerAt.tz(TZ).format('HH:mm:ss')})`);
        hasPendingSound = true;

        if (schedule.type === 'once') {
          syncSchedules(
            schedules.map((s) => (s.id === schedule.id ? { ...s, enabled: false } : s))
          );
        }
      }
    );

    scheduler.start();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOnline);
  });

  onDestroy(() => {
    if (clockTimer) {
      clearTimeout(clockTimer);
    }
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
      <span class="badge">build {BUILD_VERSION}</span>
      <button class="settings-btn" type="button" on:click={() => (settingsOpen = !settingsOpen)}
        >설정</button
      >
    </div>
  </header>

  <section class="content-grid">
    <article class="panel">
      <h2>오늘 일정</h2>
      <p class="muted">다음 이벤트: {nextScheduleText}</p>
      <ul>
        {#each schedules as item}
          <li>{formatSchedule(item)} {item.enabled ? '' : '(비활성)'}</li>
        {/each}
      </ul>
    </article>

    <article class="panel">
      <h2>알림 로그 {#if hasPendingSound}<span class="pending-dot">●</span>{/if}</h2>
      {#if logs.length === 0}
        <p class="muted">아직 기록이 없습니다.</p>
      {:else}
        <ul class="log-list">
          {#each logs as entry (entry.id)}
            <li>{entry.text}</li>
          {/each}
        </ul>
      {/if}
    </article>
  </section>

  <footer class="panel sound-panel">
    <div>
      <h2>사운드 있음</h2>
      <p class="muted">{hasPendingSound ? '대기 중인 알림음이 있습니다.' : '대기 중인 알림음이 없습니다.'}</p>
    </div>
    <div class="sound-controls">
      <span class:active={hasPendingSound} class="sound-badge">{hasPendingSound ? 'ON' : 'OFF'}</span>
      <button type="button" on:click={playPendingSound} disabled={!hasPendingSound}>재생</button>
      <audio bind:this={alertAudio} preload="auto" src="/sounds/chime.mp3"></audio>
    </div>
  </footer>

  {#if settingsOpen}
    <section class="panel settings-panel">
      <h2>설정</h2>
      <div class="settings-form">
        <input placeholder="알림 이름" bind:value={formLabel} />
        <select bind:value={formType}>
          <option value="daily">daily HH:mm</option>
          <option value="hourly">hourly</option>
          <option value="once">once datetime</option>
        </select>
        {#if formType === 'daily'}
          <input type="time" bind:value={formTime} />
        {/if}
        {#if formType === 'once'}
          <input type="datetime-local" bind:value={formDatetime} />
        {/if}
        <label class="check"><input type="checkbox" bind:checked={formEnabled} /> enable</label>
        <button type="button" on:click={addSchedule}>스케줄 추가</button>
      </div>

      <ul class="settings-list">
        {#each schedules as item}
          <li>
            <div>
              <strong>{item.label}</strong>
              <p class="muted">{formatSchedule(item)}</p>
            </div>
            <div class="actions">
              <button type="button" on:click={() => toggleSchedule(item.id)}
                >{item.enabled ? 'disable' : 'enable'}</button
              >
              <button type="button" class="danger" on:click={() => removeSchedule(item.id)}>삭제</button>
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    min-height: 100vh;
    background: radial-gradient(circle at top, #20252b 0%, #0d1014 60%);
    color: #eef3f8;
  }

  :global(#app) {
    min-height: 100vh;
  }

  .kiosk {
    min-height: 100vh;
    padding: 1.2rem;
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 1rem;
    font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif;
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid #2d333b;
    border-radius: 14px;
    padding: 0.9rem 1rem;
    background: rgba(13, 18, 24, 0.85);
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  h1 {
    font-size: 1.25rem;
    letter-spacing: 0.04em;
  }

  h2 {
    font-size: 1rem;
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
    color: #9ba7b3;
  }

  .badge {
    border: 1px solid #3f4853;
    border-radius: 999px;
    font-size: 0.75rem;
    padding: 0.2rem 0.55rem;
    color: #d5dde6;
  }

  .online {
    color: #6ee7a8;
    border-color: #296a46;
  }

  .settings-btn,
  button,
  input,
  select {
    border: 1px solid #3f4853;
    background: #1a212a;
    color: #eef3f8;
    border-radius: 10px;
    padding: 0.4rem 0.7rem;
    font-size: 0.8rem;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    min-height: 0;
  }

  .panel {
    border: 1px solid #2d333b;
    border-radius: 14px;
    background: rgba(13, 18, 24, 0.85);
    padding: 1rem;
    display: grid;
    gap: 0.8rem;
    align-content: start;
  }

  ul {
    margin: 0;
    padding-left: 1.1rem;
    display: grid;
    gap: 0.55rem;
  }

  li {
    color: #d7dee7;
    font-size: 0.95rem;
  }

  .log-list {
    max-height: 54vh;
    overflow: auto;
    padding-right: 0.4rem;
  }

  .pending-dot {
    margin-left: 0.4rem;
    color: #ff8a8a;
    font-size: 0.85rem;
  }

  .muted {
    color: #8995a1;
    font-size: 0.9rem;
  }

  .sound-panel {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .sound-controls {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .sound-badge {
    border: 1px solid #4b5562;
    border-radius: 999px;
    padding: 0.2rem 0.6rem;
    font-size: 0.75rem;
    color: #93a0ac;
  }

  .sound-badge.active {
    color: #ffd98d;
    border-color: #9a6e1d;
  }

  .settings-panel {
    margin-top: -0.3rem;
  }

  .settings-form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.5rem;
    align-items: center;
  }

  .check {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

  .settings-list {
    list-style: none;
    padding: 0;
  }

  .settings-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid #2d333b;
    border-radius: 10px;
    padding: 0.65rem;
  }

  .actions {
    display: flex;
    gap: 0.45rem;
  }

  .danger {
    border-color: #7a2f2f;
    color: #ffb0b0;
  }

  button:disabled {
    opacity: 0.5;
  }

  audio {
    display: none;
  }

  @media (max-width: 960px) {
    .content-grid {
      grid-template-columns: 1fr;
    }

    .topbar {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.65rem;
    }

    .status-row {
      justify-content: flex-start;
    }

    .sound-panel {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
