import { useState } from 'react';
import { MdExplore } from 'react-icons/md';
import './CompassButton.css';

interface CompassButtonProps {
  onClick: () => void;
  color?: 'blue' | 'green';
}

export default function CompassButton({ onClick, color = 'blue' }: CompassButtonProps) {
  const [isSpinning, setIsSpinning] = useState(false);

  const handleClick = () => {
    setIsSpinning(true);
    setTimeout(() => setIsSpinning(false), 2500);
    onClick();
  };

  return (
    <div className="compass-container">
      <button
        className={`compass-button highlighted ${color} ${isSpinning ? 'spinning' : ''}`}
        onClick={handleClick}
      >
        <MdExplore size={40} />
      </button>
    </div>
  );
}
