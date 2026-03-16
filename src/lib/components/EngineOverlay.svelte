<script lang="ts">
  import {
    type EngineId,
    getDatasetsByEngine,
    getEngineMeta,
    isDatasetEnabled,
  } from '../homi';
  import {
    getCurrentDictationItem,
    getDictationDisplayText,
  } from '../engines/dictation-core';
  import { getStore, getExportSelection } from '../state/app.svelte';
  import {
    getDictationSession,
    getDictationMode,
    setDictationMode,
    selectDictationDataset,
    startDictation,
  } from '../state/dictation.svelte';
  import {
    getScheduleHourlyChimeStatusText,
    getSchedulePreviewEntries,
    getSchedulePreviewStatusText,
    toggleScheduleHourlyChime,
    previewScheduleEntry,
  } from '../state/schedule.svelte';
  import {
    getEditor,
    setEditor,
    startEditDataset,
    cancelEditor,
    saveEditor,
    onDeleteDataset,
    selectExport,
    selectAllCurrentEngine,
    exportEngineSelection,
    toggleScheduleDatasetEnabled,
    closePopup,
    onOverlayKeydown,
  } from '../state/import.svelte';

  interface Props {
    engineId: EngineId;
  }
  let { engineId }: Props = $props();

  const meta = $derived(getEngineMeta(engineId));
  const store = $derived(getStore());
  const datasets = $derived(getDatasetsByEngine(store, engineId).filter((d) => d.engineId === engineId));
  const exportSelection = $derived(getExportSelection());
  const dictationSession = $derived(getDictationSession());
  const dictationMode = $derived(getDictationMode());
  const selectedDictationDataset = $derived(
    dictationSession.datasetId
      ? getDatasetsByEngine(store, 'dictation').find((d) => d.id === dictationSession.datasetId) ?? null
      : null,
  );
  const editor = $derived(getEditor());
  const scheduleHourlyChimeStatusText = $derived(getScheduleHourlyChimeStatusText());
  const schedulePreviewEntries = $derived(getSchedulePreviewEntries());
  const schedulePreviewStatusText = $derived(getSchedulePreviewStatusText());

  function handleDictationModeChange(value: string) {
    if (value === 'korean' || value === 'english') {
      setDictationMode(value);
    }
  }

  function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) closePopup();
  }

  function handleEditorTitle(e: Event) {
    const v = (e.currentTarget as HTMLInputElement).value;
    setEditor({ ...getEditor(), title: v });
  }

  function handleEditorItems(e: Event) {
    const v = (e.currentTarget as HTMLTextAreaElement).value;
    setEditor({ ...getEditor(), itemsText: v });
  }
</script>

<div
  class="popup-overlay"
  data-testid="overlay-root"
  data-overlay-kind="engine"
  data-engine-id={engineId}
  role="dialog"
  aria-modal="true"
  aria-labelledby="overlay-title"
  tabindex="-1"
  onclick={handleOverlayClick}
  onkeydown={onOverlayKeydown}
>
  <section
    class="popup-panel"
    data-testid="engine-root"
    data-overlay-kind="engine"
    data-engine-id={engineId}
  >
    <button type="button" class="popup-close" data-testid="overlay-close" onclick={closePopup}>닫기</button>
    <p id="overlay-title" class="muted" data-testid="overlay-title">페이지: /engines/{engineId}</p>
    <div class="popup-content">
      {#if engineId === 'dictation'}
        <section class="card" data-testid="dictation-settings-root" data-debug-anchor-id="dictation-settings-section">
          <h3>받아쓰기 실행</h3>
          <p class="muted">한글쓰기면 영어 발화, 영어쓰기면 한국어 발화</p>
          <p class="muted">학습 모드</p>
          <div class="inline">
            <label class="inline">
              <input
                type="radio"
                name="dictationMode"
                data-testid="dictation-mode-a"
                checked={dictationMode === 'korean'}
                onchange={() => handleDictationModeChange('korean')}
                value="korean"
              />
              한글쓰기
            </label>
            <label class="inline">
              <input
                type="radio"
                name="dictationMode"
                data-testid="dictation-mode-b"
                checked={dictationMode === 'english'}
                onchange={() => handleDictationModeChange('english')}
                value="english"
              />
              영어쓰기
            </label>
          </div>

          {#if selectedDictationDataset}
            <p class="muted">
              선택: {selectedDictationDataset.title} · {selectedDictationDataset.items.length}개
            </p>
            <p class="count">
              진행:
              <span>
                {selectedDictationDataset.items.length > 0 ? dictationSession.currentIndex + 1 : 0}
              </span>
              /
              <span>{selectedDictationDataset.items.length}</span>
            </p>
            {#if selectedDictationDataset.items.length > 0}
              {@const currentDictationItem = getCurrentDictationItem(selectedDictationDataset, dictationSession)}
              {#if currentDictationItem}
                <p class="muted">현재 항목: {getDictationDisplayText(currentDictationItem, dictationMode)}</p>
              {/if}
            {/if}
          {:else}
            <p class="muted">실행할 데이터셋을 먼저 선택해주세요.</p>
          {/if}

          <div class="inline">
            <button
              data-testid="dictation-start"
              onclick={startDictation}
              disabled={!selectedDictationDataset || dictationSession.running}
            >
              {dictationSession.running ? '실행 중' : '시작'}
            </button>
          </div>
          {#if dictationSession.running}
            <p class="muted">받아쓰기는 홈 실행 모드에서 진행 중입니다.</p>
          {/if}
        </section>
      {/if}

      {#if engineId === 'schedule'}
        <section class="card" data-debug-anchor-id="schedule-hourly-chime-section">
          <h3>정시 차임</h3>
          <p class="muted" data-testid="schedule-hourly-chime-status">{scheduleHourlyChimeStatusText}</p>
          <div class="inline">
            <button
              type="button"
              data-testid="schedule-hourly-chime-toggle"
              onclick={toggleScheduleHourlyChime}
            >
              {store.ui?.scheduleHourlyChimeEnabled === true ? '정시 차임 끄기' : '정시 차임 켜기'}
            </button>
          </div>
          <p class="muted">
            켜면 매시 정각에 차임 사운드를 한 번 재생합니다. 받아쓰기 실행 중이거나 조용히 모드면
            건너뜁니다.
          </p>
        </section>

        <section class="card" data-testid="schedule-preview-list" data-debug-anchor-id="schedule-preview-section">
          <h3>등록된 스케줄 미리 듣기</h3>
          <p class="muted">
            항목을 누르면 현재 브라우저에서 즉시 음성을 시험 재생합니다. audioUrl이 있으면 오디오를
            우선 사용하고, 없으면 브라우저 음성으로 읽습니다.
          </p>
          <p class="muted" data-testid="schedule-preview-status">{schedulePreviewStatusText}</p>
          {#if schedulePreviewEntries.length > 0}
            <div class="schedule-preview-list">
              {#each schedulePreviewEntries as entry}
                <button
                  type="button"
                  class="schedule-preview-item"
                  data-testid="schedule-preview-item"
                  data-preview-key={entry.key}
                  data-preview-title={entry.title}
                  onclick={() => previewScheduleEntry(entry)}
                >
                  <strong>{entry.title}</strong>
                  <span class="schedule-preview-meta">{entry.meta}</span>
                </button>
              {/each}
            </div>
          {/if}
        </section>
      {/if}

      <section class="card" data-testid="engine-datasets-list" data-debug-anchor-id="engine-datasets-section">
        <div class="inline header-row">
          <h3>자료 세트</h3>
          <button onclick={() => selectAllCurrentEngine(true)}>전체 선택</button>
          <button onclick={() => selectAllCurrentEngine(false)}>전체 해제</button>
          <button
            onclick={exportEngineSelection}
            disabled={datasets.length === 0}
            class:disabled={datasets.length === 0}
          >
            선택 내보내기
          </button>
        </div>

        <p class="muted" data-testid="engine-empty-state" hidden={datasets.length !== 0}>
          아직 데이터가 없습니다.
        </p>

        {#each datasets as dataset}
          <article
            class="dataset"
            data-testid="dataset-row"
            data-engine-id={dataset.engineId}
            data-dataset-id={dataset.id}
            data-dataset-title={dataset.title}
          >
            <label class="item-check">
              <input
                type="checkbox"
                checked={exportSelection.has(dataset.id)}
                onchange={(event: Event) => {
                  const target = event.currentTarget as HTMLInputElement;
                  selectExport(dataset.id, target.checked);
                }}
              />
              <div>
                <h4>{dataset.title}</h4>
                <p class="muted">아이템 {dataset.items.length}개 · 마지막 수정 {dataset.updatedAt}</p>
                {#if dataset.meta && typeof dataset.meta === 'object'}
                  <p class="muted">source: {JSON.stringify(dataset.source)}</p>
                {/if}
              </div>
            </label>
            <div class="dataset-actions">
              {#if engineId === 'schedule'}
                <button
                  data-testid="schedule-enabled-toggle"
                  class:disabled={isDatasetEnabled(dataset) === false}
                  onclick={() => toggleScheduleDatasetEnabled(dataset)}
                  type="button"
                >
                  {isDatasetEnabled(dataset) ? '사용함' : '사용안함'}
                </button>
              {/if}
              {#if engineId === 'dictation'}
                <button
                  type="button"
                  data-testid="dataset-open"
                  class:dictation-selected={dictationSession.datasetId === dataset.id}
                  onclick={() => selectDictationDataset(dataset)}
                  class:disabled={dictationSession.running}
                  disabled={dictationSession.running}
                >
                  {dictationSession.datasetId === dataset.id ? '선택됨' : '선택'}
                </button>
              {/if}
              <button onclick={() => startEditDataset(dataset)}>편집</button>
              <button onclick={() => onDeleteDataset(dataset)}>삭제</button>
            </div>
          </article>
        {/each}
      </section>

      {#if editor.mode}
        <section class="card" data-debug-anchor-id="engine-editor-section">
          <h3>{editor.mode === 'add' ? '자료 세트 추가' : '자료 세트 편집'}</h3>
          <p class="muted">항목은 엔진 스키마 형식의 JSON 배열로 입력해주세요.</p>
          <label>
            제목
            <input type="text" value={editor.title} oninput={handleEditorTitle} />
          </label>
          <label>
            항목(JSON)
            <textarea rows="10" value={editor.itemsText} oninput={handleEditorItems}></textarea>
          </label>
          {#if editor.error}
            <p class="error">{editor.error}</p>
          {/if}
          <div class="inline">
            <button onclick={saveEditor}>저장</button>
            <button onclick={cancelEditor}>취소</button>
          </div>
          <p class="muted">
            예시:
            {#if engineId === 'schedule'}
              {"[{ \"repeat\": \"daily\", \"title\": \"약 먹기\", \"timeStart\": \"08:00\" }, { \"repeat\": \"yearly\", \"monthDay\": \"03-12\", \"title\": \"생일 축하\", \"timeStart\": \"09:00\" }]"}
            {:else}
              {"[{ \"word\": \"apple\", \"meaning\": \"사과\", \"example\": \"I ate an apple.\" }]"}
            {/if}
          </p>
        </section>
      {/if}
    </div>
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
  .popup-content { display: grid; gap: 0.8rem; }
  .card {
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 12px;
    padding: 1.25rem;
    display: grid;
    gap: 0.9rem;
    transition: transform 180ms ease, box-shadow 180ms ease;
  }
  .card:hover {
    transform: translateY(-2px);
    box-shadow: var(--card-hover-shadow);
  }
  .muted { color: var(--text-muted); font-size: var(--font-muted); }
  .count { font-weight: 600; }
  .inline { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
  .header-row { align-items: center; }
  h3, h4, p { margin: 0; }
  .error { color: #f25f5f; }
  .dataset {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    border: 1px dashed var(--panel-border);
    border-radius: 10px;
    padding: 0.9rem;
  }
  .dataset-actions { display: flex; gap: 0.6rem; }
  .dataset h4, .dataset p { margin: 0; }
  .dataset p.muted { margin-top: 0.28rem; max-width: 100%; overflow-wrap: anywhere; font-size: 1rem; }
  .item-check { display: flex; gap: 0.6rem; align-items: flex-start; }
  .dictation-selected {
    background: #2f5ea8;
    color: #ffffff;
    border-color: #2f5ea8;
  }
  .schedule-preview-list {
    display: grid;
    gap: 0.7rem;
    margin-top: 0.85rem;
  }
  .schedule-preview-item {
    width: 100%;
    display: grid;
    justify-items: start;
    gap: 0.34rem;
    text-align: left;
    border-radius: 12px;
    padding: 1rem 1.05rem;
    background: linear-gradient(180deg, rgba(247, 251, 255, 0.96) 0%, rgba(233, 241, 255, 0.98) 100%);
  }
  .schedule-preview-item strong { font-size: 1.05rem; color: var(--text-strong); }
  .schedule-preview-meta { color: var(--text-muted); font-size: 0.98rem; white-space: normal; overflow-wrap: anywhere; }
  input[type='text'], textarea {
    width: 100%;
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    background: var(--panel-bg);
    padding: 0.85rem 0.95rem;
  }
  textarea { min-height: 220px; resize: vertical; }
  .disabled { opacity: 0.6; pointer-events: none; }
  @media (max-width: 720px) {
    .popup-overlay { align-items: flex-start; padding: 0.6rem; }
    .popup-panel { width: 100%; max-height: 95vh; border-radius: 12px; padding: 0.85rem; }
    .inline { flex-direction: column; align-items: stretch; }
  }
</style>
