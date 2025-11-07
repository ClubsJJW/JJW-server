import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

// MySQL 연결 풀 생성
const poolConnection = mysql.createPool({
  host: 'localhost',
  port: 13306,
  user: 'jjw_user',
  password: 'jjw_password',
  database: 'jjw_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Drizzle 인스턴스 생성
export const db = drizzle(poolConnection, { schema, mode: 'default' });

// 타입 export
export type DrizzleDB = typeof db;

// 연결 테스트 함수
export async function testConnection() {
  try {
    await poolConnection.query('SELECT 1');
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

