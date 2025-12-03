import { useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import './BeatyOffScreenIndicator.css';

interface OffScreenState {
  visible: boolean;
  x: number;
  y: number;
  angle: number;
}

interface BeatyOffScreenIndicatorProps {
  map: mapboxgl.Map | null;
  position: { latitude: number; longitude: number } | null;
  onClick?: () => void;
}

// 컴포넌트 외부에 상수로 정의 (매 렌더링마다 새 객체 생성 방지)
const SAFE_AREA = {
  top: 120,      // 상단 UI (프로필, 날씨 등)
  bottom: 200,   // 하단 UI (채팅바, 버튼들)
  left: 40,
  right: 40
} as const;

/**
 * 비티 마커 화면 밖 표시 컴포넌트
 * - 비티 마커가 화면 밖에 있을 때 가장자리에 인디케이터 표시
 * - 클릭 시 해당 위치로 이동
 */
function BeatyOffScreenIndicator({
  map,
  position,
  onClick
}: BeatyOffScreenIndicatorProps) {
  const [offScreen, setOffScreen] = useState<OffScreenState>({
    visible: false,
    x: 0,
    y: 0,
    angle: 0
  });

  const checkOffScreen = useCallback(() => {
    if (!map || !position) return;

    const { latitude, longitude } = position;
    const point = map.project([longitude, latitude]);
    const canvas = map.getCanvas();
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;

    const isOffScreen =
      point.x < 0 || point.x > width ||
      point.y < 0 || point.y > height;

    if (isOffScreen) {
      // 안전 영역 중심에서 마커 방향 계산
      const safeWidth = width - SAFE_AREA.left - SAFE_AREA.right;
      const safeHeight = height - SAFE_AREA.top - SAFE_AREA.bottom;
      const centerX = SAFE_AREA.left + safeWidth / 2;
      const centerY = SAFE_AREA.top + safeHeight / 2;

      const angle = Math.atan2(point.y - centerY, point.x - centerX);
      const angleDeg = angle * (180 / Math.PI);

      // 안전 영역 가장자리 위치 계산
      const maxDistX = safeWidth / 2 - 40;
      const maxDistY = safeHeight / 2 - 40;

      let edgeX = centerX + Math.cos(angle) * maxDistX;
      let edgeY = centerY + Math.sin(angle) * maxDistY;

      // 안전 영역 범위 내로 클램핑
      edgeX = Math.max(SAFE_AREA.left + 40, Math.min(width - SAFE_AREA.right - 40, edgeX));
      edgeY = Math.max(SAFE_AREA.top + 40, Math.min(height - SAFE_AREA.bottom - 40, edgeY));

      setOffScreen({
        visible: true,
        x: edgeX,
        y: edgeY,
        angle: angleDeg
      });
    } else {
      setOffScreen(prev => prev.visible ? { ...prev, visible: false } : prev);
    }
  }, [map, position]);

  useEffect(() => {
    if (!map || !position) return;

    // 초기 체크
    checkOffScreen();

    // 지도 이동 시 체크
    map.on('move', checkOffScreen);

    return () => {
      map.off('move', checkOffScreen);
    };
  }, [map, position, checkOffScreen]);

  if (!offScreen.visible) return null;

  return (
    <div
      className="beaty-offscreen-indicator"
      onClick={onClick}
      style={{
        left: offScreen.x,
        top: offScreen.y
      }}
    >
      {/* 화살표 (비티 주변에서 뾰족하게) */}
      <div
        className="beaty-offscreen-arrow"
        style={{
          transform: `translate(-50%, -100%) rotate(${offScreen.angle + 90}deg) translateY(-20px)`
        }}
      />
      {/* 비티 이미지 (동그란 배경) */}
      <div className="beaty-offscreen-circle">
        <div className="beaty-offscreen-image" />
      </div>
    </div>
  );
}

export default BeatyOffScreenIndicator;
