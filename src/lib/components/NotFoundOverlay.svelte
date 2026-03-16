<script lang="ts">
  import { navigate } from '../state/route.svelte';

  interface Props {
    path: string;
    onClose: () => void;
    onKeydown: (e: KeyboardEvent) => void;
  }
  let { path, onClose, onKeydown }: Props = $props();
</script>

<div
  class="popup-overlay"
  data-testid="overlay-root"
  role="dialog"
  aria-modal="true"
  aria-labelledby="overlay-title"
  tabindex="-1"
  onclick={(e: MouseEvent) => { if (e.target === e.currentTarget) onClose(); }}
  onkeydown={onKeydown}
>
  <section class="popup-panel">
    <button type="button" class="popup-close" onclick={onClose}>닫기</button>
    <section class="card">
      <h2 id="overlay-title" data-testid="overlay-title">알 수 없는 경로입니다.</h2>
      <p class="muted">`{path}`</p>
      <div class="inline">
        <button onclick={() => navigate('/')}>홈으로 이동</button>
      </div>
    </section>
  </section>
</div>

<style>
  .popup-overlay {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    z-index: 20;
    background: rgba(10, 24, 46, 0.28);
    padding: 1rem;
    overflow: auto;
  }
  .popup-panel {
    width: min(1080px, 96vw);
    max-height: 92vh;
    overflow-y: auto;
    border: 1px solid var(--panel-border);
    border-radius: 14px;
    background: var(--panel-bg);
    box-shadow: 0 18px 40px rgba(12, 36, 72, 0.22);
    padding: 1.3rem;
    display: grid;
    gap: 1rem;
  }
  .popup-close {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-strong);
    justify-self: end;
  }
  .card {
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 12px;
    padding: 1.25rem;
    display: grid;
    gap: 0.9rem;
  }
  .muted { color: var(--text-muted); font-size: var(--font-muted); }
  .inline { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
  h2, p { margin: 0; }
  @media (max-width: 720px) {
    .popup-overlay { align-items: flex-start; padding: 0.6rem; }
    .popup-panel { width: 100%; max-height: 95vh; border-radius: 12px; padding: 0.85rem; }
    .inline { flex-direction: column; align-items: stretch; }
  }
</style>
