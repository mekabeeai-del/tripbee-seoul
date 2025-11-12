import { useState, useEffect, useRef } from 'react';
import './BeatyBubble.css';

interface BeatyBubbleProps {
  message: string;
  variant: 'floating' | 'panel';
  isVisible?: boolean;
  onClose?: () => void;
  autoHide?: boolean;
  backgroundColor?: string;
}

export default function BeatyBubble({
  message,
  variant,
  isVisible = true,
  onClose,
  autoHide = true,
  backgroundColor
}: BeatyBubbleProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isVisible && message) {
      // 이전 타이머가 있다면 클리어
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }

      setDisplayedText('');
      let currentIndex = 0;

      const interval = setInterval(() => {
        if (currentIndex < message.length) {
          setDisplayedText(message.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
          // floating variant이고 autoHide가 true면 10초 뒤 자동으로 사라짐
          if (variant === 'floating' && autoHide) {
            autoHideTimerRef.current = setTimeout(() => {
              handleClose();
            }, 10000);
          }
        }
      }, 50); // 50ms마다 한 글자씩

      return () => {
        clearInterval(interval);
        // 컴포넌트 언마운트 시 타이머도 클리어
        if (autoHideTimerRef.current) {
          clearTimeout(autoHideTimerRef.current);
        }
      };
    }
  }, [isVisible, message, variant, autoHide]);

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
        <div className="beaty-panel-bubble">
          {displayedText.split('\n').map((line, index) => (
            <span key={index}>
              {line}
              {index < displayedText.split('\n').length - 1 && <br />}
            </span>
          ))}
          {displayedText.length < message.length && (
            <span className="beaty-cursor">|</span>
          )}
        </div>
      </div>
    );
  }

  // Floating variant
  return (
    <div className={`beaty-floating ${isClosing ? 'closing' : ''}`}>
      <div className="beaty-floating-bubble">
        <div className="beaty-floating-text">
          {displayedText}
          {displayedText.length < message.length && (
            <span className="beaty-cursor">|</span>
          )}
        </div>
      </div>
      <div className="beaty-floating-avatar">
        <img src="/img/beaty/beaty_float.png" alt="Beaty" />
      </div>
    </div>
  );
}
