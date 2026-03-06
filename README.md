# Homi

Homi는 브라우저 `localStorage`에 데이터를 저장하는 정적 웹앱입니다.

## Start
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Contract Governance (Machine-First)
이 저장소의 제품/테스트/QA/AI 리뷰 계약은 사람이 읽는 Markdown이 아니라 machine docs가 기준입니다.

- Authoritative root: `docs/machine/manifest.v1.yaml`
- Truth order: `docs/machine/truth-order.v1.yaml`
- Task read sets: `docs/machine/read-sets.v1.yaml`
- Machine schemas: `schemas/machine/*.schema.json`
- Domain schemas: `schemas/domain/*.schema.json`

`README.md`는 안내 문서이며 source of truth가 아닙니다.

## Contract Pipeline
```bash
npm run qa:contract
```

## QA
```bash
npm run qa:smoke
npm run qa:ai-review
npm run qa:gate
```

## Legacy Docs
기존 Markdown 문서는 `docs/legacy/`로 격리되어 있으며 authoritative로 취급하지 않습니다.
