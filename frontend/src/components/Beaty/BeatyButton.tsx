/**
 * Beaty 플로팅 버튼 컴포넌트
 */

import React from 'react';

interface BeatyButtonProps {
  onClick: () => void;
}

const BeatyButton: React.FC<BeatyButtonProps> = ({ onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        width: '70px',
        height: '70px',
        borderRadius: '50%',
        backgroundColor: '#6B5FCD',
        boxShadow: '0 6px 20px rgba(107, 95, 205, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '36px',
        cursor: 'pointer',
        transition: 'transform 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      ☀️
    </div>
  );
};

export default BeatyButton;
