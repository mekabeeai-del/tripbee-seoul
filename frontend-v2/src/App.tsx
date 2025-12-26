import { useRef, useState, useEffect } from 'react';
import MapContainer from './components/map/MapContainer';
import CompassButton from './components/compass/CompassButton';
import WeatherButton from './components/weather/WeatherButton';
import WeatherDetailPanel from './components/weather/WeatherDetailPanel';
import LocationButton from './components/map/LocationButton';
import BeatyMarker from './components/map/BeatyMarker';
import BeatyOffScreenIndicator from './components/map/BeatyOffScreenIndicator';
import DiscoveryPOIMarker from './components/map/DiscoveryPOIMarker';
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
import { DEMO_CAFE_PLACE_IDS, CAFE_KEYWORDS, CAFE_BEATY_MESSAGES } from './data/demoCafes';
import { getPlacesByIds } from './services/poiApi';
import { useGeoLocation } from './hooks/useGeoLocation';
import { useAuth } from './hooks/useAuth';
import { useWeather } from './hooks/useWeather';
import { useBackNavigation } from './hooks/useBackNavigation';
import { useDiscoveryMode } from './hooks/useDiscoveryMode';
import type { VisiblePOI } from './hooks/useDiscoveryMode';
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
  const { isDiscovering, toggleDiscovery, visiblePOIs, clearPOIs } = useDiscoveryMode({
    map,
    position: gpsPosition,
    weather: currentWeather,
    onMessage: showBeatyBubble
  });
  const [activeFaq, setActiveFaq] = useState<FaqCard | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<VisiblePOI | null>(null);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [cafePOIs, setCafePOIs] = useState<VisiblePOI[]>([]);
  const [isCafeLoading, setIsCafeLoading] = useState(false);

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

  // 카페 키워드 감지 함수
  const detectCafeKeyword = (message: string): boolean => {
    const lowerMessage = message.toLowerCase();
    return CAFE_KEYWORDS.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
  };

  // 카페 검색 및 마커 표시
  const searchCafes = async () => {
    if (isCafeLoading) return;

    setIsCafeLoading(true);
    showBeatyBubble(CAFE_BEATY_MESSAGES.searching);

    try {
      const places = await getPlacesByIds(DEMO_CAFE_PLACE_IDS);

      if (places.length > 0) {
        const newCafePOIs: VisiblePOI[] = places.map(place => ({
          id: place.place_id || place.name,
          name: place.name,
          description: place.address,
          emoji: '☕',
          lat: place.lat,
          lng: place.lng,
          image: place.image,
          rating: place.rating,
          address: place.address,
          phone_number: place.phone_number,
          website: place.website,
          open_now: place.open_now,
          opening_hours: place.opening_hours,
          user_rating_count: place.user_rating_count,
          photos: place.photos,
          reviews: place.reviews,
          beaty_comment: place.beaty_comment || '커피 한 잔의 여유를 즐겨보세요!'
        }));

        setCafePOIs(newCafePOIs);
        showBeatyBubble(CAFE_BEATY_MESSAGES.found(newCafePOIs.length));

        // 첫 번째 카페 위치로 지도 이동
        if (map.current && newCafePOIs.length > 0) {
          map.current.flyTo({
            center: [newCafePOIs[0].lng, newCafePOIs[0].lat],
            zoom: 15,
            duration: 1500
          });
        }
      } else {
        showBeatyBubble(CAFE_BEATY_MESSAGES.error);
      }
    } catch (error) {
      console.error('Failed to search cafes:', error);
      showBeatyBubble(CAFE_BEATY_MESSAGES.error);
    } finally {
      setIsCafeLoading(false);
    }
  };

  const handleSendMessage = (message: string) => {
    console.log('Sending message:', message);

    // 카페 키워드 감지 (우선 처리)
    if (detectCafeKeyword(message)) {
      setIsChatOpen(false);
      searchCafes();
      return;
    }

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

      {/* 마커 제거 버튼 - 발견모드 아닐 때 + 마커 있을 때만 */}
      {!isDiscovering && (visiblePOIs.length > 0 || cafePOIs.length > 0) && (
        <button
          onClick={() => {
            clearPOIs();
            setCafePOIs([]);
          }}
          className="clear-discovery-btn"
        >
          발견 정보 지우기
        </button>
      )}

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

      {/* 발견모드 POI 마커 + 카페 마커 */}
      <DiscoveryPOIMarker
        map={map.current}
        pois={[...visiblePOIs, ...cafePOIs]}
        onMarkerClick={(poi, pos) => {
          setSelectedPOI(poi);
          setClickPosition(pos);
          setIsPOIDetailOpen(true);
        }}
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
        userLocation={gpsPosition}
      />

      {/* POI Detail Panel */}
      <POIDetailPanel
        isOpen={isPOIDetailOpen}
        onClose={() => {
          setIsPOIDetailOpen(false);
          // 애니메이션 완료 후 상태 초기화 (800ms)
          setTimeout(() => {
            setSelectedPOI(null);
            setClickPosition(null);
          }, 800);
        }}
        name={selectedPOI?.name || '장소 정보'}
        imageUrl={selectedPOI?.image || 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&h=600&fit=crop'}
        expandFrom={clickPosition}
        poi={selectedPOI}
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
