import { useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

interface UseDiscoveryModeProps {
  map: React.MutableRefObject<mapboxgl.Map | null>;
  position: { latitude: number; longitude: number } | null;
  onMessage?: (message: string) => void;
}

interface UseDiscoveryModeReturn {
  isDiscovering: boolean;
  toggleDiscovery: () => void;
}

/**
 * 발견모드 상태 관리 훅
 * - 발견모드 토글
 * - 500m 반경에 맞춰 지도 줌 조정
 * - 비티 버블 메시지 표시
 */
export function useDiscoveryMode({
  map,
  position,
  onMessage
}: UseDiscoveryModeProps): UseDiscoveryModeReturn {
  const [isDiscovering, setIsDiscovering] = useState(false);

  const toggleDiscovery = useCallback(() => {
    if (isDiscovering) {
      // 발견모드 종료
      setIsDiscovering(false);
      onMessage?.('발견모드를 종료했어요!');
    } else {
      // 발견모드 시작
      setIsDiscovering(true);
      onMessage?.('상황에 맞는 장소를 찾고 있어요!');

      // 현재 위치로 이동하고 500m 반경에 맞게 줌 조정
      if (map.current && position) {
        map.current.flyTo({
          center: [position.longitude, position.latitude],
          zoom: 15.5, // 약 500m 반경
          duration: 1000
        });
      }
    }
  }, [isDiscovering, map, position, onMessage]);

  return {
    isDiscovering,
    toggleDiscovery
  };
}
