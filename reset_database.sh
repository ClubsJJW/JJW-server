#!/bin/bash

# MySQL 연결 정보
DB_HOST="localhost"
DB_PORT="3306"
DB_USER="root"
DB_PASSWORD="1234"
DB_NAME="jjw"

SCHEMA_FILE="migrations/schema.sql"

echo "⚠️  경고: 이 스크립트는 모든 테이블을 삭제하고 재생성합니다!"
echo "데이터베이스: $DB_NAME@$DB_HOST:$DB_PORT"
echo ""
read -p "계속하시겠습니까? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ 취소되었습니다."
  exit 1
fi

echo ""
echo "🔄 데이터베이스 초기화 중..."
echo ""

# 스키마 파일 실행
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$SCHEMA_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 데이터베이스 초기화 완료!"
  echo ""
  echo "📊 생성된 테이블 목록:"
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES;"
else
  echo ""
  echo "❌ 데이터베이스 초기화 실패!"
  exit 1
fi

