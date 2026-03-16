<script lang="ts">
  import {
    getStore,
    getThemeMode,
    setThemeMode,
    getDebugAreasVisible,
    setDebugAreasVisible,
  } from '../state/app.svelte';
  import { getMessage } from '../state/message.svelte';
  import {
    getScheduleQuietModeActive,
    getScheduleQuietStatusText,
    startScheduleQuietMode,
    clearScheduleQuietMode,
  } from '../state/schedule.svelte';
  import {
    BACKUP_TABS,
    getPreview,
    setPreview,
    getImportUrl,
    setImportUrl,
    getBackupTab,
    getImportJsonText,
    setImportJsonText,
    getBackupVersionDateText,
    getBackupUrlSyncStatusText,
    getDatasetCount,
    selectBackupTab,
    onBackupTabKeydown,
    closePopup,
    onOverlayKeydown,
    runUrlImport,
    runTextImport,
    loadSampleBundle,
    importFromFile,
    importFromPreview,
    togglePreviewSelection,
  } from '../state/import.svelte';

  function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) closePopup();
  }

  const message = $derived(getMessage());
  const store = $derived(getStore());
  const datasetCount = $derived(getDatasetCount());
  const themeMode = $derived(getThemeMode());
  const debugAreasVisible = $derived(getDebugAreasVisible());
  const backupVersionDateText = $derived(getBackupVersionDateText());
  const scheduleQuietModeActive = $derived(getScheduleQuietModeActive());
  const scheduleQuietStatusText = $derived(getScheduleQuietStatusText());
  const backupUrlSyncStatusText = $derived(getBackupUrlSyncStatusText());
  const backupTab = $derived(getBackupTab());
  const importUrl = $derived(getImportUrl());
  const importJsonText = $derived(getImportJsonText());
  const preview = $derived(getPreview());

  function handleImportUrlInput(e: Event) {
    setImportUrl((e.currentTarget as HTMLInputElement).value);
  }

  function handleImportJsonInput(e: Event) {
    setImportJsonText((e.currentTarget as HTMLTextAreaElement).value);
  }
</script>

<div
  class="popup-overlay"
  data-testid="overlay-root"
  data-overlay-kind="backup"
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
    data-overlay-kind="backup"
  >
    <button type="button" class="popup-close" data-testid="overlay-close" onclick={closePopup}>닫기</button>
    <p id="overlay-title" class="muted" data-testid="overlay-title">페이지: /brain</p>
    {#if message && message.type === 'error'}
      <p data-testid="backup-error" class="error">{message.text}</p>
    {/if}
    <div class="popup-content">
      <section class="card" data-testid="backup-summary-section" data-debug-anchor-id="backup-summary-section">
        <h2>브레인 설정</h2>
        <p class="muted">현재 저장 데이터: {datasetCount}개</p>
        <p class="muted" data-testid="backup-version">{backupVersionDateText}</p>
      </section>

      <section class="card" data-testid="backup-theme-section" data-debug-anchor-id="backup-theme-section">
        <h2>화면 테마</h2>
        <p data-testid="backup-theme-status" class="muted">
          현재 테마: {themeMode === 'dark' ? '다크 모드' : '라이트 모드'}
        </p>
        <div class="inline">
          <button
            type="button"
            data-testid="backup-theme-light"
            class:active={themeMode === 'light'}
            aria-pressed={themeMode === 'light'}
            onclick={() => setThemeMode('light')}
          >
            라이트 모드
          </button>
          <button
            type="button"
            data-testid="backup-theme-dark"
            class:active={themeMode === 'dark'}
            aria-pressed={themeMode === 'dark'}
            onclick={() => setThemeMode('dark')}
          >
            다크 모드
          </button>
        </div>
        <p class="muted">여기서 바꾸면 홈과 모든 설정 오버레이에 즉시 적용되고 다음 실행에도 유지됩니다.</p>
      </section>

      <section class="card" data-testid="backup-debug-section" data-debug-anchor-id="backup-debug-section">
        <h2>디버그 표시</h2>
        <p data-testid="backup-debug-areas-status" class="muted">
          홈 9분할 area: {debugAreasVisible ? '표시 중' : '숨김'}
        </p>
        <div class="inline">
          <button
            type="button"
            data-testid="backup-debug-areas-show"
            class:active={debugAreasVisible}
            aria-pressed={debugAreasVisible}
            onclick={() => setDebugAreasVisible(true)}
          >
            Show
          </button>
          <button
            type="button"
            data-testid="backup-debug-areas-hide"
            class:active={!debugAreasVisible}
            aria-pressed={!debugAreasVisible}
            onclick={() => setDebugAreasVisible(false)}
          >
            Hidden (none)
          </button>
        </div>
        <p class="muted">개발/디버그용 반투명 색상 오버레이이며, 홈 얼굴 화면의 9개 area를 각기 다른 색으로 표시합니다.</p>
      </section>

      <section class="card" data-testid="backup-quiet-section" data-debug-anchor-id="backup-quiet-section">
        <h2>알림 관리</h2>
        <p data-testid="backup-quiet-status" class="muted">{scheduleQuietStatusText}</p>
        <div class="inline">
          <button type="button" data-testid="backup-quiet-enable" onclick={startScheduleQuietMode}>
            {scheduleQuietModeActive ? '30분 더 조용히' : '30분간 조용히'}
          </button>
          <button
            type="button"
            data-testid="backup-quiet-clear"
            onclick={clearScheduleQuietMode}
            disabled={!scheduleQuietModeActive}
          >
            지금 해제
          </button>
        </div>
        <p class="muted">조용히 모드 동안 schedule 알림은 홈 문구, 브라우저 알림, 음성 출력 없이 무시됩니다.</p>
      </section>

      <section class="card" data-testid="backup-import-section" data-debug-anchor-id="backup-import-section">
        <h2>브레인 입력</h2>
        <p class="muted">가져오기 방식은 탭으로 전환합니다.</p>
        <div
          class="backup-tabs"
          data-testid="backup-tablist"
          role="tablist"
          aria-label="브레인 가져오기 방식"
          tabindex="0"
          onkeydown={onBackupTabKeydown}
        >
          {#each BACKUP_TABS as tab}
            <button
              id={`backup-tab-${tab.id}`}
              type="button"
              role="tab"
              class="backup-tab-button"
              class:active={backupTab === tab.id}
              data-testid={`backup-tab-${tab.id}`}
              aria-selected={backupTab === tab.id}
              aria-controls={`backup-panel-${tab.id}`}
              tabindex={backupTab === tab.id ? 0 : -1}
              onclick={() => selectBackupTab(tab.id)}
            >
              {tab.label}
            </button>
          {/each}
        </div>

        <div
          class="backup-tab-panel"
          id="backup-panel-url"
          data-testid="backup-panel-url"
          role="tabpanel"
          aria-labelledby="backup-tab-url"
          hidden={backupTab !== 'url'}
        >
          <h3>URL 가져오기</h3>
          <p class="muted">HTTPS JSON URL 또는 공유 링크를 붙여넣거나 바로 열 수 있습니다.</p>
          <p class="muted" data-testid="backup-url-sync-status">{backupUrlSyncStatusText}</p>
          <div class="inline">
            <input
              data-testid="backup-url-input"
              placeholder="https://.../bundle.json"
              value={importUrl}
              oninput={handleImportUrlInput}
              type="url"
              inputmode="url"
            />
            <button data-testid="backup-url-preview-btn" type="button" onclick={runUrlImport}>
              가져오기
            </button>
          </div>
          <p class="muted">{`허용 스킴: https://  (개발환경: http://localhost 허용)`}</p>
        </div>

        <div
          class="backup-tab-panel"
          id="backup-panel-text"
          data-testid="backup-panel-text"
          role="tabpanel"
          aria-labelledby="backup-tab-text"
          hidden={backupTab !== 'text'}
        >
          <h3>텍스트로 가져오기</h3>
          <label for="import-json-text-backup">JSON 텍스트</label>
          <textarea
            id="import-json-text-backup"
            data-testid="backup-json-textarea"
            rows="10"
            value={importJsonText}
            oninput={handleImportJsonInput}
            placeholder="브레인 JSON 붙여넣기 예: format:homi, version:1, datasets:..."
          ></textarea>
          <div class="inline">
            <button
              type="button"
              data-testid="backup-text-preview-btn"
              onclick={runTextImport}
            >
              텍스트로 가져오기
            </button>
          </div>
          <p class="muted">브레인 JSON을 붙여넣으면 미리보기 후 확인 저장됩니다.</p>
        </div>

        <div
          class="backup-tab-panel"
          id="backup-panel-file"
          data-testid="backup-panel-file"
          role="tabpanel"
          aria-labelledby="backup-tab-file"
          hidden={backupTab !== 'file'}
        >
          <h3>파일로 가져오기</h3>
          <div class="inline">
            <label class="file-input-trigger" data-testid="backup-file-preview-btn">
              <span>파일 선택</span>
              <input
                data-testid="backup-file-input"
                class="file-input-native"
                type="file"
                accept="application/json,.json"
                onchange={importFromFile}
              />
            </label>
            <span>또는 파일 입력</span>
          </div>
          <p class="muted">파일 Import도 URL Import와 동일하게 미리보기 후 확인 저장됩니다.</p>
        </div>

        <div
          class="backup-tab-panel"
          id="backup-panel-sample"
          data-testid="backup-panel-sample"
          role="tabpanel"
          aria-labelledby="backup-tab-sample"
          hidden={backupTab !== 'sample'}
        >
          <h3>샘플 가져오기</h3>
          <p class="muted">기본 샘플 뇌(스케줄 + 받아쓰기) 번들을 한 번에 가져올 수 있습니다.</p>
          <button
            type="button"
            data-testid="backup-sample-load-btn"
            onclick={loadSampleBundle}
          >
            기본 샘플 뇌 가져오기
          </button>
        </div>
      </section>

      {#if preview}
        <section class="card" data-testid="backup-preview" data-debug-anchor-id="backup-preview-section">
          <h3>Import 미리보기</h3>
          <p class="muted">출처: {preview.sourceText}</p>
          <p class="muted">bundleType: {preview.bundle.bundleType}, datasets: {preview.bundle.datasets.length}</p>
          {#each preview.candidates as candidate}
            <label class="item-check">
              <input
                type="checkbox"
                checked={candidate.selected}
                onchange={(event: Event) => {
                  const target = event.currentTarget as HTMLInputElement;
                  togglePreviewSelection(candidate.index, target.checked);
                }}
              />
              <div>
                <h4>{candidate.payload.title}</h4>
                <p class="muted">엔진: {candidate.payload.engineId} / 항목: {candidate.payload.items.length}개</p>
                {#if candidate.payload.id}
                  <p class="muted">원본 id: {candidate.payload.id}</p>
                {/if}
              </div>
            </label>
          {/each}
          <div class="inline">
            <button data-testid="backup-confirm" onclick={importFromPreview}>가져오기 확정</button>
            <button onclick={() => setPreview(null)}>취소</button>
          </div>
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
  .error { color: #f25f5f; }
  .inline { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
  h2, h3, h4, p { margin: 0; }
  .item-check { display: flex; gap: 0.6rem; align-items: flex-start; }
  .backup-tabs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.65rem;
  }
  .backup-tab-button { width: 100%; justify-content: center; }
  .backup-tab-panel {
    display: grid;
    gap: 0.8rem;
    padding: 1rem;
    border: 1px dashed var(--panel-border);
    border-radius: 10px;
    background: color-mix(in srgb, var(--button-hover-bg) 56%, #fff 44%);
  }
  .backup-tab-panel[hidden] { display: none; }
  .active {
    background: var(--button-text);
    color: var(--button-bg);
  }
  .file-input-trigger {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid var(--button-border);
    border-radius: 8px;
    padding: 0.85rem 1.2rem;
    color: var(--button-text);
    background: var(--button-bg);
    cursor: pointer;
    font-size: var(--font-button);
    font-weight: 700;
  }
  .file-input-trigger:hover { background: var(--button-hover-bg); }
  .file-input-native {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
  input[type='url'], textarea {
    width: 100%;
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    background: var(--panel-bg);
    padding: 0.85rem 0.95rem;
  }
  textarea { min-height: 220px; resize: vertical; }
  @media (max-width: 720px) {
    .popup-overlay { align-items: flex-start; padding: 0.6rem; }
    .popup-panel { width: 100%; max-height: 95vh; border-radius: 12px; padding: 0.85rem; }
    .backup-tabs { grid-template-columns: 1fr; }
    .inline { flex-direction: column; align-items: stretch; }
  }
</style>
