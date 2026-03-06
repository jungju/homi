# 운영/배포/문제 대응 체크리스트 (v1)

## 배포 전

- [ ] `SPEC` 변경점 반영 여부 확인 (`SPEC` vs 앱 라우트/기능 매핑)
- [ ] 샘플 번들(`public/samples/*.json`) JSON 포맷 검증
  - `format: "homi"`, `version: 1`, `bundleType` 존재
  - `datasets` 배열 존재
- [ ] 브라우저 저장소 키(`HOMI_STORAGE_KEY`) 변경 여부 검토
- [ ] 임포트 제한 정책 안내 문구가 UI에 노출되는지 확인

## 배포

- [ ] 정적 빌드 동작 점검(`npm run build`)
- [ ] `public/version.json` 생성 확인(필요 시 배포 시점 파악용)
- [ ] GitHub Pages 정적 루트/라우팅 접근 점검:
  - `/`
  - `/engines/schedule`
  - `/engines/dictation`
  - `/backup`

## 장애 대응

### Import 실패(CORS/네트워크)

- 에러 메시지: URL 불일치, fetch 실패, bundle 파싱 실패 분기 확인
- 원격 URL이 2MB 초과인 경우 차단 메시지 노출되는지 확인
- 수동 파일 임포트에서 크기 제한 초과 시 사용자 메시지 노출되는지 확인

### localStorage 손상

- 앱 시작 시 스토어 파싱 실패 시 빈 스토어로 복구되는지 확인 (`loadStore`)
- 손상 복구 후 기존 데이터는 복구 불가하므로 사용자에게 백업 필요 안내

### 충돌 정책 예외

- 동일 엔진+동일 ID 임포트 시 `new id + originalDatasetId` 동작 유지 확인
- 대량 데이터 추가 시 UI 성능 저하 여부 확인(브라우저 한계 대응)
