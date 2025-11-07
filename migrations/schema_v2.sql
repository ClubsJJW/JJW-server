-- ============================================
-- JJW-server Database Schema V2
-- Created: 2025-11-07
-- Description: memberId 기반 단순화된 SSE 시스템
-- ============================================

-- 기존 테이블 모두 삭제
DROP TABLE IF EXISTS mock_redirect_logs;
DROP TABLE IF EXISTS broadcast_results;
DROP TABLE IF EXISTS broadcast_requests;
DROP TABLE IF EXISTS sse_events;
DROP TABLE IF EXISTS mock_users;

-- ============================================
-- 1. mock_users 테이블
-- 테스트용 사용자 정보
-- ============================================
CREATE TABLE mock_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. sse_events 테이블
-- SSE 이벤트 로그 및 히스토리
-- ============================================
CREATE TABLE sse_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id TEXT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data TEXT NOT NULL,
    delivered INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_lookup (member_id(255), created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. broadcast_requests 테이블
-- 브로드캐스트 요청 로그
-- ============================================
CREATE TABLE broadcast_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id TEXT NOT NULL,
    event_data TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_broadcast_request (member_id(255), created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. broadcast_results 테이블
-- 브로드캐스트 발송 결과
-- ============================================
CREATE TABLE broadcast_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id TEXT NOT NULL,
    event_data TEXT NOT NULL,
    success INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_broadcast_result (member_id(255), created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. mock_redirect_logs 테이블
-- 리다이렉트 이벤트 로그
-- ============================================
CREATE TABLE mock_redirect_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id VARCHAR(255) NOT NULL,
    from_url VARCHAR(500),
    to_url VARCHAR(500) NOT NULL,
    triggered_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 완료 메시지
-- ============================================
SELECT 'Database schema V2 created successfully!' AS status;
SELECT 'memberId 기반 완전 단순화: sse_connections 테이블 제거, 메모리만 사용' AS info;

