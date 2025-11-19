/**
 * OpenWeatherMap API Client
 * Docs: https://openweathermap.org/api
 */

const OPENWEATHER_API_KEY = 'f18ff6e06bc5bbf01a424a43f232e30c';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

export interface CurrentWeather {
  temp: number;           // 현재 온도 (°C)
  feels_like: number;     // 체감 온도 (°C)
  temp_min: number;       // 최저 온도 (°C)
  temp_max: number;       // 최고 온도 (°C)
  humidity: number;       // 습도 (%)
  pressure: number;       // 기압 (hPa)
  weather: {
    id: number;
    main: string;         // 날씨 상태 (Rain, Snow, Clear 등)
    description: string;  // 날씨 설명
    icon: string;         // 아이콘 코드
  }[];
  wind: {
    speed: number;        // 풍속 (m/s)
    deg: number;          // 풍향 (도)
  };
  clouds: {
    all: number;          // 구름 (%)
  };
  dt: number;             // 데이터 시간 (timestamp)
  timezone: number;       // 시간대 오프셋 (초)
  name: string;           // 도시 이름
}

export interface ForecastItem {
  dt: number;             // 예보 시간 (timestamp)
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  }[];
  wind: {
    speed: number;
    deg: number;
  };
  pop: number;            // 강수 확률 (0~1)
}

export interface WeatherForecast {
  list: ForecastItem[];   // 3시간 간격 예보 (5일)
  city: {
    name: string;
    timezone: number;
  };
}

/**
 * 현재 날씨 조회
 */
export async function getCurrentWeather(lat: number, lon: number): Promise<CurrentWeather> {
  const url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=kr`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OpenWeather API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      temp: data.main.temp,
      feels_like: data.main.feels_like,
      temp_min: data.main.temp_min,
      temp_max: data.main.temp_max,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      weather: data.weather,
      wind: data.wind,
      clouds: data.clouds,
      dt: data.dt,
      timezone: data.timezone,
      name: data.name
    };
  } catch (error) {
    console.error('[Weather] Failed to fetch current weather:', error);
    throw error;
  }
}

/**
 * 5일 예보 조회 (3시간 간격)
 */
export async function getWeatherForecast(lat: number, lon: number): Promise<WeatherForecast> {
  const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=kr`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OpenWeather API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      list: data.list.map((item: any) => ({
        dt: item.dt,
        temp: item.main.temp,
        feels_like: item.main.feels_like,
        temp_min: item.main.temp_min,
        temp_max: item.main.temp_max,
        humidity: item.main.humidity,
        weather: item.weather,
        wind: item.wind,
        pop: item.pop || 0
      })),
      city: {
        name: data.city.name,
        timezone: data.city.timezone
      }
    };
  } catch (error) {
    console.error('[Weather] Failed to fetch forecast:', error);
    throw error;
  }
}

/**
 * 날씨 아이콘 URL 생성
 */
export function getWeatherIconUrl(iconCode: string, size: '1x' | '2x' | '4x' = '2x'): string {
  const sizeMap = {
    '1x': '',
    '2x': '@2x',
    '4x': '@4x'
  };
  return `https://openweathermap.org/img/wn/${iconCode}${sizeMap[size]}.png`;
}

/**
 * 날씨 상태를 한글로 변환
 */
export function getWeatherKorean(main: string): string {
  const weatherMap: Record<string, string> = {
    'Clear': '맑음',
    'Clouds': '흐림',
    'Rain': '비',
    'Drizzle': '이슬비',
    'Thunderstorm': '천둥번개',
    'Snow': '눈',
    'Mist': '안개',
    'Smoke': '연기',
    'Haze': '실안개',
    'Dust': '먼지',
    'Fog': '안개',
    'Sand': '모래바람',
    'Ash': '화산재',
    'Squall': '돌풍',
    'Tornado': '토네이도'
  };

  return weatherMap[main] || main;
}

/**
 * 풍향을 한글로 변환
 */
export function getWindDirection(deg: number): string {
  const directions = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}
