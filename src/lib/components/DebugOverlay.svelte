<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { Route } from '../state/route.svelte';

  interface Props {
    visible: boolean;
    route: Route;
  }

  interface SectionLabel {
    anchorTestId: string;
    debugName: string;
    text: string;
    left: number;
    top: number;
  }

  interface SectionTarget {
    anchorId: string;
    debugName: string;
  }

  let { visible, route }: Props = $props();

  let popupName = $state('');
  let sectionLabels = $state<SectionLabel[]>([]);

  const HOME_SECTION_TARGETS: SectionTarget[] = [
    { anchorId: 'home-bubble-section', debugName: '홈 말풍선' },
    { anchorId: 'home-clock-section', debugName: '홈 시계' },
    { anchorId: 'home-bottom-section', debugName: '하단 실행/엔진 영역' },
    { anchorId: 'home-settings-section', debugName: '설정 진입' },
  ];

  const BACKUP_SECTION_TARGETS: SectionTarget[] = [
    { anchorId: 'backup-summary-section', debugName: '브레인 설정' },
    { anchorId: 'backup-theme-section', debugName: '화면 테마' },
    { anchorId: 'backup-debug-section', debugName: '디버그 표시' },
    { anchorId: 'backup-quiet-section', debugName: '알림 관리' },
    { anchorId: 'backup-import-section', debugName: '브레인 입력' },
    { anchorId: 'backup-preview-section', debugName: 'Import 미리보기' },
  ];

  const ENGINE_SECTION_TARGETS: SectionTarget[] = [
    { anchorId: 'dictation-settings-section', debugName: '받아쓰기 실행' },
    { anchorId: 'schedule-hourly-chime-section', debugName: '정시 차임' },
    { anchorId: 'schedule-preview-section', debugName: '등록된 스케줄 미리 듣기' },
    { anchorId: 'engine-datasets-section', debugName: '자료 세트' },
    { anchorId: 'engine-editor-section', debugName: '자료 세트 편집' },
  ];

  function getPageName(routeState: Route) {
    if (routeState.kind === 'home') {
      return '/';
    }
    if (routeState.kind === 'backup') {
      return '/brain';
    }
    if (routeState.kind === 'engine') {
      return `/engines/${routeState.engineId}`;
    }
    return routeState.path;
  }

  function getTargetsForRoute(routeState: Route): SectionTarget[] {
    if (routeState.kind === 'home') {
      return HOME_SECTION_TARGETS;
    }
    if (routeState.kind === 'backup') {
      return BACKUP_SECTION_TARGETS;
    }
    if (routeState.kind === 'engine') {
      return ENGINE_SECTION_TARGETS;
    }
    return [];
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  function isVisibleElement(element: Element | null): element is HTMLElement {
    if (!(element instanceof HTMLElement)) {
      return false;
    }
    if (element.hidden) {
      return false;
    }
    const styles = window.getComputedStyle(element);
    if (styles.display === 'none' || styles.visibility === 'hidden') {
      return false;
    }
    return element.getClientRects().length > 0;
  }

  function queryByTestId(testId: string) {
    return document.querySelector(`[data-testid="${testId}"]`);
  }

  function queryByAnchorId(anchorId: string) {
    return document.querySelector(`[data-debug-anchor-id="${anchorId}"]`) ?? queryByTestId(anchorId);
  }

  function collectPopupName() {
    const title = queryByTestId('overlay-title');
    if (!isVisibleElement(title)) {
      return '';
    }
    return title.textContent?.trim() ?? '';
  }

  function collectSectionLabels(routeState: Route) {
    const targets = getTargetsForRoute(routeState);
    return targets.flatMap((target) => {
      const element = queryByAnchorId(target.anchorId);
      if (!isVisibleElement(element)) {
        return [];
      }
      const rect = element.getBoundingClientRect();
      const labelLeft = clamp(rect.left + 6, 8, Math.max(8, window.innerWidth - 248));
      const labelTop = clamp(rect.top - 26, 8, Math.max(8, window.innerHeight - 36));
      return [{
        anchorTestId: target.anchorId,
        debugName: target.debugName,
        text: `section: ${target.debugName}`,
        left: Math.round(labelLeft),
        top: Math.round(labelTop),
      }];
    });
  }

  let rafId: number | null = null;

  function updateOverlay() {
    if (!visible) {
      popupName = '';
      sectionLabels = [];
      return;
    }
    popupName = collectPopupName();
    sectionLabels = collectSectionLabels(route);
  }

  function scheduleUpdate() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(() => {
      rafId = null;
      updateOverlay();
    });
  }

  $effect(() => {
    scheduleUpdate();
  });

  onMount(() => {
    const resizeObserver = new ResizeObserver(() => {
      scheduleUpdate();
    });
    resizeObserver.observe(document.documentElement);
    resizeObserver.observe(document.body);

    const mutationObserver = new MutationObserver(() => {
      scheduleUpdate();
    });
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-testid', 'hidden', 'class', 'style', 'data-overlay-kind'],
    });

    const onScroll = () => {
      scheduleUpdate();
    };
    const onResize = () => {
      scheduleUpdate();
    };

    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);

    scheduleUpdate();

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  });

  onDestroy(() => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  });
</script>

{#if visible}
  <div class="debug-layer" data-testid="debug-layer-root" aria-hidden="true">
    <div class="debug-layer__meta">
      <div class="debug-layer__badge" data-testid="debug-page-name">page: {getPageName(route)}</div>
      {#if popupName}
        <div class="debug-layer__badge" data-testid="debug-popup-name">popup: {popupName}</div>
      {/if}
    </div>

    {#each sectionLabels as label (label.anchorTestId)}
      <div
        class="debug-layer__section-badge"
        data-testid="debug-section-label"
        data-debug-target-kind="section"
        data-debug-target-id={label.anchorTestId}
        style={`left:${label.left}px; top:${label.top}px;`}
      >
        {label.text}
      </div>
    {/each}
  </div>
{/if}

<style>
  .debug-layer {
    position: fixed;
    inset: 0;
    z-index: 120;
    pointer-events: none;
  }
  .debug-layer__meta {
    position: fixed;
    top: 10px;
    left: 10px;
    display: grid;
    gap: 0.35rem;
    pointer-events: none;
  }
  .debug-layer__badge,
  .debug-layer__section-badge {
    display: inline-flex;
    align-items: center;
    max-width: min(320px, calc(100vw - 20px));
    padding: 0.22rem 0.55rem;
    border-radius: 999px;
    background: rgba(9, 16, 28, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: #f6fbff;
    font-size: 0.78rem;
    line-height: 1.15;
    font-weight: 700;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.24);
    pointer-events: none;
  }
  .debug-layer__section-badge {
    position: fixed;
  }
  @media (max-width: 720px) {
    .debug-layer__badge,
    .debug-layer__section-badge {
      font-size: 0.72rem;
      max-width: min(260px, calc(100vw - 18px));
    }
  }
</style>
