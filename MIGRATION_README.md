# 📋 데이터베이스 마이그레이션 가이드

## 🎯 개요

이 프로젝트는 Drizzle Kit 대신 직접 SQL 파일을 사용하여 데이터베이스 스키마를 관리합니다.

## 📁 파일 구조

```
/migrations
  ├── schema.sql                     # 전체 데이터베이스 스키마 (DDL)
  └── 001_update_to_member_id.sql    # 증분 마이그레이션 (참고용)
/reset_database.sh                   # 데이터베이스 전체 리셋 스크립트
/run_migration.sh                    # 증분 마이그레이션 실행 스크립트
```

## 🚀 데이터베이스 초기화 (권장)

### 전체 스키마 리셋 및 재생성

```bash
# 실행 권한 부여 (최초 1회)
chmod +x reset_database.sh

# 데이터베이스 전체 리셋
./reset_database.sh
```

**주의**: 이 명령은 모든 테이블을 삭제하고 재생성합니다. 모든 데이터가 삭제됩니다!

### 직접 MySQL 명령어로 실행

```bash
mysql -h localhost -P 3306 -u root -p1234 jjw < migrations/schema.sql
```

## 🔄 증분 마이그레이션 (선택사항)

특정 변경사항만 적용하려면:

```bash
# 실행 권한 부여 (최초 1회)
chmod +x run_migration.sh

# 특정 마이그레이션 실행
./run_migration.sh migrations/001_update_to_member_id.sql
```

## 📝 스키마 구조

### `schema.sql` - 전체 데이터베이스 스키마

현재 프로젝트의 전체 데이터베이스 구조를 정의합니다.

**테이블 목록**:
1. **`mock_users`** - 테스트용 사용자 정보
2. **`sse_connections`** - SSE 연결 관리 (memberId 기반)
3. **`sse_events`** - SSE 이벤트 로그
4. **`broadcast_requests`** - 브로드캐스트 요청 로그
5. **`broadcast_results`** - 브로드캐스트 발송 결과
6. **`mock_redirect_logs`** - 리다이렉트 이벤트 로그

**주요 특징**:
- `memberId` (TEXT 타입) 기반 SSE 연결
- 자동 타임스탬프 관리
- 성능 최적화된 인덱스
- UTF-8 문자셋 지원

## ⚠️ 주의사항

1. **백업 필수**: 마이그레이션 전 데이터베이스 백업 권장
   ```bash
   mysqldump -h localhost -u root -p1234 jjw > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **테스트 환경 우선**: 프로덕션 적용 전 개발/스테이징 환경에서 테스트

3. **서버 중지**: 마이그레이션 중 서비스 중지 권장
   ```bash
   # NestJS 서버 중지 후 마이그레이션 실행
   ./run_migration.sh migrations/001_update_to_member_id.sql
   # 마이그레이션 완료 후 서버 재시작
   npm run start:dev
   ```

4. **롤백 불가능**: 이 마이그레이션은 컬럼을 제거하므로 직접 롤백할 수 없습니다.
   - 필요시 백업에서 복구해야 합니다.

## 🔍 마이그레이션 확인

마이그레이션 후 스키마 확인:

```bash
mysql -h localhost -P 3306 -u root -p1234 jjw -e "DESCRIBE sse_connections;"
mysql -h localhost -P 3306 -u root -p1234 jjw -e "DESCRIBE broadcast_requests;"
mysql -h localhost -P 3306 -u root -p1234 jjw -e "DESCRIBE broadcast_results;"
```

인덱스 확인:

```bash
mysql -h localhost -P 3306 -u root -p1234 jjw -e "SHOW INDEX FROM sse_connections;"
mysql -h localhost -P 3306 -u root -p1234 jjw -e "SHOW INDEX FROM broadcast_requests;"
mysql -h localhost -P 3306 -u root -p1234 jjw -e "SHOW INDEX FROM broadcast_results;"
```

## 📦 새로운 마이그레이션 추가

새로운 마이그레이션이 필요할 때:

1. `migrations/` 디렉토리에 새 SQL 파일 생성
   - 파일명 형식: `00X_description.sql`
   - 예: `002_add_user_preferences.sql`

2. SQL 파일 작성
   ```sql
   -- Migration: [설명]
   -- Date: [날짜]
   -- Description: [상세 설명]
   
   -- SQL 명령어들...
   
   SELECT 'Migration completed successfully' AS status;
   ```

3. 마이그레이션 실행
   ```bash
   ./run_migration.sh migrations/00X_description.sql
   ```

## 🔧 트러블슈팅

### 문제: "Access denied" 에러

**해결**: MySQL 연결 정보 확인
```bash
# run_migration.sh 파일 수정
DB_USER="your_user"
DB_PASSWORD="your_password"
```

### 문제: "Unknown database" 에러

**해결**: 데이터베이스 생성
```bash
mysql -h localhost -u root -p1234 -e "CREATE DATABASE IF NOT EXISTS jjw;"
```

### 문제: 인덱스가 이미 존재

**해결**: `DROP INDEX IF EXISTS`를 사용하여 안전하게 제거

## 📚 참고

- 마이그레이션은 순차적으로 실행되어야 합니다.
- 각 마이그레이션은 멱등성(idempotent)을 유지하도록 작성합니다.
- 프로덕션 환경에서는 트랜잭션을 고려하세요.

