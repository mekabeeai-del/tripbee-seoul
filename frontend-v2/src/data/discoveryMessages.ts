/**
 * 발견모드 메시지 생성
 */

export const DISCOVERY_MESSAGE_INTERVAL = 5000; // 5초

interface WeatherInfo {
  temp?: number;
  weather?: { main?: string; description?: string }[];
}

// 날씨 상태 한글 변환
const getWeatherText = (weatherMain?: string): string => {
  const weatherMap: Record<string, string> = {
    'Clear': '맑음',
    'Clouds': '흐림',
    'Rain': '비',
    'Drizzle': '이슬비',
    'Thunderstorm': '천둥번개',
    'Snow': '눈',
    'Mist': '안개',
    'Fog': '안개',
    'Haze': '연무'
  };
  return weatherMap[weatherMain || ''] || '맑음';
};

// 시간대 텍스트
const getTimeText = (): string => {
  const hour = new Date().getHours();
  if (hour < 6) return '새벽';
  if (hour < 11) return '오전';
  if (hour < 14) return '점심시간';
  if (hour < 17) return '오후';
  if (hour < 21) return '저녁시간';
  return '밤';
};

// 시간 포맷 (오전/오후 12시 30분)
const getTimeFormatted = (): string => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const period = hour < 12 ? '오전' : '오후';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${period} ${displayHour}시 ${minute}분`;
};

// 온도에 따른 코멘트
const getTempComment = (temp?: number): string => {
  if (temp === undefined) return '';
  if (temp <= -5) return '많이 춥네요! 따뜻하게 입으세요~';
  if (temp <= 5) return '쌀쌀해요! 따뜻한 음식이 생각나는 날씨네요~';
  if (temp <= 15) return '선선해요! 산책하기 좋은 날씨네요~';
  if (temp <= 25) return '따뜻해요! 야외 활동하기 딱 좋아요~';
  return '더워요! 시원한 곳을 찾아볼게요~';
};

/**
 * 실제 날씨/시간 기반 발견모드 메시지 생성
 */
export const generateDiscoveryMessages = (weather?: WeatherInfo): string[] => {
  const timeFormatted = getTimeFormatted();
  const timeText = getTimeText();
  const weatherText = getWeatherText(weather?.weather?.[0]?.main);
  const temp = weather?.temp !== undefined ? Math.round(weather.temp) : undefined;
  const tempText = temp !== undefined ? `${temp > 0 ? '영상' : '영하'} ${Math.abs(temp)}도` : '';
  const tempComment = getTempComment(temp);

  return [
    `🔍 발견모드를 시작할게요!`,
    `지금은 ${timeFormatted}이에요. 날씨는 ${weatherText}, ${tempText}예요. ${tempComment}`,
    `${timeText}에 딱 맞는 장소를 찾아볼게요! ✨`
  ];
};
