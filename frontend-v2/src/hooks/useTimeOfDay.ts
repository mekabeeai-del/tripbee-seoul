import { useState, useEffect } from 'react';

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

/**
 * 현재 시간을 기준으로 시간대를 반환하는 함수
 */
export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 12) {
    return 'morning'; // 아침 (6-11시)
  } else if (hour >= 12 && hour < 18) {
    return 'day'; // 낮 (12-17시)
  } else if (hour >= 18 && hour < 22) {
    return 'evening'; // 저녁 (18-21시)
  } else {
    return 'night'; // 밤 (22-5시)
  }
}

/**
 * 시간대별 Mapbox 스타일을 반환하는 함수
 */
export function getMapStyleByTimeOfDay(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case 'morning':
      return 'mapbox://styles/mapbox/light-v11'; // 밝고 상쾌한 톤
    case 'day':
      return 'mapbox://styles/mapbox/streets-v12'; // 기본 선명한 톤
    case 'evening':
      return 'mapbox://styles/mapbox/outdoors-v12'; // 따뜻한 톤
    case 'night':
      return 'mapbox://styles/mapbox/dark-v11'; // 어두운 톤
  }
}

/**
 * 실시간으로 시간대를 추적하는 Custom Hook
 * 매 분마다 시간을 체크하여 시간대가 바뀌면 자동으로 업데이트
 */
export function useTimeOfDay() {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(getTimeOfDay());

  useEffect(() => {
    // 매 분마다 시간대 체크
    const interval = setInterval(() => {
      const newTimeOfDay = getTimeOfDay();
      if (newTimeOfDay !== timeOfDay) {
        setTimeOfDay(newTimeOfDay);
      }
    }, 60000); // 60초마다 체크

    return () => clearInterval(interval);
  }, [timeOfDay]);

  return timeOfDay;
}
