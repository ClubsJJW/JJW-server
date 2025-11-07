# 데이터베이스 설정 가이드

## ✅ 완료된 작업

1. ✅ Docker Compose 파일 생성
2. ✅ Drizzle ORM 설치 (drizzle-orm, drizzle-kit, mysql2)
3. ✅ 데이터베이스 스키마 정의
4. ✅ NestJS 모듈 통합
5. ✅ 환경변수 설정

## 📦 설치된 패키지

```json
"dependencies": {
  "drizzle-orm": "^0.44.7",
  "mysql2": "^3.15.3",
  "dotenv": "^17.2.3"
},
"devDependencies": {
  "drizzle-kit": "^0.31.6"
}
```

## 🚀 시작하기

### 1. Docker Desktop 실행

먼저 Docker Desktop을 실행하세요.

### 2. MySQL 컨테이너 시작

```bash
docker compose up -d
```

**컨테이너 정보:**
- 이미지: mysql:8.0
- 포트: 13306 (호스트) → 3306 (컨테이너)
- 데이터베이스: jjw_db
- 사용자: jjw_user
- 비밀번호: jjw_password

### 3. 컨테이너 상태 확인

```bash
docker compose ps
```

### 4. 마이그레이션 파일 생성

```bash
pnpm run db:generate
```

이 명령어는 `src/db/schema.ts`를 기반으로 SQL 마이그레이션 파일을 생성합니다.

### 5. 데이터베이스에 스키마 적용

```bash
pnpm run db:push
```

또는 마이그레이션 실행:

```bash
pnpm run db:migrate
```

### 6. Drizzle Studio 실행 (옵션)

```bash
pnpm run db:studio
```

브라우저에서 `https://local.drizzle.studio`가 열립니다.

## 📊 데이터베이스 스키마

### users 테이블
```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);
```

### sse_sessions 테이블
```sql
CREATE TABLE sse_sessions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  client_id VARCHAR(255) NOT NULL UNIQUE,
  user_id INT,
  connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  metadata TEXT
);
```

### redirect_logs 테이블
```sql
CREATE TABLE redirect_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  client_id VARCHAR(255) NOT NULL,
  from_url VARCHAR(500),
  to_url VARCHAR(500) NOT NULL,
  triggered_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

## 🔧 사용 예제

### NestJS 서비스에서 사용하기

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { DrizzleDB } from '@/db/connection';
import { users, sseSessions, redirectLogs } from '@/db/schema';

@Injectable()
export class YourService {
  constructor(@Inject('DB') private db: DrizzleDB) {}

  // 사용자 생성
  async createUser(name: string, email: string) {
    const result = await this.db
      .insert(users)
      .values({ name, email });
    return result;
  }

  // 사용자 조회
  async getUsers() {
    return await this.db.select().from(users);
  }

  // SSE 세션 기록
  async logSseSession(clientId: string, userId?: number) {
    return await this.db
      .insert(sseSessions)
      .values({ clientId, userId });
  }

  // 리다이렉트 로그 저장
  async logRedirect(clientId: string, toUrl: string, triggeredBy: string) {
    return await this.db
      .insert(redirectLogs)
      .values({ clientId, toUrl, triggeredBy });
  }
}
```

## 📝 유용한 명령어

```bash
# 컨테이너 로그 확인
docker compose logs mysql -f

# 컨테이너 중지
docker compose down

# 컨테이너 중지 + 볼륨 삭제 (데이터 초기화)
docker compose down -v

# MySQL 접속
docker compose exec mysql mysql -ujjw_user -pjjw_password jjw_db

# 스키마 변경 후 마이그레이션 생성
pnpm run db:generate

# 마이그레이션 적용
pnpm run db:push
```

## 🐛 트러블슈팅

### 포트 충돌 시
```bash
# 13306 포트 사용 중인 프로세스 확인
lsof -i :13306

# 프로세스 종료
kill -9 <PID>
```

### 연결 실패 시
```bash
# 컨테이너 상태 확인
docker compose ps

# 컨테이너 재시작
docker compose restart mysql

# 헬스체크 확인
docker compose exec mysql mysqladmin ping -h localhost
```

## 🔐 보안 주의사항

**프로덕션 환경에서는:**
1. `.env` 파일을 Git에 커밋하지 마세요 (이미 `.gitignore`에 추가됨)
2. 강력한 비밀번호 사용
3. 환경변수로 민감한 정보 관리
4. SSL/TLS 연결 사용

## 📚 참고 문서

- [Drizzle ORM 공식 문서](https://orm.drizzle.team/)
- [Drizzle Kit 문서](https://orm.drizzle.team/kit-docs/overview)
- [MySQL 공식 문서](https://dev.mysql.com/doc/)

