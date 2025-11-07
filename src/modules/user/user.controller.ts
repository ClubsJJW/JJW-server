import { Controller, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { LoginDto } from './dto/login.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 로그인
   * POST /user/login
   * Request: { nickname: string, password: string }
   * Response: { success: boolean, message: string, data: { userId: number, nickname: string } }
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.userService.login(loginDto);
  }
}

