# Next.js에서 SSE 사용하기

## 📦 1. 커스텀 훅 만들기 (추천)

```typescript
// hooks/useSSE.ts
import { useEffect, useState, useCallback, useRef } from 'react';

interface SSEMessage {
  type: string;
  message: string;
  timestamp: string;
  connectedClients?: number;
}

interface UseSSEOptions {
  url: string;
  clientId?: string;
  autoConnect?: boolean;
}

export function useSSE({ url, clientId, autoConnect = true }: UseSSEOptions) {
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    // 이미 연결되어 있으면 중복 연결 방지
    if (eventSourceRef.current) {
      return;
    }

    const id = clientId || `client-${Date.now()}`;
    const eventSource = new EventSource(`${url}?clientId=${id}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('✅ SSE 연결 성공');
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [data, ...prev].slice(0, 50)); // 최근 50개
      } catch (e) {
        console.error('메시지 파싱 오류:', e);
      }
    };

    eventSource.onerror = (err) => {
      console.error('❌ SSE 오류:', err);
      setIsConnected(false);
      setError('연결 오류가 발생했습니다');
    };
  }, [url, clientId]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      console.log('🔌 SSE 연결 해제');
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // 클린업
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    messages,
    isConnected,
    error,
    connect,
    disconnect,
    clearMessages,
  };
}
```

## 🎨 2. 컴포넌트에서 사용하기

### App Router (Next.js 13+)

```typescript
// app/page.tsx
'use client';

import { useSSE } from '@/hooks/useSSE';

export default function HomePage() {
  const { messages, isConnected, error, clearMessages } = useSSE({
    url: 'http://localhost:3090/sse/connect',
    autoConnect: true,
  });

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">실시간 메시지</h1>

      {/* 상태 표시 */}
      <div
        className={`p-4 rounded-lg mb-6 ${
          isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}
      >
        {isConnected ? '🟢 연결됨' : '🔴 연결 끊김'}
        {error && <div className="text-sm">{error}</div>}
      </div>

      {/* 메시지 목록 */}
      <div className="space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className="p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg shadow-lg"
          >
            <div className="text-lg font-bold">{msg.message}</div>
            <div className="text-sm opacity-80">{msg.timestamp}</div>
            {msg.connectedClients && (
              <div className="text-sm">👥 {msg.connectedClients}명 연결 중</div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={clearMessages}
        className="mt-6 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
      >
        메시지 지우기
      </button>
    </div>
  );
}
```

### Pages Router (Next.js 12 이하)

```typescript
// pages/index.tsx
import { useSSE } from '@/hooks/useSSE';

export default function HomePage() {
  const { messages, isConnected } = useSSE({
    url: 'http://localhost:3090/sse/connect',
  });

  // 동일한 UI
}
```

## 🔄 3. 리다이렉트 기능 추가

```typescript
// hooks/useSSE.ts 수정
export function useSSE({ url, clientId, autoConnect = true }: UseSSEOptions) {
  // ... 기존 코드 ...

  useEffect(() => {
    if (autoConnect) {
      const id = clientId || `client-${Date.now()}`;
      const eventSource = new EventSource(`${url}?clientId=${id}`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMessages((prev) => [data, ...prev].slice(0, 50));

          // 리다이렉트 이벤트 처리 ⭐
          if (data.type === 'redirect' && data.url) {
            console.log('🔄 리다이렉트:', data.url);
            window.location.href = data.url;
          }
        } catch (e) {
          console.error('메시지 파싱 오류:', e);
        }
      };

      // ... 나머지 코드
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, url, clientId, disconnect]);

  // ...
}
```

## 🌐 4. 환경변수 설정

```bash
# .env.local
NEXT_PUBLIC_SSE_URL=http://localhost:3090/sse/connect
```

```typescript
// hooks/useSSE.ts
const { messages, isConnected } = useSSE({
  url: process.env.NEXT_PUBLIC_SSE_URL || 'http://localhost:3090/sse/connect',
});
```

## 🎯 5. 실제 사용 시나리오 (채널톡 연동)

```typescript
// app/layout.tsx - 전역에서 SSE 연결 유지
'use client';

import { useSSE } from '@/hooks/useSSE';
import { useEffect } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { messages, isConnected } = useSSE({
    url: process.env.NEXT_PUBLIC_SSE_URL!,
    clientId: typeof window !== 'undefined' ? localStorage.getItem('userId') : undefined,
    autoConnect: true,
  });

  useEffect(() => {
    // 메시지 수신 시 처리
    messages.forEach((msg) => {
      if (msg.type === 'redirect') {
        // 리다이렉트 처리
      } else if (msg.type === 'notification') {
        // 알림 표시
        alert(msg.message);
      }
    });
  }, [messages]);

  return (
    <html lang="ko">
      <body>
        {/* 연결 상태 표시 */}
        <div className="fixed top-4 right-4 z-50">
          {isConnected ? (
            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm">
              🟢 실시간 연결됨
            </div>
          ) : (
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
              🔴 연결 끊김
            </div>
          )}
        </div>
        {children}
      </body>
    </html>
  );
}
```

## 🛡️ 6. 에러 처리 및 재연결

```typescript
// hooks/useSSE.ts - 개선된 버전
export function useSSE({ url, clientId, autoConnect = true, retryDelay = 3000 }: UseSSEOptions) {
  const [reconnectCount, setReconnectCount] = useState(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) return;

    const id = clientId || `client-${Date.now()}`;
    const eventSource = new EventSource(`${url}?clientId=${id}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      setReconnectCount(0); // 재연결 성공 시 카운트 리셋
    };

    eventSource.onerror = (err) => {
      setIsConnected(false);
      setError('연결 오류');
      
      // EventSource는 자동으로 재연결을 시도하지만,
      // 완전히 실패한 경우 수동으로 재시도
      if (eventSource.readyState === EventSource.CLOSED) {
        disconnect();
        
        // 재연결 시도
        retryTimeoutRef.current = setTimeout(() => {
          console.log('🔄 재연결 시도...', reconnectCount + 1);
          setReconnectCount((prev) => prev + 1);
          connect();
        }, retryDelay);
      }
    };

    // ... 나머지 코드
  }, [url, clientId, retryDelay, reconnectCount]);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    messages,
    isConnected,
    error,
    reconnectCount,
    connect,
    disconnect,
    clearMessages,
  };
}
```

## 📱 7. 모바일/탭 변경 대응

```typescript
// hooks/useSSE.ts에 추가
useEffect(() => {
  // 탭이 다시 활성화될 때 연결 확인
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      console.log('👀 탭 활성화 - 연결 확인');
      if (!isConnected && autoConnect) {
        connect();
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [isConnected, autoConnect, connect]);
```

## 🚀 빠른 시작

1. **훅 생성**: `hooks/useSSE.ts` 파일 생성
2. **컴포넌트에서 사용**:
   ```typescript
   const { messages, isConnected } = useSSE({
     url: 'http://localhost:3090/sse/connect',
   });
   ```
3. **메시지 렌더링**: `messages.map()` 사용
4. **완료!** 🎉

## 💡 핵심 포인트

1. ✅ **useEffect 클린업**: 컴포넌트 언마운트 시 `eventSource.close()` 필수
2. ✅ **중복 연결 방지**: `useRef`로 EventSource 인스턴스 관리
3. ✅ **상태 관리**: `useState`로 연결 상태, 메시지 관리
4. ✅ **재사용성**: 커스텀 훅으로 여러 컴포넌트에서 재사용
5. ✅ **타입 안전성**: TypeScript로 타입 정의

## 🎯 채널톡 리다이렉트 시나리오

```
1. Next.js 앱 로드 → useSSE 훅으로 SSE 연결
2. 사용자가 채널톡 대화
3. 채널톡 ALF → 서버 → SSE 브로드캐스트
4. Next.js에서 수신 → window.location.href = url
5. 페이지 리다이렉트! ✨
```

