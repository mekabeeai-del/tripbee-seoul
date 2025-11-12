const BEATY_API_URL = 'http://localhost:8000';

export interface UserLocation {
  lat: number;
  lng: number;
}

export interface BeatyRequest {
  query: string;
  user_location?: UserLocation;
  mode?: 'real' | 'test';
}

export interface BeatyResponse {
  intent: string;
  answer: string;
  data: any;
  steps?: any[];
  final_response?: any;
}

// SSE 이벤트 타입
export interface SSEDataEvent {
  type: 'data';
  intent: string;
  pois?: any[];
  places?: any[];
  routes?: any[];
  poi?: any;
  count?: number;
  search_keyword?: string;
  steps?: any[];
}

export interface SSEChunkEvent {
  type: 'chunk';
  text: string;
}

export interface SSEDoneEvent {
  type: 'done';
}

export interface SSEErrorEvent {
  type: 'error';
  message: string;
}

export type SSEEvent = SSEDataEvent | SSEChunkEvent | SSEDoneEvent | SSEErrorEvent;

// SSE 콜백 인터페이스
export interface BeatyStreamCallbacks {
  onData?: (event: SSEDataEvent) => void;
  onChunk?: (event: SSEChunkEvent) => void;
  onDone?: (event: SSEDoneEvent) => void;
  onError?: (error: string) => void;
}

/**
 * SSE 기반 스트리밍 쿼리
 */
export const queryBeatyStream = async (
  query: string,
  callbacks: BeatyStreamCallbacks,
  userLocation?: UserLocation,
  mode: 'real' | 'test' = 'real'
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // 세션 토큰 가져오기
      const sessionToken = localStorage.getItem('session_token');

      // POST 요청을 위해 fetch 사용 (EventSource는 GET만 지원)
      const body = JSON.stringify({
        query,
        user_location: userLocation,
        mode
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }

      fetch(`${BEATY_API_URL}/api/query`, {
        method: 'POST',
        headers,
        body
      }).then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('Response body is not readable');
        }

        const processStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                resolve();
                break;
              }

              // 청크 디코딩
              const chunk = decoder.decode(value, { stream: true });

              // SSE 형식 파싱 (data: {...}\n\n)
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const jsonStr = line.substring(6);
                  try {
                    const event = JSON.parse(jsonStr) as SSEEvent;

                    console.log('[beatyApi] Received event:', event);
                    switch (event.type) {
                      case 'data':
                        console.log('[beatyApi] Calling onData callback');
                        callbacks.onData?.(event);
                        break;
                      case 'chunk':
                        console.log('[beatyApi] Calling onChunk callback with text:', event.text);
                        callbacks.onChunk?.(event);
                        break;
                      case 'done':
                        console.log('[beatyApi] Calling onDone callback');
                        callbacks.onDone?.(event);
                        resolve();
                        return;
                      case 'error':
                        console.log('[beatyApi] Calling onError callback');
                        callbacks.onError?.(event.message);
                        reject(new Error(event.message));
                        return;
                    }
                  } catch (parseError) {
                    console.error('Failed to parse SSE event:', jsonStr, parseError);
                  }
                }
              }
            }
          } catch (streamError) {
            console.error('Stream processing error:', streamError);
            callbacks.onError?.(String(streamError));
            reject(streamError);
          }
        };

        processStream();
      }).catch(error => {
        console.error('Fetch error:', error);
        callbacks.onError?.(String(error));
        reject(error);
      });
    } catch (error) {
      console.error('Beaty Stream API error:', error);
      callbacks.onError?.(String(error));
      reject(error);
    }
  });
};

export type { BeatyResponse, BeatyRequest, UserLocation };
