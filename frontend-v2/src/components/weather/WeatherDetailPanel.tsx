import { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import { WiDaySunny, WiCloudy, WiDaySunnyOvercast, WiRain, WiSnow, WiFog } from 'react-icons/wi';
import BeatyBubble from '../beaty/BeatyBubble';
import { getCurrentWeather, getWeatherForecast, getWeatherKorean, getWindDirection, type CurrentWeather, type WeatherForecast } from '../../services/weatherApi';
import './WeatherDetailPanel.css';

interface WeatherDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onClosing?: (isClosing: boolean) => void;
  latitude?: number;
  longitude?: number;
}

export default function WeatherDetailPanel({ isOpen, onClose, onClosing, latitude, longitude }: WeatherDetailPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 날씨 데이터 로드
  useEffect(() => {
    if (isOpen) {
      loadWeatherData();
    }
  }, [isOpen, latitude, longitude]);

  const loadWeatherData = async () => {
    // GPS 위치가 없으면 서울 기본 좌표 사용
    const lat = latitude || 37.5665;
    const lon = longitude || 126.9780;

    setIsLoading(true);
    setError(null);

    try {
      console.log('[Weather] Loading weather data...', { lat, lon });

      const [current, forecastData] = await Promise.all([
        getCurrentWeather(lat, lon),
        getWeatherForecast(lat, lon)
      ]);

      setCurrentWeather(current);
      setForecast(forecastData);

      console.log('[Weather] Weather data loaded:', { current, forecastData });
    } catch (err) {
      console.error('[Weather] Failed to load weather:', err);
      setError('날씨 정보를 가져올 수 없어요 😢');
    } finally {
      setIsLoading(false);
    }
  };

  // isOpen 변경 감지
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsClosing(false);
      onClosing?.(false);
    } else if (isVisible) {
      // 열려있다가 닫히는 경우
      setIsClosing(true);
      onClosing?.(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
        onClosing?.(false);
      }, 800);
    }
  }, [isOpen, isVisible]);

  const handleClose = () => {
    onClose();
  };

  if (!isVisible) return null;

  // 날씨 아이콘 렌더링
  const getWeatherIcon = (main: string) => {
    const iconMap: Record<string, JSX.Element> = {
      'Clear': <WiDaySunny size={32} />,
      'Clouds': <WiCloudy size={32} />,
      'Rain': <WiRain size={32} />,
      'Drizzle': <WiRain size={32} />,
      'Snow': <WiSnow size={32} />,
      'Mist': <WiFog size={32} />,
      'Fog': <WiFog size={32} />
    };
    return iconMap[main] || <WiDaySunnyOvercast size={32} />;
  };

  // 날씨 메시지 생성
  const getWeatherMessage = () => {
    if (!currentWeather) return '날씨 정보를 불러오는 중...';

    const weatherKr = getWeatherKorean(currentWeather.weather[0].main);
    const temp = Math.round(currentWeather.temp);

    return `현재 날씨는 ${weatherKr}, 온도는 ${temp}도 에요! 오늘 같은 날엔 따뜻한 국물요리 어떠신가요?`;
  };

  // 시간별 예보 데이터 (8개만)
  const hourlyForecast = forecast?.list.slice(0, 8).map((item, index) => {
    const date = new Date(item.dt * 1000);
    const time = index === 0 ? '지금' : `${date.getHours()}시`;
    return {
      time,
      icon: getWeatherIcon(item.weather[0].main),
      temp: `${Math.round(item.temp)}°`
    };
  }) || [];

  return (
    <div className={`weather-detail-overlay ${isClosing ? 'closing' : ''}`}>
      {/* 배경 */}
      <div className="weather-detail-background" onClick={handleClose} />

      {/* 패널 */}
      <div className="weather-detail-panel">
        {/* 헤더 */}
        <div className="weather-detail-header">
          <div className="weather-detail-location">
            <h2>{currentWeather?.name || '서울'} 날씨</h2>
          </div>
          <button className="weather-detail-close" onClick={handleClose}>
            <MdClose size={24} />
          </button>
        </div>

        {/* 스크롤 가능한 콘텐츠 */}
        <div className="weather-detail-content">
          {/* 로딩 중 */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>날씨 정보를 불러오는 중...</p>
            </div>
          )}

          {/* 에러 */}
          {error && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>{error}</p>
            </div>
          )}

          {/* 날씨 데이터 표시 */}
          {!isLoading && !error && currentWeather && (
            <>
              {/* 현재 날씨 - 비티 말풍선 */}
              <BeatyBubble
                variant="panel"
                message={getWeatherMessage()}
                isVisible={isOpen}
                backgroundColor="#F8F8F8"
              />

        {/* 음식 추천 */}
        <div className="weather-food-section">
          <div className="weather-food-image">
            <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop" alt="음식 추천" />
          </div>
          <div className="weather-food-content">
            <h3>인삼돈 불고기</h3>
            <p>
              인삼돈불고기는 맛과 영양이 절묘하게 만난 요리로, 신선한 돼지고기에
              인삼이 어우러져 더욱 풍미가 깊어집니다. 이렇게 만든 불고기는
              한입으로도 풍부한 맛을 볼 수 있는 이색메뉴에 추천드립니다.
            </p>
          </div>
        </div>

              {/* 현재 정보 */}
              <div className="weather-info-grid">
                <div className="weather-info-item">
                  <div className="weather-info-icon">💧</div>
                  <div className="weather-info-value">{currentWeather.humidity}%</div>
                </div>
                <div className="weather-info-item">
                  <div className="weather-info-icon">💨</div>
                  <div className="weather-info-value">{currentWeather.wind.speed} m/s {getWindDirection(currentWeather.wind.deg)}</div>
                </div>
                <div className="weather-info-item">
                  <div className="weather-info-icon">🌡️</div>
                  <div className="weather-info-value">{Math.round(currentWeather.feels_like)}°</div>
                </div>
                <div className="weather-info-item">
                  <div className="weather-info-icon">☁️</div>
                  <div className="weather-info-value">{currentWeather.clouds.all}%</div>
                </div>
              </div>

          {/* 시간별 예보 */}
          <div className="weather-hourly-section">
            <h3>· 시간별 예보 ·</h3>
            <div className="weather-hourly-scroll">
              {hourlyForecast.map((hour, index) => (
                <div key={index} className="weather-hourly-item">
                  <div className="weather-hourly-time">{hour.time}</div>
                  <div className="weather-hourly-icon">{hour.icon}</div>
                  <div className="weather-hourly-temp">{hour.temp}</div>
                </div>
              ))}
            </div>
          </div>

              {/* 날씨 제공처 */}
              <div className="weather-provider">
                <p>날씨 정보 제공: OpenWeatherMap</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
