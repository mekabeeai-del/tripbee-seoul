import { useState, useEffect, useCallback } from 'react';
import { getCurrentWeather, type CurrentWeather } from '../services/weatherApi';

// 서울 기본 좌표
const SEOUL_COORDS = { lat: 37.5665, lon: 126.9780 };

interface UseWeatherReturn {
  currentWeather: CurrentWeather | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * 날씨 데이터 관리 훅
 * - 앱 시작 시 서울 기본 날씨 로드
 * - GPS 위치 변경 시 자동 업데이트
 */
export function useWeather(
  position: { latitude: number; longitude: number } | null
): UseWeatherReturn {
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 날씨 데이터 로드
  const loadWeather = useCallback(async (lat: number, lon: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const weather = await getCurrentWeather(lat, lon);
      setCurrentWeather(weather);
      console.log('[Weather] Weather loaded:', weather);
    } catch (err) {
      console.error('[Weather] Failed to load weather:', err);
      setError('날씨 정보를 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 앱 시작 시 서울 기본 날씨 로드
  useEffect(() => {
    loadWeather(SEOUL_COORDS.lat, SEOUL_COORDS.lon);
  }, [loadWeather]);

  // GPS 위치 변경 시 날씨 업데이트
  useEffect(() => {
    if (position) {
      loadWeather(position.latitude, position.longitude);
    }
  }, [position, loadWeather]);

  // 수동 새로고침
  const refresh = useCallback(async () => {
    if (position) {
      await loadWeather(position.latitude, position.longitude);
    } else {
      await loadWeather(SEOUL_COORDS.lat, SEOUL_COORDS.lon);
    }
  }, [position, loadWeather]);

  return {
    currentWeather,
    isLoading,
    error,
    refresh
  };
}
