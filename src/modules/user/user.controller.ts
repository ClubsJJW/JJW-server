import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { LoginDto, JwtPayload } from './dto/login.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 로그인
   * POST /user/login
   * Request: { nickname: string, password: string }
   * Response: { success: boolean, message: string, data: { userId: number, nickname: string, token: string } }
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.userService.login(loginDto);
  }

  /**
   * 토큰에서 userId 파싱
   * GET /user/get-user-id
   * Headers: Authorization: Bearer <token>
   * Response: { success: boolean, data: { userId: number, nickname: string } }
   */
  @UseGuards(JwtAuthGuard)
  @Get('get-user-id')
  getUserId(@CurrentUser() user: JwtPayload) {
    return {
      success: true,
      data: {
        userId: user.userId,
        nickname: user.nickname,
      },
    };
  }
}
