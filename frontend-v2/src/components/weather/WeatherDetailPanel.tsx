import { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import { WiDaySunny, WiCloudy, WiRain, WiDaySunnyOvercast } from 'react-icons/wi';
import BeatyBubble from '../beaty/BeatyBubble';
import './WeatherDetailPanel.css';

interface WeatherDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onClosing?: (isClosing: boolean) => void;
}

export default function WeatherDetailPanel({ isOpen, onClose, onClosing }: WeatherDetailPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const weatherMessage = '현재 날씨는 맑고, 온도는 18도 에요! 오늘같이 맑은 날엔 불고기 전골 어떠신가요?';

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

  // 더미 시간별 예보 데이터
  const hourlyForecast = [
    { time: '지금', icon: <WiDaySunny size={32} />, temp: '19°' },
    { time: '21시', icon: <WiDaySunny size={32} />, temp: '18°' },
    { time: '00시', icon: <WiCloudy size={32} />, temp: '17°' },
    { time: '03시', icon: <WiCloudy size={32} />, temp: '17°' },
    { time: '06시', icon: <WiDaySunnyOvercast size={32} />, temp: '17°' },
    { time: '09시', icon: <WiDaySunny size={32} />, temp: '19°' },
    { time: '12시', icon: <WiDaySunny size={32} />, temp: '17°' },
    { time: '15시', icon: <WiDaySunny size={32} />, temp: '17°' },
  ];

  return (
    <div className={`weather-detail-overlay ${isClosing ? 'closing' : ''}`}>
      {/* 배경 */}
      <div className="weather-detail-background" onClick={handleClose} />

      {/* 패널 */}
      <div className="weather-detail-panel">
        {/* 헤더 */}
        <div className="weather-detail-header">
          <div className="weather-detail-location">
            <h2>서울 날씨</h2>
          </div>
          <button className="weather-detail-close" onClick={handleClose}>
            <MdClose size={24} />
          </button>
        </div>

        {/* 스크롤 가능한 콘텐츠 */}
        <div className="weather-detail-content">
          {/* 현재 날씨 - 비티 말풍선 */}
          <BeatyBubble
            variant="panel"
            message={weatherMessage}
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
            <div className="weather-info-value">52%</div>
          </div>
          <div className="weather-info-item">
            <div className="weather-info-icon">💨</div>
            <div className="weather-info-value">1.54 m/s</div>
          </div>
          <div className="weather-info-item">
            <div className="weather-info-icon">🌅</div>
            <div className="weather-info-value">06:48</div>
          </div>
          <div className="weather-info-item">
            <div className="weather-info-icon">🌆</div>
            <div className="weather-info-value">17:43</div>
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
            <p>날씨 정보 제공: 기상청 K-weather</p>
          </div>
        </div>
      </div>
    </div>
  );
}
