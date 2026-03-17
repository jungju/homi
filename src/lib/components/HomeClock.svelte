<script lang="ts">
  interface Props {
    dateText: string;
    timeText: string;
  }
  let { dateText, timeText }: Props = $props();

  const clockDateParts = $derived.by(() => {
    const splitIndex = dateText.lastIndexOf(' ');
    if (splitIndex < 0) {
      return {
        dateLabel: dateText,
        weekdayLabel: '',
      };
    }

    return {
      dateLabel: dateText.slice(0, splitIndex),
      weekdayLabel: dateText.slice(splitIndex + 1),
    };
  });
</script>

<section class="home-clock" data-testid="home-clock" aria-label="현재 날짜와 시간">
  <p class="home-clock-date" data-testid="home-clock-date">
    <span class="home-clock-date__numeric">{clockDateParts.dateLabel}</span>{#if clockDateParts.weekdayLabel}{' '}<span class="home-clock-date__weekday">{clockDateParts.weekdayLabel}</span>{/if}
  </p>
  <p class="home-clock-time" data-testid="home-clock-time">{timeText}</p>
</section>

<style>
  .home-clock {
    display: grid;
    justify-items: end;
    align-content: center;
    gap: clamp(0.28rem, 0.85vmin, 0.62rem);
    width: 100%;
    min-width: 0;
    max-width: none;
    height: 100%;
    box-sizing: border-box;
    text-align: right;
    padding: clamp(0.4rem, 1vw, 0.8rem) clamp(0.45rem, 1.2vw, 0.9rem) clamp(0.4rem, 1vw, 0.8rem) clamp(0.65rem, 1.6vw, 1.15rem);
    overflow: visible;
    pointer-events: none;
    container-type: inline-size;
  }
  .home-clock-date {
    margin: 0;
    width: 100%;
    max-width: 100%;
    font-size: clamp(1rem, 8.2cqw, 2.35rem);
    line-height: 1.04;
    font-weight: 800;
    letter-spacing: -0.03em;
    white-space: nowrap;
    overflow: hidden;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 0.08em 0.22em var(--home-clock-date-shadow);
  }
  .home-clock-date__numeric {
    color: var(--home-clock-date-color);
  }
  .home-clock-date__weekday {
    color: var(--home-clock-weekday-color);
  }
  .home-clock-time {
    margin: 0;
    width: 100%;
    max-width: 100%;
    font-size: clamp(5.6rem, 22cqw, 8.2rem);
    line-height: 0.8;
    font-weight: 900;
    letter-spacing: -0.075em;
    color: var(--home-clock-time-color);
    white-space: nowrap;
    overflow: hidden;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 0.12em 0.3em var(--home-clock-time-shadow);
  }
  @supports ((-webkit-background-clip: text) or (background-clip: text)) {
    .home-clock-time {
      background: linear-gradient(
        135deg,
        var(--home-clock-time-grad-start) 0%,
        var(--home-clock-time-grad-mid) 52%,
        var(--home-clock-time-grad-end) 100%
      );
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  }

  @media (max-width: 720px) {
    .home-clock {
      gap: clamp(0.2rem, 0.72vmin, 0.36rem);
      padding: clamp(0.2rem, 1vw, 0.45rem) clamp(0.25rem, 1.4vw, 0.45rem) clamp(0.2rem, 1vw, 0.45rem) clamp(0.55rem, 2vw, 0.8rem);
    }
    .home-clock-date {
      font-size: clamp(0.9rem, 8.3cqw, 1.2rem);
      line-height: 1.06;
    }
    .home-clock-time {
      font-size: clamp(2.3rem, 24cqw, 3.75rem);
      line-height: 0.82;
      letter-spacing: -0.06em;
    }
  }
</style>
