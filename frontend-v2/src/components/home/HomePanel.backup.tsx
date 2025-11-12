import { useState, useEffect } from 'react';
import { WiDaySunny, WiCloudy, WiRain } from 'react-icons/wi';
import BeatyBubble from '../beaty/BeatyBubble';
import './HomePanel.css';

interface HomePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onClosing?: (isClosing: boolean) => void;
}

export default function HomePanel({ isOpen, onClose, onClosing }: HomePanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const homeMessage = '오늘도 멋진데 맛있는것 찾고계신가요?\n반전의 향기 새로운 음식을 발견해 볼까요?';

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

  // 더미 추천 장소 데이터
  const recommendations = [
    {
      id: 1,
      name: '경복궁',
      icon: '🌙',
      image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&h=300&fit=crop'
    },
    {
      id: 2,
      name: '성화문길',
      icon: '⏰',
      image: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=400&h=300&fit=crop'
    },
    {
      id: 3,
      name: '롯데월드',
      icon: '😊',
      image: 'https://images.unsplash.com/photo-1524850011238-e3d235c7d4c9?w=400&h=300&fit=crop'
    }
  ];

  // 해시태그
  const hashtags = [
    '#카페', '#카페스타그램', '#카페투어', '#카페',
    '#카페스타그램', '#카페한잔', '#커피타임', '#커피그램',
    '#맛있는커피', '#아메리카노', '#로맨틱커피', '#디저트카페'
  ];

  return (
    <div className={`home-panel-overlay ${isClosing ? 'closing' : ''}`}>
      {/* 배경 */}
      <div className="home-panel-background" onClick={handleClose} />

      {/* 패널 */}
      <div className="home-panel">
        {/* 헤더 */}
        <div className="home-panel-header">
          <div className="home-panel-spacer"></div>
          <div className="home-panel-weather-icons">
            <div className="home-weather-icon-item">
              <WiDaySunny size={28} color="#FFB300" />
            </div>
            <div className="home-weather-icon-item">
              <WiCloudy size={28} color="#999" />
            </div>
            <div className="home-weather-icon-item">
              <WiRain size={28} color="#999" />
            </div>
          </div>
        </div>

        {/* 스크롤 가능한 콘텐츠 */}
        <div className="home-panel-content">
          {/* 비티 말풍선 */}
          <BeatyBubble
            variant="panel"
            message={homeMessage}
            isVisible={isVisible}
          />

        {/* 추천 장소 */}
        <div className="home-recommendations">
          <h3>어떤 장소는 어떠신가요?</h3>
          <div className="home-recommendations-grid">
            {recommendations.map((place) => (
              <div key={place.id} className="home-recommendation-card">
                <div className="home-recommendation-icon">{place.icon}</div>
                <div className="home-recommendation-image">
                  <img src={place.image} alt={place.name} />
                </div>
                <div className="home-recommendation-name">{place.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 여행 기록 */}
        <div className="home-trip-record">
          <h3>오늘의 여행 기록</h3>
          <div className="home-trip-map">
            <img
              src="https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/126.9780,37.5665,12,0/400x300@2x?access_token=pk.eyJ1IjoieWVhaGhhIiwiYSI6ImNtZTk4bTY2czBvcjUya29pc2NmdzM2aDQifQ.Nv8VEnrxJ5BDqBDOHH518Q"
              alt="Trip Map"
            />
          </div>
        </div>

          {/* 해시태그 */}
          <div className="home-hashtags">
            <div className="home-hashtags-scroll">
              {hashtags.map((tag, index) => (
                <span key={index} className="home-hashtag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
