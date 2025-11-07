import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getHello(): string {
    return 'Hello World!';
  }

  getHelloText(): string {
    return this.configService.get<string>('HELLO_TEXT') || 'Default Hello Text';
  }
}
