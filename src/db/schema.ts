import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  int,
  index,
} from 'drizzle-orm/mysql-core';

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
 * SSE Events 테이블
 * SSE 이벤트 로그 및 히스토리 관리
 */
export const sseEvents = mysqlTable(
  'sse_events',
  {
    id: serial('id').primaryKey(),
    memberId: text('member_id').notNull(), // 멤버 ID
    eventType: varchar('event_type', { length: 100 }).notNull(), // 'message', 'redirect', 'status' 등
    eventData: text('event_data').notNull(), // 이벤트 데이터 (JSON)
    delivered: int('delivered').default(0), // 전송 성공 여부 (0: 실패, 1: 성공)
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // 이벤트 조회 최적화
    eventLookupIdx: index('idx_event_lookup').on(
      table.memberId,
      table.createdAt,
    ),
  }),
);

/**
 * Broadcast Requests 테이블
 * 브로드캐스트 요청 로그 저장
 */
export const broadcastRequests = mysqlTable(
  'broadcast_requests',
  {
    id: serial('id').primaryKey(),
    memberId: text('member_id').notNull(), // 대상 멤버 ID
    eventData: text('event_data').notNull(), // 이벤트 데이터 (JSON)
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // 요청 조회 최적화
    requestLookupIdx: index('idx_broadcast_request').on(
      table.memberId,
      table.createdAt,
    ),
  }),
);

/**
 * Broadcast Results 테이블
 * 브로드캐스트 발송 결과 저장
 */
export const broadcastResults = mysqlTable(
  'broadcast_results',
  {
    id: serial('id').primaryKey(),
    memberId: text('member_id').notNull(), // 대상 멤버 ID
    eventData: text('event_data').notNull(), // 이벤트 데이터 (JSON)
    success: int('success').notNull(), // 전송 성공 여부 (0: 실패, 1: 성공)
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // 결과 조회 최적화
    resultLookupIdx: index('idx_broadcast_result').on(
      table.memberId,
      table.createdAt,
    ),
  }),
);

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
