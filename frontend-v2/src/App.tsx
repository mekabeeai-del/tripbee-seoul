import { useRef, useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
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
import type { User } from './services/privacyApi';
import { getSessionToken, getCurrentUser, oauthLogin, saveSessionTokens, logout as apiLogout, clearSessionTokens } from './services/privacyApi';
import { loginWithGoogle, loginWithApple } from './services/googleAuth';
import { useGeoLocation } from './hooks/useGeoLocation';
import { getCurrentWeather, type CurrentWeather } from './services/weatherApi';
import './App.css';

function App() {
  const map = useRef<any>(null);
  const geolocateControl = useRef<any>(null);
  const userMarker = useRef<any>(null);
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

  // 인증 상태
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // GPS 위치
  const { position: gpsPosition, error: gpsError, getLocation } = useGeoLocation();

  // 비티 마커 화면 밖 표시
  const [beatyOffScreen, setBeatyOffScreen] = useState<{
    visible: boolean;
    x: number;
    y: number;
    angle: number;
  }>({ visible: false, x: 0, y: 0, angle: 0 });

  // 날씨 데이터
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  // 비티 버블 메시지 표시 헬퍼 함수
  const showBeatyBubble = (message: string) => {
    setBeatyBubbleMessage(message);
    setIsBeatyBubbleVisible(true);
  };
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

  // 날씨 데이터 로드
  const loadWeather = async (lat: number, lon: number) => {
    setIsWeatherLoading(true);
    try {
      const weather = await getCurrentWeather(lat, lon);
      setCurrentWeather(weather);
      console.log('[Weather] Weather loaded:', weather);
    } catch (error) {
      console.error('[Weather] Failed to load weather:', error);
    } finally {
      setIsWeatherLoading(false);
    }
  };

  // 앱 시작 시 서울 기본 날씨 로드
  useEffect(() => {
    loadWeather(37.5665, 126.9780); // 서울 좌표
  }, []);

  // GPS 위치 변경 시 날씨 업데이트
  useEffect(() => {
    if (gpsPosition) {
      loadWeather(gpsPosition.latitude, gpsPosition.longitude);
    }
  }, [gpsPosition]);

  // 자동 로그인 체크 (세션 토큰이 있으면)
  useEffect(() => {
    const checkSession = async () => {
      const sessionToken = getSessionToken();
      if (sessionToken) {
        try {
          const response = await getCurrentUser(sessionToken);
          setCurrentUser(response.user);
          setIsLoggedIn(true);
          console.log('[AUTH] Auto-login successful:', response.user);
        } catch (error) {
          console.error('[AUTH] Auto-login failed:', error);
          // 세션이 만료되었으면 로그아웃 처리
          setIsLoggedIn(false);
          setCurrentUser(null);
        }
      }
    };

    checkSession();
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
      showBeatyBubble(`"${message}"에 대한 답변입니다! 비티가 곧 추천해드릴게요.`);
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
    showBeatyBubble('빙글빙글~ 근처에 숨은 맛집을 찾았어요! 한번 가보실래요?');
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

  // 현재 위치로 이동
  const handleLocationClick = () => {
    if (!map.current) return;
    getLocation();
  };

  // GPS 위치 업데이트 시 지도 이동 + 마커 표시
  useEffect(() => {
    if (!gpsPosition || !map.current) return;

    const { latitude, longitude } = gpsPosition;

    // 지도 이동 (줌 17 고정)
    map.current.flyTo({
      center: [longitude, latitude],
      zoom: 17,
      duration: 1000,
      essential: true
    });

    // 비티 마커 생성/업데이트
    if (userMarker.current) {
      // 기존 마커 위치 업데이트
      userMarker.current.setLngLat([longitude, latitude]);
    } else {
      // 새 마커 생성
      const el = document.createElement('div');
      el.style.position = 'relative';
      el.style.width = '50px';
      el.style.height = '50px';

      // 파동 효과 (3개 원)
      for (let i = 0; i < 3; i++) {
        const ripple = document.createElement('div');
        ripple.style.position = 'absolute';
        ripple.style.top = '50%';
        ripple.style.left = '50%';
        ripple.style.transform = 'translate(-50%, -50%)';
        ripple.style.width = '40px';
        ripple.style.height = '40px';
        ripple.style.borderRadius = '50%';
        ripple.style.border = '2px solid #FFD700';
        ripple.style.opacity = '0';
        ripple.style.animation = `ripple 2s ease-out infinite`;
        ripple.style.animationDelay = `${i * 0.6}s`;
        el.appendChild(ripple);
      }

      // 비티 이미지
      const beatyImg = document.createElement('div');
      beatyImg.style.position = 'absolute';
      beatyImg.style.top = '0';
      beatyImg.style.left = '0';
      beatyImg.style.width = '100%';
      beatyImg.style.height = '100%';
      beatyImg.style.backgroundImage = 'url(/img/beaty/beaty_float_marker.png)';
      beatyImg.style.backgroundSize = 'contain';
      beatyImg.style.backgroundRepeat = 'no-repeat';
      beatyImg.style.backgroundPosition = 'center';
      beatyImg.style.zIndex = '1';
      el.appendChild(beatyImg);

      userMarker.current = new mapboxgl.Marker({ element: el })
        .setLngLat([longitude, latitude])
        .addTo(map.current);
    }
  }, [gpsPosition]);

  // GPS 에러 처리
  useEffect(() => {
    if (gpsError) {
      showBeatyBubble(gpsError);
    }
  }, [gpsError]);

  // 비티 마커 화면 밖 체크
  useEffect(() => {
    if (!map.current || !gpsPosition) return;

    const checkBeatyOffScreen = () => {
      if (!map.current || !gpsPosition) return;

      const { latitude, longitude } = gpsPosition;
      const point = map.current.project([longitude, latitude]);
      const canvas = map.current.getCanvas();
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      // UI 안전 영역 정의 (UI가 없는 영역)
      const safeArea = {
        top: 120,      // 상단 UI (프로필, 날씨 등)
        bottom: 200,   // 하단 UI (채팅바, 버튼들)
        left: 40,      // 최소 여백
        right: 40      // 최소 여백
      };

      const isOffScreen =
        point.x < 0 || point.x > width ||
        point.y < 0 || point.y > height;

      if (isOffScreen) {
        // 안전 영역 중심에서 마커 방향 계산
        const safeWidth = width - safeArea.left - safeArea.right;
        const safeHeight = height - safeArea.top - safeArea.bottom;
        const centerX = safeArea.left + safeWidth / 2;
        const centerY = safeArea.top + safeHeight / 2;

        const angle = Math.atan2(point.y - centerY, point.x - centerX);
        const angleDeg = angle * (180 / Math.PI);

        // 안전 영역 가장자리 위치 계산
        const maxDistX = safeWidth / 2 - 40;
        const maxDistY = safeHeight / 2 - 40;

        let edgeX = centerX + Math.cos(angle) * maxDistX;
        let edgeY = centerY + Math.sin(angle) * maxDistY;

        // 안전 영역 범위 내로 클램핑
        edgeX = Math.max(safeArea.left + 40, Math.min(width - safeArea.right - 40, edgeX));
        edgeY = Math.max(safeArea.top + 40, Math.min(height - safeArea.bottom - 40, edgeY));

        setBeatyOffScreen({
          visible: true,
          x: edgeX,
          y: edgeY,
          angle: angleDeg
        });
      } else {
        setBeatyOffScreen(prev => prev.visible ? { ...prev, visible: false } : prev);
      }
    };

    // 초기 체크
    checkBeatyOffScreen();

    // 지도 이동 시 체크
    map.current.on('move', checkBeatyOffScreen);

    return () => {
      if (map.current) {
        map.current.off('move', checkBeatyOffScreen);
      }
    };
  }, [gpsPosition]);

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
      }, 800); // 600ms → 800ms 증가
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

      console.log('Mouse down - starting long press timer');
      const startX = e.clientX;
      const startY = e.clientY;
      let isMouseUp = false;

      const showContextMenu = () => {
        // mouseup이 일어났으면 무시
        if (isMouseUp) {
          console.log('Mouse already released, ignoring');
          return;
        }

        console.log('Long press completed - showing context menu');
        const lngLat = map.current?.unproject([startX, startY]);
        if (lngLat) {
          setContextMenu({
            x: startX,
            y: startY,
            lng: lngLat.lng,
            lat: lngLat.lat
          });
        }
      };

      longPressTimer.current = window.setTimeout(showContextMenu, 800);

      // mouseup 리스너 등록 (한번만 실행)
      const handleMouseUpOnce = () => {
        console.log('Mouse up - canceling long press');
        isMouseUp = true;
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        document.removeEventListener('mouseup', handleMouseUpOnce);
      };

      document.addEventListener('mouseup', handleMouseUpOnce, { once: true });
    };

    const handleContextMenu = (e: MouseEvent) => {
      // 브라우저 기본 컨텍스트 메뉴 막기
      e.preventDefault();
      console.log('Context menu prevented');
    };

    const handleMouseUp = () => {
      // 이미 위에서 처리됨
    };

    const handleMouseMove = () => {
      if (longPressTimer.current) {
        console.log('Mouse moved - canceling long press');
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

  // 로그인 핸들러
  const handleLogin = async (provider: 'google' | 'apple') => {
    try {
      console.log(`[AUTH] Starting ${provider} login...`);

      // Apple은 준비중
      if (provider === 'apple') {
        showBeatyBubble('Apple 로그인은 준비중입니다! 🚧');
        return;
      }

      // 1. OAuth 로그인 (Google/Apple)
      let authResponse;
      if (provider === 'google') {
        authResponse = await loginWithGoogle();
      } else {
        authResponse = await loginWithApple();
      }

      console.log('[AUTH] OAuth successful, logging in to backend...');

      // 2. 백엔드 로그인
      const loginResponse = await oauthLogin({
        provider,
        provider_user_id: authResponse.provider_user_id,
        provider_email: authResponse.provider_email,
        name: authResponse.name,
        profile_image_url: authResponse.profile_image_url,
        access_token: authResponse.access_token,
        refresh_token: authResponse.refresh_token,
        token_expires_at: authResponse.token_expires_at
      });

      // 3. 세션 토큰 저장
      saveSessionTokens(loginResponse.session_token, loginResponse.refresh_token);

      // 4. 상태 업데이트
      setCurrentUser(loginResponse.user);
      setIsLoggedIn(true);

      console.log('[AUTH] Login successful!', loginResponse.user);

      // 비티 버블로 환영 메시지
      showBeatyBubble(`환영합니다, ${loginResponse.user.name}님! 🎉`);

      // 홈 패널 닫기
      setIsHomePanelOpen(false);

    } catch (error) {
      console.error('[AUTH] Login failed:', error);
      showBeatyBubble('로그인에 실패했어요. 다시 시도해주세요.');
    }
  };

  // 로그아웃 핸들러
  const handleLogout = async () => {
    try {
      console.log('[AUTH] Logging out...');

      const sessionToken = getSessionToken();
      if (sessionToken) {
        await apiLogout(sessionToken);
      }

      // 세션 토큰 제거
      clearSessionTokens();

      // 상태 초기화
      setCurrentUser(null);
      setIsLoggedIn(false);

      console.log('[AUTH] Logout successful');

      // 비티 버블로 메시지
      showBeatyBubble('안전하게 로그아웃되었습니다!');

      // 홈 패널 닫기
      setIsHomePanelOpen(false);

    } catch (error) {
      console.error('[AUTH] Logout failed:', error);
      showBeatyBubble('로그아웃에 실패했어요.');
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
        onMapLoad={(loadedMap) => {
          map.current = loadedMap;
          // 지도 로드 완료 시 내 위치로 이동
          getLocation();
        }}
        onGeolocateControlLoad={(control) => (geolocateControl.current = control)}
      />

      {/* User Profile - Top Left */}
      <UserProfile
        onClick={() => setIsHomePanelOpen(!isHomePanelOpen)}
        isHomeActive={isHomePanelOpen || isHomePanelClosing}
        isLoggedIn={isLoggedIn}
        userName={currentUser?.name || 'Guest'}
        userEmail={currentUser?.email}
        profileImageUrl={currentUser?.profile_image_url}
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
        temperature={currentWeather?.temp}
        weatherMain={currentWeather?.weather[0]?.main}
        isLoading={isWeatherLoading}
        onClick={() => setIsWeatherDetailOpen(true)}
      />

      {/* Compass Button - Bottom Center (Highlighted) */}
      <CompassButton
        onClick={handleCompassClick}
        color={isPOIDetailOpen ? 'green' : 'blue'}
      />

      {/* Current Location Button - Bottom Right */}
      <LocationButton onClick={handleLocationClick} />

      {/* 비티 마커 화면 밖 표시 */}
      {beatyOffScreen.visible && (
        <div
          onClick={handleLocationClick}
          style={{
            position: 'fixed',
            left: beatyOffScreen.x,
            top: beatyOffScreen.y,
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            cursor: 'pointer',
            width: '60px',
            height: '60px'
          }}
        >
          {/* 화살표 (비티 주변에서 뾰족하게) */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '0',
              height: '0',
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '20px solid #FFD700',
              transformOrigin: 'center bottom',
              transform: `translate(-50%, -100%) rotate(${beatyOffScreen.angle + 90}deg) translateY(-20px)`,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }}
          />
          {/* 비티 이미지 (동그란 배경) */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                backgroundImage: 'url(/img/beaty/beaty_float_marker.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center'
              }}
            />
          </div>
        </div>
      )}

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

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
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
