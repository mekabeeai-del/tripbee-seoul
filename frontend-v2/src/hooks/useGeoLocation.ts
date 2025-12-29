/**
 * GPS 위치 Hook - 심플 버전
 * 현재 위치 한 번 가져오기
 */

import { useState, useCallback } from 'react';

interface GeoPosition {
  latitude: number;
  longitude: number;
}

export function useGeoLocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 현재 위치 가져오기
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('위치 서비스를 지원하지 않는 브라우저예요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
        setIsLoading(false);
      },
      (err) => {
        let errorMessage = '';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = '위치 권한을 허용해주세요! 🔒';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'GPS 신호를 받을 수 없어요. 🛰️';
            break;
          case err.TIMEOUT:
            errorMessage = '위치 찾기 시간이 초과되었어요. ⏱️';
            break;
        }
        setError(errorMessage);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,   // GPS 위성 사용 (정확)
        timeout: 10000,
        maximumAge: 0               // 항상 새 위치
      }
    );
  }, []);

  return {
    position,
    isLoading,
    error,
    getLocation
  };
}
