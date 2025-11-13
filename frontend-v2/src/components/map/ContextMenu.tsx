import { useEffect, useState } from 'react';
import './ContextMenu.css';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAction: () => void;
  onEmotionTag?: (emotion: string) => void;
}

const emotionEmojis = [
  { id: 'love', emoji: '❤️', label: '사랑해요' },
  { id: 'happy', emoji: '😊', label: '행복해요' },
  { id: 'excited', emoji: '🤩', label: '신나요' },
  { id: 'delicious', emoji: '😋', label: '맛있어요' },
  { id: 'photo', emoji: '📸', label: '사진명소' },
  { id: 'peaceful', emoji: '😌', label: '평화로워요' },
  { id: 'cool', emoji: '😎', label: '멋져요' },
  { id: 'fun', emoji: '🎉', label: '재밌어요' },
];

export default function ContextMenu({ x, y, onClose, onAction, onEmotionTag }: ContextMenuProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 애니메이션을 위해 약간의 딜레이
    setTimeout(() => setIsVisible(true), 10);

    // 배경 클릭 시 닫기
    const handleClick = (e: MouseEvent) => {
      // 비티 버튼과 이모지 버튼 클릭은 제외
      const target = e.target as HTMLElement;
      if (!target.closest('.context-menu-beaty') && !target.closest('.context-menu-emotion')) {
        onClose();
      }
    };

    // 약간의 딜레이 후 이벤트 등록 (버튼 클릭과 충돌 방지)
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick);
    };
  }, [onClose]);

  const handleBeatyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAction();
    onClose();
  };

  const handleEmotionClick = (e: React.MouseEvent, emotionId: string) => {
    e.stopPropagation();
    onEmotionTag?.(emotionId);
    onClose();
  };

  // 원형 배치 계산
  const getEmotionPosition = (index: number, total: number) => {
    const radius = 60; // 중심에서의 거리 (90 -> 60으로 축소)
    const startAngle = -90; // 위쪽부터 시작
    const angle = (startAngle + (360 / total) * index) * (Math.PI / 180);

    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  return (
    <>
      {/* 중앙 비티 버튼 */}
      <button
        className={`context-menu-beaty ${isVisible ? 'visible' : ''}`}
        style={{
          left: `${x}px`,
          top: `${y}px`,
        }}
        onClick={handleBeatyClick}
      >
        <img src="/img/beaty/beaty_float.png" alt="비티" />
      </button>

      {/* 주변 이모션 이모지들 */}
      {emotionEmojis.map((emotion, index) => {
        const pos = getEmotionPosition(index, emotionEmojis.length);
        return (
          <button
            key={emotion.id}
            className={`context-menu-emotion ${isVisible ? 'visible' : ''}`}
            style={{
              left: `${x + pos.x}px`,
              top: `${y + pos.y}px`,
              transitionDelay: `${index * 50}ms`,
            }}
            onClick={(e) => handleEmotionClick(e, emotion.id)}
            title={emotion.label}
          >
            <span className="context-menu-emotion-emoji">{emotion.emoji}</span>
          </button>
        );
      })}
    </>
  );
}
