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
    gap: clamp(0.42rem, 1vmin, 0.92rem);
    width: min(152%, calc(100% + clamp(3rem, 7vw, 5.75rem)));
    min-width: 100%;
    max-width: min(34rem, calc(100vw - 1.25rem));
    height: 100%;
    box-sizing: border-box;
    margin-left: auto;
    text-align: right;
    padding: clamp(1rem, 2.2vw, 1.8rem) clamp(1.15rem, 2.5vw, 2rem);
    border-radius: clamp(28px, 3.6vw, 40px);
    border: 1px solid rgba(84, 117, 153, 0.22);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.86) 0%, rgba(222, 236, 255, 0.96) 100%),
      radial-gradient(circle at top right, rgba(255, 255, 255, 0.9), transparent 42%);
    box-shadow:
      0 24px 52px rgba(23, 53, 93, 0.18),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(14px);
    pointer-events: none;
  }
  .home-clock-date {
    margin: 0;
    width: 100%;
    font-size: clamp(1.1rem, 4.4vmin, 2.35rem);
    line-height: 1.02;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #436180;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .home-clock-time {
    margin: 0;
    width: 100%;
    font-size: clamp(3.4rem, 17.8vmin, 8.6rem);
    line-height: 0.78;
    font-weight: 900;
    letter-spacing: -0.09em;
    color: #133b66;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 10px 26px rgba(23, 59, 102, 0.12);
  }

  @media (max-width: 720px) {
    .home-clock {
      width: 100%;
      max-width: none;
      padding: clamp(0.8rem, 2.8vw, 1.05rem);
      border-radius: clamp(22px, 5vw, 28px);
      box-shadow: 0 16px 30px rgba(23, 53, 93, 0.14);
    }
    .home-clock-date {
      font-size: clamp(0.9rem, 2.9vw, 1.2rem);
    }
    .home-clock-time {
      font-size: clamp(2.45rem, 10vw, 3.75rem);
      line-height: 0.82;
    }
  }
</style>
