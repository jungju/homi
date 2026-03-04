# Homi

가족용 키오스크 홈 헬퍼 대시보드 (Vite + Svelte + TypeScript)

## 기능

- 상단 상태바: 현재시간(Asia/Seoul), Online 상태, build version
- 스케줄 엔진: daily / hourly / once (setTimeout 재예약 방식, setInterval 미사용)
- 알림 로그 + 사운드 대기 배지
- 사운드는 자동 재생하지 않고, 사용자 클릭 시에만 재생
- 설정 패널에서 스케줄 추가/삭제/enable 토글
- 설정은 localStorage에 저장
- `version.json` 주기 확인(60초) 후 커밋 변경 시 자동 새로고침

## 로컬 실행

```bash
nvm use
pnpm install
pnpm dev
```

## 사운드 파일

`public/sounds/chime.mp3` 파일을 넣으면 알림 재생에 사용됩니다.

## 배포 (GitHub Pages)

main 브랜치 푸시 시 `.github/workflows/deploy-pages.yml`로 자동 배포됩니다.

워크플로우:

1. pnpm install
2. pnpm build
3. Pages artifact 업로드 및 deploy

커스텀 도메인:

- `public/CNAME`에 `homi.jjgo.io` 포함

DNS 설정 (Cloudflare/도메인 등록기관 공통 가이드):

- `homi.jjgo.io`에 대해 GitHub Pages 대상으로 CNAME 추가
  - 값: `<your-github-username>.github.io`
- GitHub 저장소 Settings → Pages 에서 custom domain `homi.jjgo.io` 설정
- HTTPS 강제 옵션 활성화

## 라이선스

MIT (`LICENSE`)
