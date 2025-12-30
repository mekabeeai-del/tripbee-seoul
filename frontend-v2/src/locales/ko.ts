/**
 * 한국어 번역
 */
export const ko = {
  // 공통
  common: {
    loading: '로딩 중...',
    error: '오류가 발생했어요',
    confirm: '확인',
    cancel: '취소',
    close: '닫기',
  },

  // 채팅바
  chatBar: {
    placeholder: '비티에게 물어보세요!',
  },

  // 채팅창 데모 메시지
  chatDemo: [
    { type: 'beaty', text: '안녕하세요! 오늘은 날씨가 좋네요! 오늘은 어떤 여행을 하고 계신가요?' },
    { type: 'user', text: '경복궁 근처 맛집 추천해줘' },
    { type: 'beaty', text: '경복궁 근처에 맛집을 찾고 계시는군요! 토속촌 삼계탕, 광장시장, 통인시장 등이 유명해요.' },
    { type: 'user', text: '한식으로' },
    { type: 'beaty', text: '한식이시군요! 토속촌 삼계탕 추천드려요. 경복궁에서 도보 10분 거리에 있어요.' },
    { type: 'user', text: '거기 영업시간이 어떻게 돼?' },
    { type: 'beaty', text: '토속촌은 오전 10시부터 오후 10시까지 영업해요. 점심시간에는 대기가 있을 수 있어요!' },
    { type: 'user', text: '근처에 카페도 추천해줘' },
    { type: 'beaty', text: '삼청동에 좋은 카페들이 많아요. "커피 한약방", "식물" 등이 인기가 많습니다.' },
    { type: 'user', text: '한옥 카페 좋다! 위치 알려줘' },
    { type: 'beaty', text: '삼청동 한옥 카페 "북촌 숲"을 추천해요. 경복궁에서 도보 15분 정도 걸려요.' },
  ],

  // 음성 인식
  voice: {
    title: '이렇게 말해보세요',
    examples: ['근처 카페 추천해줘', '경복궁 가는 길', '맛집 알려줘'],
    errors: {
      notAllowed: '마이크 권한이 필요해요',
      noSpeech: '음성이 감지되지 않았어요',
      audioCapture: '마이크를 찾을 수 없어요',
      network: '네트워크 오류가 발생했어요',
      default: '음성인식 오류가 발생했어요',
    },
  },

  // 발견모드
  discovery: {
    clearButton: '발견 정보 지우기',
    cleared: '발견한 장소를 모두 지웠어요!',
    ended: '발견모드를 종료했어요!',
    found: (emoji: string, name: string, comment?: string) =>
      comment ? `${emoji} ${name} 발견! ${comment}` : `${emoji} ${name}을(를) 발견했어요!`,
    // 발견모드 시작 메시지
    startMessage: '🔍 발견모드를 시작할게요!',
    weatherMessage: (time: string, weather: string, temp: string, comment: string) =>
      `지금은 ${time}이에요. 날씨는 ${weather}, ${temp}예요. ${comment}`,
    searchingMessage: (timeOfDay: string) => `${timeOfDay}에 딱 맞는 장소를 찾아볼게요! ✨`,
    // 시간대
    timeOfDay: {
      dawn: '새벽',
      morning: '오전',
      lunch: '점심시간',
      afternoon: '오후',
      evening: '저녁시간',
      night: '밤',
    },
    // 시간 포맷
    timeFormat: {
      am: '오전',
      pm: '오후',
      hourMinute: (period: string, hour: number, minute: number) =>
        `${period} ${hour}시 ${minute}분`,
    },
    // 온도 코멘트
    tempComments: {
      veryCold: '많이 춥네요! 따뜻하게 입으세요~',
      cold: '쌀쌀해요! 따뜻한 음식이 생각나는 날씨네요~',
      cool: '선선해요! 산책하기 좋은 날씨네요~',
      warm: '따뜻해요! 야외 활동하기 딱 좋아요~',
      hot: '더워요! 시원한 곳을 찾아볼게요~',
    },
    // 온도 텍스트
    tempText: (temp: number) => {
      const sign = temp > 0 ? '영상' : '영하';
      return `${sign} ${Math.abs(temp)}도`;
    },
  },

  // 비티 메시지
  beaty: {
    defaultMessage: '멋진 여행 하고 계신가요? 어떤 장소를 원하시나요?',
    gpsError: '위치를 가져올 수 없어요',
    searchResponse: (query: string) => `"${query}"에 대한 답변입니다! 비티가 곧 추천해드릴게요.`,
  },

  // 카페 검색
  cafe: {
    searching: '주변 카페를 찾고 있어요...',
    found: (count: number) => `주변에 ${count}개의 카페를 찾았어요!`,
    error: '카페를 찾는 중 오류가 발생했어요',
    defaultComment: '커피 한 잔의 여유를 즐겨보세요!',
  },

  // 날씨
  weather: {
    title: '날씨 정보',
    temperature: '온도',
    humidity: '습도',
    wind: '바람',
    forecast: '예보',
    loading: '날씨 정보를 불러오는 중...',
    error: '날씨 정보를 가져올 수 없어요 😢',
    headerTitle: (city: string) => `${city} 날씨`,
    now: '지금',
    hourSuffix: '시',
    hourlyForecast: '· 시간별 예보 ·',
    provider: '날씨 정보 제공: OpenWeatherMap',
    feelsLike: '체감',
    clouds: '구름',
    // 날씨 메시지
    message: (weather: string, temp: number) =>
      `현재 날씨는 ${weather}, 온도는 ${temp}도 에요! 오늘 같은 날엔 따뜻한 국물요리 어떠신가요?`,
    // 음식 추천
    foodRecommendation: {
      title: '인삼돈 불고기',
      description: '인삼돈불고기는 맛과 영양이 절묘하게 만난 요리로, 신선한 돼지고기에 인삼이 어우러져 더욱 풍미가 깊어집니다. 이렇게 만든 불고기는 한입으로도 풍부한 맛을 볼 수 있는 이색메뉴에 추천드립니다.',
    },
    // 날씨 상태
    conditions: {
      Clear: '맑음',
      Clouds: '흐림',
      Rain: '비',
      Drizzle: '이슬비',
      Thunderstorm: '천둥번개',
      Snow: '눈',
      Mist: '안개',
      Smoke: '연기',
      Haze: '실안개',
      Dust: '먼지',
      Fog: '안개',
      Sand: '모래바람',
      Ash: '화산재',
      Squall: '돌풍',
      Tornado: '토네이도',
    },
    // 풍향
    windDirections: ['북', '북동', '동', '남동', '남', '남서', '서', '북서'],
  },

  // 홈패널
  home: {
    title: '설정',
    language: '언어',
    languageChange: '언어 변경',
    languageChangeConfirm: '언어를 변경하면 앱이 재시작됩니다. 계속할까요?',
    login: '로그인',
    logout: '로그아웃',
    loginWith: (provider: string) => `${provider}로 로그인`,
    logoutSuccess: '로그아웃 되었어요',
    loginSuccess: '로그인 되었어요',

    // 로그인 필요 섹션
    loginRequired: '트립비에 로그인해주세요!',
    loginDescription: '로그인 하시면 비티가 맞춤형 여행을 추천해드립니다.\n함께 여행하면서 추억을 만들어봐요!',
    continueWithGoogle: 'Google로 계속하기',
    continueWithApple: 'Apple로 계속하기',

    // 비티 레벨 섹션
    beatyTitle: '탐험가 비티',
    beatyMessage: '새로운 여행을 할수록\n비티가 함께 성장해요!',

    // 스탯
    stats: {
      travelDistance: '여행거리',
      visitedPlaces: '방문장소',
      travelTime: '여행시간',
    },

    // 허니포인트
    honey: {
      todayEarned: '오늘 획득',
      totalOwned: '총 보유',
    },

    // 액션 버튼
    actions: {
      gift: '선물하기',
      closet: '옷장 보기',
    },

    // 여행 기록
    tripRecord: {
      title: '오늘의 여행 기록',
      viewDetail: '여행 기록 자세히 보기',
    },

    // 하단 메뉴
    footer: {
      logout: '로그아웃',
      languageSetting: '언어설정',
      editProfile: '정보수정',
    },

    // 준비중 툴팁
    comingSoon: '준비중인 기능입니다 🚧',

    // 경험치 모달
    expModal: {
      title: '경험치 획득 방법',
      howToEarn: '💫 경험치를 얻는 방법',
      earnList: [
        '새로운 장소 방문하기',
        '감정적인 여행 기록 남기기',
        '친구와 여행 공유하기',
        '리뷰와 사진 업로드하기',
      ],
      levelUpBenefits: '🎁 레벨업 혜택',
      benefitList: [
        '비티 캐릭터 성장',
        '특별한 뱃지 획득',
        '허니포인트 보너스',
        '숨겨진 여행지 추천',
      ],
    },

    // 레벨 모달
    levelModal: {
      title: '비티 레벨이란?',
      description: '🧠 레벨은 비티의 학습 정도를 나타냅니다',
      descriptionList: [
        { title: '여행 취향 학습', desc: '선호하는 장소 유형, 분위기, 활동 등을 학습합니다' },
        { title: '감정 이해도', desc: '여행 중 느끼는 감정과 기분을 파악합니다' },
        { title: '패턴 분석', desc: '여행 시간대, 동선, 선호 루트 등을 분석합니다' },
        { title: '개인화 추천', desc: '레벨이 높을수록 더 정확한 맞춤 추천을 제공합니다' },
      ],
      howToLevelUp: '📈 레벨업 방법',
      levelUpList: [
        '다양한 장소를 방문하고 경험을 쌓으세요',
        '여행 후 감정과 느낌을 기록하세요',
        '비티와 대화하며 선호도를 공유하세요',
        '장소에 대한 평가와 피드백을 남기세요',
      ],
      tip: '💡 레벨이 높아질수록 비티는 당신의 여행 스타일을 더 잘 이해하게 되어, 더욱 개인화된 여행지와 경험을 추천해드립니다.',
    },

    // 허니포인트 모달
    honeyModal: {
      title: '허니포인트란?',
      description: '🍯 허니포인트는 여행 활동으로 획득하는 포인트입니다',
      earnList: [
        { title: '장소 방문', desc: '새로운 장소를 방문할 때마다 포인트 획득' },
        { title: '리뷰 작성', desc: '방문한 장소에 리뷰를 남기면 추가 포인트' },
        { title: '사진 업로드', desc: '여행 사진을 공유하면 포인트 적립' },
        { title: '연속 방문', desc: '매일 여행하면 보너스 포인트 지급' },
      ],
      usage: '💰 허니포인트 사용처',
      usageList: [
        { title: '비티 선물하기', desc: '다양한 선물로 비티를 꾸며보세요 (200 🍯~)' },
        { title: '특별 여행지 잠금 해제', desc: '숨겨진 명소 정보 확인' },
        { title: '프리미엄 추천', desc: '더욱 정교한 맞춤 추천 받기' },
        { title: '할인 쿠폰', desc: '제휴 업체 할인 혜택 (준비중)' },
      ],
      tip: '💡 허니포인트를 모아 비티와 함께 더 즐거운 여행을 만들어보세요!',
    },

    // 언어 설정 모달
    languageModal: {
      title: '언어 선택 / Language',
      korean: '한국어',
      english: 'English',
      japanese: '日本語',
    },
  },

  // POI 상세
  poi: {
    rating: '평점',
    reviews: '리뷰',
    photos: '사진',
    address: '주소',
    phone: '전화',
    website: '웹사이트',
    hours: '영업시간',
    openNow: '영업 중',
    closed: '영업 종료',
    noInfo: '정보 없음',
    // 탭
    tabs: {
      info: '기본정보',
      reviews: '리뷰',
      photos: '사진',
    },
    // 편의시설
    facilities: {
      title: '편의시설',
      available: '가능',
      unavailable: '불가',
      parking: '주차',
      children: '아이 동반',
      wheelchair: '휠체어 접근',
      vegetarian: '채식 메뉴',
      takeout: '포장',
      delivery: '배달',
      dogs: '반려견 동반',
      reservable: '예약',
    },
    // 기타
    visitWebsite: '웹사이트 방문',
    noReviews: '리뷰가 없습니다',
    noPhotos: '사진이 없습니다',
  },

  // 발견모드 메시지
  discoveryMessages: {
    weather: {
      clear: '오늘 날씨가 좋네요! 산책하기 딱 좋은 날이에요.',
      clouds: '구름이 조금 있지만, 여행하기 좋은 날씨예요!',
      rain: '비가 오고 있어요. 실내 관광지를 추천해드릴게요!',
      snow: '눈이 오고 있어요! 따뜻한 카페는 어떨까요?',
      default: '오늘도 좋은 여행 되세요!',
    },
    searching: '주변을 탐색하고 있어요...',
    found: '흥미로운 장소를 발견했어요!',
  },
};

export type TranslationKeys = typeof ko;
