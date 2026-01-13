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
import RoutePanel from './components/map/RoutePanel';
import ReservationPanel, { type ReservationData } from './components/poi/ReservationPanel';
import CouponModal, { type Coupon } from './components/common/CouponModal';
import CouponListPanel from './components/common/CouponListPanel';
import HomePanel from './components/home/HomePanel';
import UserProfile from './components/home/UserProfile';
import BeatyBubble from './components/beaty/BeatyBubble';
import FaqCardModal from './components/faq/FaqCardModal';
import { faqCards } from './data/faqCards';
import type { FaqCard } from './data/faqCards';
import { DEMO_CAFE_PLACE_IDS, CAFE_KEYWORDS } from './data/demoCafes';
import { getPlacesByIds } from './services/poiApi';
import { useGeoLocation } from './hooks/useGeoLocation';
import { useAuth } from './hooks/useAuth';
import { useWeather } from './hooks/useWeather';
import { useBackNavigation } from './hooks/useBackNavigation';
import { useDiscoveryMode } from './hooks/useDiscoveryMode';
import { useTranslation } from './hooks/useTranslation';
import { getSavedLanguage, saveLanguage, type Language } from './locales';
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
  const [isRoutePanelOpen, setIsRoutePanelOpen] = useState(false);
  const [routeFromName, setRouteFromName] = useState('');
  const [routeToName, setRouteToName] = useState('');
  const [isReservationPanelOpen, setIsReservationPanelOpen] = useState(false);
  const [reservationPoiName, setReservationPoiName] = useState('');
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [issuedCoupon, setIssuedCoupon] = useState<Coupon | null>(null);
  const [isCouponListPanelOpen, setIsCouponListPanelOpen] = useState(false);
  const [language] = useState<Language>(getSavedLanguage);

  // 번역
  const t = useTranslation(language);
  const [beatyBubbleMessage, setBeatyBubbleMessage] = useState(t.beaty.defaultMessage);

  // 언어 변경 핸들러 (앱 재시작)
  const handleLanguageChange = (newLang: Language) => {
    if (newLang !== language) {
      if (window.confirm(t.home.languageChangeConfirm)) {
        saveLanguage(newLang);
        window.location.reload();
      }
    }
  };

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
    onMessage: showBeatyBubble,
    language
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
    { isOpen: isHomePanelOpen, close: () => setIsHomePanelOpen(false) },
    { isOpen: isRoutePanelOpen, close: () => setIsRoutePanelOpen(false) },
    { isOpen: isReservationPanelOpen, close: () => setIsReservationPanelOpen(false) },
    { isOpen: isCouponModalOpen, close: () => setIsCouponModalOpen(false) },
    { isOpen: isCouponListPanelOpen, close: () => setIsCouponListPanelOpen(false) }
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

  // 쿠폰 지급 키워드 감지 함수
  const detectCouponIssueKeyword = (message: string): boolean => {
    const keywords = ['쿠폰지급'];
    const lowerMessage = message.toLowerCase();
    return keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
  };

  // 쿠폰 사용 키워드 감지 함수
  const detectCouponListKeyword = (message: string): boolean => {
    const keywords = ['쿠폰사용', '쿠폰목록', '내쿠폰'];
    const lowerMessage = message.toLowerCase();
    return keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
  };

  // 쿠폰 발급 함수
  const issueCoupon = () => {
    const couponData = {
      ko: {
        title: '서울 여행 특별 할인',
        description: '서울 주요 관광지 및 제휴 식당에서 사용 가능합니다.'
      },
      ja: {
        title: 'ソウル旅行特別割引',
        description: 'ソウルの主要観光地及び提携レストランで使用可能です。'
      },
      en: {
        title: 'Seoul Travel Special Discount',
        description: 'Valid at major Seoul attractions and affiliated restaurants.'
      }
    };

    const newCoupon: Coupon = {
      id: `COUPON-${Date.now()}`,
      title: couponData[language].title,
      discount: '20% OFF',
      description: couponData[language].description,
      validUntil: '2026-03-31',
      code: 'SEOUL20',
      emoji: '🎫'
    };
    setIssuedCoupon(newCoupon);
    setIsCouponModalOpen(true);
  };

  // 카페 검색 및 마커 표시
  const searchCafes = async () => {
    if (isCafeLoading) return;

    setIsCafeLoading(true);
    showBeatyBubble(t.cafe.searching);

    try {
      const places = await getPlacesByIds(DEMO_CAFE_PLACE_IDS, language);

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
          beaty_comment: place.beaty_comment || t.cafe.defaultComment
        }));

        setCafePOIs(newCafePOIs);
        showBeatyBubble(t.cafe.found(newCafePOIs.length));

        // 첫 번째 카페 위치로 지도 이동
        if (map.current && newCafePOIs.length > 0) {
          map.current.flyTo({
            center: [newCafePOIs[0].lng, newCafePOIs[0].lat],
            zoom: 15,
            duration: 1500
          });
        }
      } else {
        showBeatyBubble(t.cafe.error);
      }
    } catch (error) {
      console.error('Failed to search cafes:', error);
      showBeatyBubble(t.cafe.error);
    } finally {
      setIsCafeLoading(false);
    }
  };

  const handleSendMessage = (message: string) => {
    console.log('Sending message:', message);

    // 쿠폰 지급 키워드 감지 (최우선 처리)
    if (detectCouponIssueKeyword(message)) {
      setIsChatOpen(false);
      issueCoupon();
      return;
    }

    // 쿠폰 목록 키워드 감지
    if (detectCouponListKeyword(message)) {
      setIsChatOpen(false);
      setIsCouponListPanelOpen(true);
      return;
    }

    // 카페 키워드 감지
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
      showBeatyBubble(t.beaty.searchResponse(message));
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

  // 길찾기 핸들러
  const handleNavigateClick = () => {
    const userNames = {
      ko: '이종로 님',
      ja: 'イ・ジョンロ様',
      en: 'Mr. Lee'
    };
    setRouteFromName(userNames[language]);
    setRouteToName(selectedPOI?.name || 'Gyeongbokgung');
    setIsPOIDetailOpen(false);
    setIsRoutePanelOpen(true);
  };

  // 예약 핸들러
  const handleReservationClick = () => {
    setReservationPoiName(selectedPOI?.name || 'Gyeongbokgung');
    setIsPOIDetailOpen(false);
    setIsReservationPanelOpen(true);
  };

  // 예약 확인 핸들러
  const handleReservationConfirm = (reservation: ReservationData) => {
    console.log('Reservation confirmed:', reservation);
    showBeatyBubble(t.reservation.reservationSuccess);
  };

  // 샘플 쿠폰 데이터 (언어별)
  const sampleCoupons: Coupon[] = language === 'ko' ? [
    {
      id: 'COUPON-001',
      title: '서울 여행 특별 할인',
      discount: '20% OFF',
      description: '서울 주요 관광지 및 제휴 식당에서 사용 가능합니다.',
      validUntil: '2026-03-31',
      code: 'SEOUL20',
      emoji: '🎫'
    },
    {
      id: 'COUPON-002',
      title: '경복궁 입장권 할인',
      discount: '30% OFF',
      description: '경복궁 입장 시 할인 혜택을 받으세요.',
      validUntil: '2026-04-30',
      code: 'PALACE30',
      emoji: '🏛️'
    },
    {
      id: 'COUPON-003',
      title: '카페 음료 할인',
      discount: '15% OFF',
      description: '제휴 카페에서 음료 구매 시 할인됩니다.',
      validUntil: '2026-05-31',
      code: 'CAFE15',
      emoji: '☕'
    },
    {
      id: 'COUPON-004',
      title: '한식당 할인',
      discount: '25% OFF',
      description: '전통 한식당에서 사용 가능한 특별 할인 쿠폰입니다.',
      validUntil: '2026-06-30',
      code: 'KOREAN25',
      emoji: '🍜'
    },
    {
      id: 'COUPON-005',
      title: '쇼핑 할인',
      discount: '10% OFF',
      description: '명동 및 강남 쇼핑몰에서 사용하세요.',
      validUntil: '2026-07-31',
      code: 'SHOP10',
      emoji: '🛍️'
    },
    {
      id: 'COUPON-006',
      title: '지하철 이용권',
      discount: '₩2,000',
      description: '서울 지하철 1일 무제한 이용권입니다.',
      validUntil: '2026-12-31',
      code: 'METRO2K',
      emoji: '🚇'
    },
    {
      id: 'COUPON-007',
      title: '박물관 입장권',
      discount: '50% OFF',
      description: '국립중앙박물관 입장료 50% 할인됩니다.',
      validUntil: '2026-08-31',
      code: 'MUSEUM50',
      emoji: '🎨'
    },
    {
      id: 'COUPON-008',
      title: '한옥마을 투어',
      discount: '40% OFF',
      description: '북촌 한옥마을 가이드 투어 특별 할인입니다.',
      validUntil: '2026-09-30',
      code: 'HANOK40',
      emoji: '🏘️'
    },
    {
      id: 'COUPON-009',
      title: 'K-POP 공연 할인',
      discount: '35% OFF',
      description: 'K-POP 콘서트 및 뮤지컬 티켓 할인 쿠폰입니다.',
      validUntil: '2026-10-31',
      code: 'KPOP35',
      emoji: '🎤'
    },
    {
      id: 'COUPON-010',
      title: '스파/찜질방',
      discount: '₩5,000',
      description: '드래곤힐스파 등 찜질방 이용권 할인입니다.',
      validUntil: '2026-11-30',
      code: 'SPA5K',
      emoji: '🧖'
    },
    {
      id: 'COUPON-011',
      title: '전통시장 상품권',
      discount: '₩10,000',
      description: '광장시장 및 남대문시장에서 사용 가능합니다.',
      validUntil: '2026-12-31',
      code: 'MARKET10K',
      emoji: '🏪'
    },
    {
      id: 'COUPON-012',
      title: '야경 투어',
      discount: '20% OFF',
      description: 'N서울타워 및 한강 야경 투어 할인 쿠폰입니다.',
      validUntil: '2026-12-31',
      code: 'NIGHT20',
      emoji: '🌃'
    }
  ] : language === 'ja' ? [
    {
      id: 'COUPON-001',
      title: 'ソウル旅行特別割引',
      discount: '20% OFF',
      description: 'ソウルの主要観光地及び提携レストランで使用可能です。',
      validUntil: '2026-03-31',
      code: 'SEOUL20',
      emoji: '🎫'
    },
    {
      id: 'COUPON-002',
      title: '景福宮入場券割引',
      discount: '30% OFF',
      description: '景福宮入場時に割引特典を受けられます。',
      validUntil: '2026-04-30',
      code: 'PALACE30',
      emoji: '🏛️'
    },
    {
      id: 'COUPON-003',
      title: 'カフェドリンク割引',
      discount: '15% OFF',
      description: '提携カフェで飲み物購入時に割引されます。',
      validUntil: '2026-05-31',
      code: 'CAFE15',
      emoji: '☕'
    },
    {
      id: 'COUPON-004',
      title: '韓国料理店割引',
      discount: '25% OFF',
      description: '伝統韓国料理店で使える特別割引クーポンです。',
      validUntil: '2026-06-30',
      code: 'KOREAN25',
      emoji: '🍜'
    },
    {
      id: 'COUPON-005',
      title: 'ショッピング割引',
      discount: '10% OFF',
      description: '明洞や江南のショッピングモールでご利用ください。',
      validUntil: '2026-07-31',
      code: 'SHOP10',
      emoji: '🛍️'
    },
    {
      id: 'COUPON-006',
      title: '地下鉄利用券',
      discount: '₩2,000',
      description: 'ソウル地下鉄1日乗り放題券です。',
      validUntil: '2026-12-31',
      code: 'METRO2K',
      emoji: '🚇'
    },
    {
      id: 'COUPON-007',
      title: '博物館入場券',
      discount: '50% OFF',
      description: '国立中央博物館入場料50%割引です。',
      validUntil: '2026-08-31',
      code: 'MUSEUM50',
      emoji: '🎨'
    },
    {
      id: 'COUPON-008',
      title: '韓屋村ツアー',
      discount: '40% OFF',
      description: '北村韓屋村ガイドツアー特別割引です。',
      validUntil: '2026-09-30',
      code: 'HANOK40',
      emoji: '🏘️'
    },
    {
      id: 'COUPON-009',
      title: 'K-POPコンサート割引',
      discount: '35% OFF',
      description: 'K-POPコンサート及びミュージカルチケット割引クーポンです。',
      validUntil: '2026-10-31',
      code: 'KPOP35',
      emoji: '🎤'
    },
    {
      id: 'COUPON-010',
      title: 'スパ/チムジルバン',
      discount: '₩5,000',
      description: 'ドラゴンヒルスパなどのチムジルバン利用券割引です。',
      validUntil: '2026-11-30',
      code: 'SPA5K',
      emoji: '🧖'
    },
    {
      id: 'COUPON-011',
      title: '伝統市場商品券',
      discount: '₩10,000',
      description: '広蔵市場及び南大門市場で使用可能です。',
      validUntil: '2026-12-31',
      code: 'MARKET10K',
      emoji: '🏪'
    },
    {
      id: 'COUPON-012',
      title: '夜景ツアー',
      discount: '20% OFF',
      description: 'Nソウルタワー及び漢江夜景ツアー割引クーポンです。',
      validUntil: '2026-12-31',
      code: 'NIGHT20',
      emoji: '🌃'
    }
  ] : [
    {
      id: 'COUPON-001',
      title: 'Seoul Travel Special Discount',
      discount: '20% OFF',
      description: 'Valid at major Seoul attractions and affiliated restaurants.',
      validUntil: '2026-03-31',
      code: 'SEOUL20',
      emoji: '🎫'
    },
    {
      id: 'COUPON-002',
      title: 'Gyeongbokgung Ticket Discount',
      discount: '30% OFF',
      description: 'Get a discount on Gyeongbokgung Palace admission.',
      validUntil: '2026-04-30',
      code: 'PALACE30',
      emoji: '🏛️'
    },
    {
      id: 'COUPON-003',
      title: 'Cafe Beverage Discount',
      discount: '15% OFF',
      description: 'Discount on drinks at affiliated cafes.',
      validUntil: '2026-05-31',
      code: 'CAFE15',
      emoji: '☕'
    },
    {
      id: 'COUPON-004',
      title: 'Korean Restaurant Discount',
      discount: '25% OFF',
      description: 'Special discount coupon for traditional Korean restaurants.',
      validUntil: '2026-06-30',
      code: 'KOREAN25',
      emoji: '🍜'
    },
    {
      id: 'COUPON-005',
      title: 'Shopping Discount',
      discount: '10% OFF',
      description: 'Use at Myeongdong and Gangnam shopping malls.',
      validUntil: '2026-07-31',
      code: 'SHOP10',
      emoji: '🛍️'
    },
    {
      id: 'COUPON-006',
      title: 'Subway Day Pass',
      discount: '₩2,000',
      description: 'Seoul subway unlimited day pass discount.',
      validUntil: '2026-12-31',
      code: 'METRO2K',
      emoji: '🚇'
    },
    {
      id: 'COUPON-007',
      title: 'Museum Admission',
      discount: '50% OFF',
      description: '50% off National Museum of Korea admission fee.',
      validUntil: '2026-08-31',
      code: 'MUSEUM50',
      emoji: '🎨'
    },
    {
      id: 'COUPON-008',
      title: 'Hanok Village Tour',
      discount: '40% OFF',
      description: 'Special discount for Bukchon Hanok Village guided tour.',
      validUntil: '2026-09-30',
      code: 'HANOK40',
      emoji: '🏘️'
    },
    {
      id: 'COUPON-009',
      title: 'K-POP Concert Discount',
      discount: '35% OFF',
      description: 'Discount coupon for K-POP concerts and musical tickets.',
      validUntil: '2026-10-31',
      code: 'KPOP35',
      emoji: '🎤'
    },
    {
      id: 'COUPON-010',
      title: 'Spa/Jjimjilbang',
      discount: '₩5,000',
      description: 'Discount for Dragon Hill Spa and other jjimjilbangs.',
      validUntil: '2026-11-30',
      code: 'SPA5K',
      emoji: '🧖'
    },
    {
      id: 'COUPON-011',
      title: 'Traditional Market Voucher',
      discount: '₩10,000',
      description: 'Valid at Gwangjang Market and Namdaemun Market.',
      validUntil: '2026-12-31',
      code: 'MARKET10K',
      emoji: '🏪'
    },
    {
      id: 'COUPON-012',
      title: 'Night View Tour',
      discount: '20% OFF',
      description: 'Discount for N Seoul Tower and Han River night tour.',
      validUntil: '2026-12-31',
      code: 'NIGHT20',
      emoji: '🌃'
    }
  ];

  // 경로 데이터 생성 (임시 - 서울시청에서 경복궁까지)
  const routeData = isRoutePanelOpen ? {
    from: { lat: 37.5665, lng: 126.9780, name: routeFromName },
    to: { lat: 37.5788, lng: 126.9770, name: routeToName },
    path: [
      [126.9780, 37.5665], // 서울시청 (출발)
      [126.9775, 37.5690], // 중간 지점 1
      [126.9772, 37.5710], // 중간 지점 2
      [126.9770, 37.5730], // 중간 지점 3
      [126.9768, 37.5755], // 중간 지점 4
      [126.9770, 37.5788]  // 경복궁 (도착)
    ] as Array<[number, number]>
  } : null;

  // 임시 경로 데이터
  const mockRoutes = [
    {
      id: '1',
      duration: '1:10',
      cost: '₩1,850',
      transfers: 1,
      distance: '29.9km',
      steps: [
        {
          type: 'subway' as const,
          name: 'Madeul Station (Line 7)',
          description: 'Towards Seokgye',
          duration: '7min',
          lineColor: '#636466',
          lineNumber: 'Line 7'
        },
        {
          type: 'subway' as const,
          name: 'Konkuk Univ. Station (Line 2)',
          description: 'Towards Seongsu',
          duration: '45min',
          lineColor: '#00A84D',
          lineNumber: 'Line 2'
        },
        {
          type: 'walk' as const,
          name: 'Hongik Univ. Station',
          description: 'Walk',
          duration: '18min',
          distance: '1.2km'
        }
      ]
    },
    {
      id: '2',
      duration: '1:20',
      cost: '₩2,000',
      transfers: 0,
      distance: '31.5km',
      steps: [
        {
          type: 'bus' as const,
          name: 'Hongik Univ. Station',
          description: 'Bus Stop',
          duration: '1h',
          lineColor: '#4CAF50',
          lineNumber: '272'
        },
        {
          type: 'walk' as const,
          name: 'Gyeongbokgung',
          description: 'Walk to destination',
          duration: '20min',
          distance: '800m'
        }
      ]
    },
    {
      id: '3',
      duration: '55min',
      cost: '₩1,850',
      transfers: 1,
      distance: '25.3km',
      steps: [
        {
          type: 'walk' as const,
          name: 'Departure',
          description: 'Walk to stop',
          duration: '5min',
          distance: '300m'
        },
        {
          type: 'subway' as const,
          name: 'Konkuk Univ. Station (Line 2)',
          description: 'Towards Euljiro',
          duration: '30min',
          lineColor: '#00A84D',
          lineNumber: 'Line 2'
        },
        {
          type: 'subway' as const,
          name: 'Gyeongbokgung Station (Line 3)',
          description: 'Towards Daehwa',
          duration: '15min',
          lineColor: '#EF7C1C',
          lineNumber: 'Line 3'
        },
        {
          type: 'walk' as const,
          name: 'Gyeongbokgung',
          description: 'Arrival',
          duration: '5min',
          distance: '250m'
        }
      ]
    }
  ];

  // 로딩 화면 (언어별 이미지)
  const loadingImageSuffix = { ko: 'Kor', en: 'Eng', ja: 'Jpn' }[language] || 'Kor';
  if (isAppLoading) {
    return (
      <div className={`app-loading-screen ${!isAppLoading ? 'fade-out' : ''}`}>
        <img src={`/img/assets/main_loading_${loadingImageSuffix}.png`} alt="Loading" className="app-loading-image" />
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
        routeData={routeData}
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
          name={language === 'ko' ? '경복궁' : language === 'ja' ? '景福宮' : 'Gyeongbokgung'}
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
          {t.discovery.clearButton}
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
        isDiscovering={isDiscovering}
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
        language={language}
        onSpeechError={showBeatyBubble}
        placeholder={t.chatBar.placeholder}
      />

      {/* Chat Window */}
      <ChatWindow
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onSendMessage={handleSendMessage}
        language={language}
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
        name={selectedPOI?.name || (language === 'ko' ? '장소 정보' : language === 'ja' ? '場所情報' : 'Place Info')}
        imageUrl={selectedPOI?.image || 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&h=600&fit=crop'}
        expandFrom={clickPosition}
        poi={selectedPOI}
        language={language}
        onNavigateClick={handleNavigateClick}
        onReservationClick={handleReservationClick}
      />

      {/* Route Panel */}
      <RoutePanel
        isOpen={isRoutePanelOpen}
        onClose={() => setIsRoutePanelOpen(false)}
        fromName={routeFromName}
        toName={routeToName}
        routes={mockRoutes}
        language={language}
      />

      {/* Reservation Panel */}
      <ReservationPanel
        isOpen={isReservationPanelOpen}
        onClose={() => setIsReservationPanelOpen(false)}
        poiName={reservationPoiName}
        language={language}
        onConfirm={handleReservationConfirm}
      />

      {/* Coupon Modal */}
      {issuedCoupon && (
        <CouponModal
          isOpen={isCouponModalOpen}
          onClose={() => setIsCouponModalOpen(false)}
          coupon={issuedCoupon}
          language={language}
        />
      )}

      {/* Coupon List Panel */}
      <CouponListPanel
        isOpen={isCouponListPanelOpen}
        onClose={() => setIsCouponListPanelOpen(false)}
        coupons={sampleCoupons}
        language={language}
        onCouponClick={(coupon) => {
          setIssuedCoupon(coupon);
          setIsCouponListPanelOpen(false);
          setIsCouponModalOpen(true);
        }}
      />

      {/* Beaty Bubble */}
      <BeatyBubble
        variant="floating"
        message={beatyBubbleMessage}
        isVisible={isBeatyBubbleVisible}
        onClose={() => setIsBeatyBubbleVisible(false)}
        isDiscovering={isDiscovering}
      />

      {/* Weather Detail Panel */}
      <WeatherDetailPanel
        isOpen={isWeatherDetailOpen}
        onClose={() => setIsWeatherDetailOpen(false)}
        latitude={gpsPosition?.latitude}
        longitude={gpsPosition?.longitude}
        language={language}
      />

      {/* Home Panel */}
      <HomePanel
        isOpen={isHomePanelOpen}
        onClose={() => setIsHomePanelOpen(false)}
        onClosing={setIsHomePanelClosing}
        language={language}
        onLanguageChange={handleLanguageChange}
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* FAQ Card Modal */}
      {activeFaq && (
        <FaqCardModal
          faq={activeFaq}
          language={language}
          onClose={() => setActiveFaq(null)}
        />
      )}
    </div>
  );
}

export default App;
