import { useState, useEffect, useRef } from 'react';
import StreamingText from '../common/StreamingText';
import './BeatyBubble.css';

interface BeatyBubbleProps {
  message: string;
  variant: 'floating' | 'panel';
  isVisible?: boolean;
  onClose?: () => void;
  autoHide?: boolean;
  backgroundColor?: string;
  bubbleColor?: string; // 말풍선 색깔
}

export default function BeatyBubble({
  message,
  variant,
  isVisible = true,
  onClose,
  autoHide = true,
  backgroundColor,
  bubbleColor = '#FFF8DC' // 기본값: 연한 노란색
}: BeatyBubbleProps) {
  const [isClosing, setIsClosing] = useState(false);
  const autoHideTimerRef = useRef<number | null>(null);

  // message가 바뀔 때마다 기존 타이머 클리어
  useEffect(() => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
  }, [message]);

  // 컴포넌트 언마운트 시 타이머 클리어
  useEffect(() => {
    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
  }, []);

  const handleStreamingComplete = () => {
    // 이전 타이머가 있으면 먼저 클리어
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }

    // floating variant이고 autoHide가 true면 10초 뒤 자동으로 사라짐
    if (variant === 'floating' && autoHide) {
      autoHideTimerRef.current = setTimeout(() => {
        handleClose();
      }, 10000);
    }
  };

  const handleClose = () => {
    if (variant === 'floating') {
      setIsClosing(true);
      setTimeout(() => {
        setIsClosing(false);
        onClose?.();
      }, 300);
    }
  };

  if (variant === 'floating' && !isVisible && !isClosing) return null;

  // Panel variant
  if (variant === 'panel') {
    return (
      <div className="beaty-panel-section" style={{ backgroundColor }}>
        <div className="beaty-panel-avatar">
          <img src="/img/beaty/beaty_float.png" alt="Beaty" />
        </div>
        <div className="beaty-panel-bubble" style={{ backgroundColor: bubbleColor }}>
          <div
            className="beaty-panel-bubble-tail"
            style={{ borderRightColor: bubbleColor }}
          />
          <StreamingText
            text={message}
            speed={50}
            showCursor={true}
            enabled={isVisible}
            onComplete={handleStreamingComplete}
          />
        </div>
      </div>
    );
  }

  // Floating variant
  return (
    <div className={`beaty-floating ${isClosing ? 'closing' : ''}`}>
      <div className="beaty-floating-bubble" style={{ backgroundColor: bubbleColor }}>
        <div
          className="beaty-floating-bubble-tail"
          style={{ borderLeftColor: bubbleColor }}
        />
        <div className="beaty-floating-text">
          <StreamingText
            text={message}
            speed={50}
            showCursor={true}
            enabled={isVisible && !isClosing}
            onComplete={handleStreamingComplete}
          />
        </div>
      </div>
      <div className="beaty-floating-avatar">
        <img src="/img/beaty/beaty_float.png" alt="Beaty" />
      </div>
    </div>
  );
}
