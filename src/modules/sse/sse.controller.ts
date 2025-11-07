import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Sse,
  MessageEvent,
  BadRequestException,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { SseService } from './sse.service';
import type {
  SseEvent,
  SseConnectionRequest,
  SseBroadcastRequest,
} from './sse.service';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  /**
   * 채널톡 SSE 연결 등록 엔드포인트
   * 채널톡 위젯과의 SSE 연결을 등록합니다.
   *
   * @param request SSE 연결 요청 정보 (JSON body)
   * @returns 연결 성공 응답
   *
   * Example: POST /sse/register
   * {
   *   "channelId": "channel_123",
   *   "userChatId": "chat_456",
   *   "userId": "user_789", // optional
   *   "clientConnectionId": "conn_abc123",
   *   "memberId": "member_001",
   *   "memberHash": "hash_value",
   *   "mediumType": "web",
   *   "mediumKey": "tab_1"
   * }
   */
  @Post('register')
  async registerConnection(
    @Body() request: SseConnectionRequest,
  ): Promise<{ success: boolean; message: string }> {
    // 필수 파라미터 검증
    if (
      !request.channelId ||
      !request.userChatId ||
      !request.clientConnectionId
    ) {
      throw new BadRequestException(
        '필수 파라미터가 누락되었습니다: channelId, userChatId, clientConnectionId',
      );
    }

    try {
      await this.sseService.registerConnection(request);
      return {
        success: true,
        message: `SSE 연결 등록 성공: ${request.clientConnectionId}`,
      };
    } catch (error) {
      throw new BadRequestException(`SSE 연결 등록 실패: ${error.message}`);
    }
  }

  /**
   * 채널톡 SSE 스트리밍 엔드포인트
   * 등록된 SSE 연결로부터 실시간 이벤트를 수신합니다.
   *
   * @param clientConnectionId SSE 연결 고유 토큰
   * @returns Observable<MessageEvent>
   *
   * Example: GET /sse/connect?clientConnectionId=conn_abc123
   */
  @Sse('connect')
  async connect(
    @Query('clientConnectionId') clientConnectionId: string,
  ): Promise<Observable<MessageEvent>> {
    if (!clientConnectionId) {
      throw new BadRequestException('clientConnectionId가 필요합니다');
    }

    try {
      // 등록된 연결로부터 이벤트 스트림 생성
      return this.sseService.getConnectionStream(clientConnectionId);
    } catch (error) {
      throw new BadRequestException(`SSE 연결 실패: ${error.message}`);
    }
  }

  /**
   * 레거시 지원용 SSE 연결 엔드포인트 (쿼리 파라미터)
   * 기존 클라이언트 호환성을 위해 유지
   *
   * @deprecated 새로운 구현에서는 POST /sse/connect 사용 권장
   */
  @Sse('legacy-connect')
  async legacyConnect(
    @Query('channelId') channelId: string,
    @Query('userChatId') userChatId: string,
    @Query('userId') userId: string,
    @Query('clientConnectionId') clientConnectionId?: string,
    @Query('memberId') memberId?: string,
    @Query('mediumKey') mediumKey?: string,
  ): Promise<Observable<MessageEvent>> {
    if (!channelId || !userChatId || !userId) {
      throw new BadRequestException(
        '필수 파라미터가 누락되었습니다: channelId, userChatId, userId',
      );
    }

    const request: SseConnectionRequest = {
      channelId,
      userChatId,
      userId,
      clientConnectionId:
        clientConnectionId ||
        `legacy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      memberId,
      mediumType: 'web',
      mediumKey,
    };

    return this.connect(request);
  }

  /**
   * 채널톡 이벤트 브로드캐스트 엔드포인트
   * 특정 채널/상담의 연결된 클라이언트들에게 이벤트를 전송합니다.
   *
   * @param request 브로드캐스트 요청 정보
   * @returns 전송된 연결 수
   *
   * Example: POST /sse/broadcast
   * {
   *   "channelId": "channel_123",
   *   "userChatId": "chat_456",
   *   "eventType": "message",
   *   "eventData": { "text": "새 메시지가 도착했습니다" }
   * }
   */
  @Post('broadcast')
  async broadcast(@Body() request: SseBroadcastRequest) {
    if (!request.channelId || !request.userChatId || !request.eventType) {
      throw new BadRequestException(
        '필수 파라미터가 누락되었습니다: channelId, userChatId, eventType',
      );
    }

    try {
      const sentCount =
        await this.sseService.broadcastToMatchingConnections(request);
      return {
        success: true,
        sentCount,
        message: `${sentCount}개의 연결에 이벤트 전송됨`,
      };
    } catch (error) {
      throw new BadRequestException(`브로드캐스트 실패: ${error.message}`);
    }
  }

  /**
   * SSE 연결 상태 및 통계를 확인하는 엔드포인트
   *
   * @returns 연결 상태 정보
   */
  @Get('status')
  getStatus() {
    const activeConnections = this.sseService.getClientCount();

    // 추가 통계 정보 조회 (실제 구현 시 DB에서 조회)
    return {
      activeConnections,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 특정 사용자의 활성 연결들을 조회하는 엔드포인트
   *
   * @param userId 사용자 ID
   * @param channelId 채널 ID
   * @returns 사용자의 활성 연결 목록
   */
  @Get('connections')
  async getUserConnections(
    @Query('userId') userId: string,
    @Query('channelId') channelId: string,
  ) {
    if (!userId || !channelId) {
      throw new BadRequestException(
        '필수 파라미터가 누락되었습니다: userId, channelId',
      );
    }

    try {
      const connections = (await this.sseService.getUserActiveConnections(
        userId,
        channelId,
      )) as Array<{
        clientConnectionId: string;
        userChatId: string;
        mediumType: string | null;
        mediumKey: string | null;
        connectedAt: Date;
      }>;
      return {
        userId,
        channelId,
        connections,
        totalCount: connections.length,
      };
    } catch (error) {
      throw new BadRequestException(`연결 조회 실패: ${error.message}`);
    }
  }

  /**
   * 테스트용 SSE 엔드포인트 (1초마다 이벤트 전송)
   * 개발/테스트용으로 유지
   *
   * @returns Observable<MessageEvent>
   */
  @Sse('test')
  test(): Observable<MessageEvent> {
    return new Observable((observer) => {
      let count = 0;
      const interval = setInterval(() => {
        observer.next({
          data: {
            message: `테스트 SSE 이벤트 ${count++}`,
            timestamp: new Date().toISOString(),
            type: 'test',
          },
        } as MessageEvent);
      }, 1000);

      return () => clearInterval(interval);
    });
  }
}
