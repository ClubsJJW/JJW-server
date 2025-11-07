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
  SseBroadcastDataType,
} from './sse.service';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  /**
   * SSE 연결 등록 엔드포인트
   * 멤버 ID 기반 SSE 연결을 등록합니다.
   *
   * @param request SSE 연결 요청 정보 (JSON body)
   * @returns 연결 성공 응답
   *
   * Example: POST /sse/register
   * {
   *   "memberId": "member_123"
   * }
   */
  @Post('register')
  async registerConnection(
    @Body() request: SseConnectionRequest,
  ): Promise<{ success: boolean; message: string }> {
    // 필수 파라미터 검증
    if (!request.memberId) {
      throw new BadRequestException('필수 파라미터가 누락되었습니다: memberId');
    }

    try {
      await this.sseService.registerConnection(request);
      return {
        success: true,
        message: `SSE 연결 등록 성공: 멤버=${request.memberId}`,
      };
    } catch (error) {
      throw new BadRequestException(`SSE 연결 등록 실패: ${error.message}`);
    }
  }

  /**
   * SSE 스트리밍 엔드포인트
   * 등록된 SSE 연결로부터 실시간 이벤트를 수신합니다.
   *
   * @param memberId 멤버 ID
   * @returns Observable<MessageEvent>
   *
   * Example: GET /sse/connect?memberId=member_123
   */
  @Sse('connect')
  async connect(
    @Query('memberId') memberId: string,
  ): Promise<Observable<MessageEvent>> {
    if (!memberId) {
      throw new BadRequestException('memberId가 필요합니다');
    }

    try {
      // 새로운 연결 등록 및 이벤트 스트림 반환
      return this.sseService.registerConnection({ memberId });
    } catch (error) {
      throw new BadRequestException(`SSE 연결 실패: ${error.message}`);
    }
  }

  /**
   * SSE 브로드캐스트 엔드포인트
   * 특정 멤버 ID의 연결된 클라이언트들에게 리다이렉트 이벤트를 전송합니다.
   *
   * @param request 브로드캐스트 요청 정보
   * @returns 전송된 연결 수
   *
   * Example: POST /sse/broadcast
   * {
   *   "memberId": "member_123",
   *   "eventData": {
   *     "url": "/new-page"
   *   }
   * }
   */
  @Post('broadcast')
  async broadcast(@Body() request: SseBroadcastRequest) {
    if (!request.memberId || !request.eventData?.url) {
      throw new BadRequestException(
        '필수 파라미터가 누락되었습니다: memberId, eventData.url',
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
   * 특정 멤버의 활성 연결들을 조회하는 엔드포인트
   *
   * @param memberId 멤버 ID
   * @returns 멤버의 활성 연결 목록
   */
  @Get('connections')
  async getMemberConnections(@Query('memberId') memberId: string) {
    if (!memberId) {
      throw new BadRequestException('필수 파라미터가 누락되었습니다: memberId');
    }

    try {
      const result = await this.sseService.getMemberActiveConnections(memberId);
      return result;
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
