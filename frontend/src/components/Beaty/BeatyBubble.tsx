/**
 * Beaty 말풍선 컴포넌트
 * 인사말, POI 추천, 응답 메시지를 표시
 */

import React, { useRef, useEffect } from 'react';

export interface RandomPoi {
  content_id: string;
  title: string;
  addr1: string;
  mapx: number;
  mapy: number;
  first_image: string | null;
  overview: string;
  beaty_description: string;
}

export type BubbleType = 'greeting' | 'poi' | 'response';

interface BeatyBubbleProps {
  isOpen: boolean;
  type: BubbleType;
  message?: string;
  randomPoi?: RandomPoi | null;
  isLoadingPoi?: boolean;
  onPoiClick?: () => void;
  onQuickSearch?: (query: string) => void;
  streamingText?: string;
  isStreaming?: boolean;
}

const BeatyBubble: React.FC<BeatyBubbleProps> = ({
  isOpen,
  type,
  message = '',
  randomPoi = null,
  isLoadingPoi = false,
  onPoiClick,
  onQuickSearch,
  streamingText = '',
  isStreaming = false
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [showButtons, setShowButtons] = React.useState(false);

  // 스트리밍 중일 때 직접 DOM 업데이트
  useEffect(() => {
    if (isStreaming && textRef.current) {
      textRef.current.textContent = streamingText;
    }
  }, [streamingText, isStreaming]);

  // greeting 타입이고 스트리밍이 끝났을 때 버튼 표시
  useEffect(() => {
    if (type === 'greeting' && !isStreaming && isOpen) {
      // 스트리밍 완료 후 0.3초 딜레이
      const timer = setTimeout(() => {
        setShowButtons(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setShowButtons(false);
    }
  }, [type, isStreaming, isOpen]);

  if (!isOpen) return null;

  // 표시할 텍스트: 스트리밍 중이면 streamingText, 아니면 message
  const displayText = isStreaming ? streamingText : message;

  console.log('[BeatyBubble] Render - isStreaming:', isStreaming, 'streamingText:', streamingText, 'displayText:', displayText);

  return (
    <div style={{ maxWidth: '380px' }}>
      {/* 비티 인사 말풍선 */}
      <div style={{
        backgroundColor: 'white',
        padding: '18px 22px',
        borderRadius: '20px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        position: 'relative'
      }}>
        {/* 스트리밍 텍스트 표시 (모든 타입 공통) */}
        {isStreaming ? (
          <div style={{
            fontSize: '13px',
            lineHeight: '1.6',
            color: '#333',
            marginBottom: type === 'greeting' ? '14px' : '0px',
            wordBreak: 'keep-all',
            whiteSpace: 'pre-wrap'
          }}>
            <span ref={textRef}>{displayText}</span>
            <span style={{ animation: 'blink 1s infinite' }}>▋</span>
          </div>
        ) : type === 'greeting' ? (
          <div style={{
            fontSize: '13px',
            lineHeight: '1.5',
            color: '#333',
            marginBottom: '14px',
            whiteSpace: 'pre-wrap'
          }}>
            {message || '안녕하세요! 저는 서울여행을 도와줄 비티에요!\n어떤 여행을 하고 싶나요?'}
          </div>
        ) : type === 'response' ? (
          <div style={{
            fontSize: '13px',
            lineHeight: '1.6',
            color: '#333',
            marginBottom: '14px',
            wordBreak: 'keep-all'
          }}>
            {message}
          </div>
        ) : (
          <>
            {/* POI 소개 */}
            <div style={{ marginBottom: '14px' }}>
              {isLoadingPoi ? (
                <div style={{
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: '#666',
                  textAlign: 'center',
                  padding: '10px 0'
                }}>
                  🐝 새로운 장소를 찾고 있어요...
                </div>
              ) : randomPoi ? (
                <div style={{
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: '#333',
                  wordBreak: 'keep-all'
                }}>
                  {/* beaty_description에서 POI명을 하이라이트 */}
                  {randomPoi.beaty_description.split(randomPoi.title).map((part, idx, arr) => (
                    <span key={idx}>
                      {part}
                      {idx < arr.length - 1 && (
                        <strong
                          onClick={onPoiClick}
                          style={{
                            color: '#FF6B9D',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          {randomPoi.title}
                        </strong>
                      )}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        )}

        {/* 빠른 선택 버튼들 - 스트리밍 완료 후 애니메이션과 함께 표시 */}
        {type === 'greeting' && showButtons && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '8px',
            animation: 'fadeInUp 0.5s ease-out'
          }}>
            {[
              { icon: '🍽️', label: '맛집', query: '서울 맛집 추천해줘', color: '#7C4DFF' },
              { icon: '🏛️', label: '관광지', query: '서울 관광지 추천해줘', color: '#5C6BC0' },
              { icon: '🏖️', label: '쇼핑', query: '서울 쇼핑하기 좋은 곳 추천해줘', color: '#42A5F5' }
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => onQuickSearch?.(item.query)}
                style={{
                  flex: 1,
                  minWidth: '105px',
                  padding: '10px 16px',
                  backgroundColor: 'white',
                  border: `1.5px solid ${item.color}`,
                  borderRadius: '18px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  opacity: 0,
                  animation: `fadeInUp 0.4s ease-out ${0.1 * idx}s forwards`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.backgroundColor = item.color;
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.color = item.color;
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* 말풍선 꼬리 - 오른쪽 아래를 가리킴 */}
        <div style={{
          position: 'absolute',
          bottom: '-8px',
          right: '30px',
          width: '0',
          height: '0',
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: '10px solid white',
          filter: 'drop-shadow(0 2px 2px rgba(0, 0, 0, 0.05))'
        }}></div>
      </div>
    </div>
  );
};

export default BeatyBubble;
