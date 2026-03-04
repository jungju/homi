<script lang="ts">
  import { onDestroy } from 'svelte';
  import dayjs from 'dayjs';
  import utc from 'dayjs/plugin/utc';
  import timezone from 'dayjs/plugin/timezone';

  dayjs.extend(utc);
  dayjs.extend(timezone);

  const TZ = 'Asia/Seoul';
  const BUILD_VERSION = 'unknown';

  let now = dayjs().tz(TZ);
  let online = navigator.onLine;
  let clockTimer: ReturnType<typeof setTimeout> | undefined;

  const todaySchedule = ['07:00 기상 알림', '09:00 오늘 일정 확인', '매시간 정각 알림'];

  function tickClock() {
    now = dayjs().tz(TZ);
    clockTimer = setTimeout(tickClock, 1000);
  }

  function handleOnline() {
    online = navigator.onLine;
  }

  tickClock();
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOnline);

  onDestroy(() => {
    if (clockTimer) {
      clearTimeout(clockTimer);
    }
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
      <button class="settings-btn" type="button">설정</button>
    </div>
  </header>

  <section class="content-grid">
    <article class="panel">
      <h2>오늘 일정</h2>
      <ul>
        {#each todaySchedule as item}
          <li>{item}</li>
        {/each}
      </ul>
    </article>

    <article class="panel">
      <h2>알림 로그</h2>
      <p class="muted">아직 기록이 없습니다.</p>
    </article>
  </section>

  <footer class="panel sound-panel">
    <div>
      <h2>사운드 있음</h2>
      <p class="muted">새 알림이 생기면 여기에서 수동 재생합니다.</p>
    </div>
    <button type="button" disabled>재생</button>
  </footer>
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
  button {
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

  .muted {
    color: #8995a1;
    font-size: 0.9rem;
  }

  .sound-panel {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  button:disabled {
    opacity: 0.5;
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
  }
</style>
