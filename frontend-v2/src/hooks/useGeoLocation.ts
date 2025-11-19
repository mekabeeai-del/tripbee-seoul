/**
 * GPS 위치 추적 및 보정 Hook
 * - 빠른 초기 위치 (캐시 허용)
 * - watchPosition으로 실시간 추적
 * - 칼만 필터로 떨림 보정
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface KalmanFilter {
  latitude: number;
  longitude: number;
  variance: number;
}

export function useGeoLocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const kalmanRef = useRef<KalmanFilter | null>(null);

  // 칼만 필터 초기화
  const initKalman = (lat: number, lng: number, accuracy: number) => {
    kalmanRef.current = {
      latitude: lat,
      longitude: lng,
      variance: accuracy * accuracy
    };
  };

  // 칼만 필터 업데이트
  const updateKalman = (lat: number, lng: number, accuracy: number): { lat: number; lng: number } => {
    if (!kalmanRef.current) {
      initKalman(lat, lng, accuracy);
      return { lat, lng };
    }

    const kalman = kalmanRef.current;
    const measurementVariance = accuracy * accuracy;

    // 칼만 게인 계산
    const kalmanGain = kalman.variance / (kalman.variance + measurementVariance);

    // 상태 업데이트
    kalman.latitude = kalman.latitude + kalmanGain * (lat - kalman.latitude);
    kalman.longitude = kalman.longitude + kalmanGain * (lng - kalman.longitude);

    // 분산 업데이트
    kalman.variance = (1 - kalmanGain) * kalman.variance;

    return {
      lat: kalman.latitude,
      lng: kalman.longitude
    };
  };

  // 위치 추적 시작
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('위치 서비스를 지원하지 않는 브라우저예요.');
      return;
    }

    setIsTracking(true);
    setError(null);

    console.log('[GPS] 위치 추적 시작...');

    // 1단계: 빠른 초기 위치 (캐시 허용)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        console.log(`[GPS] 초기 위치: ${latitude}, ${longitude} (정확도: ${accuracy}m)`);

        initKalman(latitude, longitude, accuracy);

        setPosition({
          latitude,
          longitude,
          accuracy,
          timestamp: pos.timestamp
        });
      },
      (err) => {
        console.warn('[GPS] 초기 위치 실패:', err.message);
      },
      {
        enableHighAccuracy: false, // 빠른 위치 우선
        timeout: 5000,
        maximumAge: 30000 // 30초 이내 캐시 허용
      }
    );

    // 2단계: watchPosition으로 실시간 추적
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        console.log(`[GPS] 위치 업데이트: ${latitude}, ${longitude} (정확도: ${accuracy}m)`);

        // 3단계: 칼만 필터 적용
        const filtered = updateKalman(latitude, longitude, accuracy);

        setPosition({
          latitude: filtered.lat,
          longitude: filtered.lng,
          accuracy,
          timestamp: pos.timestamp
        });
      },
      (err) => {
        console.error('[GPS] 위치 추적 에러:', err.message);
        let errorMessage = '';

        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = '위치 권한을 허용해주세요! 🔒';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'GPS 신호를 받을 수 없어요. 야외로 나가보세요! 🛰️';
            break;
          case err.TIMEOUT:
            errorMessage = '위치 찾기 시간이 초과되었어요. ⏱️';
            break;
        }

        setError(errorMessage);
      },
      {
        enableHighAccuracy: true,  // 정확한 GPS 사용
        timeout: 30000,            // 30초 타임아웃
        maximumAge: 0              // 실시간 위치만
      }
    );
  }, []);

  // 위치 추적 중지
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      console.log('[GPS] 위치 추적 중지');
    }
    setIsTracking(false);
    kalmanRef.current = null;
  }, []);

  // 컴포넌트 언마운트 시 추적 중지
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    position,
    isTracking,
    error,
    startTracking,
    stopTracking
  };
}
