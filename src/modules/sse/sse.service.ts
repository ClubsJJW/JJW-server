import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject } from 'rxjs';
import { eq, and, gt } from 'drizzle-orm';
import { sseConnections, sseEvents } from '../../db/schema';

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
  channelId: string; // 채널 고유값
  userChatId: string; // 상담 대화 단위 ID
  userId?: string; // 고객 기본 키 (nullable - 로그인하지 않은 사용자 허용)
  clientConnectionId: string; // SSE 연결 고유 토큰
  memberId?: string; // 회원 고객 키 (선택적)
  memberHash?: string; // 멤버 인증 해시 (선택적)
  mediumType?: string; // 유입 매체 구분 (web, ios, android 등)
  mediumKey?: string; // 매체 세부 식별자
  sessionId?: string; // 세션 범위 내 재연결 식별
  metadata?: Record<string, any>; // 추가 메타데이터
}

/**
 * SSE 이벤트 전송을 위한 요청 DTO
 */
export interface SseBroadcastRequest {
  channelId: string; // 대상 채널 ID
  userChatId: string; // 대상 상담 ID
  mediumKey?: string; // 대상 매체 키 (지정하지 않으면 모든 매체에 전송)
  eventType: string; // 이벤트 타입 ('message', 'redirect', 'status' 등)
  eventData: any; // 이벤트 데이터
  excludeConnectionId?: string; // 제외할 연결 ID (본인 제외 등)
}

export interface SseConnectionStream extends Observable<SseEvent> {}

@Injectable()
export class SseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SseService.name);
  private readonly clients = new Map<string, Subject<SseEvent>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

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
    const {
      channelId,
      userChatId,
      userId,
      clientConnectionId,
      memberId,
      memberHash,
      mediumType = 'web',
      mediumKey,
      sessionId,
      metadata,
    } = request;

    // TTL 설정 (기본 1시간)
    const ttlMinutes = parseInt(
      this.configService.get('SSE_TTL_MINUTES', '60'),
    );
    const ttlExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    try {
      // 1. 기존 연결 정리 (동일 clientConnectionId가 있으면 제거)
      await this.db
        .delete(sseConnections)
        .where(eq(sseConnections.clientConnectionId, clientConnectionId));

      // 2. 새 연결 정보 저장
      await this.db.insert(sseConnections).values({
        channelId,
        userChatId,
        userId,
        clientConnectionId,
        memberId,
        memberHash,
        mediumType,
        mediumKey,
        sessionId,
        ttlExpiresAt,
        metadata: metadata ? JSON.stringify(metadata) : null,
      });

      // 3. 메모리 연결 설정
      const subject = new Subject<SseEvent>();
      this.clients.set(clientConnectionId, subject);

      this.logger.log(
        `✅ SSE 연결 등록: ${clientConnectionId} (채널: ${channelId}, 상담: ${userChatId})`,
      );

      return new Observable((observer) => {
        const subscription = subject.subscribe(observer);

        // 클라이언트 연결 해제 시 정리
        return () => {
          subscription.unsubscribe();
          this.clients.delete(clientConnectionId);
          this.logger.log(`❌ SSE 연결 해제: ${clientConnectionId}`);
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
  /**
   * 특정 연결 ID에 대한 이벤트 스트림을 가져옵니다
   */
  getConnectionStream(clientConnectionId: string): Observable<SseEvent> {
    const subject = this.clients.get(clientConnectionId);
    if (!subject) {
      throw new Error(`연결을 찾을 수 없습니다: ${clientConnectionId}`);
    }
    return subject.asObservable();
  }

  async broadcastToMatchingConnections(
    request: SseBroadcastRequest,
  ): Promise<number> {
    const {
      channelId,
      userChatId,
      mediumKey,
      eventType,
      eventData,
      excludeConnectionId,
    } = request;

    try {
      const now = new Date();

      // 1. 매칭되는 활성 연결들 조회
      let query = this.db
        .select({
          clientConnectionId: sseConnections.clientConnectionId,
          memberId: sseConnections.memberId,
          memberHash: sseConnections.memberHash,
          mediumKey: sseConnections.mediumKey,
        })
        .from(sseConnections)
        .where(
          and(
            eq(sseConnections.channelId, channelId),
            eq(sseConnections.userChatId, userChatId),
            gt(sseConnections.ttlExpiresAt, now), // TTL 유효한 연결만
          ),
        );

      // mediumKey가 지정된 경우 필터링
      if (mediumKey) {
        query = query.where(eq(sseConnections.mediumKey, mediumKey));
      }

      const matchingConnections = (await query) as Array<{
        clientConnectionId: string;
        memberId: string | null;
        memberHash: string | null;
        mediumKey: string | null;
      }>;

      if (matchingConnections.length === 0) {
        this.logger.debug(
          `매칭되는 SSE 연결 없음: 채널=${channelId}, 상담=${userChatId}, 매체=${mediumKey || 'all'}`,
        );
        return 0;
      }

      // 2. 멤버 인증 검증 (memberId가 있는 경우)
      const hasMemberAuth = matchingConnections.some(
        (conn) => conn.memberId && conn.memberHash,
      );
      let validConnections = matchingConnections;

      if (hasMemberAuth) {
        // 멤버 인증이 필요한 경우, 해시 검증 통과한 연결만 허용
        validConnections = matchingConnections.filter((conn) => {
          if (!conn.memberId || !conn.memberHash) return false;
          // TODO: 실제 멤버 해시 검증 로직 구현 (외부 서비스 호출 등)
          return true; // 임시로 모두 통과
        });
      }

      // 3. 제외할 연결 제거
      if (excludeConnectionId) {
        validConnections = validConnections.filter(
          (conn) => conn.clientConnectionId !== excludeConnectionId,
        );
      }

      if (validConnections.length === 0) {
        this.logger.debug('유효한 SSE 연결 없음 (인증/제외 필터링 후)');
        return 0;
      }

      // 4. 이벤트 전송 및 로깅
      const event: SseEvent = {
        data: {
          type: eventType,
          ...eventData,
          timestamp: new Date().toISOString(),
          channelId,
          userChatId,
        },
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: eventType,
      };

      let successCount = 0;

      for (const connection of validConnections) {
        const client = this.clients.get(connection.clientConnectionId);
        if (client) {
          client.next(event);
          successCount++;

          // 이벤트 로그 저장
          await this.db.insert(sseEvents).values({
            clientConnectionId: connection.clientConnectionId,
            eventType,
            eventData: JSON.stringify(eventData),
            userChatId,
            channelId,
            delivered: 1,
          });
        } else {
          // 메모리에 없는 연결은 DB에서 정리
          await this.db
            .delete(sseConnections)
            .where(
              eq(
                sseConnections.clientConnectionId,
                connection.clientConnectionId,
              ),
            );

          // 실패 이벤트 로그 저장
          await this.db.insert(sseEvents).values({
            clientConnectionId: connection.clientConnectionId,
            eventType,
            eventData: JSON.stringify(eventData),
            userChatId,
            channelId,
            delivered: 0,
          });
        }
      }

      this.logger.log(
        `📤 SSE 브로드캐스트: ${successCount}/${validConnections.length} 연결 성공 (채널: ${channelId}, 상담: ${userChatId})`,
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
  isClientConnected(clientConnectionId: string): boolean {
    return this.clients.has(clientConnectionId);
  }

  /**
   * 특정 연결 정보를 조회합니다.
   */
  async getConnectionInfo(clientConnectionId: string) {
    const result = (await this.db
      .select()
      .from(sseConnections)
      .where(eq(sseConnections.clientConnectionId, clientConnectionId))
      .limit(1)) as Promise<Array<typeof sseConnections.$inferSelect>>;

    return result[0] || null;
  }

  /**
   * 특정 사용자의 활성 연결들을 조회합니다.
   */
  async getUserActiveConnections(userId: string, channelId: string) {
    const now = new Date();

    return (await this.db
      .select({
        clientConnectionId: sseConnections.clientConnectionId,
        userChatId: sseConnections.userChatId,
        mediumType: sseConnections.mediumType,
        mediumKey: sseConnections.mediumKey,
        connectedAt: sseConnections.connectedAt,
      })
      .from(sseConnections)
      .where(
        and(
          eq(sseConnections.userId, userId),
          eq(sseConnections.channelId, channelId),
          gt(sseConnections.ttlExpiresAt, now),
        ),
      )) as Promise<
      Array<{
        clientConnectionId: string;
        userChatId: string;
        mediumType: string | null;
        mediumKey: string | null;
        connectedAt: Date;
      }>
    >;
  }

  /**
   * 만료된 연결들을 정리합니다.
   */
  async cleanupExpiredConnections(): Promise<number> {
    const now = new Date();

    try {
      const expiredConnections = await (this.db
        .select({ clientConnectionId: sseConnections.clientConnectionId })
        .from(sseConnections)
        .where(gt(sseConnections.ttlExpiresAt, now)) as Promise<
        Array<{
          clientConnectionId: string;
        }>
      >);

      if (expiredConnections.length > 0) {
        // 메모리에서 제거
        expiredConnections.forEach(({ clientConnectionId }) => {
          this.clients.delete(clientConnectionId);
        });

        // DB에서 제거
        const result = await this.db
          .delete(sseConnections)
          .where(gt(sseConnections.ttlExpiresAt, now));

        this.logger.log(
          `🧹 만료된 SSE 연결 정리: ${expiredConnections.length}개`,
        );
        return expiredConnections.length;
      }

      return 0;
    } catch (error) {
      this.logger.error(`만료 연결 정리 실패: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * 모듈 초기화 시 정기 정리 작업을 시작합니다.
   */
  onModuleInit() {
    this.logger.log('🔄 SSE 만료 연결 정기 정리 시작 (5분마다)');

    // 5분마다 만료된 연결 정리
    this.cleanupInterval = setInterval(
      async () => {
        await this.cleanupExpiredConnections();
      },
      5 * 60 * 1000,
    ); // 5분

    // 초기 정리 실행
    setTimeout(() => {
      this.cleanupExpiredConnections();
    }, 10000); // 10초 후 시작
  }

  /**
   * 모듈 종료 시 정리 작업을 중지합니다.
   */
  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.logger.log('🛑 SSE 정리 작업 중지');
    }
  }
}
