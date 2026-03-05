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

  interface StoryLine {
    text: string;
    photo?: '/photos/yunsol.jpg' | '/photos/dad.jpg';
    alt?: string;
  }

  let now = dayjs().tz(TZ);
  let online = true;
  let buildVersion = BUILD_VERSION;
  let versionInfo: VersionInfo | null = null;

  let schedules: ScheduleItem[] = [];
  let hasPendingSound = false;
  let speaking = false;
  let speech = '윤솔아 얼른 씻어. 오늘 일찍 자고.';
  let showPhoto = false;
  let currentPhotoSrc: '/photos/yunsol.jpg' | '/photos/dad.jpg' = '/photos/yunsol.jpg';
  let currentPhotoAlt = '윤솔 사진';

  let clockTimer: ReturnType<typeof setTimeout> | undefined;
  let versionTimer: ReturnType<typeof setTimeout> | undefined;
  let speakTimer: ReturnType<typeof setTimeout> | undefined;
  let storyTimer: ReturnType<typeof setTimeout> | undefined;
  let photoTimer: ReturnType<typeof setTimeout> | undefined;
  let scheduler: SchedulerEngine | undefined;

  const storyLines: StoryLine[] = [
    { text: '윤솔아 얼른 씻어. 오늘 일찍 자고.' },
    { text: '가방 챙기고 내일 준비 미리 하자.' },
    { text: '양치하고 물 한 잔 마시면 완벽해.' },
    { text: 'You are doing great. Keep smiling.' },
    { text: 'Great job today. Let us rest early tonight.' },
    {
      text: '사진 속 윤솔이 표정은 에너지가 넘쳐서 보는 사람도 웃게 해. 웃는 모습이 너무 좋아.',
      photo: '/photos/yunsol.jpg',
      alt: '윤솔 사진'
    },
    {
      text: '오늘의 윤솔이는 씩씩한 탐험가 같아. 눈빛이 반짝반짝해.',
      photo: '/photos/yunsol.jpg',
      alt: '윤솔 사진'
    },
    {
      text: '윤솔이 아빠 표정이 정말 따뜻하고 유쾌해요. 웃는 모습이 너무 좋아요.',
      photo: '/photos/dad.jpg',
      alt: '윤솔이 아빠 사진'
    },
    {
      text: '자연스럽고 자신감 있는 미소가 가족을 편안하게 해주는 얼굴이에요.',
      photo: '/photos/dad.jpg',
      alt: '윤솔이 아빠 사진'
    },
    {
      text: '오늘도 수고 많았어요. 이 미소처럼 가볍게 마무리해요.',
      photo: '/photos/dad.jpg',
      alt: '윤솔이 아빠 사진'
    }
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

  function speakStoryEveryMinute() {
    const pick = storyLines[Math.floor(Math.random() * storyLines.length)];
    const line = pick.text;

    if (pick.photo) {
      currentPhotoSrc = pick.photo;
      currentPhotoAlt = pick.alt ?? '사진';
      showPhoto = true;
      if (photoTimer) clearTimeout(photoTimer);
      photoTimer = setTimeout(() => {
        showPhoto = false;
      }, 9000);
    } else {
      showPhoto = false;
    }

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
    if (photoTimer) clearTimeout(photoTimer);
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

    {#if showPhoto}
      <div class="photo-card">
        <img src={currentPhotoSrc} alt={currentPhotoAlt} />
      </div>
    {/if}
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

  .photo-card {
    position: absolute;
    z-index: 4;
    left: 50%;
    top: 52%;
    transform: translate(-50%, -50%);
    width: min(58vw, 460px);
    border: 2px solid #7bb0e8;
    border-radius: 18px;
    padding: 0.35rem;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 14px 34px rgba(24, 62, 107, 0.32);
  }

  .photo-card img {
    width: 100%;
    display: block;
    border-radius: 10px;
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
