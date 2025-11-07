# NestJS Schedule로 변경하기 (참고용)

만약 `@nestjs/schedule`를 사용하고 싶다면:

## 1. 패키지 설치

```bash
pnpm add @nestjs/schedule
```

## 2. 모듈에 import

```typescript
// src/modules/sse/sse.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SseController } from './sse.controller';
import { SseService } from './sse.service';

@Module({
  imports: [ScheduleModule.forRoot()],  // 추가!
  controllers: [SseController],
  providers: [SseService],
  exports: [SseService],
})
export class SseModule {}
```

## 3. Service 변경

```typescript
// src/modules/sse/sse.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class SseService {
  // OnModuleInit, OnModuleDestroy 제거!
  // broadcastInterval 변수 제거!

  constructor(private readonly configService: ConfigService) {}

  // ... registerClient, sendToClient 등은 그대로 ...

  // 데코레이터로 간단하게!
  @Interval(3000)  // 3초마다
  handleBroadcast() {
    const clientCount = this.getClientCount();
    
    if (clientCount > 0) {
      const helloText = this.configService.get<string>('HELLO_TEXT') || 'Hello!';
      
      this.broadcast({
        data: {
          type: 'hello',
          message: helloText,
          timestamp: new Date().toISOString(),
          connectedClients: clientCount,
        },
      });
      
      console.log(`📤 HELLO_TEXT 브로드캐스트: "${helloText}" → ${clientCount}명의 클라이언트`);
    }
  }
}
```

## 4. 더 많은 예제

### 매 분마다
```typescript
@Cron('0 * * * * *')  // 매 분의 0초
handleEveryMinute() { }
```

### 5분마다
```typescript
@Cron(CronExpression.EVERY_5_MINUTES)
handleEvery5Minutes() { }
```

### 매일 자정
```typescript
@Cron('0 0 0 * * *')
handleMidnight() { }
```

### 평일 오전 9시
```typescript
@Cron('0 0 9 * * 1-5')  // 월~금
handleWeekdayMorning() { }
```

## Cron 표현식 패턴

```
 * * * * * *
 | | | | | |
 | | | | | +-- 요일 (0-7, 0과 7은 일요일)
 | | | | +---- 월 (1-12)
 | | | +------ 일 (1-31)
 | | +-------- 시 (0-23)
 | +---------- 분 (0-59)
 +------------ 초 (0-59)
```

## 장단점

### 장점
- ✅ 선언적이고 읽기 쉬움
- ✅ 자동 정리 (메모리 누수 걱정 없음)
- ✅ Cron 표현식으로 복잡한 패턴 가능
- ✅ 테스트하기 더 쉬움

### 단점
- ❌ 추가 패키지 필요
- ❌ 동적으로 interval 변경 어려움
- ❌ 오버킬일 수 있음 (간단한 작업에는)

## 결론

**현재 프로젝트(해커톤)에서는 setInterval이 더 적합합니다!**

- 간단하고 직관적
- 추가 의존성 없음
- 동적 설정 가능
- 충분히 안정적

**나중에 다음이 필요하면 Cron 고려:**
- 매일/매주 특정 시간 작업
- 여러 스케줄 작업 관리
- 더 복잡한 타이밍 패턴

