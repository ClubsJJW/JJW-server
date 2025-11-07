import { mysqlTable, serial, varchar, text, timestamp, int, index } from 'drizzle-orm/mysql-core';

/**
 * Mock Users 테이블
 * 테스트용 사용자 정보
 */
export const mockUsers = mysqlTable('mock_users', {
  id: serial('id').primaryKey(),
  nickname: varchar('nickname', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

/**
 * SSE Connections 테이블
 * 채널톡 SSE 연결을 관리하기 위한 테이블
 */
export const sseConnections = mysqlTable('sse_connections', {
  id: serial('id').primaryKey(),

  // 필수 식별 키들
  channelId: varchar('channel_id', { length: 255 }).notNull(), // 채널 고유값
  userChatId: varchar('user_chat_id', { length: 255 }).notNull(), // 상담 대화 단위 ID
  userId: varchar('user_id', { length: 255 }), // 고객 기본 키 (nullable - 로그인하지 않은 사용자 허용)
  clientConnectionId: varchar('client_connection_id', { length: 255 }).notNull().unique(), // SSE 연결 고유 토큰

  // 보안/정합성 키들 (선택적)
  memberId: varchar('member_id', { length: 255 }), // 회원 고객 키
  memberHash: varchar('member_hash', { length: 255 }), // 멤버 인증 해시
  mediumType: varchar('medium_type', { length: 50 }), // 유입 매체 구분 (web, ios, android 등)
  mediumKey: varchar('medium_key', { length: 255 }), // 매체 세부 식별자 (웹 탭 구분 등)
  sessionId: varchar('session_id', { length: 255 }), // 세션 범위 내 재연결 식별

  // 연결 관리
  connectedAt: timestamp('connected_at').defaultNow().notNull(),
  lastActivityAt: timestamp('last_activity_at').defaultNow().onUpdateNow().notNull(),
  ttlExpiresAt: timestamp('ttl_expires_at').defaultNow().notNull(), // 연결 만료 시간

  // 추가 메타데이터
  metadata: text('metadata'), // JSON 형태로 추가 정보 저장

  // 인덱스 설정 (매칭 성능 최적화)
}, (table) => ({
  // 매칭 키 복합 인덱스: {channelId, userChatId, mediumKey} → clientConnectionId
  matchingIdx: index('idx_sse_matching').on(table.channelId, table.userChatId, table.mediumKey, table.ttlExpiresAt),

  // 조회 최적화 인덱스들
  userChatIdx: index('idx_user_chat').on(table.userChatId, table.ttlExpiresAt),
  clientConnectionIdx: index('idx_client_connection').on(table.clientConnectionId),
  channelUserIdx: index('idx_channel_user').on(table.channelId, table.userId),
}));

/**
 * SSE Events 테이블
 * SSE 이벤트 로그 및 히스토리 관리
 */
export const sseEvents = mysqlTable('sse_events', {
  id: serial('id').primaryKey(),
  clientConnectionId: varchar('client_connection_id', { length: 255 }).notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(), // 'message', 'redirect', 'status' 등
  eventData: text('event_data').notNull(), // 이벤트 데이터 (JSON)
  userChatId: varchar('user_chat_id', { length: 255 }), // 관련 상담 ID
  channelId: varchar('channel_id', { length: 255 }), // 관련 채널 ID
  delivered: int('delivered').default(0), // 전송 성공 여부 (0: 실패, 1: 성공)
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // 이벤트 조회 최적화
  eventLookupIdx: index('idx_event_lookup').on(table.clientConnectionId, table.createdAt),
  chatEventIdx: index('idx_chat_event').on(table.userChatId, table.createdAt),
}));

/**
 * Redirect Logs 테이블
 * 리다이렉트 이벤트 로그
 */
export const mockRedirectLogs = mysqlTable('mock_redirect_logs', {
  id: serial('id').primaryKey(),
  clientId: varchar('client_id', { length: 255 }).notNull(),
  fromUrl: varchar('from_url', { length: 500 }),
  toUrl: varchar('to_url', { length: 500 }).notNull(),
  triggeredBy: varchar('triggered_by', { length: 100 }), // 'manual', 'channel_talk', 'auto' 등
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

