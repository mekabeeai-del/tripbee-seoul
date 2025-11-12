/**
 * Beaty 플로팅 UI (버튼 + 말풍선)
 */

import React from 'react';
import BeatyBubble from './BeatyBubble';
import BeatyButton from './BeatyButton';
import type { RandomPoi, BubbleType } from './BeatyBubble';

interface BeatyFloatingProps {
  // 표시 여부
  show: boolean;

  // 말풍선 관련
  isBubbleOpen: boolean;
  bubbleType: BubbleType;
  bubbleMessage?: string;
  randomPoi?: RandomPoi | null;
  isLoadingPoi?: boolean;

  // 스트리밍 관련
  streamingText?: string;
  isStreaming?: boolean;

  // 이벤트 핸들러
  onBeatyClick: () => void;
  onPoiClick?: () => void;
  onQuickSearch?: (query: string) => void;
}

const BeatyFloating: React.FC<BeatyFloatingProps> = ({
  show,
  isBubbleOpen,
  bubbleType,
  bubbleMessage,
  randomPoi,
  isLoadingPoi,
  onBeatyClick,
  onPoiClick,
  onQuickSearch,
  streamingText,
  isStreaming
}) => {
  console.log('[BeatyFloating] Render - show:', show, 'isBubbleOpen:', isBubbleOpen, 'isStreaming:', isStreaming, 'streamingText length:', streamingText?.length);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      right: '24px',
      bottom: '24px',
      zIndex: 1500,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '12px',
      animation: 'bounce 2s ease-in-out infinite'
    }}>
      {/* 비티 말풍선 */}
      <BeatyBubble
        isOpen={isBubbleOpen}
        type={bubbleType}
        message={bubbleMessage}
        randomPoi={randomPoi}
        isLoadingPoi={isLoadingPoi}
        onPoiClick={onPoiClick}
        onQuickSearch={onQuickSearch}
        streamingText={streamingText}
        isStreaming={isStreaming}
      />

      {/* 비티 플로팅 버튼 */}
      <BeatyButton onClick={onBeatyClick} />
    </div>
  );
};

export default BeatyFloating;
