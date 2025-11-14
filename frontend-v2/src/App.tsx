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
import ContextMenu from './components/map/ContextMenu';
import FaqCardModal from './components/faq/FaqCardModal';
import { faqCards } from './data/faqCards';
import type { FaqCard } from './data/faqCards';
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
  const [language, setLanguage] = useState<'ko' | 'en' | 'ja'>('ko');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; lng: number; lat: number } | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const [activeFaq, setActiveFaq] = useState<FaqCard | null>(null);

  // 앱 초기 로딩
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppLoading(false);
    }, 1800); // fade-out 고려해서 약간 줄임
    return () => clearTimeout(timer);
  }, []);

  // 브라우저 히스토리 관리 (모바일 뒤로가기 지원)
  useEffect(() => {
    const handlePopState = () => {
      // 열린 패널이 있으면 닫기
      if (isChatOpen) {
        setIsChatOpen(false);
      } else if (isPOIDetailOpen) {
        setIsPOIDetailOpen(false);
      } else if (isWeatherDetailOpen) {
        setIsWeatherDetailOpen(false);
      } else if (isHomePanelOpen) {
        setIsHomePanelOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isChatOpen, isPOIDetailOpen, isWeatherDetailOpen, isHomePanelOpen]);

  // 패널이 열릴 때 히스토리 추가
  useEffect(() => {
    if (isChatOpen || isPOIDetailOpen || isWeatherDetailOpen || isHomePanelOpen) {
      window.history.pushState(null, '', window.location.href);
    }
  }, [isChatOpen, isPOIDetailOpen, isWeatherDetailOpen, isHomePanelOpen]);

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
      setTimeout(() => {
        setBeatyBubbleMessage(`"${message}"에 대한 답변입니다! 비티가 곧 추천해드릴게요.`);
        setIsBeatyBubbleVisible(true);
      }, 500);
    }
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

  // 지도 컨텍스트 메뉴 long-press 이벤트
  useEffect(() => {
    if (!map.current) return;

    // 지도 로드 완료까지 대기
    const setupListeners = () => {
      console.log('Setting up context menu listeners');

      const handleTouchStart = (e: TouchEvent) => {
      // 패널이 열려있으면 무시
      if (isChatOpen || isPOIDetailOpen || isWeatherDetailOpen || isHomePanelOpen) return;

      // 두 손가락 이상 터치(핀치 줌 등)면 무시
      if (e.touches.length > 1) {
        console.log('Multi-touch detected, ignoring long press');
        // 기존 타이머도 취소
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        touchStartPos.current = null;
        return;
      }

      const touch = e.touches[0];
      const touchX = touch.clientX;
      const touchY = touch.clientY;
      touchStartPos.current = { x: touchX, y: touchY };
      console.log('Touch start - single finger at', touchX, touchY);

      longPressTimer.current = window.setTimeout(() => {
        console.log('Long press timer fired - showing context menu');

        // 터치한 화면 좌표를 지도 좌표로 변환
        const lngLat = map.current?.unproject([touchX, touchY]);
        if (lngLat) {
          console.log('Context menu created at', lngLat.lng, lngLat.lat);
          setContextMenu({
            x: touchX,
            y: touchY,
            lng: lngLat.lng,
            lat: lngLat.lat
          });
        }
      }, 600);
    };

    const handleTouchEnd = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      touchStartPos.current = null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      // 두 손가락 이상이면 타이머 취소
      if (e.touches.length > 1) {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        touchStartPos.current = null;
        return;
      }

      // 손가락을 많이 움직였으면 취소 (10px 이상)
      if (longPressTimer.current && touchStartPos.current) {
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
        const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);

        if (deltaX > 10 || deltaY > 10) {
          console.log('Touch moved too much, canceling long press');
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
          touchStartPos.current = null;
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      // 패널이 열려있으면 무시
      if (isChatOpen || isPOIDetailOpen || isWeatherDetailOpen || isHomePanelOpen) return;

      console.log('Mouse down');
      longPressTimer.current = window.setTimeout(() => {
        console.log('Long press detected - showing context menu');
        e.preventDefault();

        // 클릭한 화면 좌표를 지도 좌표로 변환
        const lngLat = map.current?.unproject([e.clientX, e.clientY]);
        if (lngLat) {
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            lng: lngLat.lng,
            lat: lngLat.lat
          });
        }
      }, 600);
    };

    const handleContextMenu = (e: MouseEvent) => {
      // 브라우저 기본 컨텍스트 메뉴 막기
      e.preventDefault();
      console.log('Context menu prevented');
    };

    const handleMouseUp = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };

    const handleMouseMove = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };

      const canvas = map.current.getCanvas();
      console.log('Canvas found:', canvas);

      canvas.addEventListener('touchstart', handleTouchStart as any);
      canvas.addEventListener('touchend', handleTouchEnd);
      canvas.addEventListener('touchmove', handleTouchMove);
      canvas.addEventListener('mousedown', handleMouseDown as any);
      canvas.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('contextmenu', handleContextMenu as any);

      return () => {
        canvas.removeEventListener('touchstart', handleTouchStart as any);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('mousedown', handleMouseDown as any);
        canvas.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('contextmenu', handleContextMenu as any);
      };
    };

    // 지도가 완전히 로드되면 리스너 설정
    if (map.current.loaded()) {
      return setupListeners();
    } else {
      map.current.on('load', setupListeners);
      return () => {
        map.current?.off('load', setupListeners);
      };
    }
  }, [map.current, isChatOpen, isPOIDetailOpen, isWeatherDetailOpen, isHomePanelOpen]);

  // 컨텍스트 메뉴 액션 핸들러
  const handleContextMenuAction = () => {
    console.log('Context menu - Ask Beaty about location');

    // 비티한테 이 장소에 대해 물어보기
    setBeatyBubbleMessage('이 장소가 궁금하신가요? 제가 알아볼게요!');
    setIsBeatyBubbleVisible(true);
    // TODO: 클릭한 위치의 좌표를 이용해서 장소 정보 API 호출
  };

  // 이모션 태그 핸들러
  const handleEmotionTag = (emotion: string) => {
    console.log('Emotion tagged:', emotion);

    const emotionMessages: { [key: string]: string } = {
      love: '이 장소를 사랑하시는군요! ❤️ 저도 기억할게요!',
      happy: '행복한 순간이네요! 😊 멋진 추억이 되셨으면 좋겠어요!',
      excited: '정말 신나는 곳이죠! 🤩 더 재밌는 곳도 찾아드릴게요!',
      delicious: '맛있는 곳이군요! 😋 다른 맛집도 추천해드릴까요?',
      photo: '사진 찍기 좋은 곳이에요! 📸 인스타 감성 뿜뿜!',
      peaceful: '평화로운 순간... 😌 힐링하는 시간 되세요!',
      cool: '멋진 곳이죠! 😎 센스 있으시네요!',
      fun: '재밌는 곳이네요! 🎉 계속 즐거운 여행 되세요!',
    };

    setBeatyBubbleMessage(emotionMessages[emotion] || '감정을 기록했어요!');
    setIsBeatyBubbleVisible(true);
    // TODO: 서버에 감정 태그 저장 (위치 좌표 + emotion)
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
        language={language}
        onLanguageChange={setLanguage}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onAction={handleContextMenuAction}
          onEmotionTag={handleEmotionTag}
        />
      )}

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
