/**
 * 발견모드 메시지 생성
 */

import { getTranslation, type Language } from '../locales';
import type { TranslationKeys } from '../locales/ko';

export const DISCOVERY_MESSAGE_INTERVAL = 5000; // 5초

interface WeatherInfo {
  temp?: number;
  weather?: { main?: string; description?: string }[];
}

// 날씨 상태 텍스트 (번역 사용)
const getWeatherText = (weatherMain: string | undefined, t: TranslationKeys): string => {
  if (!weatherMain) return t.weather.conditions.Clear;
  return t.weather.conditions[weatherMain as keyof typeof t.weather.conditions] || t.weather.conditions.Clear;
};

// 시간대 텍스트 (번역 사용)
const getTimeOfDayText = (t: TranslationKeys): string => {
  const hour = new Date().getHours();
  if (hour < 6) return t.discovery.timeOfDay.dawn;
  if (hour < 11) return t.discovery.timeOfDay.morning;
  if (hour < 14) return t.discovery.timeOfDay.lunch;
  if (hour < 17) return t.discovery.timeOfDay.afternoon;
  if (hour < 21) return t.discovery.timeOfDay.evening;
  return t.discovery.timeOfDay.night;
};

// 시간 포맷 (번역 사용)
const getTimeFormatted = (t: TranslationKeys): string => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const period = hour < 12 ? t.discovery.timeFormat.am : t.discovery.timeFormat.pm;
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return t.discovery.timeFormat.hourMinute(period, displayHour, minute);
};

// 온도에 따른 코멘트 (번역 사용)
const getTempComment = (temp: number | undefined, t: TranslationKeys): string => {
  if (temp === undefined) return '';
  if (temp <= -5) return t.discovery.tempComments.veryCold;
  if (temp <= 5) return t.discovery.tempComments.cold;
  if (temp <= 15) return t.discovery.tempComments.cool;
  if (temp <= 25) return t.discovery.tempComments.warm;
  return t.discovery.tempComments.hot;
};

/**
 * 실제 날씨/시간 기반 발견모드 메시지 생성
 */
export const generateDiscoveryMessages = (weather?: WeatherInfo, language: Language = 'ko'): string[] => {
  const t = getTranslation(language);

  const timeFormatted = getTimeFormatted(t);
  const timeOfDayText = getTimeOfDayText(t);
  const weatherText = getWeatherText(weather?.weather?.[0]?.main, t);
  const temp = weather?.temp !== undefined ? Math.round(weather.temp) : undefined;
  const tempText = temp !== undefined ? t.discovery.tempText(temp) : '';
  const tempComment = getTempComment(temp, t);

  return [
    t.discovery.startMessage,
    t.discovery.weatherMessage(timeFormatted, weatherText, tempText, tempComment),
    t.discovery.searchingMessage(timeOfDayText)
  ];
};
