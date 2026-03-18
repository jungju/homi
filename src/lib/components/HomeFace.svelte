<script lang="ts">
  import type { RobotStyle } from '../homi';
  import type { HomeMood } from '../state/face.svelte';

  interface Props {
    mood: HomeMood;
    styleId: RobotStyle;
  }
  let { mood, styleId }: Props = $props();
</script>

<div class="home-face" data-testid="home-face" role="img" aria-label="친근한 홈 캐릭터 얼굴">
  <div class="home-face__frame" data-style={styleId}>
    <div class="home-face__head" data-mood={mood} data-style={styleId}>
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
    box-shadow:
      0 18px 42px rgba(144, 86, 38, 0.18),
      0 0 0 1px rgba(255, 255, 255, 0.34);
    position: relative;
    overflow: visible;
    transition: border-radius 280ms ease, transform 280ms ease, box-shadow 280ms ease;
  }
  .home-face__frame::before,
  .home-face__frame::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    pointer-events: none;
  }
  .home-face__frame::before {
    inset: clamp(6px, 1.5vmin, 16px);
    border: clamp(2px, 0.55vmin, 5px) solid rgba(255, 255, 255, 0.5);
    opacity: 0.58;
    transition: border-radius 280ms ease, inset 280ms ease, opacity 280ms ease;
  }
  .home-face__frame::after {
    inset: clamp(-6px, -1.5vmin, -16px);
    background:
      radial-gradient(circle at 50% 50%, rgba(255, 215, 150, 0.26) 0%, transparent 58%),
      radial-gradient(circle at 50% 62%, rgba(255, 170, 97, 0.12) 0%, transparent 72%);
    filter: blur(clamp(12px, 2.6vmin, 26px));
    opacity: 0.9;
    transition: border-radius 280ms ease, opacity 280ms ease, inset 280ms ease;
  }
  .home-face__head {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background:
      radial-gradient(circle at 30% 26%, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.18) 16%, transparent 34%),
      radial-gradient(circle at 72% 78%, rgba(255, 170, 103, 0.38) 0%, rgba(255, 170, 103, 0.04) 28%, transparent 54%),
      linear-gradient(180deg, #ffe0ab 0%, #ffd28b 44%, #f2b466 100%);
    position: relative;
    display: grid;
    place-items: center;
    box-shadow:
      inset 0 12px 18px rgba(255, 255, 255, 0.24),
      inset 0 -18px 26px rgba(185, 103, 30, 0.16);
    transition: border-radius 280ms ease, width 280ms ease, height 280ms ease, transform 280ms ease, background 280ms ease, box-shadow 280ms ease;
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
    background:
      radial-gradient(circle at 42% 34%, #5f7899 0%, #425b7a 20%, #2d415c 44%, #1a2a40 76%, #121f31 100%);
    position: relative;
    box-shadow:
      inset 0 10px 18px rgba(255, 255, 255, 0.2),
      inset 0 -10px 14px rgba(8, 15, 25, 0.26),
      0 8px 14px rgba(29, 43, 64, 0.1);
    transition: background 260ms ease, box-shadow 260ms ease, transform 260ms ease, opacity 260ms ease;
  }
  .home-face__eye::before {
    content: '';
    position: absolute;
    inset: clamp(15px, 3.2vmin, 30px);
    border-radius: 50%;
    background: radial-gradient(circle at 50% 52%, #0f1827 0%, #162337 44%, rgba(12, 20, 31, 0) 76%);
    opacity: 0.95;
    transition: background 260ms ease, opacity 260ms ease;
  }
  .home-face__eye::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    width: clamp(20px, 4.8vmin, 48px);
    height: clamp(20px, 4.8vmin, 48px);
    top: clamp(8px, 2vmin, 24px);
    left: clamp(8px, 2vmin, 24px);
    background: radial-gradient(circle, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.86) 55%, rgba(255, 255, 255, 0) 100%);
    transition: background 260ms ease, opacity 260ms ease;
  }
  .home-face__mouth {
    margin-top: clamp(22px, 6.1vmin, 46px);
    width: clamp(42px, 12vmin, 92px);
    height: clamp(5px, 1.4vmin, 10px);
    border-radius: 999px;
    background: linear-gradient(180deg, #e78444 0%, #bc5a2b 100%);
    box-shadow:
      0 4px 10px rgba(168, 83, 35, 0.14),
      inset 0 1px 0 rgba(255, 236, 220, 0.46);
    transition: background 260ms ease, box-shadow 260ms ease, transform 260ms ease, opacity 260ms ease;
  }
  .home-face__cheek {
    position: absolute;
    width: clamp(26px, 6.2vmin, 58px);
    height: clamp(18px, 4.4vmin, 34px);
    background: radial-gradient(circle, rgba(255, 170, 176, 0.58) 0%, rgba(255, 170, 176, 0.22) 58%, rgba(255, 170, 176, 0) 100%);
    border-radius: 50%;
    top: clamp(52px, 18vmin, 168px);
    filter: blur(clamp(1px, 0.25vmin, 2.2px));
    opacity: 0.84;
    transition: background 260ms ease, transform 260ms ease, opacity 260ms ease;
  }
  .home-face__cheek.left { left: clamp(34px, 7.8vmin, 82px); }
  .home-face__cheek.right { right: clamp(34px, 7.8vmin, 82px); }
  .home-face__spark {
    position: absolute;
    width: clamp(10px, 1.5vmin, 16px);
    height: clamp(10px, 1.5vmin, 16px);
    top: clamp(18px, 9vmin, 56px);
    opacity: 0.85;
    animation: sparkle 2.3s infinite ease-in-out;
  }
  .home-face__spark::before,
  .home-face__spark::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.52);
    transform: translate(-50%, -50%);
  }
  .home-face__spark::before {
    width: 100%;
    height: 28%;
  }
  .home-face__spark::after {
    width: 28%;
    height: 100%;
  }
  .home-face__spark::before,
  .home-face__spark::after {
    transition: background 260ms ease, box-shadow 260ms ease, opacity 260ms ease;
  }
  .home-face__spark.left { left: clamp(30px, 10.5vmin, 92px); animation-delay: 0.3s; }
  .home-face__spark.right { right: clamp(30px, 10.5vmin, 92px); animation-delay: 1.1s; }

  .home-face__frame[data-style='mint'] {
    border-radius: 44% 44% 40% 40% / 36% 36% 48% 48%;
  }
  .home-face__frame[data-style='mint']::before {
    border-radius: 40% 40% 36% 36% / 34% 34% 44% 44%;
  }
  .home-face__frame[data-style='mint']::after {
    border-radius: 46% 46% 42% 42% / 38% 38% 50% 50%;
  }

  .home-face__head[data-style='mint'] {
    background:
      radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.96) 0%, rgba(255, 255, 255, 0.24) 15%, transparent 32%),
      radial-gradient(circle at 75% 82%, rgba(120, 234, 210, 0.34) 0%, rgba(120, 234, 210, 0.06) 28%, transparent 56%),
      linear-gradient(180deg, #f2fff7 0%, #d6f6e8 46%, #9fe0c9 100%);
    width: 96%;
    height: 92%;
    border-radius: 42% 42% 38% 38% / 34% 34% 48% 48%;
    transform: translateY(clamp(6px, 1.5vmin, 14px));
    box-shadow:
      inset 0 12px 18px rgba(255, 255, 255, 0.26),
      inset 0 -18px 26px rgba(61, 142, 121, 0.14);
  }
  .home-face__head[data-style='mint'] .home-face__eyes {
    gap: clamp(46px, 12.4vmin, 146px);
    margin-top: clamp(24px, 7.2vmin, 72px);
  }
  .home-face__head[data-style='mint'] .home-face__eye {
    background:
      radial-gradient(circle at 42% 34%, #66a8a0 0%, #4d8d89 20%, #2f6668 44%, #214b50 76%, #163539 100%);
    box-shadow:
      inset 0 10px 18px rgba(255, 255, 255, 0.2),
      inset 0 -10px 14px rgba(10, 33, 33, 0.24),
      0 8px 14px rgba(30, 88, 82, 0.12);
  }
  .home-face__head[data-style='mint'] .home-face__eye::before {
    background: radial-gradient(circle at 50% 52%, #0d2a28 0%, #143936 44%, rgba(10, 29, 28, 0) 76%);
  }
  .home-face__head[data-style='mint'] .home-face__mouth {
    background: linear-gradient(180deg, #ff9d7b 0%, #d56d54 100%);
    box-shadow:
      0 4px 10px rgba(164, 96, 81, 0.12),
      inset 0 1px 0 rgba(255, 242, 233, 0.48);
  }
  .home-face__head[data-style='mint'] .home-face__cheek {
    background: radial-gradient(circle, rgba(255, 186, 174, 0.62) 0%, rgba(255, 186, 174, 0.24) 58%, rgba(255, 186, 174, 0) 100%);
  }
  .home-face__head[data-style='mint'] .home-face__cheek.left {
    left: clamp(48px, 10vmin, 110px);
    top: clamp(74px, 20.5vmin, 180px);
  }
  .home-face__head[data-style='mint'] .home-face__cheek.right {
    right: clamp(48px, 10vmin, 110px);
    top: clamp(74px, 20.5vmin, 180px);
  }
  .home-face__head[data-style='mint'] .home-face__spark::before,
  .home-face__head[data-style='mint'] .home-face__spark::after {
    background: rgba(244, 255, 252, 0.98);
    box-shadow: 0 0 10px rgba(150, 255, 232, 0.44);
  }

  .home-face__frame[data-style='midnight'] {
    width: 94%;
    height: 94%;
    border-radius: 24%;
    box-shadow:
      0 20px 46px rgba(8, 16, 32, 0.28),
      0 0 0 1px rgba(193, 230, 255, 0.16);
  }
  .home-face__frame[data-style='midnight']::before {
    inset: clamp(8px, 1.8vmin, 18px);
    border-radius: 18%;
    border-color: rgba(193, 230, 255, 0.22);
    opacity: 0.72;
  }
  .home-face__frame[data-style='midnight']::after {
    inset: clamp(-3px, -1vmin, -10px);
    border-radius: 26%;
    background:
      radial-gradient(circle at 50% 50%, rgba(71, 162, 255, 0.22) 0%, transparent 58%),
      radial-gradient(circle at 50% 62%, rgba(132, 208, 255, 0.14) 0%, transparent 72%);
  }
  .home-face__head[data-style='midnight'] {
    transform-origin: center;
  }
  .home-face__head[data-style='midnight'] {
    background:
      radial-gradient(circle at 28% 22%, rgba(193, 230, 255, 0.32) 0%, rgba(193, 230, 255, 0.08) 14%, transparent 32%),
      radial-gradient(circle at 76% 78%, rgba(85, 173, 255, 0.24) 0%, rgba(85, 173, 255, 0.04) 30%, transparent 56%),
      linear-gradient(180deg, #364966 0%, #263851 44%, #1c293d 100%);
    width: 90%;
    height: 90%;
    border-radius: 22%;
    transform: translateY(clamp(2px, 0.6vmin, 8px));
    box-shadow:
      inset 0 12px 18px rgba(210, 235, 255, 0.12),
      inset 0 -18px 26px rgba(2, 10, 22, 0.28),
      0 14px 26px rgba(7, 16, 32, 0.16);
  }
  .home-face__head[data-style='midnight']::before {
    content: '';
    position: absolute;
    inset: clamp(14px, 3vmin, 30px);
    border-radius: clamp(22px, 5.2vmin, 44px);
    border: clamp(2px, 0.45vmin, 4px) solid rgba(158, 220, 255, 0.24);
    pointer-events: none;
    opacity: 0.7;
  }
  .home-face__head[data-style='midnight'] .home-face__eyes {
    gap: clamp(38px, 11vmin, 128px);
    margin-top: clamp(18px, 5.8vmin, 58px);
  }
  .home-face__head[data-style='midnight'] .home-face__eye {
    width: clamp(56px, 12.4vmin, 124px);
    height: clamp(56px, 12.4vmin, 124px);
    border-radius: 22px;
    background:
      radial-gradient(circle at 42% 34%, #8ed7ff 0%, #59b5f0 16%, #204f7d 34%, #122c48 66%, #0b1b2d 100%);
    box-shadow:
      inset 0 10px 18px rgba(255, 255, 255, 0.16),
      inset 0 -10px 14px rgba(4, 12, 22, 0.38),
      0 8px 14px rgba(5, 16, 30, 0.18);
  }
  .home-face__head[data-style='midnight'] .home-face__eye::before {
    inset: clamp(14px, 3vmin, 26px);
    border-radius: 16px;
    background: radial-gradient(circle at 50% 52%, #07111e 0%, #0c1a2a 44%, rgba(5, 13, 22, 0) 76%);
  }
  .home-face__head[data-style='midnight'] .home-face__eye::after {
    width: clamp(18px, 3.9vmin, 38px);
    height: clamp(18px, 3.9vmin, 38px);
    background: radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(219, 244, 255, 0.86) 55%, rgba(255, 255, 255, 0) 100%);
  }
  .home-face__head[data-style='midnight'] .home-face__mouth {
    margin-top: clamp(36px, 7.8vmin, 68px);
    width: clamp(64px, 16vmin, 122px);
    height: clamp(7px, 1.6vmin, 12px);
    background: linear-gradient(180deg, #9ad6ff 0%, #4a91d9 100%);
    box-shadow:
      0 4px 10px rgba(27, 73, 120, 0.2),
      inset 0 1px 0 rgba(222, 244, 255, 0.46);
  }
  .home-face__head[data-style='midnight'] .home-face__cheek {
    width: clamp(18px, 4vmin, 32px);
    height: clamp(14px, 3vmin, 22px);
    background: radial-gradient(circle, rgba(146, 170, 255, 0.34) 0%, rgba(146, 170, 255, 0.16) 58%, rgba(146, 170, 255, 0) 100%);
    opacity: 0.76;
  }
  .home-face__head[data-style='midnight'] .home-face__cheek.left {
    left: clamp(54px, 11vmin, 118px);
    top: clamp(82px, 20vmin, 188px);
  }
  .home-face__head[data-style='midnight'] .home-face__cheek.right {
    right: clamp(54px, 11vmin, 118px);
    top: clamp(82px, 20vmin, 188px);
  }
  .home-face__head[data-style='midnight'] .home-face__spark.left {
    left: clamp(42px, 9vmin, 86px);
    top: clamp(26px, 6.2vmin, 52px);
  }
  .home-face__head[data-style='midnight'] .home-face__spark.right {
    right: clamp(42px, 9vmin, 86px);
    top: clamp(26px, 6.2vmin, 52px);
  }
  .home-face__head[data-style='midnight'] .home-face__spark::before,
  .home-face__head[data-style='midnight'] .home-face__spark::after {
    background: rgba(198, 242, 255, 0.98);
    box-shadow: 0 0 11px rgba(111, 216, 255, 0.58);
  }

  /* Mood animations */
  .home-face__head[data-mood='wink'] { animation: head-bounce 1s ease; }
  .home-face__head[data-mood='wink'] .home-face__eye:first-child {
    height: 8px;
    transform: translateY(18px);
    transition: all 90ms ease;
    border-radius: 8px;
  }
  .home-face__head[data-mood='wink'] .home-face__eye:first-child::before,
  .home-face__head[data-mood='wink'] .home-face__eye:first-child::after {
    opacity: 0;
  }
  .home-face__head[data-mood='proud'] .home-face__mouth {
    width: clamp(52px, 14vmin, 104px);
    height: clamp(6px, 1.6vmin, 12px);
    background: linear-gradient(180deg, #ef8d3f 0%, #dc6121 100%);
  }
  .home-face__head[data-mood='proud'] .home-face__cheek {
    opacity: 0.96;
    transform: scale(1.08);
  }
  .home-face__head[data-mood='curious'] .home-face__mouth {
    width: 38px;
    height: clamp(5px, 1.4vmin, 10px);
    background: linear-gradient(180deg, #e68f4d 0%, #cc6f2f 100%);
    transform: rotate(10deg);
  }
  .home-face__head[data-mood='concern'] .home-face__eye {
    transform: translateY(1px);
    box-shadow:
      inset 0 10px 18px rgba(255, 255, 255, 0.16),
      inset 0 -10px 16px rgba(8, 15, 25, 0.32),
      0 8px 14px rgba(29, 43, 64, 0.1);
  }
  .home-face__head[data-mood='concern'] .home-face__mouth {
    transform: rotate(-8deg);
    background: linear-gradient(180deg, #c98555 0%, #9c5e34 100%);
  }
  .home-face__head[data-mood='calm'] .home-face__mouth {
    width: clamp(36px, 10vmin, 80px);
    height: clamp(4px, 1.2vmin, 8px);
    background: linear-gradient(180deg, #de8449 0%, #b45a2a 100%);
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
