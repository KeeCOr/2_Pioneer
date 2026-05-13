# Pioneer 작업 규칙

## 빌드 및 실행파일 배치

지시사항 수행 완료 후 반드시 아래 순서로 실행한다.

### 빌드 명령어

```bash
# 1. Vite 빌드
cd C:/Development/2_Pioneer && npm run build

# 2. dist를 Electron 프로젝트로 복사
cp -r C:/Development/2_Pioneer/dist/. C:/temp/pioneer-electron/dist/

# 3. Electron 패키징
cd C:/temp/pioneer-electron && npm run dist
```

### 실행파일 배치
- 빌드 출력: `C:/Development/2_Pioneer/release/Pioneer_v{버전}_portable.exe`
- 루트에도 동일하게 배치: `C:/Development/2_Pioneer/Pioneer_v{버전}_portable.exe`
- 이전 버전 루트 파일은 삭제

### 버전 관리
- `C:/temp/pioneer-electron/package.json`의 `version` 및 `portable.artifactName` 수동 업데이트

## 기획서 최신화

기능 추가/변경 후 반드시 업데이트:
- `docs/Pioneer_기획서.md`
- `docs/Pioneer_기획서.html`
