-- SSE Connections 테이블 스키마 간소화

-- 기존 인덱스들 제거 (에러가 나도 무시)
DROP INDEX idx_sse_matching ON sse_connections;
DROP INDEX idx_user_chat ON sse_connections;  
DROP INDEX idx_channel_user ON sse_connections;

-- 기존 컬럼들 제거 (에러가 나도 무시)
ALTER TABLE sse_connections DROP COLUMN user_id;
ALTER TABLE sse_connections DROP COLUMN member_id;
ALTER TABLE sse_connections DROP COLUMN member_hash;
ALTER TABLE sse_connections DROP COLUMN medium_type;
ALTER TABLE sse_connections DROP COLUMN medium_key;
ALTER TABLE sse_connections DROP COLUMN session_id;
ALTER TABLE sse_connections DROP COLUMN metadata;

-- 새로운 인덱스들 생성
CREATE INDEX idx_sse_matching ON sse_connections (channel_id, user_chat_id, ttl_expires_at);
CREATE INDEX idx_client_connection ON sse_connections (client_connection_id);

-- 현재 테이블 구조 확인
DESCRIBE sse_connections;
