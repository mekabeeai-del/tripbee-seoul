import { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useGoogleLogin } from '@react-oauth/google';
import mapboxgl from 'mapbox-gl';
import Map, { addMarkers, clearMarkers } from './components/Map';
import type { MarkerData } from './components/Map';
import SearchBar from './components/SearchBar';
import RouteTimeline from './components/RouteTimeline';
import TripOnboardingModal from './components/TripOnboardingModal';
import BeatyFloating from './components/Beaty/BeatyFloating';
import KTODetailPanel from './components/KTODetailPanel';
import GoogleDetailPanel from './components/GoogleDetailPanel';
import WeatherDetailPanel from './components/WeatherDetailPanel';
import type { RandomPoi } from './components/Beaty/BeatyBubble';
import { queryBeatyStream } from './services/beatyApi';
import type { BeatyResponse, SSEDataEvent } from './services/beatyApi';
import { oauthLogin, saveSession, getSessionToken, getCurrentUser, clearSession, logout as logoutApi, getActiveTripSession, getTripContext, getCategories, getQueryHistory } from './services/authApi';
import type { TripContext, QueryHistory } from './services/authApi';
import './App.css';

// 카테고리별 이모지 매핑
const getCategoryEmoji = (categoryName: string): string => {
  const emojiMap: { [key: string]: string } = {
    '관광지': '🏛️',
    '문화시설': '🎭',
    '축제공연행사': '🎪',
    '여행코스': '🗺️',
    '레포츠': '⚽',
    '숙박': '🏨',
    '쇼핑': '🛍️',
    '음식점': '🍽️'
  };
  return emojiMap[categoryName] || '📍';
};

// 동행인별 이모지 매핑
const getCompanionEmoji = (companionId: string): string => {
  const emojiMap: { [key: string]: string } = {
    'solo': '🚶',
    'friends': '👯',
    'couple': '💑',
    'family': '👨‍👩‍👧‍👦'
  };
  return emojiMap[companionId] || '👥';
};

type PanelMode = 'full' | 'half';

interface SelectedPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: string;
  user_rating_count?: number;
  image?: string;
  description?: string;
  editorial_summary?: string;
  phone_number?: string;
  website?: string;
  open_now?: boolean;
  price_level?: string;
  parking_available?: boolean;
  good_for_children?: boolean;
  wheelchair_accessible?: boolean;
  vegetarian_food?: boolean;
  takeout?: boolean;
  delivery?: boolean;
  allows_dogs?: boolean;
  reservable?: boolean;
  contentId?: string;  // KTO 데이터 구분용
  contentTypeId?: string;
  routeData?: any; // 경로 상세 데이터
}

interface RecentPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  image?: string;
  timestamp: number;
  contentId?: string;  // KTO 데이터 구분용
  contentTypeId?: string;
  description?: string;
  rating?: string;
}

// localStorage 헬퍼 함수
const getRecentPlaces = (): RecentPlace[] => {
  try {
    const data = localStorage.getItem('recentPlaces');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveRecentPlace = (place: SelectedPlace) => {
  const recent = getRecentPlaces();
  const newPlace: RecentPlace = {
    id: Date.now().toString(),
    name: place.name,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    image: place.image,
    timestamp: Date.now(),
    contentId: place.contentId,
    contentTypeId: place.contentTypeId,
    description: place.description,
    rating: place.rating
  };

  // 중복 제거 (같은 이름+주소)
  const filtered = recent.filter(p => !(p.name === newPlace.name && p.address === newPlace.address));

  // 최근 10개까지만 저장
  const updated = [newPlace, ...filtered].slice(0, 10);
  localStorage.setItem('recentPlaces', JSON.stringify(updated));
};

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<BeatyResponse | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>('full');
  const [dragStartY, setDragStartY] = useState(0);
  const [dragCurrentY, setDragCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isBubbleOpen, setIsBubbleOpen] = useState(true);
  const [bubbleType, setBubbleType] = useState<'greeting' | 'poi' | 'response'>('greeting');
  const [randomPoi, setRandomPoi] = useState<RandomPoi | null>(null);
  const [bubbleMessage, setBubbleMessage] = useState<string>('');
  const [streamingText, setStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingPoi, setIsLoadingPoi] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [currentPlaceIndex, setCurrentPlaceIndex] = useState(0);
  const [allPlaces, setAllPlaces] = useState<SelectedPlace[]>([]);
  const [swipeStartX, setSwipeStartX] = useState(0);
  const [swipeCurrentX, setSwipeCurrentX] = useState(0);
  const [isSwipingPlace, setIsSwipingPlace] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isTripOnboardingOpen, setIsTripOnboardingOpen] = useState(false);
  const [recentPlaces, setRecentPlaces] = useState<RecentPlace[]>([]);
  const [chatHistory, setChatHistory] = useState<QueryHistory[]>([]);
  const [tripContext, setTripContext] = useState<TripContext | null>(null);
  const [categoryNames, setCategoryNames] = useState<{ [key: string]: string }>({});
  const [ktoContentId, setKtoContentId] = useState<string | null>(null);
  const [ktoPanelHeight, setKtoPanelHeight] = useState<'half' | 'full'>('half');
  const [googlePlaceDetail, setGooglePlaceDetail] = useState<SelectedPlace | null>(null);
  const [googlePanelHeight, setGooglePanelHeight] = useState<'half' | 'full'>('half');
  const [isChatHistoryExpanded, setIsChatHistoryExpanded] = useState(false);
  const [chatHistoryPage, setChatHistoryPage] = useState(1);
  const [weather, setWeather] = useState<{emoji: string, temperature: number} | null>(null);
  const [showWeatherDetail, setShowWeatherDetail] = useState(false);
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullCurrentY, setPullCurrentY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isChatHistoryLoading, setIsChatHistoryLoading] = useState(true);
  const [isRecentPlacesExpanded, setIsRecentPlacesExpanded] = useState(false);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const categoriesLoadedRef = useRef(false); // 카테고리 로드 여부 추적
  const chatHistoryScrollRef = useRef<HTMLDivElement | null>(null);

  // 컴포넌트 마운트 시 localStorage에서 데이터 로드 및 카테고리 이름 가져오기
  useEffect(() => {
    setRecentPlaces(getRecentPlaces());

    // 로그인된 사용자라면 대화기록 로드
    const loadChatHistory = async () => {
      const sessionToken = getSessionToken();
      if (sessionToken) {
        try {
          const historyResponse = await getQueryHistory(sessionToken, 20);
          if (historyResponse.success && historyResponse.queries) {
            setChatHistory(historyResponse.queries);
          }
        } catch (error) {
          console.error('[CHAT_HISTORY] 초기 로드 실패:', error);
        } finally {
          setIsChatHistoryLoading(false);
        }
      } else {
        setIsChatHistoryLoading(false);
      }
    };
    loadChatHistory();

    // 카테고리 이름 가져오기 (한번만 실행)
    const loadCategories = async () => {
      if (categoriesLoadedRef.current) {
        return;
      }

      try {
        const categories = await getCategories();
        const nameMap: { [key: string]: string } = {};
        categories.forEach(cat => {
          nameMap[cat.cat_code] = cat.name;
        });
        setCategoryNames(nameMap);
        categoriesLoadedRef.current = true; // 로드 완료 표시
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();

    // 날씨 정보 가져오기
    const loadWeather = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/weather');
        if (response.ok) {
          const data = await response.json();
          setWeather({
            emoji: data.emoji,
            temperature: data.temperature
          });
        }
      } catch (error) {
        console.error('Failed to load weather:', error);
      }
    };
    loadWeather();

    // 초기 greeting 메시지 스트리밍
    setTimeout(() => {
      streamText('안녕하세요! 저는 서울여행을 도와줄 비티에요!\n어떤 여행을 하고 싶나요?');
    }, 500); // 0.5초 딜레이 후 시작
  }, []);

  // 대화기록 확장 시 스크롤을 맨 아래로
  useEffect(() => {
    if (isChatHistoryExpanded && chatHistoryScrollRef.current) {
      // 렌더링 완료 후 스크롤
      setTimeout(() => {
        if (chatHistoryScrollRef.current) {
          chatHistoryScrollRef.current.scrollTop = chatHistoryScrollRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [isChatHistoryExpanded, chatHistory]);

  // Google OAuth login handler
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsAuthLoading(true);
      try {
        // Get user info from Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        const userData = await userInfoResponse.json();

        // Call privacy-service to create session
        const loginResult = await oauthLogin({
          provider: 'google',
          provider_user_id: userData.sub,
          provider_email: userData.email,
          name: userData.name,
          profile_image_url: userData.picture,
          access_token: tokenResponse.access_token
        });

        // Save session and update user state
        saveSession(loginResult.session_token, loginResult.refresh_token, loginResult.expires_at);
        setUser(loginResult.user);
        setIsLoginModalOpen(false);

        // Fetch trip context (현재 몇일차, 관심사, 동행인, 여행목적 등)
        const tripContextResponse = await getTripContext(loginResult.session_token);
        if (tripContextResponse.has_active_trip && tripContextResponse.trip_context) {
          setTripContext(tripContextResponse.trip_context);
        } else {
          // No active trip → show onboarding modal
          setIsTripOnboardingOpen(true);
        }
      } catch (error) {
        console.error('OAuth login failed:', error);
        alert('로그인 중 오류가 발생했습니다.');
      } finally {
        setIsAuthLoading(false);
      }
    },
    onError: () => {
      console.error('Google login failed');
      alert('구글 로그인에 실패했습니다.');
      setIsAuthLoading(false);
    }
  });

  // Session restoration on app load
  useEffect(() => {
    const restoreSession = async () => {
      const sessionToken = getSessionToken();
      if (sessionToken) {
        try {
          const currentUser = await getCurrentUser(sessionToken);
          setUser(currentUser);

          // Fetch trip context (현재 몇일차, 관심사, 동행인, 여행목적 등)
          const tripContextResponse = await getTripContext(sessionToken);
          if (tripContextResponse.has_active_trip && tripContextResponse.trip_context) {
            setTripContext(tripContextResponse.trip_context);
          } else {
            // No active trip → show onboarding modal
            setIsTripOnboardingOpen(true);
          }
        } catch (error) {
          console.error('Session restoration failed:', error);
          clearSession();
        }
      }
    };
    restoreSession();
  }, []);

  const handleMapLoad = (map: mapboxgl.Map) => {
    mapRef.current = map;
  };

  const handleLocationUpdate = (location: { lat: number; lng: number }) => {
    setUserLocation(location);
  };

  const handleMenuClick = () => {
    // Google 패널이 열려있으면 닫기
    if (googlePlaceDetail) {
      setGooglePlaceDetail(null);
    }
    // KTO 패널이 열려있으면 닫기
    if (ktoContentId) {
      setKtoContentId(null);
    }
    // 검색 결과 및 선택된 장소 초기화
    setResponse(null);
    setSelectedPlace(null);
    setCurrentPlaceIndex(0);
    // 홈 패널 토글
    setIsPanelOpen(!isPanelOpen);
    // 홈 패널을 열 때는 full 모드로
    if (!isPanelOpen) {
      setPanelMode('full');
    }
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStartY(clientY);
    setDragCurrentY(clientY);
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragCurrentY(clientY);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const dragDistance = dragCurrentY - dragStartY;
    const threshold = 100; // 100px 이상 드래그하면 상태 변경

    if (isPanelOpen && dragDistance > threshold) {
      // 패널이 열려있고 아래로 드래그 -> 닫기
      setIsPanelOpen(false);
    } else if (!isPanelOpen && dragDistance < -threshold) {
      // 패널이 닫혀있고 위로 드래그 -> 열기
      setIsPanelOpen(true);
    }

    setDragStartY(0);
    setDragCurrentY(0);
  };

  const handleQuickSearch = (query: string) => {
    handleSearch(query);
  };

  // 텍스트 스트리밍 애니메이션 헬퍼
  const streamText = (text: string, callback: () => void = () => {}) => {
    setStreamingText('');
    setIsStreaming(true);

    let charIndex = 0;
    const typingInterval = setInterval(() => {
      if (charIndex < text.length) {
        setStreamingText(text.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        setIsStreaming(false);
        callback();
      }
    }, 30); // 30ms마다 한 글자씩
  };

  const fetchRandomPoi = async () => {
    setIsLoadingPoi(true);
    try {
      const url = userLocation
        ? `http://localhost:8000/api/random-poi?lat=${userLocation.lat}&lng=${userLocation.lng}`
        : 'http://localhost:8000/api/random-poi';

      // 세션 토큰 가져오기
      const sessionToken = localStorage.getItem('session_token');
      const headers: HeadersInit = {};
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }

      const response = await fetch(url, { headers });
      const data = await response.json();

      if (data.success && data.poi) {
        setRandomPoi(data.poi);
        setBubbleType('poi');
        setBubbleMessage(data.poi.beaty_description);

        // POI 설명을 스트리밍으로 표시
        streamText(data.poi.beaty_description);
      } else {
        // POI가 없으면 greeting으로 돌아가기
        setBubbleType('greeting');
        setRandomPoi(null);

        // Greeting 메시지 스트리밍
        streamText('안녕하세요! 저는 서울여행을 도와줄 비티에요!\n어떤 여행을 하고 싶나요?');
      }
    } catch (error) {
      console.error('Random POI fetch error:', error);
      // 에러 시 greeting으로 돌아가기
      setBubbleType('greeting');
      setRandomPoi(null);

      // Greeting 메시지 스트리밍
      streamText('안녕하세요! 저는 서울여행을 도와줄 비티에요!\n어떤 여행을 하고 싶나요?');
    } finally {
      setIsLoadingPoi(false);
    }
  };

  const handleBeatyClick = () => {
    if (isBubbleOpen) {
      // 로딩 중이면 닫기 무시
      if (isLoadingPoi) return;
      // 열려있으면 닫기
      setIsBubbleOpen(false);
    } else {
      // 닫혀있으면 랜덤 POI 가져와서 열기
      setBubbleType('poi'); // 먼저 poi 모드로 변경
      setIsBubbleOpen(true);

      // 로딩 메시지 스트리밍
      streamText('🐝 새로운 장소를 찾고 있어요...');

      fetchRandomPoi();
    }
  };

  const handlePoiClick = () => {
    if (!randomPoi || !mapRef.current) return;

    // 지도 이동
    mapRef.current.flyTo({
      center: [randomPoi.mapx, randomPoi.mapy],
      zoom: 15,
      duration: 1500
    });

    // 기존 마커 제거
    clearMarkers(markersRef.current);

    // 새 마커 추가
    const markers: MarkerData[] = [{
      lng: randomPoi.mapx,
      lat: randomPoi.mapy,
      title: randomPoi.title,
      address: randomPoi.addr1,
      description: randomPoi.beaty_description,
      color: '#FF6B9D',
      image: randomPoi.first_image || undefined
    }];

    addMarkers(mapRef.current, markersRef.current, markers);

    // 말풍선 닫기
    setIsBubbleOpen(false);

    // KTO 상세 정보 표시
    if (randomPoi.content_id) {
      setKtoContentId(randomPoi.content_id);
      setKtoPanelHeight('half');  // 항상 half로 시작
    }
  };

  const handleMarkerClick = (markerData: MarkerData, index: number) => {
    if (!mapRef.current) return;

    console.log('[MARKER_CLICK] index:', index, 'markerData:', markerData);

    // markerData에서 직접 SelectedPlace 생성 (allPlaces 상태에 의존하지 않음)
    const place: SelectedPlace = {
      name: markerData.name || markerData.title || '장소',
      address: markerData.address || '',
      lat: markerData.lat,
      lng: markerData.lng,
      description: markerData.description,
      rating: markerData.rating,
      image: markerData.image,
      contentId: markerData.contentId,
      contentTypeId: markerData.contentTypeId,
      placeId: markerData.placeId,
      menu_url: markerData.menu_url,
      website: markerData.website,
      phone: markerData.phone,
      opening_hours: markerData.opening_hours,
      reviews: markerData.reviews,
      photos: markerData.photos,
      routeData: markerData.routeData
    };

    // ✨ localStorage에 최근 장소 저장
    saveRecentPlace(place);
    setRecentPlaces(getRecentPlaces());

    setSelectedPlace(place);
    setCurrentPlaceIndex(index);

    // content_id가 있으면 KTO 상세 정보 표시
    if (place.contentId) {
      setKtoContentId(place.contentId);
      setKtoPanelHeight('half');  // 항상 half로 시작
      setGooglePlaceDetail(null);  // Google 패널 닫기
      setIsPanelOpen(false);  // 기존 패널 닫기
      // KTO 패널도 표시하지만 지도는 이동
    } else {
      // Google Places 데이터는 GoogleDetailPanel로 표시
      setGooglePlaceDetail(place);
      setKtoContentId(null);  // KTO 패널 닫기
      setIsPanelOpen(false);  // 기존 패널 닫기 (GoogleDetailPanel만 표시)
    }

    // 지도 센터 이동 - 패널 높이를 고려한 offset 적용
    const map = mapRef.current;

    // 현재 줌 레벨이 15가 아니면 15로 설정
    const currentZoom = map.getZoom();
    const targetZoom = 15;

    // 줌 레벨 15 기준으로 offset 계산
    if (Math.abs(currentZoom - targetZoom) > 0.1) {
      // 줌이 많이 다르면 먼저 줌 변경
      map.setZoom(targetZoom);
    }

    const canvas = map.getCanvas();
    const canvasHeight = canvas.height;

    // 마커 위치를 픽셀로 변환 (현재 줌 레벨 기준)
    const targetPoint = map.project([markerData.lng, markerData.lat]);

    // 패널 높이를 고려한 offset
    // 마커를 보이는 영역(상단 50%)의 중앙에 위치시키려면
    // 지도 중심을 패널 높이의 1/4만큼 아래로 이동
    const offsetPixels = canvasHeight * 0.125; // 양수 = 지도 중심을 아래로

    // offset 적용된 화면 중심점 계산
    const centerPoint = {
      x: targetPoint.x,
      y: targetPoint.y + offsetPixels  // 지도 중심을 아래로 내려서 마커가 상단에 보이도록
    };

    const targetCenter = map.unproject(centerPoint);

    // 부드럽게 이동
    map.flyTo({
      center: [targetCenter.lng, targetCenter.lat],
      zoom: targetZoom,
      duration: 1000
    });
  };

  const handlePlaceSlide = (direction: 'prev' | 'next') => {
    if (allPlaces.length === 0 || !mapRef.current) return;

    let newIndex = currentPlaceIndex;
    if (direction === 'prev') {
      newIndex = currentPlaceIndex > 0 ? currentPlaceIndex - 1 : allPlaces.length - 1;
    } else {
      newIndex = currentPlaceIndex < allPlaces.length - 1 ? currentPlaceIndex + 1 : 0;
    }

    setCurrentPlaceIndex(newIndex);
    const newPlace = allPlaces[newIndex];
    setSelectedPlace(newPlace);

    // 지도 센터 이동 - 패널 고려한 offset 적용
    const map = mapRef.current;

    const currentZoom = map.getZoom();
    const targetZoom = 15;

    if (Math.abs(currentZoom - targetZoom) > 0.1) {
      map.setZoom(targetZoom);
    }

    const canvas = map.getCanvas();
    const canvasHeight = canvas.height;

    const targetPoint = map.project([newPlace.lng, newPlace.lat]);
    const offsetPixels = canvasHeight * 0.125; // 양수 = 지도 중심을 아래로

    const centerPoint = {
      x: targetPoint.x,
      y: targetPoint.y + offsetPixels
    };

    const targetCenter = map.unproject(centerPoint);

    map.flyTo({
      center: [targetCenter.lng, targetCenter.lat],
      zoom: targetZoom,
      duration: 800
    });
  };

  // 장소 스와이프 핸들러
  const handleSwipeStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (allPlaces.length <= 1) return; // 장소가 1개 이하면 스와이프 불필요

    setIsSwipingPlace(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setSwipeStartX(clientX);
    setSwipeCurrentX(clientX);
  };

  const handleSwipeMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isSwipingPlace) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setSwipeCurrentX(clientX);
  };

  const handleSwipeEnd = () => {
    if (!isSwipingPlace) return;
    setIsSwipingPlace(false);

    const swipeDistance = swipeCurrentX - swipeStartX;
    const threshold = 80; // 80px 이상 스와이프하면 장소 변경

    if (swipeDistance > threshold) {
      // 오른쪽으로 스와이프 -> 이전 장소
      handlePlaceSlide('prev');
    } else if (swipeDistance < -threshold) {
      // 왼쪽으로 스와이프 -> 다음 장소
      handlePlaceSlide('next');
    }

    setSwipeStartX(0);
    setSwipeCurrentX(0);
  };

  const handleSearch = async (query: string) => {
    if (!mapRef.current) {
      console.error('Map not loaded yet');
      return;
    }

    setIsLoading(true);
    // 새 검색 시 선택된 장소 초기화 및 패널 모드 full로 변경
    setSelectedPlace(null);
    setPanelMode('full');

    // 스트리밍 초기화 및 "생각중" 메시지를 타이핑 효과로 표시
    flushSync(() => {
      setIsPanelOpen(false);
      setBubbleType('response');
      setIsBubbleOpen(true);
      setIsStreaming(true);
      setStreamingText('');
      setBubbleMessage('');
    });

    // "🐝 비티가 생각하고있어요" 메시지를 타이핑 효과로 표시
    const thinkingMessage = '🐝 비티가 생각하고있어요';
    let charIndex = 0;
    const typingInterval = setInterval(() => {
      if (charIndex < thinkingMessage.length) {
        flushSync(() => {
          setStreamingText(thinkingMessage.slice(0, charIndex + 1));
        });
        charIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 50); // 50ms마다 한 글자씩

    let result: any = null;

    try {
      // SSE 스트리밍으로 쿼리 실행
      await queryBeatyStream(
        query,
        {
          onData: (event) => {
            console.log('[SSE] Data event received:', event);

            // 타이핑 인터벌 정리
            clearInterval(typingInterval);

            // 즉시 데이터 이벤트 기반으로 result 구성
            result = {
              intent: event.intent,
              data: {
                places: event.places,
                pois: event.pois,
                routes: event.routes,
                poi: event.poi,
                count: event.count,
                search_keyword: event.search_keyword
              },
              steps: event.steps
            };
            setResponse(result);

            // FIND_PLACE 인텐트: 마커 추가 및 지도 이동 (스트리밍 전에 실행)
            if (event.intent === 'FIND_PLACE' && event.places) {
              clearMarkers(markersRef.current);

              // 기존 경로 레이어 제거
              if (mapRef.current.getLayer('route-line')) {
                mapRef.current.removeLayer('route-line');
              }
              if (mapRef.current.getSource('route')) {
                mapRef.current.removeSource('route');
              }

              // allPlaces 저장 (전체 Google Places 정보 포함)
              const places: SelectedPlace[] = event.places.map((place: any) => ({
                name: place.name,
                address: place.address,
                lat: place.lat,
                lng: place.lng,
                rating: place.rating,
                user_rating_count: place.user_rating_count,
                image: place.image,
                description: place.description,
                editorial_summary: place.editorial_summary,
                phone_number: place.phone_number,
                website: place.website,
                open_now: place.open_now,
                price_level: place.price_level,
                parking_available: place.parking_available,
                good_for_children: place.good_for_children,
                wheelchair_accessible: place.wheelchair_accessible,
                vegetarian_food: place.vegetarian_food,
                takeout: place.takeout,
                delivery: place.delivery,
                allows_dogs: place.allows_dogs,
                reservable: place.reservable,
                reviews: place.reviews,
                photos: place.photos,
                menu_url: place.menu_url
              }));
              setAllPlaces(places);

              const markers: MarkerData[] = event.places.map((place: any, index: number) => ({
                lng: place.lng,
                lat: place.lat,
                title: place.name,
                address: place.address,
                description: place.rating ? `⭐ ${place.rating}` : undefined,
                color: '#4A90E2',
                rank: index + 1
              }));

              // 마커 추가 및 bounds 계산
              const bounds = addMarkers(mapRef.current, markersRef.current, markers, (markerData, index) => {
                const actualPlace = places[index];
                if (!actualPlace) {
                  console.error('[MARKER_CLICK] actualPlace가 없습니다! index:', index);
                  return;
                }

                const place: SelectedPlace = { ...actualPlace };

                // ✨ localStorage에 최근 장소 저장
                saveRecentPlace(place);
                setRecentPlaces(getRecentPlaces());

                setSelectedPlace(place);
                setCurrentPlaceIndex(index);

                // Google Places 데이터는 GoogleDetailPanel로 표시
                setGooglePlaceDetail(place);
                setGooglePanelHeight('half');
                setKtoContentId(null);
                setIsPanelOpen(false);

                // 지도 센터 이동
                if (mapRef.current) {
                  const map = mapRef.current;
                  const targetZoom = 15;
                  map.setZoom(targetZoom);

                  const canvas = map.getCanvas();
                  const canvasHeight = canvas.height;
                  const targetPoint = map.project([place.lng, place.lat]);

                  const halfPanelHeight = canvasHeight * 0.5;
                  const offsetPixels = -30;

                  const centerPoint = {
                    x: targetPoint.x,
                    y: targetPoint.y - offsetPixels
                  };

                  const targetCenter = map.unproject(centerPoint);

                  map.flyTo({
                    center: [targetCenter.lng, targetCenter.lat],
                    zoom: targetZoom,
                    duration: 1000
                  });
                }
              });

              // 모든 마커가 보이도록 줌 조절 (fitBounds) - 스트리밍 시작 전에 실행
              if (bounds && mapRef.current) {
                mapRef.current.fitBounds(bounds, {
                  padding: { top: 100, bottom: 100, left: 50, right: 50 },
                  maxZoom: 15,
                  duration: 1000
                });
              }
            }

            // 스트리밍을 위해 즉시 버블 열기 (RECOMMEND는 제외 - 마커 표시 후 스트리밍)
            if (event.intent === 'FIND_PLACE' || event.intent === 'RANDOM' || event.intent === 'GENERAL_CHAT') {
              // flushSync로 즉시 렌더링하여 버블 열기
              flushSync(() => {
                setIsPanelOpen(false);
                setBubbleType('response');
                setIsBubbleOpen(true);
                setIsStreaming(true);
                setStreamingText('');
                setBubbleMessage(''); // 이전 메시지 초기화
              });
              console.log('[DEBUG] Bubble opened for streaming, intent:', event.intent);
            }
          },
          onChunk: (event) => {
            console.log('[SSE] Chunk received:', event.text);
            console.log('[DEBUG] Before update - isBubbleOpen:', isBubbleOpen, 'bubbleType:', bubbleType, 'isStreaming:', isStreaming);
            // flushSync로 즉시 동기 렌더링
            flushSync(() => {
              setStreamingText(prev => {
                // 첫 청크가 오면 "생각중" 메시지를 지우고 실제 응답으로 교체
                if (prev.startsWith('🐝 비티가 생각하고있어요')) {
                  console.log('[DEBUG] First chunk - clearing thinking message');
                  return event.text;
                }
                const newText = prev + event.text;
                console.log('[DEBUG] streamingText updated to length:', newText.length);
                return newText;
              });
            });
            console.log('[DEBUG] After setStreamingText called');
          },
          onDone: () => {
            console.log('[SSE] Stream completed');
            // 최종 메시지를 bubbleMessage에 복사
            setStreamingText(prev => {
              setBubbleMessage(prev);
              return prev; // 일단 유지
            });
            // 다음 이벤트 루프에서 초기화
            setTimeout(() => {
              setStreamingText('');
              setIsStreaming(false);
            }, 0);
          },
          onError: (error) => {
            console.error('[SSE] Stream error:', error);
            setIsStreaming(false);
            setStreamingText('');
          }
        },
        userLocation || undefined
      );

      // FIND_PLACE는 onData에서 이미 처리됨 (마커 추가 + 지도 이동)
      // 다른 인텐트들만 여기서 처리
      if (result.intent === 'LANDMARK' && result.data?.landmarks) {
        clearMarkers(markersRef.current);

        // 기존 경로 레이어 제거
        if (mapRef.current.getLayer('route-line')) {
          mapRef.current.removeLayer('route-line');
        }
        if (mapRef.current.getSource('route')) {
          mapRef.current.removeSource('route');
        }
        const markers: MarkerData[] = result.data.landmarks.map((landmark: any) => ({
          lng: landmark.mapx,
          lat: landmark.mapy,
          title: landmark.title,
          name: landmark.title,
          address: landmark.addr1,
          description: landmark.description,
          color: '#6f42c1',
          rank: landmark.rank,
          image: landmark.first_image,
          contentId: landmark.content_id,
          contentTypeId: landmark.content_type_id
        }));

        // allPlaces 저장
        const places: SelectedPlace[] = result.data.landmarks.map((landmark: any) => ({
          name: landmark.title,
          address: landmark.addr1,
          lat: landmark.mapy,
          lng: landmark.mapx,
          description: landmark.description,
          image: landmark.first_image
        }));
        setAllPlaces(places);

        addMarkers(mapRef.current, markersRef.current, markers, handleMarkerClick);

        // 랜드마크는 자동으로 1번 선택
        if (places.length > 0) {
          const firstPlace = places[0];
          setSelectedPlace(firstPlace);
          setCurrentPlaceIndex(0);
          setPanelMode('half');

          // 지도 센터 이동
          const map = mapRef.current;
          const targetZoom = 15;
          map.setZoom(targetZoom);

          const canvas = map.getCanvas();
          const canvasHeight = canvas.height;
          const targetPoint = map.project([firstPlace.lng, firstPlace.lat]);
          const offsetPixels = canvasHeight * 0.125;

          const centerPoint = {
            x: targetPoint.x,
            y: targetPoint.y + offsetPixels
          };

          const targetCenter = map.unproject(centerPoint);

          map.flyTo({
            center: [targetCenter.lng, targetCenter.lat],
            zoom: targetZoom,
            duration: 1000
          });
        }
      }
      else if (result.intent === 'RECOMMEND' && result.data?.pois) {
        const markers: MarkerData[] = result.data.pois.map((poi: any, index: number) => ({
          lng: poi.mapx,
          lat: poi.mapy,
          title: poi.title || poi.name,
          name: poi.title || poi.name,
          address: poi.addr1 || poi.address,
          description: poi.beaty_description,
          color: '#28a745',
          rank: index + 1,
          contentId: poi.content_id,
          contentTypeId: poi.content_type_id
        }));

        // allPlaces 저장 (content_id 포함)
        const places: SelectedPlace[] = result.data.pois.map((poi: any) => ({
          name: poi.title || poi.name,
          address: poi.addr1 || poi.address,
          lat: poi.mapy,
          lng: poi.mapx,
          description: poi.beaty_description,
          contentId: poi.content_id,
          contentTypeId: poi.content_type_id
        }));
        setAllPlaces(places);

        // 마커 추가 및 bounds 계산
        const bounds = addMarkers(mapRef.current, markersRef.current, markers, handleMarkerClick);

        // 모든 마커가 보이도록 줌 조절 (fitBounds) - 애니메이션 완료 후 스트리밍 시작
        if (bounds && mapRef.current) {
          mapRef.current.once('moveend', () => {
            console.log('[RECOMMEND] Map animation completed, starting bubble stream');
            // 지도 이동 완료 후 버블 열고 스트리밍 시작
            flushSync(() => {
              setIsPanelOpen(false);
              setBubbleType('response');
              setIsBubbleOpen(true);
              setIsStreaming(true);
              setStreamingText('');
              setBubbleMessage(''); // 이전 메시지 초기화
            });
          });

          mapRef.current.fitBounds(bounds, {
            padding: { top: 100, bottom: 100, left: 50, right: 50 },
            maxZoom: 15,
            duration: 1000
          });
        }
      }
      else if (result.intent === 'RANDOM' && result.data?.poi) {
        // RANDOM 인텐트 - 단일 POI
        const poi = result.data.poi;
        const markers: MarkerData[] = [{
          lng: poi.mapx,
          lat: poi.mapy,
          title: poi.title,
          name: poi.title,
          address: poi.addr1,
          description: poi.beaty_description,
          color: '#FF6B9D',
          image: poi.first_image
        }];

        // allPlaces 저장
        const places: SelectedPlace[] = [{
          name: poi.title,
          address: poi.addr1,
          lat: poi.mapy,
          lng: poi.mapx,
          description: poi.beaty_description,
          image: poi.first_image
        }];
        setAllPlaces(places);

        addMarkers(mapRef.current, markersRef.current, markers, handleMarkerClick);

        // 자동으로 선택
        if (places.length > 0) {
          const firstPlace = places[0];
          setSelectedPlace(firstPlace);
          setCurrentPlaceIndex(0);
          setPanelMode('half');

          // 지도 센터 이동
          const map = mapRef.current;
          const targetZoom = 15;
          map.setZoom(targetZoom);

          const canvas = map.getCanvas();
          const canvasHeight = canvas.height;
          const targetPoint = map.project([firstPlace.lng, firstPlace.lat]);
          const offsetPixels = canvasHeight * 0.125;

          const centerPoint = {
            x: targetPoint.x,
            y: targetPoint.y + offsetPixels
          };

          const targetCenter = map.unproject(centerPoint);

          map.flyTo({
            center: [targetCenter.lng, targetCenter.lat],
            zoom: targetZoom,
            duration: 1000
          });
        }
      }
      else if (result.intent === 'GENERAL_CHAT') {
        // GENERAL_CHAT - 패널 닫고 비티 말풍선만 표시
        setIsPanelOpen(false);
        setBubbleType('response');
        setBubbleMessage(result.natural_response || result.answer);
        setIsBubbleOpen(true);
      }
      else if (result.intent === 'ROUTE' && result.data?.routes) {
        // 경로 데이터를 allPlaces에 저장 (각 경로를 place처럼 처리)
        const routes = result.data.routes;
        const routePlaces: SelectedPlace[] = routes.map((route: any, index: number) => {
          const info = route.info || {};

          // subPath 상세 정보 생성
          let pathDetails = '';
          if (route.subPath && Array.isArray(route.subPath)) {
            pathDetails = route.subPath.map((sub: any, idx: number) => {
              if (sub.trafficType === 1) {
                // 지하철
                return `🚇 ${sub.lane?.[0]?.name || '지하철'} (${sub.startName} → ${sub.endName})`;
              } else if (sub.trafficType === 2) {
                // 버스
                return `🚌 ${sub.lane?.[0]?.busNo || '버스'} (${sub.startName} → ${sub.endName})`;
              } else if (sub.trafficType === 3) {
                // 도보
                return `🚶 도보 ${sub.distance}m (약 ${sub.sectionTime}분)`;
              }
              return '';
            }).filter(Boolean).join('\n');
          }

          return {
            name: `경로 ${index + 1}`,
            address: `${info.totalTime || 0}분 · ${info.payment || 0}원`,
            lat: 0, // 경로는 좌표가 없음
            lng: 0,
            description: pathDetails || `소요시간: ${info.totalTime}분\n요금: ${info.payment}원\n거리: ${(info.totalDistance / 1000).toFixed(1)}km`,
            rating: `환승 ${info.busTransitCount + info.subwayTransitCount}회`,
            routeData: route // 전체 경로 데이터 저장
          };
        });
        setAllPlaces(routePlaces);

        // 첫 번째 경로 자동 선택
        if (routePlaces.length > 0) {
          setSelectedPlace(routePlaces[0]);
          setCurrentPlaceIndex(0);
          setPanelMode('half');
        }

        // GeoJSON이 있으면 지도에 그리기
        if (result.data.geojson) {
          const geojson = result.data.geojson;

          // GeoJSON 소스 추가
          mapRef.current.addSource('route', {
            type: 'geojson',
            data: geojson
          });

          // 경로 라인 레이어 추가
          mapRef.current.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            filter: ['==', ['get', 'type'], 'route'],
            paint: {
              'line-color': '#4A90E2',
              'line-width': 5,
              'line-opacity': 0.8
            }
          });

          // 출발지/도착지 마커 추가
          const features = geojson.features.filter((f: any) =>
            f.properties.type === 'origin' || f.properties.type === 'destination'
          );

          features.forEach((feature: any) => {
            const [lng, lat] = feature.geometry.coordinates;
            const isOrigin = feature.properties.type === 'origin';

            const el = document.createElement('div');
            el.style.width = '35px';
            el.style.height = '35px';
            el.style.backgroundColor = isOrigin ? '#28a745' : '#dc3545';
            el.style.borderRadius = '50%';
            el.style.border = '3px solid white';
            el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.fontSize = '16px';
            el.style.color = 'white';
            el.textContent = isOrigin ? 'A' : 'B';

            const marker = new mapboxgl.Marker(el)
              .setLngLat([lng, lat])
              .setPopup(new mapboxgl.Popup({ offset: 30 })
                .setHTML(`<strong>${feature.properties.name}</strong>`))
              .addTo(mapRef.current!);

            markersRef.current.push(marker);
          });
        }
      }

    } catch (error) {
      console.error('Search error:', error);
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);

      // ✨ 검색 성공 시 대화기록 다시 로드
      if (result) {
        const sessionToken = getSessionToken();
        if (sessionToken) {
          // DB 저장 완료를 기다리기 위해 500ms 딜레이
          setTimeout(async () => {
            try {
              const historyResponse = await getQueryHistory(sessionToken, 20);
              if (historyResponse.success && historyResponse.queries) {
                setChatHistory(historyResponse.queries);
              }
            } catch (error) {
              console.error('[CHAT_HISTORY] 검색 후 재로드 실패:', error);
            }
          }, 500);
        }
      }
    }
  };

  const handleQuickAction = (action: string) => {
    // 퀵 액션 버튼 클릭 핸들러
    switch (action) {
      case 'intro':
        handleSearch('서울 소개해줘');
        break;
      case 'landmark':
        handleSearch('서울에서 꼭 가봐야할 곳');
        break;
      case 'route':
        // TODO: 여행경로 생성 플로우 시작
        break;
    }
  };

  // 대화기록 더보기 클릭
  const handleChatHistoryExpand = () => {
    setIsChatHistoryExpanded(true);
    // 다음 렌더링 후 스크롤을 맨 아래로
    setTimeout(() => {
      if (chatHistoryScrollRef.current) {
        chatHistoryScrollRef.current.scrollTop = chatHistoryScrollRef.current.scrollHeight;
      }
    }, 100);
  };

  // 대화기록 닫기
  const handleChatHistoryClose = () => {
    setIsChatHistoryExpanded(false);
    setChatHistoryPage(1);
    setHasMoreHistory(true);
  };

  // 최근 본 장소 더보기 클릭
  const handleRecentPlacesExpand = () => {
    setIsRecentPlacesExpanded(true);
  };

  // 최근 본 장소 닫기
  const handleRecentPlacesClose = () => {
    setIsRecentPlacesExpanded(false);
  };

  // 추가 대화기록 로드 (Pull-to-refresh)
  const loadMoreChatHistory = async () => {
    if (isLoadingMoreHistory || !hasMoreHistory) return;

    const sessionToken = getSessionToken();
    if (!sessionToken) return;

    setIsLoadingMoreHistory(true);
    try {
      const nextPage = chatHistoryPage + 1;
      const historyResponse = await getQueryHistory(sessionToken, 20, (nextPage - 1) * 20);

      if (historyResponse.success && historyResponse.queries) {
        if (historyResponse.queries.length === 0) {
          setHasMoreHistory(false);
        } else {
          // 기존 기록 앞에 추가 (과거 데이터)
          setChatHistory(prev => [...historyResponse.queries, ...prev]);
          setChatHistoryPage(nextPage);
        }
      } else {
        setHasMoreHistory(false);
      }
    } catch (error) {
      console.error('Failed to load more chat history:', error);
    } finally {
      setIsLoadingMoreHistory(false);
    }
  };

  // Pull-to-refresh 터치/마우스 이벤트
  const handlePullStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!chatHistoryScrollRef.current) return;
    const scrollTop = chatHistoryScrollRef.current.scrollTop;

    // 스크롤이 최상단일 때만 pull 시작
    if (scrollTop === 0 && !isLoadingMoreHistory && hasMoreHistory) {
      setIsPulling(true);
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setPullStartY(clientY);
      setPullCurrentY(clientY);
    }
  };

  const handlePullMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPulling) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // 아래로만 당길 수 있도록 (양수만)
    if (clientY > pullStartY) {
      setPullCurrentY(clientY);
      e.preventDefault(); // 스크롤 방지
    }
  };

  const handlePullEnd = async () => {
    if (!isPulling) return;

    const pullDistance = pullCurrentY - pullStartY;
    const threshold = 80; // 80px 이상 당기면 새로고침

    setIsPulling(false);
    setPullStartY(0);
    setPullCurrentY(0);

    if (pullDistance >= threshold && hasMoreHistory && !isLoadingMoreHistory) {
      // 새로고침 실행
      await loadMoreChatHistory();
    }
  };

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden'
    }}>
      <Map
        onMapLoad={handleMapLoad}
        onLocationUpdate={handleLocationUpdate}
        onKTOPOIClick={(contentId) => {
          setKtoContentId(contentId);
          setKtoPanelHeight('half');
          setGooglePlaceDetail(null);
          setIsPanelOpen(false);
        }}
        selectedKTOContentId={ktoContentId}
      />

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000
      }}>
        <SearchBar
          onSearch={handleSearch}
          onMenuClick={handleMenuClick}
          isLoading={isLoading}
          onQuickAction={handleQuickAction}
          isPanelOpen={isPanelOpen}
          googlePanelHeight={googlePlaceDetail ? googlePanelHeight : null}
          ktoPanelHeight={ktoContentId ? ktoPanelHeight : null}
        />
      </div>

      {/* 플로팅 비티 - 패널이 모두 닫혀있을 때만 표시 */}
      <BeatyFloating
        show={!isPanelOpen && !googlePlaceDetail && !ktoContentId}
        isBubbleOpen={isBubbleOpen}
        bubbleType={bubbleType}
        bubbleMessage={bubbleMessage}
        randomPoi={randomPoi}
        isLoadingPoi={isLoadingPoi}
        onBeatyClick={handleBeatyClick}
        onPoiClick={handlePoiClick}
        onQuickSearch={handleQuickSearch}
        streamingText={streamingText}
        isStreaming={isStreaming}
      />

      {/* 하단 슬라이드 패널 */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: panelMode === 'half' ? '50vh' : 'calc(100vh - 100px)',
          backgroundColor: 'white',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.2)',
          transform: isDragging
            ? `translateY(${Math.max(0, dragCurrentY - dragStartY)}px)`
            : (isPanelOpen ? 'translateY(0)' : 'translateY(100%)'),
          transition: isDragging ? 'none' : 'transform 0.3s ease-out, height 0.3s ease-out',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {/* 패널 헤더 - 드래그 핸들 */}
        <div
          style={{
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'center',
            cursor: 'grab',
            userSelect: 'none',
            borderBottom: '1px solid #eee'
          }}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div style={{
            width: '40px',
            height: '4px',
            backgroundColor: '#ddd',
            borderRadius: '2px'
          }}></div>
        </div>

        {/* 패널 내용 */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative'
        }}>
          {/* 선택된 장소가 있으면 장소 상세 정보 표시 */}
          {selectedPlace ? (
            <div style={{ width: '100%', overflow: 'hidden', position: 'relative', height: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  position: 'relative',
                  transform: isSwipingPlace
                    ? `translateX(calc(-${currentPlaceIndex * (100 / allPlaces.length)}% + ${swipeCurrentX - swipeStartX}px))`
                    : `translateX(-${currentPlaceIndex * (100 / allPlaces.length)}%)`,
                  transition: isSwipingPlace ? 'none' : 'transform 0.3s ease-out',
                  width: `${allPlaces.length * 100}%`,
                  height: '100%'
                }}
                onMouseDown={handleSwipeStart}
                onMouseMove={handleSwipeMove}
                onMouseUp={handleSwipeEnd}
                onMouseLeave={handleSwipeEnd}
                onTouchStart={handleSwipeStart}
                onTouchMove={handleSwipeMove}
                onTouchEnd={handleSwipeEnd}
              >
                {allPlaces.map((place, index) => (
                  <div
                    key={index}
                    style={{
                      width: `${100 / allPlaces.length}%`,
                      flexShrink: 0,
                      padding: '20px',
                      paddingBottom: allPlaces.length > 1 ? '70px' : '20px',
                      position: 'relative',
                      minHeight: '100%'
                    }}
                  >
                  {/* Half 모드: 간단한 요약 정보 */}
                  {panelMode === 'half' ? (
                    <>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        {/* 작은 이미지 */}
                        {place.image && (
                          <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}>
                            <img
                              src={place.image}
                              alt={place.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        {/* 간단한 정보 */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '18px',
                            fontWeight: '700',
                            color: '#002B5C',
                            marginBottom: '6px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {place.name}
                          </div>

                          {place.address && (
                            <div style={{
                              fontSize: '12px',
                              color: '#666',
                              marginBottom: '4px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              📍 {place.address}
                            </div>
                          )}

                          {place.rating && (
                            <div style={{
                              fontSize: '12px',
                              color: '#666'
                            }}>
                              {place.rating}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 경로 타임라인 또는 간단한 설명 */}
                      {place.routeData ? (
                        <RouteTimeline routeData={place.routeData} mode="horizontal" />
                      ) : place.description ? (
                        <div style={{
                          fontSize: '13px',
                          color: '#333',
                          lineHeight: '1.5',
                          marginBottom: '12px',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {place.description}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    /* Full 모드: 전체 상세 정보 */
                    <>
                      {/* 큰 이미지 */}
                      {place.image && (
                        <div style={{
                          width: '100%',
                          height: '200px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          marginBottom: '16px'
                        }}>
                          <img
                            src={place.image}
                            alt={place.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      {/* 장소 정보 */}
                      <div style={{
                        fontSize: '22px',
                        fontWeight: '700',
                        color: '#002B5C',
                        marginBottom: '8px'
                      }}>
                        {place.name}
                      </div>

                      {place.address && (
                        <div style={{
                          fontSize: '14px',
                          color: '#666',
                          marginBottom: '12px',
                          lineHeight: '1.5'
                        }}>
                          📍 {place.address}
                        </div>
                      )}

                      {place.rating && (
                        <div style={{
                          fontSize: '14px',
                          color: '#666',
                          marginBottom: '12px'
                        }}>
                          {place.rating}
                        </div>
                      )}

                      {/* 경로 타임라인 또는 전체 설명 */}
                      {place.routeData ? (
                        <RouteTimeline routeData={place.routeData} mode="vertical" />
                      ) : place.description ? (
                        <div style={{
                          fontSize: '14px',
                          color: '#333',
                          lineHeight: '1.6',
                          marginTop: '16px',
                          padding: '12px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '8px'
                        }}>
                          {place.description}
                        </div>
                      ) : null}

                      {/* 간략히 보기 버튼 */}
                      <button
                        onClick={() => setPanelMode('half')}
                        style={{
                          width: '100%',
                          padding: '12px',
                          marginTop: '16px',
                          backgroundColor: '#f5f5f5',
                          color: '#002B5C',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        간략히 보기 ▲
                      </button>
                    </>
                  )}

                  {/* 닫기 버튼 */}
                  {index === currentPlaceIndex && (
                    <button
                      onClick={() => {
                        setSelectedPlace(null);
                        setIsPanelOpen(false);
                        setPanelMode('full');
                        // 지도 마커 모두 제거
                        clearMarkers(markersRef.current);
                        // allPlaces 초기화
                        setAllPlaces([]);
                      }}
                      style={{
                        position: 'absolute',
                        top: '28px',
                        right: '28px',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        border: 'none',
                        color: 'white',
                        fontSize: '18px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              </div>

              {/* 상세보기 버튼 - half 모드에서만 표시 */}
              {panelMode === 'half' && (
                <button
                  onClick={() => setPanelMode('full')}
                  style={{
                    position: 'absolute',
                    bottom: allPlaces.length > 1 ? '46px' : '16px',
                    left: '20px',
                    right: '20px',
                    padding: '12px',
                    backgroundColor: '#002B5C',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    zIndex: 101
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#004080';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#002B5C';
                  }}
                >
                  상세보기 ▼
                </button>
              )}
            </div>
          ) : !user ? (
            // 로그아웃 상태 - 로그인 유도
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '40px 20px',
              textAlign: 'center',
              cursor: 'pointer'
            }}
            onClick={() => setIsLoginModalOpen(true)}
            >
              {/* 게스트 아이콘 */}
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '60px',
                marginBottom: '24px',
                color: '#999'
              }}>
                👤
              </div>

              {/* 로그인 유도 문구 */}
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#002B5C',
                marginBottom: '12px'
              }}>
                로그인하고 시작하기
              </h3>
              <p style={{
                fontSize: '14px',
                color: '#666',
                lineHeight: '1.6',
                marginBottom: '24px'
              }}>
                로그인하시면 개인화된<br />
                서울 여행 추천을 받아보실 수 있어요
              </p>

              {/* 로그인 버튼 */}
              <button style={{
                padding: '12px 32px',
                backgroundColor: '#002B5C',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#003d7a'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#002B5C'}
              >
                로그인하기
              </button>
            </div>
          ) : isRecentPlacesExpanded ? (
            /* 최근 본 장소 전체보기 모드 */
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* 헤더 */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <button
                  onClick={handleRecentPlacesClose}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid #ddd',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    color: '#666'
                  }}
                >
                  ←
                </button>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#002B5C'
                }}>
                  최근 본 장소
                </div>
              </div>

              {/* 장소 그리드 */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px'
              }}>
                {recentPlaces.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    color: '#999',
                    padding: '40px 0',
                    fontSize: '14px'
                  }}>
                    최근 본 장소가 없습니다
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px'
                  }}>
                    {recentPlaces.map((place, idx) => (
                      <div
                        key={idx}
                        onClick={() => {

                          // 기존 마커 제거
                          clearMarkers(markersRef.current);

                          // 마커 추가
                          if (mapRef.current) {
                            const markers: MarkerData[] = [{
                              lng: place.lng,
                              lat: place.lat,
                              title: place.name,
                              name: place.name,
                              address: place.address,
                              description: place.description,
                              color: '#FF6B9D',
                              image: place.image,
                              rating: place.rating,
                              contentId: place.contentId,
                              contentTypeId: place.contentTypeId,
                              placeId: place.placeId,
                              menu_url: place.menu_url,
                              website: place.website,
                              phone: place.phone,
                              opening_hours: place.opening_hours,
                              reviews: place.reviews,
                              photos: place.photos
                            }];

                            addMarkers(mapRef.current, markersRef.current, markers, handleMarkerClick);

                            // 지도 이동
                            mapRef.current.flyTo({
                              center: [place.lng, place.lat],
                              zoom: 15,
                              duration: 1000
                            });
                          }

                          // 최근 본 장소 패널 닫기
                          setIsRecentPlacesExpanded(false);
                          // 홈패널 닫기
                          setIsPanelOpen(false);

                          // KTO 데이터인 경우 KTODetailPanel 열기
                          if (place.contentId) {
                            setKtoContentId(place.contentId);
                            setKtoPanelHeight('half');  // 항상 half로 시작
                            setGooglePlaceDetail(null);  // Google 패널 닫기
                          } else {
                            // Google Places 데이터는 GoogleDetailPanel로 표시
                            const googlePlace: SelectedPlace = {
                              name: place.name,
                              address: place.address,
                              lat: place.lat,
                              lng: place.lng,
                              image: place.image,
                              description: place.description,
                              rating: place.rating
                            };
                            setGooglePlaceDetail(googlePlace);
                            setKtoContentId(null);  // KTO 패널 닫기
                          }
                        }}
                        style={{
                          borderRadius: '12px',
                          overflow: 'hidden',
                          backgroundColor: 'white',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                          cursor: 'pointer',
                          transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                        }}
                      >
                        {/* 이미지 */}
                        <div style={{
                          width: '100%',
                          height: '120px',
                          backgroundColor: place.image ? 'transparent' : '#e0e0e0',
                          backgroundImage: place.image ? `url(${place.image})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '32px'
                        }}>
                          {!place.image && '📍'}
                        </div>

                        {/* 정보 */}
                        <div style={{ padding: '12px' }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#333',
                            marginBottom: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {place.name}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: '#999',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {place.address}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : isChatHistoryExpanded ? (
            /* 대화기록 전체보기 모드 */
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* 헤더 */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <button
                  onClick={handleChatHistoryClose}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid #ddd',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    color: '#666'
                  }}
                >
                  ←
                </button>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#002B5C'
                }}>
                  대화기록
                </div>
              </div>

              {/* 채팅 메시지 리스트 (reverse order: 아래가 최신) */}
              <div
                ref={chatHistoryScrollRef}
                onMouseDown={handlePullStart}
                onMouseMove={handlePullMove}
                onMouseUp={handlePullEnd}
                onMouseLeave={handlePullEnd}
                onTouchStart={handlePullStart}
                onTouchMove={handlePullMove}
                onTouchEnd={handlePullEnd}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                {/* Pull-to-refresh 인디케이터 영역 */}
                <div style={{
                  height: isPulling ? Math.min(pullCurrentY - pullStartY, 100) : (isLoadingMoreHistory ? 60 : 0),
                  transition: isPulling ? 'none' : 'height 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  backgroundColor: '#f8f9fa'
                }}>
                  {isLoadingMoreHistory ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#666',
                      fontSize: '13px'
                    }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #ddd',
                        borderTop: '2px solid #4A90E2',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      불러오는 중...
                    </div>
                  ) : isPulling && (pullCurrentY - pullStartY) >= 80 ? (
                    <div style={{ color: '#4A90E2', fontSize: '13px', fontWeight: '600' }}>
                      ↓ 놓으면 새로고침
                    </div>
                  ) : isPulling ? (
                    <div style={{ color: '#999', fontSize: '13px' }}>
                      ↓ 당겨서 새로고침
                    </div>
                  ) : null}
                </div>

                {/* 메시지 컨테이너 */}
                <div style={{
                  flex: 1,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column-reverse',
                  gap: '16px'
                }}>
                  {/* 더 이상 없음 메시지 */}
                  {!hasMoreHistory && chatHistory.length > 20 && (
                    <div style={{
                      textAlign: 'center',
                      padding: '12px',
                      color: '#999',
                      fontSize: '13px'
                    }}>
                      모든 대화를 불러왔습니다
                    </div>
                  )}

                {/* 대화 메시지들 (최신이 아래) */}
                {chatHistory.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    color: '#999',
                    padding: '40px 0',
                    fontSize: '14px'
                  }}>
                    대화 내역이 없습니다
                  </div>
                ) : (
                  chatHistory.map((history) => {
                    const date = new Date(history.created_at);
                    const timeStr = `${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

                    return (
                      <div key={history.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* 내 질의 (오른쪽 정렬) */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <div
                            style={{
                              maxWidth: '75%',
                              padding: '10px 14px',
                              backgroundColor: '#4A90E2',
                              color: 'white',
                              borderRadius: '16px 16px 4px 16px',
                              fontSize: '14px',
                              lineHeight: '1.5',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                            }}
                          >
                            {history.query_text}
                          </div>
                        </div>

                        {/* 비티 응답 (왼쪽 정렬) */}
                        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', gap: '8px' }}>
                          {/* 비티 아이콘 */}
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#FFE5EC',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px'
                          }}>
                            ☀️
                          </div>

                          <div
                            onClick={async () => {
                              // 대화 클릭 시 검색 결과 복원
                              // final_result가 JSON 문자열이면 파싱
                              let parsedResult = history.final_result;
                              if (typeof parsedResult === 'string') {
                                try {
                                  parsedResult = JSON.parse(parsedResult);
                                } catch (e) {
                                  console.error('[CHAT_HISTORY] JSON 파싱 실패:', e);
                                  return;
                                }
                              }


                              const responseData = {
                                intent: history.intent,
                                answer: history.beaty_response_text,
                                data: parsedResult
                              };
                              setResponse(responseData);
                              clearMarkers(markersRef.current);

                              // intent별로 마커 추가
                              if (history.intent === 'FIND_PLACE' && parsedResult?.places) {
                                const markers: MarkerData[] = parsedResult.places.map((place: any, index: number) => ({
                                  lng: place.lng,
                                  lat: place.lat,
                                  title: place.name,
                                  name: place.name,
                                  address: place.address,
                                  description: place.rating ? `⭐ ${place.rating}` : undefined,
                                  color: '#4A90E2',
                                  rank: index + 1,
                                  rating: place.rating,
                                  placeId: place.place_id,
                                  menu_url: place.menu_url,
                                  website: place.website,
                                  phone: place.phone,
                                  opening_hours: place.opening_hours,
                                  reviews: place.reviews,
                                  photos: place.photos
                                }));

                                const places: SelectedPlace[] = parsedResult.places.map((place: any) => ({
                                  name: place.name,
                                  address: place.address,
                                  lat: place.lat,
                                  lng: place.lng,
                                  rating: place.rating
                                }));
                                setAllPlaces(places);

                                if (mapRef.current) {
                                  const bounds = addMarkers(mapRef.current, markersRef.current, markers, handleMarkerClick);
                                  if (bounds) {
                                    mapRef.current.fitBounds(bounds, {
                                      padding: { top: 100, bottom: 100, left: 50, right: 50 },
                                      maxZoom: 15,
                                      duration: 1000
                                    });
                                  }
                                }
                              }
                              else if (history.intent === 'RECOMMEND' && parsedResult?.pois) {
                                const markers: MarkerData[] = parsedResult.pois.map((poi: any, index: number) => ({
                                  lng: poi.mapx,
                                  lat: poi.mapy,
                                  title: poi.title || poi.name,
                                  name: poi.title || poi.name,
                                  address: poi.addr1 || poi.address,
                                  description: poi.beaty_description,
                                  color: '#28a745',
                                  rank: index + 1,
                                  contentId: poi.content_id,
                                  contentTypeId: poi.content_type_id
                                }));

                                const places: SelectedPlace[] = parsedResult.pois.map((poi: any) => ({
                                  name: poi.title || poi.name,
                                  address: poi.addr1 || poi.address,
                                  lat: poi.mapy,
                                  lng: poi.mapx,
                                  description: poi.beaty_description,
                                  contentId: poi.content_id,
                                  contentTypeId: poi.content_type_id
                                }));
                                setAllPlaces(places);

                                if (mapRef.current) {
                                  const bounds = addMarkers(mapRef.current, markersRef.current, markers, handleMarkerClick);
                                  if (bounds) {
                                    mapRef.current.fitBounds(bounds, {
                                      padding: { top: 100, bottom: 100, left: 50, right: 50 },
                                      maxZoom: 15,
                                      duration: 1000
                                    });
                                  }
                                }
                              }
                              else if (history.intent === 'LANDMARK' && parsedResult?.landmarks) {
                                const markers: MarkerData[] = parsedResult.landmarks.map((landmark: any) => ({
                                  lng: landmark.mapx,
                                  lat: landmark.mapy,
                                  title: landmark.title,
                                  name: landmark.title,
                                  address: landmark.addr1,
                                  description: landmark.description,
                                  color: '#6f42c1',
                                  rank: landmark.rank,
                                  image: landmark.first_image,
                                  contentId: landmark.content_id,
                                  contentTypeId: landmark.content_type_id
                                }));

                                const places: SelectedPlace[] = parsedResult.landmarks.map((landmark: any) => ({
                                  name: landmark.title,
                                  address: landmark.addr1,
                                  lat: landmark.mapy,
                                  lng: landmark.mapx,
                                  description: landmark.description,
                                  image: landmark.first_image
                                }));
                                setAllPlaces(places);

                                if (mapRef.current) {
                                  addMarkers(mapRef.current, markersRef.current, markers, handleMarkerClick);
                                }
                              }
                              else if (history.intent === 'RANDOM' && parsedResult?.poi) {
                                // RANDOM 인텐트 - 단일 POI
                                const poi = parsedResult.poi;
                                const markers: MarkerData[] = [{
                                  lng: poi.mapx,
                                  lat: poi.mapy,
                                  title: poi.title,
                                  address: poi.addr1,
                                  description: poi.beaty_description,
                                  color: '#FF6B9D',
                                  image: poi.first_image
                                }];

                                const places: SelectedPlace[] = [{
                                  name: poi.title,
                                  address: poi.addr1,
                                  lat: poi.mapy,
                                  lng: poi.mapx,
                                  description: poi.beaty_description,
                                  image: poi.first_image,
                                  contentId: poi.content_id,
                                  contentTypeId: poi.content_type_id
                                }];
                                setAllPlaces(places);

                                if (mapRef.current) {
                                  addMarkers(mapRef.current, markersRef.current, markers, handleMarkerClick);

                                  // 지도 이동
                                  mapRef.current.flyTo({
                                    center: [poi.mapx, poi.mapy],
                                    zoom: 15,
                                    duration: 1000
                                  });
                                }
                              }

                              // 패널 닫고 말풍선 열기
                              setIsChatHistoryExpanded(false);
                              setIsPanelOpen(false);
                              setBubbleType('response');
                              setBubbleMessage(history.beaty_response_text);
                              setIsBubbleOpen(true);
                            }}
                            style={{ display: 'flex', flexDirection: 'column', maxWidth: 'calc(75% - 40px)', cursor: 'pointer' }}
                          >
                            <div style={{
                              padding: '10px 14px',
                              backgroundColor: '#f8f9fa',
                              color: '#333',
                              borderRadius: '16px 16px 16px 4px',
                              fontSize: '14px',
                              lineHeight: '1.5',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#e9ecef';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#f8f9fa';
                            }}
                            >
                              {history.beaty_response_text}
                            </div>
                            <div style={{
                              fontSize: '11px',
                              color: '#999',
                              marginTop: '4px',
                              paddingLeft: '4px'
                            }}>
                              {timeStr} · {history.result_count}개
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                </div>
              </div>

              {/* 스피너 애니메이션 CSS */}
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : !tripContext ? (
            // 로그인했지만 TripContext 로딩 중
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#999'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid #f3f3f3',
                borderTop: '3px solid #4A90E2',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              {/* 스피너 애니메이션 CSS */}
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : (
            <div>
              {/* 여행 컨텍스트 헤더 */}
              <div style={{
                padding: '20px',
                borderBottom: '1px solid #f0f0f0'
              }}>
                {/* 상단 버튼들 */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '30px',
                  overflowX: 'auto',
                  alignItems: 'center'
                }}>
                  {/* 프로필 사진 */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#4A90E2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: '600',
                    flexShrink: 0,
                    marginRight: '-4px'
                  }}>
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>

                  {/* 사용자 이름 */}
                  <div style={{
                    padding: '10px 8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#666',
                    whiteSpace: 'nowrap'
                  }}>
                    {user.name || 'User'}님
                  </div>

                  {/* 관심사 영역 (회색 테두리로 감싸기) */}
                  {tripContext && tripContext.interests && tripContext.interests.length > 0 && (
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      padding: '1px 12px',
                      borderRadius: '20px',
                      border: '2px solid #ddd',
                      backgroundColor: 'transparent',
                      alignItems: 'center'
                    }}>
                      {tripContext.interests.map((interest, index) => {
                        const categoryName = categoryNames[interest] || '';
                        const emoji = categoryName ? getCategoryEmoji(categoryName) : getCategoryEmoji('기본');
                        return (
                          <div key={index} style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            flexShrink: 0,
                            cursor: 'pointer'
                          }}>
                            {emoji}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 동행인 버튼 (동그라미 테두리) */}
                  {tripContext && tripContext.companions && (
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      border: '2px solid #ddd',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      flexShrink: 0,
                      cursor: 'pointer'
                    }}>
                      {getCompanionEmoji(tripContext.companions)}
                    </div>
                  )}

                  {/* 여행목적 버튼들 */}
                  {tripContext && tripContext.purpose && tripContext.purpose.map((p, index) => (
                    <div key={index} style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      border: '2px solid white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      flexShrink: 0,
                      cursor: 'pointer'
                    }}>
                      🎯
                    </div>
                  ))}
                </div>

                {/* 타임라인 */}
                {tripContext && tripContext.total_days && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '16px'
                  }}>
                    {Array.from({ length: tripContext.total_days }).map((_, dayIndex) => {
                      const dayNumber = dayIndex + 1;
                      const isCurrent = dayNumber === tripContext.current_day;
                      const isPast = dayNumber < tripContext.current_day;
                      const isFuture = dayNumber > tripContext.current_day;

                      return (
                        <div key={dayNumber} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <div style={{
                              width: isCurrent ? '48px' : '24px',
                              height: isCurrent ? '48px' : '24px',
                              borderRadius: '50%',
                              backgroundColor: isCurrent ? 'white' : (isFuture ? '#f5f5f5' : '#ddd'),
                              border: isCurrent ? '3px solid #4A90E2' : 'none',
                              transition: 'all 0.3s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: isCurrent ? 'pointer' : 'default'
                            }}
                            onClick={() => {
                              if (isCurrent && weather) {
                                setShowWeatherDetail(true);
                              }
                            }}
                            >
                              {isCurrent && weather && (
                                <>
                                  <div style={{ fontSize: '16px', lineHeight: '1' }}>{weather.emoji}</div>
                                  <div style={{ fontSize: '10px', fontWeight: '600', color: '#4A90E2', lineHeight: '1', marginTop: '2px' }}>{weather.temperature}°</div>
                                </>
                              )}
                            </div>
                          </div>
                          {dayNumber < tripContext.total_days && (
                            <div style={{
                              width: '20px',
                              height: '2px',
                              backgroundColor: isFuture ? '#f5f5f5' : '#ddd'
                            }}></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 날짜 표시 */}
                <div style={{
                  textAlign: 'center',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#4A90E2',
                  marginBottom: '12px'
                }}>
                  {tripContext ? `${tripContext.current_day}일차` : '여행 시작'}
                </div>

                {/* 질문 텍스트 */}
                <div style={{
                  textAlign: 'center',
                  fontSize: '16px',
                  color: '#333',
                  fontWeight: '500'
                }}>
                  오늘은 어떤 여행을 하고 계신가요?
                </div>
              </div>

              {/* 스크롤 가능한 컨텐츠 영역 */}
              <div style={{ padding: '16px' }}>
                {/* 추천 장소 갤러리 */}
                <div style={{
                  marginBottom: '20px',
                  marginLeft: '-16px',
                  marginRight: '-16px'
                }}>
                  <div style={{
                    paddingLeft: '16px',
                    marginBottom: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#002B5C'
                  }}>
                    이런 장소는 어때요?
                  </div>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'scroll',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  paddingBottom: '4px',
                  WebkitOverflowScrolling: 'touch'
                }}>
                  {[
                    { icon: '🏛️', name: '경복궁' },
                    { icon: '🍜', name: '명동교자' },
                    { icon: '🏖️', name: '명동거리' },
                    { icon: '🌳', name: '남산공원' },
                    { icon: '🎭', name: '북촌한옥마을' },
                    { icon: '🗼', name: '남산타워' },
                    { icon: '🎨', name: '인사동' },
                    { icon: '🏰', name: '창덕궁' },
                    { icon: '🌉', name: '청계천' },
                    { icon: '🎪', name: '홍대거리' }
                  ].map((place, idx) => (
                    <div
                      key={idx}
                      style={{
                        minWidth: '80px',
                        width: '80px',
                        flexShrink: 0,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: 'white',
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <div style={{
                        width: '100%',
                        height: '60px',
                        backgroundColor: '#e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px'
                      }}>
                        {place.icon}
                      </div>
                      <div style={{
                        padding: '6px'
                      }}>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#333',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          textAlign: 'center'
                        }}>
                          {place.name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 최근 대화기록 섹션 */}
              <div style={{
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#002B5C'
                  }}>
                    최근 대화기록
                  </div>
                  <button
                    onClick={handleChatHistoryExpand}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: 'transparent',
                      color: '#666',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    더보기
                  </button>
                </div>

                {chatHistory.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    color: '#999',
                    padding: '16px 0',
                    fontSize: '13px'
                  }}>
                    대화 내역이 없습니다
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {chatHistory.slice(0, 5).map((history) => {
                        const date = new Date(history.created_at);
                        const timeStr = `${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

                        return (
                          <div
                            key={history.id}
                            onClick={async () => {
                              // 더보기 안에서 클릭한 것과 동일한 액션 실행
                              // final_result가 JSON 문자열이면 파싱
                              let parsedResult = history.final_result;
                              if (typeof parsedResult === 'string') {
                                try {
                                  parsedResult = JSON.parse(parsedResult);
                                } catch (e) {
                                  console.error('[CHAT_HISTORY] JSON 파싱 실패:', e);
                                  return;
                                }
                              }

                              const responseData = {
                                intent: history.intent,
                                answer: history.beaty_response_text,
                                data: parsedResult
                              };
                              setResponse(responseData);
                              clearMarkers(markersRef.current);

                              // intent별로 마커 추가
                              if (history.intent === 'FIND_PLACE' && parsedResult?.places) {
                                const markers: MarkerData[] = parsedResult.places.map((place: any, index: number) => ({
                                  lng: place.lng,
                                  lat: place.lat,
                                  title: place.name,
                                  name: place.name,
                                  address: place.address,
                                  description: place.rating ? `⭐ ${place.rating}` : undefined,
                                  color: '#4A90E2',
                                  rank: index + 1,
                                  rating: place.rating,
                                  placeId: place.place_id,
                                  menu_url: place.menu_url,
                                  website: place.website,
                                  phone: place.phone,
                                  opening_hours: place.opening_hours,
                                  reviews: place.reviews,
                                  photos: place.photos
                                }));

                                const places: SelectedPlace[] = parsedResult.places.map((place: any) => ({
                                  name: place.name,
                                  address: place.address,
                                  lat: place.lat,
                                  lng: place.lng,
                                  rating: place.rating
                                }));
                                setAllPlaces(places);

                                if (mapRef.current) {
                                  const bounds = addMarkers(mapRef.current, markersRef.current, markers, handleMarkerClick);
                                  if (bounds) {
                                    mapRef.current.fitBounds(bounds, {
                                      padding: { top: 100, bottom: 100, left: 50, right: 50 },
                                      maxZoom: 15,
                                      duration: 1000
                                    });
                                  }
                                }
                              }
                              else if (history.intent === 'RECOMMEND' && parsedResult?.pois) {
                                const markers: MarkerData[] = parsedResult.pois.map((poi: any, index: number) => ({
                                  lng: poi.mapx,
                                  lat: poi.mapy,
                                  title: poi.title || poi.name,
                                  name: poi.title || poi.name,
                                  address: poi.addr1 || poi.address,
                                  description: poi.beaty_description,
                                  color: '#28a745',
                                  rank: index + 1,
                                  contentId: poi.content_id,
                                  contentTypeId: poi.content_type_id
                                }));

                                const places: SelectedPlace[] = parsedResult.pois.map((poi: any) => ({
                                  name: poi.title || poi.name,
                                  address: poi.addr1 || poi.address,
                                  lat: poi.mapy,
                                  lng: poi.mapx,
                                  description: poi.beaty_description,
                                  contentId: poi.content_id,
                                  contentTypeId: poi.content_type_id
                                }));
                                setAllPlaces(places);

                                if (mapRef.current) {
                                  const bounds = addMarkers(mapRef.current, markersRef.current, markers, handleMarkerClick);
                                  if (bounds) {
                                    mapRef.current.fitBounds(bounds, {
                                      padding: { top: 100, bottom: 100, left: 50, right: 50 },
                                      maxZoom: 15,
                                      duration: 1000
                                    });
                                  }
                                }
                              }
                              else if (history.intent === 'LANDMARK' && parsedResult?.landmarks) {
                                const markers: MarkerData[] = parsedResult.landmarks.map((landmark: any) => ({
                                  lng: landmark.mapx,
                                  lat: landmark.mapy,
                                  title: landmark.title,
                                  name: landmark.title,
                                  address: landmark.addr1,
                                  description: landmark.description,
                                  color: '#6f42c1',
                                  rank: landmark.rank,
                                  image: landmark.first_image,
                                  contentId: landmark.content_id,
                                  contentTypeId: landmark.content_type_id
                                }));

                                const places: SelectedPlace[] = parsedResult.landmarks.map((landmark: any) => ({
                                  name: landmark.title,
                                  address: landmark.addr1,
                                  lat: landmark.mapy,
                                  lng: landmark.mapx,
                                  description: landmark.description,
                                  image: landmark.first_image
                                }));
                                setAllPlaces(places);

                                if (mapRef.current) {
                                  addMarkers(mapRef.current, markersRef.current, markers, handleMarkerClick);
                                }
                              }
                              else if (history.intent === 'RANDOM' && parsedResult?.poi) {
                                // RANDOM 인텐트 - 단일 POI
                                const poi = parsedResult.poi;
                                const markers: MarkerData[] = [{
                                  lng: poi.mapx,
                                  lat: poi.mapy,
                                  title: poi.title,
                                  address: poi.addr1,
                                  description: poi.beaty_description,
                                  color: '#FF6B9D',
                                  image: poi.first_image
                                }];

                                const places: SelectedPlace[] = [{
                                  name: poi.title,
                                  address: poi.addr1,
                                  lat: poi.mapy,
                                  lng: poi.mapx,
                                  description: poi.beaty_description,
                                  image: poi.first_image,
                                  contentId: poi.content_id,
                                  contentTypeId: poi.content_type_id
                                }];
                                setAllPlaces(places);

                                if (mapRef.current) {
                                  addMarkers(mapRef.current, markersRef.current, markers, handleMarkerClick);

                                  // 지도 이동
                                  mapRef.current.flyTo({
                                    center: [poi.mapx, poi.mapy],
                                    zoom: 15,
                                    duration: 1000
                                  });
                                }
                              }

                              // 패널 닫고 말풍선 열기
                              setIsPanelOpen(false);
                              setBubbleType('response');
                              setBubbleMessage(history.beaty_response_text);
                              setIsBubbleOpen(true);
                            }}
                            style={{
                              padding: '8px 10px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#e9ecef';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#f8f9fa';
                            }}
                          >
                            <div style={{
                              fontSize: '13px',
                              fontWeight: '500',
                              color: '#333',
                              marginBottom: '3px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {history.query_text}
                            </div>
                            <div style={{
                              fontSize: '11px',
                              color: '#999'
                            }}>
                              {timeStr} · {history.result_count}개
                            </div>
                          </div>
                        );
                      })}
                    </div>
                )}
              </div>

              {/* 최근 본 장소 섹션 */}
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#002B5C'
                  }}>
                    최근 본 장소
                  </div>
                  <button
                    onClick={handleRecentPlacesExpand}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: 'transparent',
                      color: '#666',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    더보기
                  </button>
                </div>

                {recentPlaces.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    color: '#999',
                    padding: '16px 0',
                    fontSize: '13px'
                  }}>
                    최근 검색한 장소가 없습니다
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px',
                    overflowX: 'auto'
                  }}>
                    {recentPlaces.slice(0, 4).map((place) => {
                      return (
                        <div
                          key={place.id}
                          onClick={() => {
                            // 더보기 안에서 클릭한 것과 동일한 액션 실행
                            // 기존 마커 제거
                            clearMarkers(markersRef.current);

                            // 마커 추가
                            if (mapRef.current) {
                              const markers: MarkerData[] = [{
                                lng: place.lng,
                                lat: place.lat,
                                title: place.name,
                                name: place.name,
                                address: place.address,
                                description: place.description,
                                color: '#FF6B9D',
                                image: place.image,
                                rating: place.rating,
                                contentId: place.contentId,
                                contentTypeId: place.contentTypeId,
                                placeId: place.placeId,
                                menu_url: place.menu_url,
                                website: place.website,
                                phone: place.phone,
                                opening_hours: place.opening_hours,
                                reviews: place.reviews,
                                photos: place.photos
                              }];

                              addMarkers(mapRef.current, markersRef.current, markers, handleMarkerClick);

                              // 지도 이동
                              mapRef.current.flyTo({
                                center: [place.lng, place.lat],
                                zoom: 15,
                                duration: 1000
                              });
                            }

                            // 홈패널 닫기
                            setIsPanelOpen(false);

                            // KTO 데이터인 경우 KTODetailPanel 열기
                            if (place.contentId) {
                              setKtoContentId(place.contentId);
                              setKtoPanelHeight('half');  // 항상 half로 시작
                              setGooglePlaceDetail(null);  // Google 패널 닫기
                            } else {
                              // Google Places 데이터는 GoogleDetailPanel로 표시
                              const googlePlace: SelectedPlace = {
                                name: place.name,
                                address: place.address,
                                lat: place.lat,
                                lng: place.lng,
                                image: place.image,
                                description: place.description,
                                rating: place.rating
                              };
                              setGooglePlaceDetail(googlePlace);
                              setKtoContentId(null);  // KTO 패널 닫기
                            }
                          }}
                          style={{
                            padding: '8px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            aspectRatio: '1',
                            minWidth: 0
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#e9ecef';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                          }}
                        >
                          {/* 이미지 썸네일 */}
                          {place.image ? (
                            <div style={{
                              width: '100%',
                              aspectRatio: '1',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              backgroundColor: '#e0e0e0'
                            }}>
                              <img
                                src={place.image}
                                alt={place.name}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div style={{
                              width: '100%',
                              aspectRatio: '1',
                              borderRadius: '6px',
                              backgroundColor: '#e0e0e0'
                            }} />
                          )}

                          <div style={{
                            fontSize: '11px',
                            fontWeight: '500',
                            color: '#333',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textAlign: 'center'
                          }}>
                            {place.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              </div>
            </div>
          )}

          {/* 날씨 상세 패널 */}
          {showWeatherDetail && (
            <WeatherDetailPanel onClose={() => setShowWeatherDetail(false)} />
          )}
        </div>

        {/* 슬라이드 인디케이터 (여러 장소가 있을 때만, half 모드에서만) */}
        {selectedPlace && allPlaces.length > 1 && panelMode === 'half' && (
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '6px',
            alignItems: 'center',
            zIndex: 100
          }}>
            {allPlaces.map((_, index) => (
              <div
                key={index}
                onClick={() => {
                  setCurrentPlaceIndex(index);
                  setSelectedPlace(allPlaces[index]);
                  if (mapRef.current) {
                    const newPlace = allPlaces[index];
                    const map = mapRef.current;
                    const currentZoom = map.getZoom();
                    const targetZoom = 15;
                    if (Math.abs(currentZoom - targetZoom) > 0.1) {
                      map.setZoom(targetZoom);
                    }
                    const canvas = map.getCanvas();
                    const canvasHeight = canvas.height;
                    const targetPoint = map.project([newPlace.lng, newPlace.lat]);
                    const offsetPixels = canvasHeight * 0.125;
                    const centerPoint = {
                      x: targetPoint.x,
                      y: targetPoint.y + offsetPixels
                    };
                    const targetCenter = map.unproject(centerPoint);
                    map.flyTo({
                      center: [targetCenter.lng, targetCenter.lat],
                      zoom: targetZoom,
                      duration: 800
                    });
                  }
                }}
                style={{
                  width: index === currentPlaceIndex ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: index === currentPlaceIndex ? '#002B5C' : 'rgba(0, 43, 92, 0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        )}

        {/* 패널 하단 고정 메뉴 (로그인 상태일 때만) */}
        {!selectedPlace && user && (
          <div style={{
            borderTop: '1px solid #e0e0e0',
            padding: '8px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '16px',
            fontSize: '13px',
            color: '#666'
          }}>
            <button
              onClick={() => setIsLogoutModalOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                fontSize: '13px',
                cursor: 'pointer',
                padding: 0
              }}
            >
              로그아웃
            </button>
            <span style={{ color: '#ddd' }}>|</span>
            <button
              onClick={() => {
                // TODO: 이용약관 페이지
                alert('이용약관 페이지 (준비중)');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                fontSize: '13px',
                cursor: 'pointer',
                padding: 0
              }}
            >
              이용약관
            </button>
            <span style={{ color: '#ddd' }}>|</span>
            <button
              onClick={() => {
                // TODO: 정보수정 페이지
                alert('정보수정 페이지 (준비중)');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                fontSize: '13px',
                cursor: 'pointer',
                padding: 0
              }}
            >
              정보수정
            </button>
          </div>
        )}
      </div>

      {/* 로그인 모달 */}
      {isLoginModalOpen && (
        <div
          onClick={() => setIsLoginModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              padding: '32px 24px',
              width: '90%',
              maxWidth: '380px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>☀️</div>
              <h2 style={{
                fontSize: '22px',
                fontWeight: '700',
                marginBottom: '8px',
                color: '#002B5C'
              }}>
                비티와 함께 여행하기
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#666',
                lineHeight: '1.5'
              }}>
                간편하게 로그인하고<br />맞춤형 여행 추천을 받아보세요
              </p>
            </div>

            {/* 구글 로그인 버튼 */}
            <button
              onClick={() => googleLogin()}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: 'white',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f8f8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
                <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z" fill="#34A853"/>
                <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
                <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
              </svg>
              Google로 계속하기
            </button>

            {/* 애플 로그인 버튼 */}
            <button
              onClick={() => {
                // TODO: Implement Apple OAuth with Supabase
                setUser({
                  email: 'user@appleid.com',
                  profile_image: null,
                  provider: 'apple'
                });
                setIsLoginModalOpen(false);
              }}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#000',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.2s',
                marginBottom: '16px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#333';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#000';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.927 16.791c-.457.653-1.003 1.306-1.802 1.32-.75.015-1.004-.444-1.87-.444-.867 0-1.15.428-1.87.459-.748.03-1.404-.718-1.862-1.371C7.89 14.74 6.967 11.2 8.663 8.816c.81-1.179 2.258-1.925 3.827-1.94.754-.016 1.463.412 1.927.412.464 0 1.334-.509 2.248-.434.383.016 1.46.154 2.15 1.163-.056.035-1.284.749-1.27 2.234.015 1.776 1.56 2.364 1.575 2.378-.016.045-.246.84-.81 1.665zM13.08 5.622c.653-.791.094-1.523.07-1.567-.63.025-1.391.422-1.84 1.164-.398.655-.097 1.464-.063 1.493.626.045 1.222-.418 1.833-1.09z" fill="currentColor"/>
              </svg>
              Apple로 계속하기
            </button>

            <button
              onClick={() => setIsLoginModalOpen(false)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'transparent',
                color: '#999',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              나중에 하기
            </button>
          </div>
        </div>
      )}

      {/* 로그아웃 확인 모달 */}
      {isLogoutModalOpen && (
        <div
          onClick={() => setIsLogoutModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              padding: '32px 24px',
              width: '90%',
              maxWidth: '350px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👋</div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                marginBottom: '8px',
                color: '#002B5C'
              }}>
                로그아웃 하시겠어요?
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#666',
                lineHeight: '1.5'
              }}>
                다시 로그인하시면<br />맞춤형 추천을 계속 받을 수 있어요
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f5f5f5',
                  color: '#666',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={async () => {
                  setIsLogoutModalOpen(false);
                  setIsAuthLoading(true);
                  try {
                    const sessionToken = getSessionToken();
                    if (sessionToken) {
                      await logoutApi(sessionToken);
                    }
                    clearSession();
                    setUser(null);
                  } catch (error) {
                    console.error('Logout failed:', error);
                    // Clear session anyway on logout error
                    clearSession();
                    setUser(null);
                  } finally {
                    setIsAuthLoading(false);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 전체 로딩 창 */}
      {isAuthLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4000
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div style={{
            marginTop: '20px',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            처리 중...
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* 여행 온보딩 모달 */}
      <TripOnboardingModal
        isOpen={isTripOnboardingOpen}
        onClose={() => setIsTripOnboardingOpen(false)}
        onComplete={async () => {
          setIsTripOnboardingOpen(false);

          // Fetch trip context after trip is created
          const sessionToken = getSessionToken();
          if (sessionToken) {
            try {
              const tripContextResponse = await getTripContext(sessionToken);
              if (tripContextResponse.has_active_trip && tripContextResponse.trip_context) {
                setTripContext(tripContextResponse.trip_context);
              }
            } catch (error) {
              console.error('Failed to fetch trip context:', error);
            }
          }

          alert('여행 정보가 저장되었습니다! 맞춤형 추천을 받아보세요 ✨');
        }}
      />

      {/* KTO 상세 정보 패널 */}
      <KTODetailPanel
        contentId={ktoContentId}
        onClose={() => setKtoContentId(null)}
        panelHeight={ktoPanelHeight}
        onToggleHeight={() => setKtoPanelHeight(prev => prev === 'half' ? 'full' : 'half')}
      />

      {/* Google Places 상세 정보 패널 */}
      <GoogleDetailPanel
        place={googlePlaceDetail}
        onClose={() => setGooglePlaceDetail(null)}
        panelHeight={googlePanelHeight}
        onToggleHeight={() => setGooglePanelHeight(prev => prev === 'half' ? 'full' : 'half')}
      />
    </div>
  );
}

export default App;
