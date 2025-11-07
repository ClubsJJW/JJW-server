# 👤 User API 문서 (업데이트)

## ✅ 변경사항

### userId는 이제 Auto Increment!

**Before:**
- 로그인 시 userId를 직접 입력

**After:**
- ✅ userId는 users 테이블의 auto increment 값
- ✅ loginId만 입력하면 자동으로 userId 생성
- ✅ 첫 로그인: 새 user 생성 (userId 자동 할당)
- ✅ 재로그인: 기존 userId 재사용

## 📊 데이터베이스 구조

### 1. users 테이블 (신규)
```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,  -- ← userId는 여기서 자동 생성!
  login_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);
```

### 2. user_login_logs 테이블
```sql
CREATE TABLE user_login_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  login_id VARCHAR(255) NOT NULL,
  user_id BIGINT NOT NULL,  -- users.id를 참조
  is_login_now BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);
```

## 🔌 API 사용법

### 1. 로그인 (신규 사용자)

**POST** `/user/login`

**Request:**
```json
{
  "loginId": "alice"
}
```

**Response:**
```json
{
  "success": true,
  "message": "신규 사용자 로그인 성공",
  "data": {
    "id": 2,
    "loginId": "alice",
    "userId": 1,  // ← Auto increment로 자동 생성!
    "isLoginNow": true,
    "createdAt": "2025-11-07T13:31:36.000Z"
  }
}
```

**동작:**
1. `users` 테이블에 신규 user 생성 (id: 1 auto increment)
2. `user_login_logs` 테이블에 로그인 기록 생성 (userId: 1)

---

### 2. 로그인 (이름 포함)

**POST** `/user/login`

**Request:**
```json
{
  "loginId": "bob",
  "name": "Bob Smith"  // 선택적
}
```

**Response:**
```json
{
  "success": true,
  "message": "신규 사용자 로그인 성공",
  "data": {
    "id": 3,
    "loginId": "bob",
    "userId": 2,  // ← 두 번째 사용자이므로 2
    "isLoginNow": true,
    "createdAt": "2025-11-07T13:31:45.000Z"
  }
}
```

---

### 3. 재로그인 (기존 사용자)

**POST** `/user/login`

**Request:**
```json
{
  "loginId": "alice"  // 기존에 있던 사용자
}
```

**Response:**
```json
{
  "success": true,
  "message": "로그인 성공",  // ← "신규"가 아님
  "data": {
    "id": 4,
    "loginId": "alice",
    "userId": 1,  // ← 처음 생성된 userId 그대로 사용!
    "isLoginNow": true,
    "createdAt": "2025-11-07T13:32:10.000Z"
  }
}
```

**동작:**
1. `users` 테이블에서 loginId로 기존 user 조회 (id: 1)
2. 기존 userId(1)를 사용하여 `user_login_logs`에 새 로그인 기록 생성

---

## 🎯 핵심 포인트

### userId 생성 로직

```typescript
// 1. users 테이블에서 loginId로 조회
const user = await db.select().from(users)
  .where(eq(users.loginId, loginId))
  .limit(1);

// 2-1. 없으면 신규 생성 (userId auto increment)
if (user.length === 0) {
  const result = await db.insert(users).values({
    loginId,
    name: name || loginId
  });
  userId = result[0].insertId; // ← Auto increment 값!
}
// 2-2. 있으면 기존 userId 사용
else {
  userId = user[0].id; // ← 기존 userId 재사용
}

// 3. user_login_logs에 기록
await db.insert(userLoginLogs).values({
  loginId,
  userId,  // ← Auto increment 또는 기존 값
  isLoginNow: true
});
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 신규 사용자 3명 로그인

```bash
# Alice (userId: 1)
curl -X POST http://localhost:3090/user/login \
  -H "Content-Type: application/json" \
  -d '{"loginId": "alice"}'

# Bob (userId: 2)
curl -X POST http://localhost:3090/user/login \
  -H "Content-Type: application/json" \
  -d '{"loginId": "bob", "name": "Bob Smith"}'

# Charlie (userId: 3)
curl -X POST http://localhost:3090/user/login \
  -H "Content-Type: application/json" \
  -d '{"loginId": "charlie"}'
```

### 시나리오 2: 기존 사용자 재로그인

```bash
# Alice 재로그인 (여전히 userId: 1)
curl -X POST http://localhost:3090/user/login \
  -H "Content-Type: application/json" \
  -d '{"loginId": "alice"}'

# 결과: userId는 1로 동일!
```

### 시나리오 3: 로그인 히스토리 확인

```bash
curl http://localhost:3090/user/alice/history
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "loginId": "alice",
      "userId": 1,  // ← 첫 로그인
      "isLoginNow": false,
      "createdAt": "2025-11-07T13:31:36.000Z"
    },
    {
      "id": 4,
      "loginId": "alice",
      "userId": 1,  // ← 재로그인 (같은 userId!)
      "isLoginNow": true,
      "createdAt": "2025-11-07T13:32:10.000Z"
    }
  ]
}
```

---

## 📈 데이터 흐름

```
로그인 요청: { loginId: "alice" }
    ↓
users 테이블 조회
    ↓
없음? → users 테이블에 INSERT → userId: 1 (auto increment)
있음? → 기존 userId 조회 → userId: 1 (재사용)
    ↓
user_login_logs 테이블에 INSERT
    ↓
{ loginId: "alice", userId: 1, isLoginNow: true }
```

---

## 🔍 데이터베이스 확인

### Drizzle Studio에서 확인

```bash
pnpm run db:studio
```

1. `users` 테이블 확인
   - id (auto increment)
   - login_id
   - name

2. `user_login_logs` 테이블 확인
   - user_id가 users.id를 참조

### MySQL 직접 확인

```bash
docker compose exec mysql mysql -ujjw_user -pjjw_password jjw_db
```

```sql
-- users 테이블 확인
SELECT * FROM users;

-- user_login_logs 테이블 확인
SELECT * FROM user_login_logs;

-- JOIN해서 확인
SELECT 
  u.id as user_id,
  u.login_id,
  u.name,
  l.id as log_id,
  l.is_login_now,
  l.created_at
FROM users u
LEFT JOIN user_login_logs l ON u.id = l.user_id
ORDER BY l.created_at DESC;
```

---

## 🎨 API 응답 구조

### 신규 사용자
```json
{
  "success": true,
  "message": "신규 사용자 로그인 성공",
  "data": {
    "id": 2,          // login_logs의 id
    "loginId": "alice",
    "userId": 1,      // users.id (auto increment)
    "isLoginNow": true,
    "createdAt": "2025-11-07T13:31:36.000Z"
  }
}
```

### 기존 사용자
```json
{
  "success": true,
  "message": "로그인 성공",  // ← "신규"가 없음
  "data": {
    "id": 4,          // login_logs의 id (새로운 로그)
    "loginId": "alice",
    "userId": 1,      // users.id (기존 값 재사용)
    "isLoginNow": true,
    "createdAt": "2025-11-07T13:32:10.000Z"
  }
}
```

---

## 💡 장점

1. **자동 userId 관리**
   - 클라이언트가 userId를 알 필요 없음
   - 서버에서 자동으로 생성/관리

2. **중복 방지**
   - loginId가 unique하므로 같은 사용자는 항상 같은 userId

3. **로그인 히스토리 추적**
   - 같은 userId로 모든 로그인 기록 조회 가능

4. **확장 가능**
   - 나중에 users 테이블에 프로필 정보 추가 용이

---

## 🚀 빠른 시작

```bash
# 서버 실행
pnpm start:dev

# 신규 사용자 로그인
curl -X POST http://localhost:3090/user/login \
  -H "Content-Type: application/json" \
  -d '{"loginId": "myuser", "name": "My Name"}'

# 로그인 상태 확인
curl http://localhost:3090/user/myuser/status

# 로그인 히스토리 확인
curl http://localhost:3090/user/myuser/history
```

