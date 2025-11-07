import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Sse,
  MessageEvent,
  BadRequestException,
  Logger,
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
  private readonly logger = new Logger(SseController.name);

  constructor(private readonly sseService: SseService) {}

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
    this.logger.log(`📡 GET /sse/connect - memberId: ${memberId}`);

    if (!memberId) {
      this.logger.error('❌ GET /sse/connect - memberId 누락');
      throw new BadRequestException('memberId가 필요합니다');
    }

    try {
      // 새로운 연결 등록 및 이벤트 스트림 반환
      const stream = await this.sseService.registerConnection({ memberId });
      this.logger.log(`✅ GET /sse/connect - 연결 성공: ${memberId}`);
      return stream;
    } catch (error) {
      this.logger.error(`❌ GET /sse/connect - 연결 실패: ${error.message}`);
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
    this.logger.log(
      `📤 POST /sse/broadcast - memberId: ${request.memberId}, url: ${request.eventData?.url}`,
    );

    if (!request.memberId || !request.eventData?.url) {
      this.logger.error('❌ POST /sse/broadcast - 필수 파라미터 누락');
      throw new BadRequestException(
        '필수 파라미터가 누락되었습니다: memberId, eventData.url',
      );
    }

    try {
      const sentCount =
        await this.sseService.broadcastToMatchingConnections(request);
      this.logger.log(
        `✅ POST /sse/broadcast - 성공: ${sentCount}개 연결에 전송 (memberId: ${request.memberId})`,
      );
      return {
        success: true,
        sentCount,
        message: `${sentCount}개의 연결에 이벤트 전송됨`,
      };
    } catch (error) {
      this.logger.error(`❌ POST /sse/broadcast - 실패: ${error.message}`);
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
    this.logger.log('📊 GET /sse/status');

    const activeConnections = this.sseService.getClientCount();

    const response = {
      activeConnections,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };

    this.logger.log(`✅ GET /sse/status - 활성 연결: ${activeConnections}개`);
    return response;
  }

  /**
   * 특정 멤버의 활성 연결들을 조회하는 엔드포인트
   *
   * @param memberId 멤버 ID
   * @returns 멤버의 활성 연결 목록
   */
  @Get('connections')
  async getMemberConnections(@Query('memberId') memberId: string) {
    this.logger.log(`🔍 GET /sse/connections - memberId: ${memberId}`);

    if (!memberId) {
      this.logger.error('❌ GET /sse/connections - memberId 누락');
      throw new BadRequestException('필수 파라미터가 누락되었습니다: memberId');
    }

    try {
      const result = await this.sseService.getMemberActiveConnections(memberId);
      this.logger.log(
        `✅ GET /sse/connections - 조회 성공: ${result.activeCount}개 연결 (memberId: ${memberId})`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `❌ GET /sse/connections - 조회 실패: ${error.message}`,
      );
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
