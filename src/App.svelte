<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { createBrowserRuntime } from './lib/runtime';
  import type { HomeMood } from './lib/state/face.svelte';

  // State modules
  import { initAppState, getStore, getDebugAreasVisible, getRobotStyle } from './lib/state/app.svelte';
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
  import DebugOverlay from './lib/components/DebugOverlay.svelte';
  import EngineOverlay from './lib/components/EngineOverlay.svelte';
  import BrainOverlay from './lib/components/BrainOverlay.svelte';
  import NotFoundOverlay from './lib/components/NotFoundOverlay.svelte';
  import {
    HOME_AREA_DEBUG_LABELS,
    HOME_AREA_IDS,
    getHomePlacementStyle,
    type HomePlacement,
  } from './lib/layout/home-areas';

  const runtime = createBrowserRuntime();
  const HOME_BUBBLE_PLACEMENT: HomePlacement = {
    areas: [1, 2, 3],
    origin: 'top-center',
    offsetY: 'clamp(8px, 1.8vh, 18px)',
    zIndex: 4,
  };
  const HOME_CLOCK_PLACEMENT: HomePlacement = {
    areas: [5, 6],
    origin: 'top-left',
    zIndex: 4,
  };
  const HOME_BOTTOM_PLACEMENT: HomePlacement = {
    areas: [8],
    origin: 'bottom-center',
    offsetY: 'clamp(-8px, -1.8vh, -18px)',
    zIndex: 4,
  };
  const HOME_SETTINGS_PLACEMENT: HomePlacement = {
    areas: [9],
    origin: 'bottom-right',
    zIndex: 4,
  };

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
  const debugAreasVisible = $derived(getDebugAreasVisible());
  const robotStyle = $derived(getRobotStyle());

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
      <HomeFace mood={displayMood} styleId={robotStyle} />
      <div
        class="home-area-grid"
        data-testid="home-area-grid"
        data-debug-areas={debugAreasVisible ? 'visible' : 'hidden'}
      >
        {#each HOME_AREA_IDS as areaId}
          <div class="home-area" data-area={areaId} data-testid={`home-area-${areaId}`}></div>
        {/each}
      </div>

      {#if debugAreasVisible}
        <div class="home-area-label-layer" aria-hidden="true">
          {#each HOME_AREA_IDS as areaId}
            <div class="home-area-label-slot" data-area={areaId}>
              <span class="home-area__debug-label" data-testid={`home-area-${areaId}-label`}>
                {HOME_AREA_DEBUG_LABELS[areaId]}
              </span>
            </div>
          {/each}
        </div>
      {/if}

      <div class="home-area-layer">
        <div
          class="home-area-placement home-area-placement--bubble"
          data-testid="home-bubble-section"
          data-debug-anchor-id="home-bubble-section"
          style={getHomePlacementStyle(HOME_BUBBLE_PLACEMENT)}
        >
          <HomeBubble statusText={homeStatusText} statusTone={homeStatusTone} modeText={homeModeText} />
        </div>

        <div
          class="home-area-placement home-area-placement--clock"
          data-testid="home-clock-section"
          data-debug-anchor-id="home-clock-section"
          style={getHomePlacementStyle(HOME_CLOCK_PLACEMENT)}
        >
          <HomeClock dateText={homeClockDateText} timeText={homeClockTimeText} />
        </div>

        <div
          class="home-area-placement home-area-placement--bottom"
          data-testid="home-bottom-section"
          data-debug-anchor-id="home-bottom-section"
          style={getHomePlacementStyle(HOME_BOTTOM_PLACEMENT)}
        >
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

        <div
          class="home-area-placement home-area-placement--settings"
          data-testid="home-settings-section"
          data-debug-anchor-id="home-settings-section"
          style={getHomePlacementStyle(HOME_SETTINGS_PLACEMENT)}
        >
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

  <DebugOverlay visible={debugAreasVisible} {route} />
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
  .home-area-grid,
  .home-area-layer,
  .home-area-label-layer {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: repeat(3, minmax(0, 1fr));
    overflow: visible;
  }
  .home-area-grid {
    z-index: 2;
    pointer-events: none;
  }
  .home-area-layer {
    z-index: 4;
    pointer-events: none;
  }
  .home-area-label-layer {
    z-index: 6;
    pointer-events: none;
  }
  .home-area,
  .home-area-label-slot {
    position: relative;
    min-width: 0;
    min-height: 0;
    overflow: visible;
  }
  .home-area::before {
    content: '';
    position: absolute;
    inset: clamp(4px, 0.8vw, 10px);
    border-radius: clamp(18px, 2vw, 28px);
    background: transparent;
    border: 0 solid transparent;
    opacity: 0;
    pointer-events: none;
    transition: opacity 140ms ease;
  }
  .home-area__debug-label {
    position: absolute;
    top: clamp(8px, 1vw, 12px);
    left: clamp(8px, 1vw, 12px);
    z-index: 1;
    display: inline-flex;
    align-items: center;
    max-width: calc(100% - clamp(16px, 2vw, 24px));
    padding: 0.18rem 0.45rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(15, 39, 68, 0.12);
    color: #17314d;
    font-size: clamp(0.62rem, 0.9vw, 0.82rem);
    line-height: 1.1;
    font-weight: 700;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    box-shadow: 0 4px 10px rgba(15, 39, 68, 0.12);
    pointer-events: none;
  }
  .home-area-grid[data-debug-areas='visible'] .home-area::before {
    opacity: 1;
    border-width: 1px;
  }
  .home-area[data-area='1']::before {
    background: rgba(255, 107, 107, 0.2);
    border-color: rgba(255, 107, 107, 0.48);
  }
  .home-area[data-area='2']::before {
    background: rgba(255, 159, 67, 0.18);
    border-color: rgba(255, 159, 67, 0.44);
  }
  .home-area[data-area='3']::before {
    background: rgba(255, 206, 86, 0.18);
    border-color: rgba(255, 206, 86, 0.42);
  }
  .home-area[data-area='4']::before {
    background: rgba(75, 192, 192, 0.18);
    border-color: rgba(75, 192, 192, 0.42);
  }
  .home-area[data-area='5']::before {
    background: rgba(54, 162, 235, 0.18);
    border-color: rgba(54, 162, 235, 0.42);
  }
  .home-area[data-area='6']::before {
    background: rgba(99, 102, 241, 0.18);
    border-color: rgba(99, 102, 241, 0.42);
  }
  .home-area[data-area='7']::before {
    background: rgba(168, 85, 247, 0.18);
    border-color: rgba(168, 85, 247, 0.42);
  }
  .home-area[data-area='8']::before {
    background: rgba(236, 72, 153, 0.18);
    border-color: rgba(236, 72, 153, 0.42);
  }
  .home-area[data-area='9']::before {
    background: rgba(34, 197, 94, 0.18);
    border-color: rgba(34, 197, 94, 0.42);
  }
  .home-area-placement {
    position: relative;
    grid-column: var(--home-area-col-start) / var(--home-area-col-end);
    grid-row: var(--home-area-row-start) / var(--home-area-row-end);
    display: flex;
    justify-content: var(--home-area-justify);
    align-items: var(--home-area-align);
    min-width: 0;
    min-height: 0;
    overflow: visible;
    z-index: var(--home-area-z);
    pointer-events: none;
    transform: translate(var(--home-area-offset-x), var(--home-area-offset-y));
  }
  .home-area-placement > * {
    position: relative;
    z-index: 1;
    pointer-events: auto;
  }
  .home-area-placement--bottom {
    align-items: flex-end;
    padding-bottom: clamp(8px, 1.8vh, 18px);
  }
  .home-area-placement--clock {
    align-items: stretch;
    justify-content: flex-end;
    padding: clamp(10px, 1.4vw, 16px) clamp(8px, 1.2vw, 14px) clamp(10px, 1.4vw, 16px) 0;
  }
  .home-area-placement--settings {
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
    .home-area-placement--bottom {
      padding-bottom: max(6px, env(safe-area-inset-bottom));
    }
    .home-area-placement--clock {
      grid-column: 2 / 4;
      grid-row: 1 / 2;
      justify-content: flex-end;
      align-items: flex-start;
      width: 100%;
      margin-left: auto;
      padding: clamp(6px, 1.8vw, 10px) max(6px, env(safe-area-inset-right)) 0 0;
      transform: translate(0, 0);
    }
    .home-area-placement--clock :global(.home-clock) {
      height: auto;
      width: min(62vw, 232px);
      max-width: min(62vw, 232px);
    }
    .home-area-placement--settings {
      padding-right: max(6px, env(safe-area-inset-right));
      padding-bottom: max(6px, env(safe-area-inset-bottom));
    }
  }
</style>
