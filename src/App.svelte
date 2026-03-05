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
  let speech = 'Ready.';

  let clockTimer: ReturnType<typeof setTimeout> | undefined;
  let versionTimer: ReturnType<typeof setTimeout> | undefined;
  let speakTimer: ReturnType<typeof setTimeout> | undefined;
  let storyTimer: ReturnType<typeof setTimeout> | undefined;
  let scheduler: SchedulerEngine | undefined;

  const storyLines = [
    'Time to wash up and get ready for bed. || 얼른 씻고 잘 준비하자.',
    'Pack your school bag now. || 지금 가방 챙기자.',
    'You are doing great today. || 오늘도 정말 잘하고 있어.',
    'Let us focus for ten minutes. || 10분만 집중해서 공부하자.',
    'Great job. Keep going. || 아주 잘했어, 계속 해보자.',
    'Agree means to have the same opinion. || agree는 동의하다는 뜻이야.',
    'Classroom means a room for learning. || classroom은 교실이라는 뜻이야.',
    'Early sleep gives you more energy. || 일찍 자면 내일 더 힘이 나.'
  ];

  function getNow() {
    return dayjs().tz(TZ);
  }

  function setSpeech(message: string) {
    speech = message.replace(' || ', ' / ');
    speaking = true;
    if (speakTimer) clearTimeout(speakTimer);
    speakTimer = setTimeout(() => (speaking = false), 2800);
  }

  function speakOut(message: string) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    if (message.includes(' || ')) {
      const [en, ko] = message.split(' || ');
      const enUtter = new SpeechSynthesisUtterance(en.trim());
      enUtter.lang = 'en-US';
      const koUtter = new SpeechSynthesisUtterance(ko.trim());
      koUtter.lang = 'ko-KR';
      enUtter.onend = () => window.speechSynthesis.speak(koUtter);
      window.speechSynthesis.speak(enUtter);
      return;
    }

    const utter = new SpeechSynthesisUtterance(message);
    utter.lang = /[가-힣]/.test(message) ? 'ko-KR' : 'en-US';
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
    if (!document.hidden) fetchVersion();
  }

  function tickClock() {
    now = getNow();
    clockTimer = setTimeout(tickClock, 1000);
  }

  function handleOnline() {
    online = navigator.onLine;
    setSpeech(online ? '연결 상태 양호.' : '네트워크 연결이 끊겼어요.');
  }

  function speakStoryEveryMinute() {
    const line = storyLines[Math.floor(Math.random() * storyLines.length)];
    setSpeech(line);
    speakOut(line);
    storyTimer = setTimeout(speakStoryEveryMinute, 60_000);
  }

  onMount(() => {
    online = navigator.onLine;
    schedules = getDefaultSchedules(getNow());

    tickClock();
    pollVersionLoop();
    speakStoryEveryMinute();

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
    if (storyTimer) clearTimeout(storyTimer);
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
  :global(body) { margin:0; min-height:100vh; background: radial-gradient(circle at 50% 20%, #cce6ff 0%, #8fc9ff 55%, #5ea8f0 100%); color:#10233f; overflow:hidden; user-select:none; }
  :global(#app) { min-height:100vh; }
  .stage { min-height:100vh; display:grid; grid-template-rows:auto 1fr; gap:1rem; padding:1rem; font-family:'Noto Sans KR','Apple SD Gothic Neo',sans-serif; }
  .topbar { display:flex; justify-content:space-between; align-items:center; border:1px solid #7cb9f3; border-radius:16px; padding:.8rem 1rem; background:rgba(244,250,255,.86); }
  h1,p { margin:0; }
  .status-row { display:flex; gap:.45rem; flex-wrap:wrap; justify-content:flex-end; }
  .time { color:#b9cae5; font-weight:600; letter-spacing:.03em; }
  .badge { border:1px solid #7baee3; border-radius:999px; padding:.15rem .55rem; font-size:.72rem; color:#1f426d; background:rgba(255,255,255,.7); }
  .online { border-color:#2d8f63; color:#167e4f; }
  .pending { border-color:#936125; color:#7e4b12; }
  .face-wrap { position:relative; display:grid; place-items:center; min-height:0; }
  .halo { position:absolute; width:min(72vw,680px); aspect-ratio:1; border-radius:50%; background:radial-gradient(circle, rgba(255,255,255,.9), rgba(120,196,255,.15)); filter:blur(3px); animation:pulse 4s ease-in-out infinite; }
  .face { z-index:1; width:min(58vw,520px); aspect-ratio:1/.78; border-radius:26px; border:1px solid #72b7f5; background:linear-gradient(180deg, rgba(236,247,255,.98), rgba(206,232,255,.96)); box-shadow:inset 0 0 42px rgba(255,255,255,.55); display:grid; grid-template-rows:1fr auto; padding:1.2rem; }
  .eyes { display:grid; grid-template-columns:1fr 1fr; align-items:center; gap:1.2rem; }
  .eye { height:min(16vw,120px); border-radius:16px; border:1px solid #7bb9ef; background:radial-gradient(circle at 50% 35%, rgba(255,255,255,.98), rgba(157,214,255,.55)); display:grid; place-items:center; animation:blink 6s infinite; }
  .pupil { width:22%; aspect-ratio:1; border-radius:50%; background:#0b1d3a; box-shadow:0 0 22px rgba(8,26,58,.9); }
  .mouth { justify-self:center; width:42%; height:12px; border-radius:999px; background:#8db5f8; opacity:.85; transition:all .25s ease; }
  .speaking .mouth { height:28px; border-radius:14px; background:#9cc5ff; box-shadow:0 0 18px rgba(156,197,255,.4); }
  .mouth.alert { background:#ffd08b; box-shadow:0 0 18px rgba(255,204,128,.4); }
  .speech-bubble { z-index:2; margin-top:1rem; width:min(72vw,760px); border:1px solid #7bb0e8; border-radius:16px; padding:.85rem 1rem; background:rgba(255,255,255,.84); font-size:clamp(1rem,1.6vw,1.25rem); text-align:center; color:#123a63; }
  @keyframes blink {0%,47%,52%,100%{transform:scaleY(1)}49%{transform:scaleY(.06)}}
  @keyframes pulse {0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.04);opacity:1}}
  @media (max-width:960px){ .topbar{flex-direction:column;align-items:flex-start;gap:.5rem}.status-row{justify-content:flex-start}.face{width:min(90vw,520px)} }
</style>
