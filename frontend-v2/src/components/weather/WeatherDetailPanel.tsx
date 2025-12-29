import { useState, useEffect, useMemo } from 'react';
import { MdClose } from 'react-icons/md';
import { WiDaySunny, WiCloudy, WiDaySunnyOvercast, WiRain, WiSnow, WiFog } from 'react-icons/wi';
import BeatyBubble from '../beaty/BeatyBubble';
import ExpandableOverlay from '../common/ExpandableOverlay';
import { getCurrentWeather, getWeatherForecast, type CurrentWeather, type WeatherForecast } from '../../services/weatherApi';
import { getTranslation, type Language } from '../../locales';
import './WeatherDetailPanel.css';

interface WeatherDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onClosing?: (isClosing: boolean) => void;
  latitude?: number;
  longitude?: number;
  language?: Language;
}

// 날씨 패널 확장 시작 위치 (좌측 하단 - 날씨 버튼 위치)
const getWeatherExpandFrom = () => ({
  x: 44,
  y: window.innerHeight - 134
});

export default function WeatherDetailPanel({ isOpen, onClose, onClosing, latitude, longitude, language = 'ko' }: WeatherDetailPanelProps) {
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandFrom, setExpandFrom] = useState(getWeatherExpandFrom());

  // 번역
  const t = useMemo(() => getTranslation(language), [language]);

  // 날씨 상태 번역
  const getWeatherText = (main: string) => {
    return t.weather.conditions[main as keyof typeof t.weather.conditions] || main;
  };

  // 풍향 번역
  const getWindDirectionText = (deg: number) => {
    const index = Math.round(deg / 45) % 8;
    return t.weather.windDirections[index];
  };

  // 날씨 데이터 로드
  useEffect(() => {
    if (isOpen) {
      loadWeatherData();
      // 창 크기에 따라 확장 위치 업데이트
      setExpandFrom(getWeatherExpandFrom());
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
      setError(t.weather.error);
    } finally {
      setIsLoading(false);
    }
  };

  // 날씨 아이콘 렌더링
  const getWeatherIcon = (main: string): React.ReactElement => {
    const iconMap: Record<string, React.ReactElement> = {
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
    if (!currentWeather) return t.weather.loading;

    const weatherText = getWeatherText(currentWeather.weather[0].main);
    const temp = Math.round(currentWeather.temp);

    return t.weather.message(weatherText, temp);
  };

  // 시간별 예보 데이터 (8개만)
  const hourlyForecast = forecast?.list.slice(0, 8).map((item, index) => {
    const date = new Date(item.dt * 1000);
    const time = index === 0 ? t.weather.now : `${date.getHours()}${t.weather.hourSuffix}`;
    return {
      time,
      icon: getWeatherIcon(item.weather[0].main),
      temp: `${Math.round(item.temp)}°`
    };
  }) || [];

  return (
    <ExpandableOverlay
      isOpen={isOpen}
      onClose={onClose}
      onClosing={onClosing}
      expandFrom={expandFrom}
      className="weather-detail-overlay"
    >
      {/* 패널 */}
      <div className="weather-detail-panel">
        {/* 헤더 */}
        <div className="weather-detail-header">
          <div className="weather-detail-location">
            <h2>{t.weather.headerTitle(currentWeather?.name || 'Seoul')}</h2>
          </div>
          <button className="weather-detail-close" onClick={onClose}>
            <MdClose size={24} />
          </button>
        </div>

        {/* 스크롤 가능한 콘텐츠 */}
        <div className="weather-detail-content">
          {/* 로딩 중 */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>{t.weather.loading}</p>
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
            <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop" alt={t.weather.foodRecommendation.title} />
          </div>
          <div className="weather-food-content">
            <h3>{t.weather.foodRecommendation.title}</h3>
            <p>{t.weather.foodRecommendation.description}</p>
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
                  <div className="weather-info-value">{currentWeather.wind.speed} m/s {getWindDirectionText(currentWeather.wind.deg)}</div>
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
            <h3>{t.weather.hourlyForecast}</h3>
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
                <p>{t.weather.provider}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </ExpandableOverlay>
  );
}
