import { Module, Global, OnModuleInit } from '@nestjs/common';
import { db, testConnection } from './connection';

@Global()
@Module({
  providers: [
    {
      provide: 'DB',
      useValue: db,
    },
  ],
  exports: ['DB'],
})
export class DbModule implements OnModuleInit {
  async onModuleInit() {
    console.log('🔌 Initializing database connection...');
    await testConnection();
  }
}
