import { Controller, Get, Sse } from '@nestjs/common';
import { AppService } from './app.service';
import { Observable, interval, map } from 'rxjs';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('api/hello')
  getHelloText(): { message: string } {
    return { message: this.appService.getHelloText() };
  }

  @Sse('sse')
  sendEvents(): Observable<MessageEvent> {
    return interval(1000).pipe(
      map((num) => ({
        data: { message: `SSE event ${num}`, timestamp: new Date().toISOString() },
      } as MessageEvent)),
    );
  }
}
