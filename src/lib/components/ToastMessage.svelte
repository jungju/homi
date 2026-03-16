<script lang="ts">
  import { getMessage } from '../state/message.svelte';

  interface Props {
    visible: boolean;
  }
  let { visible }: Props = $props();

  const message = $derived(getMessage());
</script>

{#if visible && message}
  <div
    data-testid="toast-root"
    class={`toast ${message.type}`}
    aria-live="polite"
  >
    {message.text}
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    top: 0.9rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 30;
    width: min(96vw, 920px);
    box-sizing: border-box;
    border-radius: 8px;
    padding: 0.85rem 1.05rem;
    border: 1px solid transparent;
    font-size: 1.2rem;
    font-weight: 700;
  }
  .toast.ok {
    background: var(--toast-ok-bg);
    border-color: var(--toast-ok-border);
    color: var(--toast-ok-text);
  }
  .toast.error {
    background: var(--toast-err-bg);
    border-color: var(--toast-err-border);
    color: var(--toast-err-text);
  }
</style>
