# JJW Server

채널톡 해커톤용 NestJS 백엔드 서버입니다. SSE(Server-Sent Events) 지원 및 환경변수 기반 API를 제공합니다.

## 기능

- ✅ SSE(Server-Sent Events) 지원 (모듈화)
- ✅ HTTP/2 지원 (선택적)
- ✅ 환경변수 기반 설정
- ✅ TypeScript strict null checks
- ✅ REST API 엔드포인트
- ✅ 클라이언트별 SSE 연결 관리

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
USE_HTTP2=false
HELLO_TEXT=Hello from Channel Talk Hackathon!
```

**환경변수 설명:**
- `PORT`: 서버 포트 (기본값: 3090)
- `USE_HTTP2`: HTTP/2 사용 여부 (true/false, 기본값: false)
- `HELLO_TEXT`: 헬로 메시지 텍스트

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

### GET /sse/connect

SSE(Server-Sent Events) 연결 엔드포인트. 클라이언트별 실시간 이벤트를 수신합니다.

**Query Parameters:**
- `clientId` (optional): 클라이언트 고유 ID

**Response:**
Server-Sent Events 스트림

**Example:**
```bash
# 클라이언트 ID 지정
curl -N http://localhost:3090/sse/connect?clientId=user123

# 클라이언트 ID 자동 생성
curl -N http://localhost:3090/sse/connect
```

### GET /sse/test

테스트용 SSE 엔드포인트. 1초마다 이벤트를 전송합니다.

**Example:**
```bash
curl -N http://localhost:3090/sse/test
```

### GET /sse/status

SSE 연결 상태를 확인하는 엔드포인트.

**Response:**
```json
{
  "connectedClients": 0
}
```

**Example:**
```bash
curl http://localhost:3090/sse/status
```

## 프로젝트 구조

```
src/
  ├── modules/
  │   └── sse/              # SSE 모듈
  │       ├── sse.module.ts
  │       ├── sse.controller.ts
  │       └── sse.service.ts
  ├── app.controller.ts     # 컨트롤러 (라우팅)
  ├── app.service.ts        # 서비스 (비즈니스 로직)
  ├── app.module.ts         # 애플리케이션 모듈
  └── main.ts               # 엔트리포인트 (HTTP/2 설정)
```

## HTTP/2 설정

HTTP/2를 활성화하려면:

1. 환경변수 설정:
```bash
USE_HTTP2=true
```

2. SSL 인증서 생성 (이미 생성되어 있음):
```bash
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' \
  -keyout certs/localhost-key.pem -out certs/localhost-cert.pem -days 365
```

3. 서버 시작:
```bash
pnpm run start:dev
```

4. HTTPS로 접속:
```bash
# -k 옵션은 자체 서명 인증서 허용
curl -k https://localhost:3090/api/hello
```

**참고:** 개발 환경에서는 HTTP/1.1로 충분하며, 프로덕션에서는 Nginx/Caddy 같은 리버스 프록시를 통해 HTTP/2를 활성화하는 것을 권장합니다.

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
