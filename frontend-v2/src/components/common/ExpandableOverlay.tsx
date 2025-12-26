import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import './ExpandableOverlay.css';

interface ExpandableOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onClosing?: (isClosing: boolean) => void;
  expandFrom?: { x: number; y: number } | null;
  children: ReactNode;
  className?: string;
}

/**
 * 클릭 위치에서 원형으로 확장되는 오버레이 컴포넌트
 * - expandFrom: 확장 시작 좌표 (없으면 화면 중앙에서 시작)
 * - 닫힐 때 같은 위치로 축소
 */
export default function ExpandableOverlay({
  isOpen,
  onClose,
  onClosing,
  expandFrom,
  children,
  className = ''
}: ExpandableOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsClosing(false);
      onClosing?.(false);
    } else if (isVisible) {
      setIsClosing(true);
      onClosing?.(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
        onClosing?.(false);
      }, 800);
    }
  }, [isOpen, isVisible]);

  if (!isVisible) return null;

  const overlayStyle = expandFrom ? {
    '--trigger-x': `${expandFrom.x}px`,
    '--trigger-y': `${expandFrom.y}px`
  } as React.CSSProperties : undefined;

  return (
    <div
      className={`expandable-overlay ${isClosing ? 'closing' : ''} ${className}`}
      style={overlayStyle}
    >
      <div className="expandable-overlay-background" onClick={onClose} />
      <div className="expandable-overlay-content">
        {children}
      </div>
    </div>
  );
}
