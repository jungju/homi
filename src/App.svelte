<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { createBrowserRuntime } from './lib/runtime';
  import type { HomeMood } from './lib/state/face.svelte';

  // State modules
  import { initAppState, getStore } from './lib/state/app.svelte';
  import { getMessage } from './lib/state/message.svelte';
  import { getRoute, parsePath, navigate, setRouteSideEffects, setSharedImportLoader } from './lib/state/route.svelte';
  import { initClockState, getHomeClockDateText, getHomeClockTimeText, startHomeClock, stopHomeClock } from './lib/state/clock.svelte';
  import { initFaceState, getBlink, getHomeAlertText, cleanupFace } from './lib/state/face.svelte';
  import { initScheduleState, getScheduleQuietModeActive, getHomeQuietStatusText, startScheduleReminder, stopScheduleReminder, primeHourlyChime } from './lib/state/schedule.svelte';
  import { initDictationState, getDictationSession, getDictationMode, getSelectedDictationDataset, onNextDictationItem, stopDictation } from './lib/state/dictation.svelte';
  import {
    initImportState, loadBackupVersionDate, applyRouteSideEffects, maybeLoadSharedImportFromLocation,
    onHomeEngineClick, openSettingsPopup, closePopup, onOverlayKeydown, getDatasetCount,
    startLinkedImportSync, stopLinkedImportSync,
  } from './lib/state/import.svelte';

  // Components
  import ToastMessage from './lib/components/ToastMessage.svelte';
  import HomeFace from './lib/components/HomeFace.svelte';
  import HomeBubble from './lib/components/HomeBubble.svelte';
  import HomeClock from './lib/components/HomeClock.svelte';
  import HomeControls from './lib/components/HomeControls.svelte';
  import DictationRunner from './lib/components/DictationRunner.svelte';
  import EngineOverlay from './lib/components/EngineOverlay.svelte';
  import BrainOverlay from './lib/components/BrainOverlay.svelte';
  import NotFoundOverlay from './lib/components/NotFoundOverlay.svelte';

  const runtime = createBrowserRuntime();

  // Initialize all state modules
  initAppState(runtime);
  initClockState(runtime);
  initFaceState(runtime);
  initScheduleState(runtime);
  initDictationState(runtime);
  initImportState(runtime);

  // Wire up route side effects
  setRouteSideEffects(applyRouteSideEffects);
  setSharedImportLoader(maybeLoadSharedImportFromLocation);

  // Reactive derivations
  const route = $derived(getRoute());
  const message = $derived(getMessage());
  const blink = $derived(getBlink());
  const homeAlertText = $derived(getHomeAlertText());
  const dictationSession = $derived(getDictationSession());
  const dictationMode = $derived(getDictationMode());
  const selectedDictationDataset = $derived(getSelectedDictationDataset());
  const homeClockDateText = $derived(getHomeClockDateText());
  const homeClockTimeText = $derived(getHomeClockTimeText());
  const datasetCount = $derived(getDatasetCount());
  const scheduleQuietModeActive = $derived(getScheduleQuietModeActive());
  const homeQuietStatusText = $derived(getHomeQuietStatusText());

  // Derived display state
  const homeMood: HomeMood = $derived(
    getSelectedDictationDataset() && getDictationSession().gameMode
      ? 'calm'
      : homeAlertText
        ? 'wink'
        : message?.type === 'error'
          ? 'concern'
          : datasetCount === 0
            ? 'curious'
            : 'proud'
  );
  const displayMood: HomeMood = $derived(blink ? 'wink' : homeMood);
  const homeModeText = $derived(dictationSession.gameMode ? '현재 모드: 받아쓰기 실행모드' : '');
  const homeStatusText = $derived(
    dictationSession.gameMode
      ? '받아쓰기를 진행하고 있어요'
      : homeAlertText
        ? homeAlertText
        : route.kind === 'home' && scheduleQuietModeActive
          ? homeQuietStatusText
          : message && route.kind === 'home'
            ? message.text
            : ''
  );
  const homeStatusTone: 'default' | 'alert' | 'error' | 'running' = $derived(
    dictationSession.gameMode
      ? 'running'
      : homeAlertText
        ? 'alert'
        : message?.type === 'error' && route.kind === 'home'
          ? 'error'
          : 'default'
  );

  // Prime hourly chime reactively
  $effect(() => {
    primeHourlyChime();
  });

  function onPopState() {
    parsePath();
  }

  onMount(() => {
    const s = getStore();
    if (!s?.datasetsByEngine) {
      initAppState(runtime);
    }
    void loadBackupVersionDate();
    startHomeClock();
    startLinkedImportSync();
    startScheduleReminder(() => getDictationSession().gameMode);

    if (route.kind === 'unknown') {
      navigate('/');
      return;
    }

    parsePath();
    window.addEventListener('popstate', onPopState);
  });

  onDestroy(() => {
    window.removeEventListener('popstate', onPopState);
    cleanupFace();
    stopHomeClock();
    stopLinkedImportSync();
    stopDictation();
    stopScheduleReminder();
  });
</script>

<div class="layout home-layout" data-testid="app-root">
  <ToastMessage visible={route.kind === 'engine' || route.kind === 'backup'} />

  <main class="home" data-testid="home-root">
    <section class="home-fullscreen">
      <div class="home-fullscreen__halo"></div>
      <HomeFace mood={displayMood} />
      <div class="home-control-grid" data-testid="home-control-grid">
        <div class="home-control-box" data-box="1" data-testid="home-control-box-1"></div>
        <div class="home-control-box" data-box="2" data-testid="home-control-box-2">
          <HomeBubble statusText={homeStatusText} statusTone={homeStatusTone} modeText={homeModeText} />
        </div>
        <div class="home-control-box" data-box="3" data-testid="home-control-box-3"></div>
        <div class="home-control-box" data-box="4" data-testid="home-control-box-4"></div>
        <div class="home-control-box" data-box="5" data-testid="home-control-box-5"></div>
        <div class="home-control-box" data-box="6" data-testid="home-control-box-6">
          <HomeClock dateText={homeClockDateText} timeText={homeClockTimeText} />
        </div>
        <div class="home-control-box" data-box="7" data-testid="home-control-box-7"></div>
        <div class="home-control-box" data-box="8" data-testid="home-control-box-8">
          {#if dictationSession.gameMode && selectedDictationDataset}
            <DictationRunner
              session={dictationSession}
              mode={dictationMode}
              dataset={selectedDictationDataset}
              onNext={onNextDictationItem}
              onExit={stopDictation}
            />
          {/if}
          {#if !dictationSession.gameMode}
            <HomeControls onEngineClick={onHomeEngineClick} />
          {/if}
        </div>
        <div class="home-control-box" data-box="9" data-testid="home-control-box-9">
          <button
            type="button"
            class="home-settings-btn"
            data-testid="home-open-backup"
            aria-label="브레인 설정"
            title="브레인 설정"
            onclick={openSettingsPopup}
          >
            <span aria-hidden="true">⚙</span>
          </button>
        </div>
      </div>
    </section>
  </main>

  {#if route.kind === 'engine'}
    <EngineOverlay engineId={route.engineId} />
  {/if}

  {#if route.kind === 'backup'}
    <BrainOverlay />
  {/if}

  {#if route.kind === 'unknown'}
    <NotFoundOverlay path={route.path} onClose={closePopup} onKeydown={onOverlayKeydown} />
  {/if}
</div>

<style>
  .layout {
    max-width: 980px;
    margin: 0 auto;
    padding: 1rem;
    display: grid;
    gap: 1rem;
  }
  .layout.home-layout {
    max-width: none;
    width: 100%;
    min-height: 100vh;
    padding: 0;
    gap: 0;
  }
  .home {
    position: relative;
    width: 100%;
    height: 100dvh;
    min-height: 100dvh;
    max-height: 100dvh;
    padding: clamp(0.4rem, 1vw, 0.8rem);
    box-sizing: border-box;
    overflow: hidden;
  }
  .home-fullscreen {
    width: 100%;
    height: 100%;
    max-height: 100%;
    margin: 0 auto;
    border-radius: 2rem;
    display: block;
    position: relative;
    padding: clamp(0.35rem, 0.9vw, 0.75rem);
    overflow: hidden;
  }
  .home-fullscreen__halo {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(circle at 50% 48%, rgba(255, 255, 255, 0.22), transparent 63%);
    pointer-events: none;
    filter: blur(0.2rem);
  }
  .home-control-grid {
    position: absolute;
    inset: 0;
    z-index: 3;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: repeat(3, minmax(0, 1fr));
    overflow: visible;
    pointer-events: auto;
  }
  .home-control-box {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    min-height: 0;
    box-sizing: border-box;
    padding: 0.3rem;
    overflow: visible;
    pointer-events: auto;
  }
  .home-control-box[data-box='2'] {
    align-items: flex-start;
    z-index: 4;
    padding-top: clamp(8px, 1.8vh, 18px);
    padding-inline: 0;
  }
  .home-control-box[data-box='8'] {
    align-items: flex-end;
    padding-bottom: clamp(8px, 1.8vh, 18px);
  }
  .home-control-box[data-box='6'] {
    align-items: stretch;
    justify-content: flex-end;
    justify-self: end;
    width: min(calc(100% + clamp(6rem, 12vw, 9rem)), calc(100vw - clamp(0.9rem, 2vw, 1.8rem)));
    max-width: min(35rem, calc(100vw - clamp(0.9rem, 2vw, 1.8rem)));
    margin-left: 0;
    margin-right: 0;
    padding: clamp(10px, 1.4vw, 16px) clamp(8px, 1.2vw, 14px) clamp(10px, 1.4vw, 16px) 0;
    z-index: 4;
  }
  .home-control-box[data-box='9'] {
    align-items: flex-end;
    justify-content: flex-end;
    padding-right: clamp(8px, 1.8vh, 18px);
    padding-bottom: clamp(8px, 1.8vh, 18px);
  }
  .home-settings-btn {
    width: clamp(4.25rem, 8vw, 5.5rem);
    height: clamp(4.25rem, 8vw, 5.5rem);
    border: 1px solid var(--panel-border);
    border-radius: 999px;
    background: color-mix(in srgb, var(--panel-bg) 82%, #fff 18%);
    color: var(--text-main);
    display: inline-grid;
    place-items: center;
    font-size: clamp(1.8rem, 3vw, 2.45rem);
    font-weight: 700;
    padding: 0;
    box-shadow: 0 10px 24px rgba(31, 90, 179, 0.12);
    pointer-events: auto;
  }
  .home-settings-btn:hover {
    background: color-mix(in srgb, var(--button-hover-bg) 78%, #fff 22%);
  }
  .home-settings-btn span {
    line-height: 1;
  }
  @media (max-width: 720px) {
    .home {
      min-height: 100dvh;
      padding: 0.4rem;
    }
    .home-fullscreen {
      min-height: 100%;
      width: 100vw;
      border-radius: 0;
      padding: 0.8rem 0.45rem;
    }
    .home-control-box[data-box='2'] {
      padding-top: max(6px, env(safe-area-inset-top));
    }
    .home-control-box[data-box='8'] {
      padding-bottom: max(6px, env(safe-area-inset-bottom));
    }
    .home-control-box[data-box='6'] {
      width: 100%;
      max-width: none;
      margin-left: 0;
      padding: clamp(8px, 2vw, 12px);
    }
    .home-control-box[data-box='9'] {
      padding-right: max(6px, env(safe-area-inset-right));
      padding-bottom: max(6px, env(safe-area-inset-bottom));
    }
  }
</style>
