import { useState, useEffect } from 'react';
import './StreamingText.css';

interface HighlightConfig {
  text: string;
  color: string;
}

interface StreamingTextProps {
  text: string;
  speed?: number; // ms per character
  showCursor?: boolean;
  onComplete?: () => void;
  className?: string;
  enabled?: boolean; // 스트리밍 효과 활성화 여부
  highlights?: HighlightConfig[]; // 강조할 텍스트와 색상 배열
}

export default function StreamingText({
  text,
  speed = 50,
  showCursor = false,
  onComplete,
  className = '',
  enabled = true,
  highlights = []
}: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!enabled) {
      // 스트리밍 비활성화 시 전체 텍스트 즉시 표시
      setDisplayedText(text);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    // text가 바뀔 때마다 리셋
    setDisplayedText('');
    setIsComplete(false);
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, enabled]);

  // 하이라이트 적용 함수
  const renderTextWithHighlights = (text: string) => {
    if (highlights.length === 0) {
      return text;
    }

    let result: React.ReactNode[] = [];
    let lastIndex = 0;

    // 모든 하이라이트를 찾아서 적용
    highlights.forEach((highlight, idx) => {
      const index = text.indexOf(highlight.text, lastIndex);
      if (index !== -1) {
        // 하이라이트 이전 텍스트
        if (index > lastIndex) {
          result.push(text.substring(lastIndex, index));
        }
        // 하이라이트된 텍스트
        result.push(
          <span key={`highlight-${idx}`} style={{ color: highlight.color }}>
            {highlight.text}
          </span>
        );
        lastIndex = index + highlight.text.length;
      }
    });

    // 나머지 텍스트
    if (lastIndex < text.length) {
      result.push(text.substring(lastIndex));
    }

    return result;
  };

  return (
    <span className={`streaming-text ${className}`}>
      {renderTextWithHighlights(displayedText)}
      {showCursor && !isComplete && <span className="streaming-cursor">|</span>}
    </span>
  );
}
