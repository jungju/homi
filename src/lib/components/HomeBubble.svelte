<script lang="ts">
  interface Props {
    statusText: string;
    statusTone: 'default' | 'alert' | 'error' | 'running';
    modeText: string;
  }
  let { statusText, statusTone, modeText }: Props = $props();
</script>

<section class="home-dialog" data-testid="home-bubble" role="status" aria-live="polite">
  <h1 data-testid="home-robot-name" class="home-robot-name">호미</h1>
  {#if statusText}
    <p data-testid="home-status-text" class={`home-status ${statusTone}`}>{statusText}</p>
  {/if}
  {#if modeText}
    <p data-testid="home-mode-text" class="home-mode">{modeText}</p>
  {/if}
</section>

<style>
  .home-robot-name {
    margin: 0;
    font-size: var(--home-name-size);
    line-height: 0.92;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: var(--text-strong);
  }
  .home-status {
    margin: 0;
    font-size: var(--home-status-size);
    line-height: 1.18;
    font-weight: 800;
    color: var(--home-status-default);
    overflow-wrap: anywhere;
    text-wrap: balance;
  }
  .home-status.alert { color: var(--home-status-alert); }
  .home-status.error { color: var(--home-status-error); }
  .home-status.running { color: var(--home-status-running); }
  .home-mode {
    margin: 0;
    font-size: var(--home-mode-size);
    font-weight: 700;
    color: var(--muted-text);
  }
  .home-dialog {
    position: relative;
    flex: 0 0 auto;
    padding: 1rem 1.35rem;
    border-radius: 22px;
    border: 1px solid var(--panel-border);
    background: color-mix(in srgb, var(--panel-bg) 80%, var(--text-color) 5%);
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.08);
    display: grid;
    gap: 0.45rem;
    text-align: center;
    width: min(calc(100vw - 1.2rem), 960px);
    max-width: 960px;
    overflow: visible;
    pointer-events: auto;
  }
  .home-dialog:after { display: none; }
  @media (max-width: 700px) {
    .home-dialog {
      width: min(calc(100vw - 0.9rem), 700px);
      max-width: none;
    }
  }
</style>
