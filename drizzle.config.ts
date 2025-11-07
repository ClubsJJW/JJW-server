import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

// 환경변수에서 DB 연결 정보 구성
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '13306';
const dbName = process.env.DB_NAME || 'jjw_db';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || 'my-secret-pw';

const databaseUrl = `mysql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;

