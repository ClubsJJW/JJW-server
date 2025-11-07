# SSE 모듈 사용 가이드

이 문서는 SSE 모듈을 다른 모듈에서 사용하는 방법을 설명합니다.

## 개요

SSE(Server-Sent Events) 모듈은 서버에서 클라이언트로 실시간 이벤트를 전송할 수 있는 기능을 제공합니다.
채널톡 ALF와 통합하여 클라이언트 리다이렉트 기능을 구현할 수 있습니다.

## 아키텍처

```
채널톡 ALF → Channel App Function → SSE Service → SSE 연결된 클라이언트
```

## 다른 모듈에서 SseService 사용하기

### 1. 모듈 Import

```typescript
// your-module.module.ts
import { Module } from '@nestjs/common';
import { SseModule } from '../sse/sse.module';
import { YourService } from './your.service';

@Module({
  imports: [SseModule], // SSE 모듈 import
  providers: [YourService],
})
export class YourModule {}
```

### 2. Service에서 SseService 주입

```typescript
// your.service.ts
import { Injectable } from '@nestjs/common';
import { SseService } from '../sse/sse.service';

@Injectable()
export class YourService {
  constructor(private readonly sseService: SseService) {}

  // 특정 클라이언트에게 리다이렉트 이벤트 전송
  sendRedirectToClient(clientId: string, redirectUrl: string): boolean {
    return this.sseService.sendToClient(clientId, {
      data: {
        type: 'redirect',
        url: redirectUrl,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // 모든 클라이언트에게 알림 브로드캐스트
  broadcastNotification(message: string): void {
    this.sseService.broadcast({
      data: {
        type: 'notification',
        message,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // 클라이언트 연결 상태 확인
  checkClientConnection(clientId: string): boolean {
    return this.sseService.isClientConnected(clientId);
  }
}
```

## 채널앱 통합 예제

### 1. 채널앱 Function 구현

```typescript
// channel-app.controller.ts
import { Controller, Put, Body } from '@nestjs/common';
import { SseService } from '../sse/sse.service';

interface ChannelFunctionRequest {
  method: string;
  params?: any;
  context: {
    channel: {
      id: string;
    };
    caller?: {
      id: string;
      type: string;
    };
  };
}

@Controller('functions')
export class ChannelAppController {
  constructor(private readonly sseService: SseService) {}

  @Put()
  async handleFunction(@Body() request: ChannelFunctionRequest) {
    const { method, params, context } = request;

    try {
      switch (method) {
        case 'redirectClient':
          return this.handleRedirect(params, context);
        default:
          return {
            error: {
              type: 'METHOD_NOT_FOUND',
              message: `Unknown method: ${method}`,
            },
          };
      }
    } catch (error) {
      return {
        error: {
          type: 'INTERNAL_ERROR',
          message: error.message,
        },
      };
    }
  }

  private handleRedirect(params: any, context: any) {
    const { clientId, url } = params.input;

    if (!clientId || !url) {
      return {
        error: {
          type: 'INVALID_PARAMS',
          message: 'clientId and url are required',
        },
      };
    }

    // SSE를 통해 클라이언트에 리다이렉트 명령 전송
    const sent = this.sseService.sendToClient(clientId, {
      data: {
        type: 'redirect',
        url,
        timestamp: new Date().toISOString(),
      },
    });

    if (!sent) {
      return {
        error: {
          type: 'CLIENT_NOT_CONNECTED',
          message: `Client ${clientId} is not connected`,
        },
      };
    }

    return {
      result: {
        type: 'string',
        attributes: {
          message: `Redirect command sent to client ${clientId}`,
        },
      },
    };
  }
}
```

### 2. 클라이언트 측 구현 (예제)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Channel Talk SSE Client</title>
</head>
<body>
  <h1>SSE 리다이렉트 클라이언트</h1>
  <p>상태: <span id="status">연결 중...</span></p>
  <p>클라이언트 ID: <span id="clientId"></span></p>

  <script>
    // 고유한 클라이언트 ID 생성 (실제로는 사용자 ID 등을 사용)
    const clientId = 'user-' + Math.random().toString(36).substr(2, 9);
    document.getElementById('clientId').textContent = clientId;

    // SSE 연결
    const eventSource = new EventSource(`http://localhost:3090/sse/connect?clientId=${clientId}`);

    eventSource.onopen = () => {
      console.log('✅ SSE 연결 성공');
      document.getElementById('status').textContent = '연결됨';
    };

    eventSource.onmessage = (event) => {
      console.log('📨 이벤트 수신:', event.data);
      
      try {
        const data = JSON.parse(event.data);
        
        // 리다이렉트 이벤트 처리
        if (data.type === 'redirect') {
          console.log(`🔄 리다이렉트: ${data.url}`);
          // 실제 리다이렉트 실행
          window.location.href = data.url;
        }
        
        // 알림 이벤트 처리
        if (data.type === 'notification') {
          console.log(`🔔 알림: ${data.message}`);
          alert(data.message);
        }
      } catch (e) {
        console.error('이벤트 파싱 오류:', e);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ SSE 오류:', error);
      document.getElementById('status').textContent = '연결 실패';
    };

    // 페이지 종료 시 연결 종료
    window.addEventListener('beforeunload', () => {
      eventSource.close();
    });
  </script>
</body>
</html>
```

### 3. 채널톡에서 Function 호출

채널톡 ALF에서 다음과 같이 Function을 호출할 수 있습니다:

```json
{
  "method": "redirectClient",
  "params": {
    "input": {
      "clientId": "user-abc123",
      "url": "https://example.com/checkout"
    }
  },
  "context": {
    "channel": {
      "id": "channel-id"
    }
  }
}
```

## 이벤트 타입

SSE를 통해 전송할 수 있는 이벤트 타입:

### Redirect Event

```typescript
{
  type: 'redirect',
  url: string,
  timestamp: string
}
```

### Notification Event

```typescript
{
  type: 'notification',
  message: string,
  timestamp: string
}
```

### Custom Event

```typescript
{
  type: 'custom',
  action: string,
  payload: any,
  timestamp: string
}
```

## 보안 고려사항

1. **클라이언트 ID 인증**: 실제 프로덕션에서는 클라이언트 ID를 JWT 등으로 검증해야 합니다.
2. **URL 검증**: 리다이렉트 URL을 화이트리스트로 검증하여 오픈 리다이렉트 취약점을 방지합니다.
3. **Rate Limiting**: 과도한 요청을 방지하기 위해 레이트 리미팅을 구현합니다.
4. **CORS 설정**: 적절한 CORS 정책을 설정합니다.

## 모니터링

SSE 연결 상태 모니터링:

```bash
# 연결된 클라이언트 수 확인
curl http://localhost:3090/sse/status
```

## 다음 단계

- [ ] 채널앱 Function 구현
- [ ] 클라이언트 인증 추가
- [ ] URL 화이트리스트 검증
- [ ] 에러 핸들링 강화
- [ ] 로깅 및 모니터링 추가

