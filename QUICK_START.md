# 🚀 빠른 시작 가이드

## 1️⃣ Docker Desktop 실행

Docker Desktop을 먼저 실행하세요.

## 2️⃣ MySQL 컨테이너 시작

```bash
docker compose up -d
```

## 3️⃣ 데이터베이스 스키마 적용

```bash
pnpm run db:push
```

## 4️⃣ 서버 시작

```bash
pnpm run start:dev
```

## ✅ 확인

서버 로그에서 다음 메시지를 확인하세요:

```
🔌 Initializing database connection...
✅ Database connected successfully
🚀 Application is running on: http://localhost:3090
```

## 🧪 테스트

### SSE 리다이렉트 테스트
```bash
open http://localhost:3090/test-1.html
```

### Drizzle Studio (데이터베이스 GUI)
```bash
pnpm run db:studio
```

---

**문제 발생 시** `DATABASE_SETUP.md` 참고!

