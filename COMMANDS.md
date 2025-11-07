# 🚀 자주 사용하는 명령어

## 개발 서버 실행

```bash
# DB 자동 실행 + 개발 서버 시작 (권장!)
pnpm start:dev
```

이 명령어는 자동으로:
1. Docker Compose로 MySQL 컨테이너 시작
2. 5초 대기 (DB 초기화 시간)
3. NestJS 개발 서버 실행

## 개발 서버 종료

```bash
# Ctrl+C로 서버 종료 후
pnpm stop:dev
```

DB 컨테이너도 중지됩니다.

## 데이터베이스 관리

```bash
# 스키마를 DB에 적용
pnpm db:push

# 마이그레이션 파일 생성
pnpm db:generate

# Drizzle Studio (GUI) 실행
pnpm db:studio
```

## Docker 명령어

```bash
# 컨테이너 상태 확인
docker compose ps

# 로그 확인
docker compose logs mysql -f

# DB 초기화 (데이터 삭제)
docker compose down -v
```

## 기타

```bash
# 빌드
pnpm build

# 프로덕션 실행
pnpm start:prod

# 린트
pnpm lint

# 테스트
pnpm test
```

