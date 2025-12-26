import { useState, useEffect, useRef } from 'react';
import { MdExplore } from 'react-icons/md';
import './CompassButton.css';

interface CompassButtonProps {
  isDiscovering: boolean;
  onToggle: () => void;
  color?: 'blue' | 'green';
}

export default function CompassButton({ isDiscovering, onToggle, color = 'blue' }: CompassButtonProps) {
  const [isExiting, setIsExiting] = useState(false);
  const prevDiscovering = useRef(isDiscovering);

  useEffect(() => {
    // 발견모드가 true → false로 바뀔 때 종료 애니메이션
    if (prevDiscovering.current && !isDiscovering) {
      setIsExiting(true);
      const timer = setTimeout(() => setIsExiting(false), 300);
      return () => clearTimeout(timer);
    }
    prevDiscovering.current = isDiscovering;
  }, [isDiscovering]);

  const getButtonClass = () => {
    if (isDiscovering) return 'discovering';
    if (isExiting) return 'exiting';
    return 'highlighted';
  };

  return (
    <div className="compass-container">
      <button
        className={`compass-button ${color} ${getButtonClass()}`}
        onClick={onToggle}
      >
        <MdExplore size={40} />
      </button>
    </div>
  );
}
