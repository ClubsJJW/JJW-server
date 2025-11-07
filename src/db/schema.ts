import { mysqlTable, serial, varchar, text, timestamp, int } from 'drizzle-orm/mysql-core';

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
 * SSE Sessions 테이블
 * SSE 연결 세션을 관리하기 위한 테이블
 */
export const mockSseSessions = mysqlTable('mock_sse_sessions', {
  id: serial('id').primaryKey(),
  clientId: varchar('client_id', { length: 255 }).notNull().unique(),
  userId: int('user_id'),
  connectedAt: timestamp('connected_at').defaultNow().notNull(),
  lastActivityAt: timestamp('last_activity_at').defaultNow().onUpdateNow().notNull(),
  metadata: text('metadata'), // JSON 형태로 추가 정보 저장
});

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

