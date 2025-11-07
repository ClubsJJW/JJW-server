#!/bin/bash

# MySQL 연결 정보
DB_HOST="localhost"
DB_PORT="3306"
DB_USER="root"
DB_PASSWORD="1234"
DB_NAME="jjw"

MIGRATION_FILE="$1"

if [ -z "$MIGRATION_FILE" ]; then
  echo "사용법: ./run_migration.sh <migration_file.sql>"
  exit 1
fi

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "에러: 마이그레이션 파일을 찾을 수 없습니다: $MIGRATION_FILE"
  exit 1
fi

echo "🔄 마이그레이션 실행 중: $MIGRATION_FILE"
echo "데이터베이스: $DB_NAME@$DB_HOST:$DB_PORT"
echo ""

mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 마이그레이션 완료!"
else
  echo ""
  echo "❌ 마이그레이션 실패!"
  exit 1
fi
