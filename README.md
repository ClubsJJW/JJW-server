# JJW Server

채널톡 해커톤용 NestJS 백엔드 서버입니다. SSE(Server-Sent Events) 지원 및 환경변수 기반 API를 제공합니다.

## 기능

- ✅ SSE(Server-Sent Events) 엔드포인트
- ✅ 환경변수 기반 설정
- ✅ TypeScript strict null checks
- ✅ REST API 엔드포인트

## 기술 스택

- NestJS
- TypeScript
- RxJS
- pnpm

## 시작하기

### 사전 요구사항

- Node.js (v18 이상 권장)
- pnpm

### 설치

```bash
# 의존성 설치
pnpm install
```

### 환경변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 필요한 값을 설정하세요.

```bash
cp .env.example .env
```

`.env` 파일 예시:

```
PORT=3090
HELLO_TEXT=Hello from Channel Talk Hackathon!
```

### 실행

```bash
# 개발 모드
pnpm run start:dev

# 프로덕션 모드
pnpm run build
pnpm run start:prod
```

서버는 기본적으로 `http://localhost:3090`에서 실행됩니다.

## API 엔드포인트

### GET /

기본 헬스체크 엔드포인트

```bash
curl http://localhost:3090
```

### GET /api/hello

환경변수 `HELLO_TEXT`의 값을 반환합니다.

**Response:**
```json
{
  "message": "Hello from Channel Talk Hackathon!"
}
```

**Example:**
```bash
curl http://localhost:3090/api/hello
```

### GET /sse

SSE(Server-Sent Events) 엔드포인트. 1초마다 이벤트를 전송합니다.

**Example:**
```bash
curl -N http://localhost:3090/sse
```

## 프로젝트 구조

```
src/
  ├── app.controller.ts   # 컨트롤러 (라우팅)
  ├── app.service.ts      # 서비스 (비즈니스 로직)
  ├── app.module.ts       # 애플리케이션 모듈
  └── main.ts             # 엔트리포인트
```

## 개발

```bash
# 유닛 테스트
pnpm run test

# E2E 테스트
pnpm run test:e2e

# 테스트 커버리지
pnpm run test:cov

# 린트
pnpm run lint
```

## 라이센스

MIT
