import { useRef, useState, useEffect } from 'react';
import MapContainer from './components/map/MapContainer';
import CompassButton from './components/compass/CompassButton';
import WeatherButton from './components/weather/WeatherButton';
import WeatherDetailPanel from './components/weather/WeatherDetailPanel';
import LocationButton from './components/map/LocationButton';
import BeatyMarker from './components/map/BeatyMarker';
import BeatyOffScreenIndicator from './components/map/BeatyOffScreenIndicator';
import ChatWindow from './components/chat/ChatWindow';
import ChatBar from './components/chat/ChatBar';
import POIButton from './components/poi/POIButton';
import POIDetailPanel from './components/poi/POIDetailPanel';
import HomePanel from './components/home/HomePanel';
import UserProfile from './components/home/UserProfile';
import BeatyBubble from './components/beaty/BeatyBubble';
import FaqCardModal from './components/faq/FaqCardModal';
import { faqCards } from './data/faqCards';
import type { FaqCard } from './data/faqCards';
import { useGeoLocation } from './hooks/useGeoLocation';
import { useAuth } from './hooks/useAuth';
import { useWeather } from './hooks/useWeather';
import { useBackNavigation } from './hooks/useBackNavigation';
import { useDiscoveryMode } from './hooks/useDiscoveryMode';
import './App.css';

function App() {
  const map = useRef<mapboxgl.Map | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPOIDetailOpen, setIsPOIDetailOpen] = useState(false);
  const [isWeatherDetailOpen, setIsWeatherDetailOpen] = useState(false);
  const [isHomePanelOpen, setIsHomePanelOpen] = useState(false);
  const [isHomePanelClosing, setIsHomePanelClosing] = useState(false);
  const [isBeatyBubbleVisible, setIsBeatyBubbleVisible] = useState(true);
  const [beatyBubbleMessage, setBeatyBubbleMessage] = useState('멋진 여행 하고 계신가요? 어떤 장소를 원하시나요?');
  const [language, setLanguage] = useState<'ko' | 'en' | 'ja'>('ko');

  // 인증 상태
  const { isLoggedIn, currentUser, login, logout } = useAuth();

  // GPS 위치
  const { position: gpsPosition, error: gpsError, getLocation } = useGeoLocation();

  // 날씨 데이터
  const { currentWeather, isLoading: isWeatherLoading } = useWeather(gpsPosition);

  // 비티 버블 메시지 표시 헬퍼 함수
  const showBeatyBubble = (message: string) => {
    setBeatyBubbleMessage(message);
    setIsBeatyBubbleVisible(true);
  };

  // 발견모드
  const { isDiscovering, toggleDiscovery } = useDiscoveryMode({
    map,
    position: gpsPosition,
    onMessage: showBeatyBubble
  });
  const [activeFaq, setActiveFaq] = useState<FaqCard | null>(null);

  // 앱 초기 로딩
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppLoading(false);
    }, 1800); // fade-out 고려해서 약간 줄임
    return () => clearTimeout(timer);
  }, []);

  // 모바일 뒤로가기 지원
  useBackNavigation([
    { isOpen: isChatOpen, close: () => setIsChatOpen(false) },
    { isOpen: isPOIDetailOpen, close: () => setIsPOIDetailOpen(false) },
    { isOpen: isWeatherDetailOpen, close: () => setIsWeatherDetailOpen(false) },
    { isOpen: isHomePanelOpen, close: () => setIsHomePanelOpen(false) }
  ]);

  // FAQ 키워드 감지 함수
  const detectFaqKeyword = (message: string): FaqCard | null => {
    const lowerMessage = message.toLowerCase();

    for (const faq of Object.values(faqCards)) {
      for (const keyword of faq.keywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          return faq;
        }
      }
    }
    return null;
  };

  const handleSendMessage = (message: string) => {
    console.log('Sending message:', message);

    // FAQ 키워드 감지
    const matchedFaq = detectFaqKeyword(message);

    if (matchedFaq) {
      // FAQ 모달 표시
      setActiveFaq(matchedFaq);
      setIsChatOpen(false);
    } else {
      // 일반 응답
      setIsChatOpen(false);
      showBeatyBubble(`"${message}"에 대한 답변입니다! 비티가 곧 추천해드릴게요.`);
    }
  };

  const handleChatBarFocus = () => {
    setIsChatOpen(true);
  };

  // 현재 위치로 이동
  const handleLocationClick = () => {
    if (!map.current) return;
    getLocation();
  };

  // GPS 에러 처리
  useEffect(() => {
    if (gpsError) {
      showBeatyBubble(gpsError);
    }
  }, [gpsError]);

  // 로그인 핸들러
  const handleLogin = async (provider: 'google' | 'apple') => {
    const result = await login(provider);
    if (result.message) {
      showBeatyBubble(result.message);
    }
    if (result.success) {
      setIsHomePanelOpen(false);
    }
  };

  // 로그아웃 핸들러
  const handleLogout = async () => {
    const result = await logout();
    if (result.message) {
      showBeatyBubble(result.message);
    }
    if (result.success) {
      setIsHomePanelOpen(false);
    }
  };

  // 로딩 화면
  if (isAppLoading) {
    return (
      <div className={`app-loading-screen ${!isAppLoading ? 'fade-out' : ''}`}>
        <img src="/img/temp/main_loading.png" alt="Loading" className="app-loading-image" />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* 발견모드 화면 테두리 효과 */}
      <div className={`discovery-border ${isDiscovering ? 'active' : ''}`} />

      {/* Map Container */}
      <MapContainer
        onMapLoad={(loadedMap) => {
          map.current = loadedMap;
          // 지도 로드 완료 시 내 위치로 이동
          getLocation();
        }}
      />

      {/* User Profile - Top Left */}
      <div className={`ui-slide ui-slide-left ${isDiscovering ? 'hidden' : ''}`}>
        <UserProfile
          onClick={() => setIsHomePanelOpen(!isHomePanelOpen)}
          isHomeActive={isHomePanelOpen || isHomePanelClosing}
          isLoggedIn={isLoggedIn}
          userName={currentUser?.name || 'Guest'}
          userEmail={currentUser?.email}
          profileImageUrl={currentUser?.profile_image_url}
        />
      </div>

      {/* Gyeongbokgung POI Button - Top Right */}
      <div className={`ui-slide ui-slide-right ${isDiscovering ? 'hidden' : ''}`}>
        <POIButton
          name="경복궁"
          imageUrl="https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=300&h=200&fit=crop"
          lat={37.5788}
          lng={126.9770}
          isPaused={isPOIDetailOpen}
          onClick={() => {
            setIsPOIDetailOpen(true);
          }}
        />
      </div>

      {/* Weather Button - Bottom Left */}
      <WeatherButton
        temperature={currentWeather?.temp}
        weatherMain={currentWeather?.weather[0]?.main}
        isLoading={isWeatherLoading}
        isHidden={isDiscovering}
        onClick={() => setIsWeatherDetailOpen(true)}
      />

      {/* Compass Button - Bottom Center (Highlighted) */}
      <CompassButton
        isDiscovering={isDiscovering}
        onToggle={toggleDiscovery}
        color={isPOIDetailOpen ? 'green' : 'blue'}
      />

      {/* Current Location Button - Bottom Right */}
      <LocationButton onClick={handleLocationClick} isHidden={isDiscovering} />

      {/* 비티 마커 (지도 위) + 발견모드 레이더 */}
      <BeatyMarker
        map={map.current}
        position={gpsPosition}
        isDiscovering={isDiscovering}
      />

      {/* 비티 마커 화면 밖 표시 */}
      <BeatyOffScreenIndicator
        map={map.current}
        position={gpsPosition}
        onClick={handleLocationClick}
      />

      {/* Chat Bar */}
      <ChatBar
        onSendMessage={handleSendMessage}
        onFocus={handleChatBarFocus}
        isChatOpen={isChatOpen}
        isHidden={isDiscovering}
      />

      {/* Chat Window */}
      <ChatWindow
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onSendMessage={handleSendMessage}
      />

      {/* POI Detail Panel */}
      <POIDetailPanel
        isOpen={isPOIDetailOpen}
        onClose={() => setIsPOIDetailOpen(false)}
        name="경복궁"
        imageUrl="https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&h=600&fit=crop"
      />

      {/* Beaty Bubble */}
      <BeatyBubble
        variant="floating"
        message={beatyBubbleMessage}
        isVisible={isBeatyBubbleVisible}
        onClose={() => setIsBeatyBubbleVisible(false)}
      />

      {/* Weather Detail Panel */}
      <WeatherDetailPanel
        isOpen={isWeatherDetailOpen}
        onClose={() => setIsWeatherDetailOpen(false)}
        latitude={gpsPosition?.latitude}
        longitude={gpsPosition?.longitude}
      />

      {/* Home Panel */}
      <HomePanel
        isOpen={isHomePanelOpen}
        onClose={() => setIsHomePanelOpen(false)}
        onClosing={setIsHomePanelClosing}
        language={language}
        onLanguageChange={setLanguage}
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* FAQ Card Modal */}
      {activeFaq && (
        <FaqCardModal
          faq={activeFaq}
          language="ko"
          onClose={() => setActiveFaq(null)}
        />
      )}
    </div>
  );
}

export default App;
