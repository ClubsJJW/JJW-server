export class LoginDto {
  nickname: string;
  password: string;
}

export class LoginResponseDto {
  success: boolean;
  message: string;
  data?: {
    userId: number; // mock_users 테이블의 id
    nickname: string;
  };
}
