import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { DrizzleDB } from '@/db/connection';
import { mockUsers } from '@/db/schema';
import { LoginDto, LoginResponseDto } from './dto/login.dto';

@Injectable()
export class UserService {
  constructor(@Inject('DB') private db: DrizzleDB) {}

  /**
   * 사용자 로그인
   * nickname과 password로 인증
   * 해당 nickname이 없으면 새로 생성
   */
  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    try {
      const { nickname, password } = loginDto;

      // 1. mock_users 테이블에서 nickname으로 사용자 찾기
      const user = await this.db
        .select()
        .from(mockUsers)
        .where(eq(mockUsers.nickname, nickname))
        .limit(1);

      let userId: number;

      // 2-1. 사용자가 없으면 새로 생성
      if (user.length === 0) {
        const insertResult = await this.db.insert(mockUsers).values({
          nickname,
          password,
        });

        userId = Number(insertResult[0].insertId);
        console.log(`✨ 신규 사용자 생성: ${nickname} (userId: ${userId})`);

        return {
          success: true,
          message: '신규 사용자 생성 및 로그인 성공',
          data: {
            userId,
            nickname,
          },
        };
      }

      // 2-2. 사용자가 있는데 password가 다르면 실패
      if (user[0].password !== password) {
        console.log(`❌ 로그인 실패: ${nickname} (비밀번호 오류)`);
        return {
          success: false,
          message: '비밀번호가 일치하지 않습니다',
        };
      }

      // 3. 로그인 성공
      userId = user[0].id;
      console.log(`👤 기존 사용자 로그인: ${nickname} (userId: ${userId})`);

      return {
        success: true,
        message: '로그인 성공',
        data: {
          userId,
          nickname,
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: '로그인 실패',
      };
    }
  }
}
