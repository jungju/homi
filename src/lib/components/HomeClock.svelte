<script lang="ts">
  interface Props {
    dateText: string;
    timeText: string;
  }
  let { dateText, timeText }: Props = $props();
</script>

<section class="home-clock" data-testid="home-clock" aria-label="현재 날짜와 시간">
  <p class="home-clock-date" data-testid="home-clock-date">{dateText}</p>
  <p class="home-clock-time" data-testid="home-clock-time">{timeText}</p>
</section>

<style>
  .home-clock {
    display: grid;
    justify-items: end;
    align-content: center;
    gap: clamp(0.32rem, 0.9vmin, 0.72rem);
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
    line-height: 1.02;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #436180;
    white-space: nowrap;
    overflow: hidden;
    font-variant-numeric: tabular-nums;
  }
  .home-clock-time {
    margin: 0;
    width: 100%;
    max-width: 100%;
    font-size: clamp(5.6rem, 22cqw, 8.2rem);
    line-height: 0.8;
    font-weight: 900;
    letter-spacing: -0.075em;
    color: #133b66;
    white-space: nowrap;
    overflow: hidden;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 10px 26px rgba(23, 59, 102, 0.12);
  }

  @media (max-width: 720px) {
    .home-clock {
      gap: clamp(0.24rem, 0.8vmin, 0.42rem);
      padding: clamp(0.2rem, 1vw, 0.45rem) clamp(0.25rem, 1.4vw, 0.45rem) clamp(0.2rem, 1vw, 0.45rem) clamp(0.55rem, 2vw, 0.8rem);
    }
    .home-clock-date {
      font-size: clamp(0.9rem, 8.3cqw, 1.2rem);
    }
    .home-clock-time {
      font-size: clamp(2.3rem, 24cqw, 3.75rem);
      line-height: 0.82;
      letter-spacing: -0.06em;
    }
  }
</style>
