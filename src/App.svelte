<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import dayjs from 'dayjs';
  import utc from 'dayjs/plugin/utc';
  import timezone from 'dayjs/plugin/timezone';
  import { SchedulerEngine, findNextEvent, getDefaultSchedules, type ScheduleItem } from './lib/scheduler';

  dayjs.extend(utc);
  dayjs.extend(timezone);

  const TZ = 'Asia/Seoul';
  const BUILD_VERSION = 'unknown';

  interface VersionInfo {
    buildTime: string;
    commit: string;
  }

  let now = dayjs().tz(TZ);
  let online = true;
  let buildVersion = BUILD_VERSION;
  let versionInfo: VersionInfo | null = null;

  let schedules: ScheduleItem[] = [];
  let hasPendingSound = false;
  let speaking = false;
  let speech = '윤솔아 얼른 씻어. 오늘 일찍 자고.';

  let clockTimer: ReturnType<typeof setTimeout> | undefined;
  let versionTimer: ReturnType<typeof setTimeout> | undefined;
  let speakTimer: ReturnType<typeof setTimeout> | undefined;
  let englishTimer: ReturnType<typeof setTimeout> | undefined;
  let scheduler: SchedulerEngine | undefined;

  const englishLines = [
    '윤솔아 얼른 씻어. 오늘 일찍 자고.',
    '윤솔아, 오늘도 정말 잘하고 있어.',
    '숙제 10분만 집중하고 쉬자.',
    '가방 챙기고 내일 준비 미리 하자.',
    '양치하고 물 한 잔 마시면 완벽해.',
    '조금씩 해도 충분히 멋진 발전이야.',
    '오늘 있었던 좋은 일 하나만 떠올려 보자.',
    '지금은 쉬는 시간, 몸을 쭉 펴 보자.',
    '일찍 자면 내일 더 힘이 나!',
    '윤솔이는 소중하고 멋진 아이야.'
  ];
  function getNow() {
    return dayjs().tz(TZ);
  }

  function setSpeech(message: string) {
    speech = message;
    speaking = true;
    if (speakTimer) clearTimeout(speakTimer);
    speakTimer = setTimeout(() => {
      speaking = false;
    }, 2800);
  }

  function speakOut(message: string) {
    if (!('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(message);
    utter.lang = /[가-힣]/.test(message) ? 'ko-KR' : 'en-US';
    utter.rate = 1;
    utter.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
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
    versionTimer = setTimeout(pollVersionLoop, 30_000);
  }

  function handleVisibilityOrFocus() {
    if (!document.hidden) {
      fetchVersion();
    }
  }

  function tickClock() {
    now = getNow();
    clockTimer = setTimeout(tickClock, 1000);
  }

  function handleOnline() {
    online = navigator.onLine;
    setSpeech(online ? '연결 상태 양호.' : '네트워크 연결이 끊겼어요.');
  }

  function speakEnglishEveryMinute() {
    const line = englishLines[Math.floor(Math.random() * englishLines.length)];
    setSpeech(line);
    speakOut(line);
    englishTimer = setTimeout(speakEnglishEveryMinute, 60_000);
  }
  onMount(() => {
    online = navigator.onLine;
    schedules = getDefaultSchedules(getNow());

    tickClock();
    pollVersionLoop();
    englishTimer = setTimeout(speakEnglishEveryMinute, 60_000);

    const next = findNextEvent(schedules, getNow());
    if (next) setSpeech(`다음 일정: ${next.schedule.label}`);

    scheduler = new SchedulerEngine(
      () => getNow(),
      () => schedules,
      ({ schedule, triggerAt }) => {
        hasPendingSound = true;
        const line = `${schedule.label} · ${triggerAt.tz(TZ).format('HH:mm')}`;
        setSpeech(line);
        speakOut(schedule.label);

        if (schedule.type === 'once') {
          schedules = schedules.map((s) => (s.id === schedule.id ? { ...s, enabled: false } : s));
        }
      }
    );

    scheduler.start();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOnline);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
  });

  onDestroy(() => {
    if (clockTimer) clearTimeout(clockTimer);
    if (versionTimer) clearTimeout(versionTimer);
    if (speakTimer) clearTimeout(speakTimer);
    if (englishTimer) clearTimeout(englishTimer);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    scheduler?.stop();
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOnline);
    window.removeEventListener('focus', handleVisibilityOrFocus);
    document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
  });
</script>

<main class="stage">
  <header class="topbar">
    <h1>Homi</h1>
    <div class="status-row">
      <span class="time">{now.format('HH:mm:ss')}</span>
      <span class:online class="badge">{online ? 'ONLINE' : 'OFFLINE'}</span>
      <span class="badge">v{buildVersion}</span>
      <span class:pending={hasPendingSound} class="badge">{hasPendingSound ? 'SOUND PENDING' : 'QUIET'}</span>
    </div>
  </header>

  <section class="face-wrap" aria-label="homi face">
    <div class="halo"></div>

    <div class="face {speaking ? 'speaking' : ''}">
      <div class="eyes">
        <div class="eye"><span class="pupil"></span></div>
        <div class="eye"><span class="pupil"></span></div>
      </div>
      <div class="mouth {hasPendingSound ? 'alert' : ''}"></div>
    </div>

    <div class="speech-bubble">
      <p>{speech}</p>
    </div>
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    min-height: 100vh;
    background: radial-gradient(circle at 50% 20%, #cce6ff 0%, #8fc9ff 55%, #5ea8f0 100%);
    color: #10233f;
    overflow: hidden;
    user-select: none;
  }

  :global(#app) {
    min-height: 100vh;
  }

  .stage {
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 1rem;
    padding: 1rem;
    font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif;
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid #7cb9f3;
    border-radius: 16px;
    padding: 0.8rem 1rem;
    background: rgba(244, 250, 255, 0.86);
  }

  h1,
  p {
    margin: 0;
  }

  .status-row {
    display: flex;
    gap: 0.45rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .time {
    color: #b9cae5;
    font-weight: 600;
    letter-spacing: 0.03em;
  }

  .badge {
    border: 1px solid #7baee3;
    border-radius: 999px;
    padding: 0.15rem 0.55rem;
    font-size: 0.72rem;
    color: #1f426d;
    background: rgba(255, 255, 255, 0.7);
  }

  .online {
    border-color: #2d8f63;
    color: #9dffca;
  }

  .pending {
    border-color: #936125;
    color: #ffd89b;
  }

  .face-wrap {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 0;
  }

  .halo {
    position: absolute;
    width: min(72vw, 680px);
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.9), rgba(120, 196, 255, 0.15));
    filter: blur(3px);
    animation: pulse 4s ease-in-out infinite;
  }

  .face {
    z-index: 1;
    width: min(58vw, 520px);
    aspect-ratio: 1 / 0.78;
    border-radius: 26px;
    border: 1px solid #72b7f5;
    background: linear-gradient(180deg, rgba(236, 247, 255, 0.98), rgba(206, 232, 255, 0.96));
    box-shadow: inset 0 0 42px rgba(255, 255, 255, 0.55);
    display: grid;
    grid-template-rows: 1fr auto;
    padding: 1.2rem;
  }

  .eyes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: 1.2rem;
  }

  .eye {
    height: min(16vw, 120px);
    border-radius: 16px;
    border: 1px solid #7bb9ef;
    background: radial-gradient(circle at 50% 35%, rgba(255, 255, 255, 0.98), rgba(157, 214, 255, 0.55));
    display: grid;
    place-items: center;
    animation: blink 6s infinite;
  }

  .pupil {
    width: 22%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: #0b1d3a;
    box-shadow: 0 0 22px rgba(8, 26, 58, 0.9);
  }

  .mouth {
    justify-self: center;
    width: 42%;
    height: 12px;
    border-radius: 999px;
    background: #8db5f8;
    opacity: 0.85;
    transition: all 0.25s ease;
  }

  .speaking .mouth {
    height: 28px;
    border-radius: 14px;
    background: #9cc5ff;
    box-shadow: 0 0 18px rgba(156, 197, 255, 0.4);
  }

  .mouth.alert {
    background: #ffd08b;
    box-shadow: 0 0 18px rgba(255, 204, 128, 0.4);
  }

  .speech-bubble {
    z-index: 2;
    margin-top: 1rem;
    width: min(72vw, 760px);
    border: 1px solid #7bb0e8;
    border-radius: 16px;
    padding: 0.85rem 1rem;
    background: rgba(255, 255, 255, 0.84);
    font-size: clamp(1rem, 1.6vw, 1.25rem);
    text-align: center;
    color: #123a63;
  }

  @keyframes blink {
    0%,
    47%,
    52%,
    100% {
      transform: scaleY(1);
    }
    49% {
      transform: scaleY(0.06);
    }
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.7;
    }
    50% {
      transform: scale(1.04);
      opacity: 1;
    }
  }

  @media (max-width: 960px) {
    .topbar {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .status-row {
      justify-content: flex-start;
    }

    .face {
      width: min(90vw, 520px);
    }
  }
</style>
