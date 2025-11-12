import { useRef, useState, useEffect } from 'react';
import MapContainer from './components/map/MapContainer';
import CompassButton from './components/compass/CompassButton';
import WeatherButton from './components/weather/WeatherButton';
import WeatherDetailPanel from './components/weather/WeatherDetailPanel';
import LocationButton from './components/map/LocationButton';
import ChatWindow from './components/chat/ChatWindow';
import ChatBar from './components/chat/ChatBar';
import POIButton from './components/poi/POIButton';
import POIDetailPanel from './components/poi/POIDetailPanel';
import HomePanel from './components/home/HomePanel';
import UserProfile from './components/home/UserProfile';
import BeatyBubble from './components/beaty/BeatyBubble';
import './App.css';

function App() {
  const map = useRef<any>(null);
  const geolocateControl = useRef<any>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPOIDetailOpen, setIsPOIDetailOpen] = useState(false);
  const [isWeatherDetailOpen, setIsWeatherDetailOpen] = useState(false);
  const [isHomePanelOpen, setIsHomePanelOpen] = useState(false);
  const [isHomePanelClosing, setIsHomePanelClosing] = useState(false);
  const [isBeatyBubbleVisible, setIsBeatyBubbleVisible] = useState(true);
  const [beatyBubbleMessage, setBeatyBubbleMessage] = useState('멋진 여행 하고 계신가요? 어떤 장소를 원하시나요?');

  // 앱 초기 로딩
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppLoading(false);
    }, 1800); // fade-out 고려해서 약간 줄임
    return () => clearTimeout(timer);
  }, []);

  const handleSendMessage = (message: string) => {
    console.log('Sending message:', message);

    // 채팅창 닫기
    setIsChatOpen(false);

    // 잠시 후 비티 버블로 답변 표시
    setTimeout(() => {
      setBeatyBubbleMessage(`"${message}"에 대한 답변입니다! 비티가 곧 추천해드릴게요.`);
      setIsBeatyBubbleVisible(true);
    }, 500);
  };

  const handleChatBarFocus = () => {
    setIsChatOpen(true);
  };

  // ===== Compass Button Actions =====
  // 지도 화면: 랜덤 POI 추천
  const handleCompassInMap = () => {
    // 지도 빙글 회전 애니메이션
    if (map.current) {
      map.current.easeTo({
        bearing: 360,
        duration: 1000
      });
      // 회전 후 원래대로
      setTimeout(() => {
        map.current?.easeTo({
          bearing: 0,
          duration: 0
        });
      }, 1000);
    }

    // 비티 버블로 랜덤 추천
    setTimeout(() => {
      setBeatyBubbleMessage('빙글빙글~ 근처에 숨은 맛집을 찾았어요! 한번 가보실래요?');
      setIsBeatyBubbleVisible(true);
    }, 1000);
  };

  // POI 상세 화면: 길찾기
  const handleCompassInPOIDetail = () => {
    // TODO: 길찾기 API 연동
    console.log('길찾기 기능 호출');
  };

  // 채팅 화면: 미래 확장
  const handleCompassInChat = () => {
    // TODO: 채팅 관련 컴퍼스 액션
  };

  // 날씨 화면: 미래 확장
  const handleCompassInWeather = () => {
    // TODO: 날씨 관련 컴퍼스 액션
  };

  // 홈 화면: 미래 확장
  const handleCompassInHome = () => {
    // TODO: 홈 관련 컴퍼스 액션
  };

  // 중앙 컴퍼스 핸들러 - 상황별 분기
  const handleCompassClick = () => {
    if (isPOIDetailOpen) {
      handleCompassInPOIDetail();
    } else if (isChatOpen) {
      handleCompassInChat();
    } else if (isWeatherDetailOpen) {
      handleCompassInWeather();
    } else if (isHomePanelOpen) {
      handleCompassInHome();
    } else {
      // 기본: 지도 화면
      handleCompassInMap();
    }
  };

  const handleLocationClick = () => {
    if (navigator.geolocation && map.current) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;

        // Trigger geolocate control to show marker
        if (geolocateControl.current) {
          geolocateControl.current.trigger();
        }

        // Immediately fly to location with zoom 17
        map.current?.flyTo({
          center: [longitude, latitude],
          zoom: 17,
          duration: 1000
        });
      });
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
      {/* Map Container */}
      <MapContainer
        onMapLoad={(loadedMap) => (map.current = loadedMap)}
        onGeolocateControlLoad={(control) => (geolocateControl.current = control)}
      />

      {/* User Profile - Top Left */}
      <UserProfile
        onClick={() => setIsHomePanelOpen(!isHomePanelOpen)}
        isHomeActive={isHomePanelOpen || isHomePanelClosing}
      />

      {/* Gyeongbokgung POI Button - Top Right */}
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

      {/* Beaty Chat Bubble - Center (Hidden for now) */}
      {/* <div className="chat-bubble">
        <div className="beaty-avatar">🐝</div>
        <div className="bubble-content">
          <strong>안녕하세요!</strong>
          <br />
          오늘은 어떤 여행을 하고계신가요?❓
        </div>
      </div> */}

      {/* Weather Button - Bottom Left */}
      <WeatherButton
        temperature={19}
        onClick={() => setIsWeatherDetailOpen(true)}
      />

      {/* Compass Button - Bottom Center (Highlighted) */}
      <CompassButton
        onClick={handleCompassClick}
        color={isPOIDetailOpen ? 'green' : 'blue'}
      />

      {/* Current Location Button - Bottom Right */}
      <LocationButton onClick={handleLocationClick} />

      {/* Chat Bar */}
      <ChatBar
        onSendMessage={handleSendMessage}
        onFocus={handleChatBarFocus}
        isChatOpen={isChatOpen}
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
      />

      {/* Home Panel */}
      <HomePanel
        isOpen={isHomePanelOpen}
        onClose={() => setIsHomePanelOpen(false)}
        onClosing={setIsHomePanelClosing}
      />
    </div>
  );
}

export default App;
