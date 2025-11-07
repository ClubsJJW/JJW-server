import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject } from 'rxjs';
import {
  sseEvents,
  broadcastRequests,
  broadcastResults,
} from '../../db/schema';

export interface SseEvent {
  data: any;
  id?: string;
  type?: string;
  retry?: number;
}

/**
 * SSE 연결 등록을 위한 요청 DTO
 */
export interface SseConnectionRequest {
  memberId: string; // 멤버 고유 ID
}

/**
 * SSE 브로드캐스트 데이터 타입 정의
 */
export type SseBroadcastDataType = {
  url: string; // 필수: 리다이렉트 경로 (메인 URL 제외한 path, 예: "/new-page")
};

/**
 * SSE 이벤트 전송을 위한 요청 DTO
 */
export interface SseBroadcastRequest {
  memberId: string; // 대상 멤버 ID
  eventData: SseBroadcastDataType; // 이벤트 데이터
}

@Injectable()
export class SseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SseService.name);
  // memberId를 키로 Subject 배열 관리 (한 멤버가 여러 연결 가능)
  private readonly clients = new Map<string, Subject<SseEvent>[]>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject('DB') private readonly db: any,
  ) {}

  /**
   * 채널톡 SSE 연결을 등록합니다.
   * 복합 키 검증 및 데이터베이스 저장 후 연결을 설정합니다.
   * @param request SSE 연결 요청 정보
   * @returns Observable<SseEvent>
   */
  async registerConnection(
    request: SseConnectionRequest,
  ): Promise<Observable<SseEvent>> {
    const { memberId } = request;

    try {
      // 메모리 연결 설정 - memberId에 Subject 추가
      const subject = new Subject<SseEvent>();
      const existingSubjects = this.clients.get(memberId) || [];
      existingSubjects.push(subject);
      this.clients.set(memberId, existingSubjects);

      this.logger.log(
        `✅ SSE 연결 등록: 멤버=${memberId} (현재 연결 수: ${existingSubjects.length})`,
      );

      return new Observable((observer) => {
        const subscription = subject.subscribe(observer);

        // 클라이언트 연결 해제 시 정리
        return () => {
          subscription.unsubscribe();

          // 해당 subject를 배열에서 제거
          const subjects = this.clients.get(memberId);
          if (subjects) {
            const index = subjects.indexOf(subject);
            if (index > -1) {
              subjects.splice(index, 1);
            }

            // 배열이 비면 Map에서 제거
            if (subjects.length === 0) {
              this.clients.delete(memberId);
            } else {
              this.clients.set(memberId, subjects);
            }
          }

          this.logger.log(`❌ SSE 연결 해제: 멤버=${memberId}`);
        };
      });
    } catch (error) {
      this.logger.error(`SSE 연결 등록 실패: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 채널톡 매칭 로직에 따라 이벤트를 브로드캐스트합니다.
   * {channelId, userChatId, mediumKey}로 매칭되는 연결들에 전송합니다.
   * @param request 브로드캐스트 요청 정보
   * @returns 전송된 연결 수
   */

  async broadcastToMatchingConnections(
    request: SseBroadcastRequest,
  ): Promise<number> {
    const { memberId, eventData } = request;

    try {
      // 1. 브로드캐스트 요청 저장
      await this.db.insert(broadcastRequests).values({
        memberId,
        eventData: JSON.stringify(eventData),
      });

      this.logger.log(`📝 브로드캐스트 요청 저장: 멤버=${memberId}`);

      // 2. 메모리에서 해당 멤버의 모든 연결 가져오기
      const subjects = this.clients.get(memberId);

      if (!subjects || subjects.length === 0) {
        this.logger.debug(`매칭되는 SSE 연결 없음: 멤버=${memberId}`);
        return 0;
      }

      // 3. 이벤트 전송
      const event: SseEvent = {
        data: {
          ...eventData,
          timestamp: new Date().toISOString(),
          memberId,
        },
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'redirect',
      };

      let successCount = 0;

      // 모든 연결에 이벤트 전송
      for (const subject of subjects) {
        try {
          subject.next(event);
          successCount++;

          // 성공 이벤트 로그 저장
          await this.db.insert(sseEvents).values({
            memberId,
            eventType: 'redirect',
            eventData: JSON.stringify(eventData),
            delivered: 1,
          });

          // 브로드캐스트 결과 저장
          await this.db.insert(broadcastResults).values({
            memberId,
            eventData: JSON.stringify(eventData),
            success: 1,
          });
        } catch (error) {
          this.logger.error(
            `이벤트 전송 실패: 멤버=${memberId}, 에러=${error.message}`,
          );

          // 실패 이벤트 로그 저장
          await this.db.insert(sseEvents).values({
            memberId,
            eventType: 'redirect',
            eventData: JSON.stringify(eventData),
            delivered: 0,
          });

          // 브로드캐스트 결과 저장
          await this.db.insert(broadcastResults).values({
            memberId,
            eventData: JSON.stringify(eventData),
            success: 0,
          });
        }
      }

      this.logger.log(
        `📤 SSE 브로드캐스트: ${successCount}/${subjects.length} 연결 성공 (멤버: ${memberId})`,
      );

      return successCount;
    } catch (error) {
      this.logger.error(`SSE 브로드캐스트 실패: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 모든 클라이언트에게 이벤트를 브로드캐스트합니다.
   * @param event 전송할 이벤트
   */
  broadcast(event: SseEvent): void {
    this.clients.forEach((subjects) => {
      subjects.forEach((subject) => {
        subject.next(event);
      });
    });
  }

  /**
   * 연결된 클라이언트 수를 반환합니다.
   */
  getClientCount(): number {
    let totalCount = 0;
    this.clients.forEach((subjects) => {
      totalCount += subjects.length;
    });
    return totalCount;
  }

  /**
   * 특정 멤버가 연결되어 있는지 확인합니다.
   */
  isMemberConnected(memberId: string): boolean {
    const subjects = this.clients.get(memberId);
    return subjects !== undefined && subjects.length > 0;
  }

  /**
   * 특정 멤버의 활성 연결들을 조회합니다 (메모리 기반).
   */
  async getMemberActiveConnections(memberId: string) {
    // 메모리에서 실제 연결 수 확인
    const subjects = this.clients.get(memberId);
    const activeCount = subjects ? subjects.length : 0;

    return {
      memberId,
      activeCount,
      isConnected: activeCount > 0,
    };
  }

  /**
   * 모든 활성 연결에 heartbeat 이벤트를 전송합니다.
   */
  async sendHeartbeatToAllConnections(): Promise<number> {
    try {
      const now = new Date();

      // 메모리에서 모든 활성 연결 가져오기
      let totalConnections = 0;
      this.clients.forEach((subjects) => {
        totalConnections += subjects.length;
      });

      if (totalConnections === 0) {
        return 0;
      }

      // heartbeat 이벤트 생성
      const heartbeatEvent: SseEvent = {
        data: {
          url: '/heartbeat',
          type: 'heartbeat',
          message: 'Connection is alive',
          timestamp: now.toISOString(),
          activeConnections: totalConnections,
        },
        id: `heartbeat-${Date.now()}`,
        type: 'heartbeat',
      };

      let sentCount = 0;

      // 모든 활성 연결에 heartbeat 전송
      this.clients.forEach((subjects) => {
        subjects.forEach((subject) => {
          try {
            subject.next(heartbeatEvent);
            sentCount++;
          } catch (error) {
            this.logger.error(`Heartbeat 전송 에러: ${error.message}`);
          }
        });
      });

      if (sentCount > 0) {
        this.logger.debug(
          `💓 Heartbeat 전송: ${sentCount}/${totalConnections}개 연결`,
        );
      }

      return sentCount;
    } catch (error) {
      this.logger.error(`Heartbeat 전송 실패: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * 모듈 초기화 시 정기 정리 및 heartbeat 작업을 시작합니다.
   */
  onModuleInit() {
    this.logger.log('💓 SSE heartbeat 시작 (5초마다)');

    // 5초마다 모든 활성 연결에 heartbeat 전송
    this.heartbeatInterval = setInterval(async () => {
      await this.sendHeartbeatToAllConnections();
    }, 5 * 1000); // 5초
  }

  /**
   * 모듈 종료 시 정리 작업을 중지합니다.
   */
  onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.logger.log('🛑 SSE heartbeat 중지');
    }
  }
}
