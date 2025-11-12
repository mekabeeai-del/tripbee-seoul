import { useState, useEffect } from 'react';
import './POIButton.css';

interface POIButtonProps {
  name: string;
  imageUrl: string;
  lat: number;
  lng: number;
  isPaused?: boolean;
  onClick?: () => void;
}

// 더미 이미지 목록 (실제로는 API에서 가져올 수 있음)
const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1524850011238-e3d235c7d4c9?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1565098772267-60af42b81ef2?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=300&fit=crop'
];

export default function POIButton({ name, isPaused = false, onClick }: POIButtonProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // 10초 타이머 (isPaused가 true면 멈춤, false면 다시 시작)
  useEffect(() => {
    if (isPaused) {
      return; // 상세 패널 열려있으면 타이머 멈춤
    }

    // 패널 닫히면 타이머 다시 시작
    const interval = setInterval(() => {
      setIsAnimating(true);

      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev + 1) % SAMPLE_IMAGES.length);
        setIsAnimating(false);
      }, 500); // 애니메이션 중간에 이미지 변경
    }, 10000); // 10초마다

    return () => {
      clearInterval(interval);
    };
  }, [isPaused]);

  return (
    <div className="poi-button-circle" onClick={onClick} style={{ cursor: 'pointer' }}>
      <img
        src={SAMPLE_IMAGES[currentImageIndex]}
        alt={name}
        className={isAnimating ? 'poi-image-animating' : ''}
      />
    </div>
  );
}
