<script lang="ts">
  import type { DataSetV1 } from '../homi';
  import { getCurrentDictationItem, getDictationDisplayText, type DictationSessionState, type DictationWriteMode } from '../engines/dictation-core';

  interface Props {
    session: DictationSessionState;
    mode: DictationWriteMode;
    dataset: DataSetV1;
    onNext: () => void;
    onExit: () => void;
  }
  let { session, mode, dataset, onNext, onExit }: Props = $props();
</script>

<section class="card dictation-game-screen home-bottom-panel" data-testid="dictation-root">
  <h3>받아쓰기 게임</h3>
  <p class="muted">
    모드: {mode === 'korean' ? '한글쓰기(영어 발화)' : '영어쓰기(한국어 발화)'}
    · 데이터셋: {dataset.title}
  </p>

  {#if dataset.items.length > 0}
    {@const currentDictationItem = getCurrentDictationItem(dataset, session)}
    {#if currentDictationItem}
      <p class="count" data-testid="dictation-progress">
        진행:
        <span data-testid="dictation-progress-index">{session.currentIndex + 1}</span>
        /
        <span data-testid="dictation-progress-total">{dataset.items.length}</span>
      </p>
      <p class="muted" data-testid="dictation-current-text">
        현재 항목: {getDictationDisplayText(currentDictationItem, mode)}
      </p>
    {/if}
  {/if}

  <p class="muted">10초마다 자동으로 다음 항목으로 넘어갑니다.</p>
  <div class="inline">
    <button data-testid="dictation-next" onclick={onNext}>Next</button>
    <button data-testid="dictation-exit" onclick={onExit}>게임 나가기</button>
  </div>
</section>

<style>
  .dictation-game-screen {
    display: grid;
    gap: 0.7rem;
    justify-items: center;
    text-align: center;
    pointer-events: auto;
  }
  .home-bottom-panel {
    position: relative;
    flex: 0 0 auto;
    width: min(94vw, 760px);
    margin: 0;
    pointer-events: auto;
  }
  .card {
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 12px;
    padding: 1.25rem;
    display: grid;
    gap: 0.9rem;
  }
  .muted {
    color: var(--text-muted);
    font-size: var(--font-muted);
  }
  .count { font-weight: 600; }
  .inline {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
  }
  h3, p { margin: 0; }
  @media (max-width: 720px) {
    .inline { flex-direction: column; align-items: stretch; }
    .home-bottom-panel { width: min(95vw, 640px); }
  }
</style>
