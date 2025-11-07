import { Controller, Get, Query, Sse, MessageEvent } from '@nestjs/common';
import { Observable, interval, map } from 'rxjs';
import { SseService, SseEvent } from './sse.service';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  /**
   * SSE 연결 엔드포인트
   * 클라이언트가 이 엔드포인트에 연결하면 실시간 이벤트를 받을 수 있습니다.
   * 
   * @param clientId 클라이언트 고유 ID (쿼리 파라미터)
   * @returns Observable<MessageEvent>
   * 
   * Example: GET /sse/connect?clientId=user123
   */
  @Sse('connect')
  connect(@Query('clientId') clientId: string): Observable<MessageEvent> {
    if (!clientId) {
      clientId = `client-${Date.now()}`;
    }

    return this.sseService.registerClient(clientId).pipe(
      map((event: SseEvent) => {
        const messageEvent: MessageEvent = {
          data: event.data,
          id: event.id,
          type: event.type,
          retry: event.retry,
        } as MessageEvent;
        return messageEvent;
      }),
    );
  }

  /**
   * 테스트용 SSE 엔드포인트 (1초마다 이벤트 전송)
   * 
   * @returns Observable<MessageEvent>
   * 
   * Example: GET /sse/test
   */
  @Sse('test')
  test(): Observable<MessageEvent> {
    return interval(1000).pipe(
      map((num) => ({
        data: { 
          message: `SSE event ${num}`, 
          timestamp: new Date().toISOString() 
        },
      } as MessageEvent)),
    );
  }

  /**
   * SSE 연결 상태를 확인하는 엔드포인트
   * 
   * @returns 연결된 클라이언트 수
   */
  @Get('status')
  getStatus(): { connectedClients: number } {
    return {
      connectedClients: this.sseService.getClientCount(),
    };
  }
}

