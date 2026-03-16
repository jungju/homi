<script lang="ts">
  import type { HomeMood } from '../state/face.svelte';

  interface Props {
    mood: HomeMood;
  }
  let { mood }: Props = $props();
</script>

<div class="home-face" data-testid="home-face" role="img" aria-label="친근한 홈 캐릭터 얼굴">
  <div class="home-face__frame">
    <div class="home-face__head" data-mood={mood}>
      <div class="home-face__eyes">
        <div class="home-face__eye"></div>
        <div class="home-face__eye"></div>
      </div>
      <div class="home-face__mouth"></div>
      <div class="home-face__cheek left"></div>
      <div class="home-face__cheek right"></div>
      <div class="home-face__spark left"></div>
      <div class="home-face__spark right"></div>
    </div>
  </div>
</div>

<style>
  .home-face {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
    width: clamp(320px, min(88vmin, calc(100dvh - 4rem)), 860px);
    height: clamp(320px, min(88vmin, calc(100dvh - 4rem)), 860px);
    display: grid;
    justify-items: center;
    gap: 0.6rem;
    pointer-events: none;
  }
  .home-face__frame {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: transparent;
    border: 0;
    display: grid;
    place-items: center;
    box-shadow: 0 12px 30px rgba(143, 79, 36, 0.22);
    position: relative;
    overflow: visible;
  }
  .home-face__head {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #ffd28b;
    position: relative;
    display: grid;
    place-items: center;
  }
  .home-face__eyes {
    display: flex;
    gap: clamp(52px, 13.8vmin, 166px);
    margin-top: clamp(30px, 8.5vmin, 84px);
  }
  .home-face__eye {
    width: clamp(60px, 14vmin, 144px);
    height: clamp(60px, 14vmin, 144px);
    border-radius: 50%;
    background: #2d3f57;
    position: relative;
    box-shadow: inset -8px 0 0 rgba(255, 255, 255, 0.72);
  }
  .home-face__eye::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    width: clamp(20px, 4.8vmin, 48px);
    height: clamp(20px, 4.8vmin, 48px);
    top: clamp(8px, 2vmin, 24px);
    left: clamp(8px, 2vmin, 24px);
    background: #fff;
  }
  .home-face__mouth {
    margin-top: clamp(22px, 6.1vmin, 46px);
    width: clamp(42px, 12vmin, 92px);
    height: clamp(5px, 1.4vmin, 10px);
    border-radius: 999px;
    background: #b45a2a;
  }
  .home-face__cheek {
    position: absolute;
    width: clamp(12px, 3.6vmin, 24px);
    height: clamp(8px, 2.8vmin, 15px);
    background: #f7b3b3;
    border-radius: 50%;
    top: clamp(52px, 18vmin, 168px);
    filter: blur(0.2px);
  }
  .home-face__cheek.left { left: clamp(34px, 7.8vmin, 82px); }
  .home-face__cheek.right { right: clamp(34px, 7.8vmin, 82px); }
  .home-face__spark {
    position: absolute;
    width: 6px;
    height: 6px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 50%;
    top: clamp(18px, 9vmin, 56px);
    opacity: 0.85;
    animation: sparkle 2.3s infinite ease-in-out;
  }
  .home-face__spark.left { left: clamp(30px, 10.5vmin, 92px); animation-delay: 0.3s; }
  .home-face__spark.right { right: clamp(30px, 10.5vmin, 92px); animation-delay: 1.1s; }

  /* Mood animations */
  .home-face__head[data-mood='wink'] { animation: head-bounce 1s ease; }
  .home-face__head[data-mood='wink'] .home-face__eye:first-child {
    height: 8px;
    transform: translateY(18px);
    transition: all 90ms ease;
    border-radius: 8px;
  }
  .home-face__head[data-mood='proud'] .home-face__mouth {
    width: clamp(52px, 14vmin, 104px);
    height: clamp(6px, 1.6vmin, 12px);
    background: #e16b24;
  }
  .home-face__head[data-mood='proud'] .home-face__cheek {
    opacity: 0.42;
    transform: scale(1.08);
  }
  .home-face__head[data-mood='curious'] .home-face__mouth {
    width: 38px;
    height: clamp(5px, 1.4vmin, 10px);
    background: #cc6f2f;
    transform: rotate(10deg);
  }
  .home-face__head[data-mood='concern'] .home-face__eye { transform: translateY(1px); }
  .home-face__head[data-mood='concern'] .home-face__mouth {
    transform: rotate(-8deg);
    background: #9c5e34;
  }
  .home-face__head[data-mood='calm'] .home-face__mouth {
    width: clamp(36px, 10vmin, 80px);
    height: clamp(4px, 1.2vmin, 8px);
    background: #b45a2a;
  }
  .home-face__head[data-mood='wink'],
  .home-face__head[data-mood='proud'],
  .home-face__head[data-mood='curious'],
  .home-face__head[data-mood='concern'],
  .home-face__head[data-mood='calm'] {
    transition: all 260ms ease;
  }
  .home-face__head[data-mood='wink'] { animation: head-tilt 0.9s ease; }

  @keyframes head-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(2px); }
  }
  @keyframes head-tilt {
    0% { transform: rotate(0deg); }
    50% { transform: rotate(-3.5deg); }
    100% { transform: rotate(0deg); }
  }
  @keyframes sparkle {
    0%, 100% { transform: scale(0.9); opacity: 0.35; }
    50% { transform: scale(1.25); opacity: 1; }
  }

  @media (max-width: 720px) {
    .home-face {
      width: clamp(220px, min(82vmin, calc(100dvh - 8rem)), 560px);
      height: clamp(220px, min(82vmin, calc(100dvh - 8rem)), 560px);
    }
  }
</style>
