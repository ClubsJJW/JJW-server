import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject } from 'rxjs';

export interface SseEvent {
  data: any;
  id?: string;
  type?: string;
  retry?: number;
}

@Injectable()
export class SseService implements OnModuleInit, OnModuleDestroy {
  private readonly clients = new Map<string, Subject<SseEvent>>();
  private broadcastInterval: NodeJS.Timeout | null = null;
  private redirectToggle = false; // 리다이렉트 URL 번갈아 보내기 위한 플래그

  constructor(private readonly configService: ConfigService) {}

  /**
   * 새로운 SSE 클라이언트를 등록합니다.
   * @param clientId 클라이언트 고유 ID
   * @returns Observable<SseEvent>
   */
  registerClient(clientId: string): Observable<SseEvent> {
    const subject = new Subject<SseEvent>();
    this.clients.set(clientId, subject);

    console.log(`✅ SSE 클라이언트 연결: ${clientId}`);

    return new Observable((observer) => {
      const subscription = subject.subscribe(observer);

      // 클라이언트 연결 해제 시 정리
      return () => {
        subscription.unsubscribe();
        this.clients.delete(clientId);
        console.log(`❌ SSE 클라이언트 연결 해제: ${clientId}`);
      };
    });
  }

  /**
   * 특정 클라이언트에게 이벤트를 전송합니다.
   * @param clientId 클라이언트 고유 ID
   * @param event 전송할 이벤트
   */
  sendToClient(clientId: string, event: SseEvent): boolean {
    const client = this.clients.get(clientId);
    if (client) {
      client.next(event);
      return true;
    }
    return false;
  }

  /**
   * 모든 클라이언트에게 이벤트를 브로드캐스트합니다.
   * @param event 전송할 이벤트
   */
  broadcast(event: SseEvent): void {
    this.clients.forEach((client) => {
      client.next(event);
    });
  }

  /**
   * 연결된 클라이언트 수를 반환합니다.
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * 특정 클라이언트가 연결되어 있는지 확인합니다.
   */
  isClientConnected(clientId: string): boolean {
    return this.clients.has(clientId);
  }

  /**
   * 모듈 초기화 시 주기적 브로드캐스트를 시작합니다.
   */
  onModuleInit() {
    console.log('🔄 SSE 주기적 리다이렉트 브로드캐스트 시작 (3초마다)');

    this.broadcastInterval = setInterval(() => {
      const clientCount = this.getClientCount();

      if (clientCount > 0) {
        // test-1.html과 test-2.html URL을 번갈아 보내기
        this.redirectToggle = !this.redirectToggle;
        const redirectUrl = this.redirectToggle
          ? 'http://localhost:3090/test-1.html'
          : 'http://localhost:3090/test-2.html';

        this.broadcast({
          data: {
            type: 'redirect',
            url: redirectUrl,
            timestamp: new Date().toISOString(),
            connectedClients: clientCount,
          },
        });

        console.log(
          `🔄 리다이렉트 브로드캐스트: "${redirectUrl}" → ${clientCount}명의 클라이언트`,
        );
      }
    }, 3000); // 3초마다
  }

  /**
   * 모듈 종료 시 interval을 정리합니다.
   */
  onModuleDestroy() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      console.log('🛑 SSE 브로드캐스트 중지');
    }
  }
}
