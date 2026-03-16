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
    gap: clamp(0.46rem, 1.1vmin, 1rem);
    width: 100%;
    min-width: 0;
    max-width: none;
    height: 100%;
    box-sizing: border-box;
    text-align: right;
    padding: clamp(1.1rem, 2.5vw, 1.95rem) clamp(1.15rem, 2.7vw, 2.15rem);
    border-radius: clamp(30px, 4vw, 42px);
    border: 1px solid rgba(84, 117, 153, 0.22);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.86) 0%, rgba(222, 236, 255, 0.96) 100%),
      radial-gradient(circle at top right, rgba(255, 255, 255, 0.9), transparent 42%);
    box-shadow:
      0 24px 52px rgba(23, 53, 93, 0.18),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(14px);
    overflow: hidden;
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
    font-size: clamp(4.9rem, 25cqw, 8.2rem);
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
      padding: clamp(0.8rem, 2.8vw, 1.05rem);
      border-radius: clamp(22px, 5vw, 28px);
      box-shadow: 0 16px 30px rgba(23, 53, 93, 0.14);
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
