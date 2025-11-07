# 👤 User API 문서

## ✅ 완료된 작업

1. ✅ MySQL 연결 수정 (포트 13306)
2. ✅ user_login_logs 테이블 생성
3. ✅ User 모듈 생성 (Controller, Service, DTO)
4. ✅ Login/Logout API 구현
5. ✅ 로그인 히스토리 및 상태 확인 API

## 📊 데이터베이스 스키마

### user_login_logs 테이블

```sql
CREATE TABLE user_login_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  login_id VARCHAR(255) NOT NULL,
  user_id BIGINT NOT NULL,
  is_login_now BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);
```

## 🔌 API 엔드포인트

### 1. 로그인

**POST** `/user/login`

**Request Body:**
```json
{
  "loginId": "test_user",
  "userId": 12345
}
```

**Response:**
```json
{
  "success": true,
  "message": "로그인 성공",
  "data": {
    "id": 1,
    "loginId": "test_user",
    "userId": 12345,
    "isLoginNow": true,
    "createdAt": "2025-11-07T13:21:33.000Z"
  }
}
```

**동작:**
- 기존 동일 loginId의 세션을 모두 로그아웃 처리
- 새로운 로그인 기록 생성
- `isLoginNow`를 `true`로 설정

**curl 예제:**
```bash
curl -X POST http://localhost:3090/user/login \
  -H "Content-Type: application/json" \
  -d '{"loginId": "test_user", "userId": 12345}'
```

---

### 2. 로그아웃

**POST** `/user/logout`

**Request Body:**
```json
{
  "loginId": "test_user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "로그아웃 성공"
}
```

**동작:**
- 해당 loginId의 모든 활성 세션의 `isLoginNow`를 `false`로 변경

**curl 예제:**
```bash
curl -X POST http://localhost:3090/user/logout \
  -H "Content-Type: application/json" \
  -d '{"loginId": "test_user"}'
```

---

### 3. 로그인 상태 확인

**GET** `/user/:loginId/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "loginId": "test_user",
    "isLoggedIn": true,
    "lastLogin": "2025-11-07T13:21:33.000Z"
  }
}
```

**curl 예제:**
```bash
curl http://localhost:3090/user/test_user/status
```

---

### 4. 로그인 히스토리 조회

**GET** `/user/:loginId/history`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "loginId": "test_user",
      "userId": 12345,
      "isLoginNow": false,
      "createdAt": "2025-11-07T13:21:33.000Z",
      "updatedAt": "2025-11-07T13:22:15.000Z"
    },
    {
      "id": 2,
      "loginId": "test_user",
      "userId": 12345,
      "isLoginNow": true,
      "createdAt": "2025-11-07T13:22:30.000Z",
      "updatedAt": "2025-11-07T13:22:30.000Z"
    }
  ]
}
```

**curl 예제:**
```bash
curl http://localhost:3090/user/test_user/history
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 신규 로그인

```bash
# 1. 로그인
curl -X POST http://localhost:3090/user/login \
  -H "Content-Type: application/json" \
  -d '{"loginId": "user123", "userId": 999}'

# 2. 상태 확인
curl http://localhost:3090/user/user123/status
# → isLoggedIn: true
```

### 시나리오 2: 중복 로그인

```bash
# 1. 첫 번째 로그인
curl -X POST http://localhost:3090/user/login \
  -H "Content-Type: application/json" \
  -d '{"loginId": "user123", "userId": 999}'

# 2. 두 번째 로그인 (다른 세션)
curl -X POST http://localhost:3090/user/login \
  -H "Content-Type: application/json" \
  -d '{"loginId": "user123", "userId": 999}'

# 3. 히스토리 확인
curl http://localhost:3090/user/user123/history
# → 첫 번째 로그인은 isLoginNow: false
# → 두 번째 로그인만 isLoginNow: true
```

### 시나리오 3: 로그아웃

```bash
# 1. 로그아웃
curl -X POST http://localhost:3090/user/logout \
  -H "Content-Type: application/json" \
  -d '{"loginId": "user123"}'

# 2. 상태 확인
curl http://localhost:3090/user/user123/status
# → isLoggedIn: false
```

---

## 📝 주요 특징

1. **자동 세션 관리**
   - 새 로그인 시 기존 세션 자동 로그아웃
   - 중복 로그인 방지

2. **로그인 히스토리 추적**
   - 모든 로그인/로그아웃 기록 저장
   - 시간별 활동 추적 가능

3. **실시간 상태 확인**
   - 현재 로그인 상태 조회
   - 마지막 로그인 시간 확인

4. **Type-safe**
   - TypeScript + Drizzle ORM
   - 컴파일 타임 타입 체크

---

## 🔍 데이터베이스 확인

### Drizzle Studio 실행

```bash
pnpm run db:studio
```

브라우저에서 `user_login_logs` 테이블 확인 가능!

### MySQL 직접 접속

```bash
docker compose exec mysql mysql -ujjw_user -pjjw_password jjw_db

# 쿼리 예제
SELECT * FROM user_login_logs;
SELECT * FROM user_login_logs WHERE login_id = 'test_user';
SELECT * FROM user_login_logs WHERE is_login_now = 1;
```

---

## 🎯 다음 단계 제안

1. **인증 토큰 추가**
   - JWT 발급
   - 토큰 검증 미들웨어

2. **세션 타임아웃**
   - 일정 시간 후 자동 로그아웃
   - Cron job으로 만료 세션 정리

3. **SSE 통합**
   - 로그인 시 SSE 세션과 연결
   - 로그아웃 시 SSE 연결도 해제

4. **로그 분석**
   - 사용자별 로그인 빈도
   - 평균 세션 시간
   - 활성 사용자 통계

