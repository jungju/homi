<script lang="ts">
  import { ENGINE_REGISTRY, type EngineId } from '../homi';

  interface Props {
    onEngineClick: (id: EngineId) => void;
  }
  let { onEngineClick }: Props = $props();

  const ENGINE_VISUALS: Record<string, { icon: string; accent: string; bg: string }> = {
    schedule: { icon: '📅', accent: '#4a90e2', bg: '#dce9ff' },
    dictation: { icon: '🎧', accent: '#f0a44e', bg: '#ffe2be' },
  };
</script>

<section class="home-bottom-panel home-idle-controls">
  <div class="home-engine-row" data-testid="home-open-engines">
    {#each ENGINE_REGISTRY as engine}
      <button
        class="home-engine-btn"
        data-testid={`home-engine-btn-${engine.id}`}
        onclick={() => onEngineClick(engine.id)}
      >
        <span
          class="engine-badge"
          style={`--engine-color: ${ENGINE_VISUALS[engine.id]?.accent}; --engine-bg: ${ENGINE_VISUALS[engine.id]?.bg};`}
        >
          {ENGINE_VISUALS[engine.id]?.icon}
        </span>
        <span>{engine.title} 열기</span>
      </button>
    {/each}
  </div>
</section>

<style>
  .home-idle-controls {
    display: grid;
    gap: 0.8rem;
    justify-items: stretch;
    align-items: center;
    max-height: none;
    overflow: visible;
    pointer-events: auto;
  }
  .home-engine-row {
    position: relative;
    z-index: 1;
    width: min(720px, 94vw);
    display: grid;
    justify-content: center;
    gap: 0.75rem;
    grid-template-columns: repeat(2, minmax(220px, 1fr));
    pointer-events: auto;
  }
  .home-engine-btn {
    height: 4.35rem;
    border: 1px solid var(--panel-border);
    border-radius: 999px;
    background: color-mix(in srgb, var(--panel-bg) 82%, #fff 18%);
    color: var(--text-main);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.7rem;
    width: 100%;
    font-weight: 700;
    font-size: clamp(1.15rem, 1.8vw, 1.55rem);
    padding: 0 1.2rem;
    pointer-events: auto;
  }
  .home-engine-btn:hover {
    background: color-mix(in srgb, var(--button-hover-bg) 78%, #fff 22%);
  }
  .engine-badge {
    width: 2.8rem;
    height: 2.8rem;
    border-radius: 50%;
    background: var(--engine-bg, #dce9ff);
    color: #0f2b4a;
    display: grid;
    place-items: center;
    border: 2px solid var(--engine-color, #7ab3f7);
    font-size: 1.35rem;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
  }
  .home-bottom-panel {
    position: relative;
    flex: 0 0 auto;
    width: min(94vw, 760px);
    margin: 0;
    pointer-events: auto;
  }
  @media (max-width: 720px) {
    .home-engine-row {
      width: 100%;
      grid-template-columns: 1fr;
      gap: 0.7rem;
    }
    .home-bottom-panel {
      width: min(95vw, 640px);
    }
  }
</style>
