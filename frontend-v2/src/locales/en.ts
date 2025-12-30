/**
 * English Translation
 */
export const en = {
  // Common
  common: {
    loading: 'Loading...',
    error: 'An error occurred',
    confirm: 'Confirm',
    cancel: 'Cancel',
    close: 'Close',
  },

  // Chat Bar
  chatBar: {
    placeholder: 'Ask Beaty!',
  },

  // Chat Demo Messages
  chatDemo: [
    { type: 'beaty', text: 'Hello! The weather is lovely today! What kind of trip are you planning?' },
    { type: 'user', text: 'Recommend restaurants near Gyeongbokgung' },
    { type: 'beaty', text: 'Looking for restaurants near Gyeongbokgung! Tosokchon Samgyetang, Gwangjang Market, and Tongin Market are famous.' },
    { type: 'user', text: 'Korean food please' },
    { type: 'beaty', text: 'Korean food! I recommend Tosokchon Samgyetang. It\'s a 10-minute walk from Gyeongbokgung.' },
    { type: 'user', text: 'What are their hours?' },
    { type: 'beaty', text: 'Tosokchon is open from 10 AM to 10 PM. There might be a wait during lunch!' },
    { type: 'user', text: 'Recommend a cafe nearby too' },
    { type: 'beaty', text: 'There are great cafes in Samcheong-dong. "Coffee Hanyakbang" and "Sikmul" are popular.' },
    { type: 'user', text: 'Hanok cafe sounds nice! Tell me the location' },
    { type: 'beaty', text: 'I recommend "Bukchon Forest" hanok cafe in Samcheong-dong. It\'s about a 15-minute walk from Gyeongbokgung.' },
  ],

  // Voice Recognition
  voice: {
    title: 'Try saying',
    examples: ['Find cafes nearby', 'How to get to Gyeongbokgung', 'Recommend restaurants'],
    errors: {
      notAllowed: 'Microphone permission required',
      noSpeech: 'No speech detected',
      audioCapture: 'Microphone not found',
      network: 'Network error occurred',
      default: 'Voice recognition error',
    },
  },

  // Discovery Mode
  discovery: {
    clearButton: 'Clear discoveries',
    cleared: 'All discovered places have been cleared!',
    ended: 'Discovery mode ended!',
    found: (emoji: string, name: string, comment?: string) =>
      comment ? `${emoji} Found ${name}! ${comment}` : `${emoji} Discovered ${name}!`,
    // Discovery start messages
    startMessage: '🔍 Starting discovery mode!',
    weatherMessage: (time: string, weather: string, temp: string, comment: string) =>
      `It's ${time} now. Weather is ${weather}, ${temp}. ${comment}`,
    searchingMessage: (timeOfDay: string) => `Looking for the perfect spots for ${timeOfDay}! ✨`,
    // Time of day
    timeOfDay: {
      dawn: 'dawn',
      morning: 'morning',
      lunch: 'lunchtime',
      afternoon: 'afternoon',
      evening: 'evening',
      night: 'night',
    },
    // Time format
    timeFormat: {
      am: 'AM',
      pm: 'PM',
      hourMinute: (period: string, hour: number, minute: number) =>
        `${hour}:${minute.toString().padStart(2, '0')} ${period}`,
    },
    // Temperature comments
    tempComments: {
      veryCold: 'It\'s really cold! Bundle up~',
      cold: 'It\'s chilly! Perfect weather for warm food~',
      cool: 'It\'s cool! Great weather for a walk~',
      warm: 'It\'s warm! Perfect for outdoor activities~',
      hot: 'It\'s hot! Let me find some cool places~',
    },
    // Temperature text
    tempText: (temp: number) => `${temp}°C`,
  },

  // Beaty Messages
  beaty: {
    defaultMessage: 'Having a great trip? What kind of place are you looking for?',
    gpsError: 'Unable to get location',
    searchResponse: (query: string) => `Here's my answer about "${query}"! Beaty will recommend soon.`,
  },

  // Cafe Search
  cafe: {
    searching: 'Looking for cafes nearby...',
    found: (count: number) => `Found ${count} cafes nearby!`,
    error: 'Error occurred while searching for cafes',
    defaultComment: 'Enjoy a moment with a cup of coffee!',
  },

  // Weather
  weather: {
    title: 'Weather Info',
    temperature: 'Temperature',
    humidity: 'Humidity',
    wind: 'Wind',
    forecast: 'Forecast',
    loading: 'Loading weather info...',
    error: 'Unable to fetch weather info 😢',
    headerTitle: (city: string) => `${city} Weather`,
    now: 'Now',
    hourSuffix: ':00',
    hourlyForecast: '· Hourly Forecast ·',
    provider: 'Weather by OpenWeatherMap',
    feelsLike: 'Feels like',
    clouds: 'Clouds',
    // Weather message
    message: (weather: string, temp: number) =>
      `Current weather is ${weather}, ${temp}°C! How about some warm soup on a day like this?`,
    // Food recommendation
    foodRecommendation: {
      title: 'Ginseng Pork Bulgogi',
      description: 'Ginseng pork bulgogi is a dish where taste and nutrition meet perfectly. Fresh pork combined with ginseng creates a deeper flavor. This unique menu item offers rich taste in every bite.',
    },
    // Weather conditions
    conditions: {
      Clear: 'Clear',
      Clouds: 'Cloudy',
      Rain: 'Rain',
      Drizzle: 'Drizzle',
      Thunderstorm: 'Thunderstorm',
      Snow: 'Snow',
      Mist: 'Mist',
      Smoke: 'Smoke',
      Haze: 'Haze',
      Dust: 'Dust',
      Fog: 'Fog',
      Sand: 'Sand',
      Ash: 'Ash',
      Squall: 'Squall',
      Tornado: 'Tornado',
    },
    // Wind directions
    windDirections: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
  },

  // Home Panel
  home: {
    title: 'Settings',
    language: 'Language',
    languageChange: 'Change Language',
    languageChangeConfirm: 'Changing language will restart the app. Continue?',
    login: 'Login',
    logout: 'Logout',
    loginWith: (provider: string) => `Login with ${provider}`,
    logoutSuccess: 'Logged out successfully',
    loginSuccess: 'Logged in successfully',

    // Login Required Section
    loginRequired: 'Please login to TripBee!',
    loginDescription: 'Login to get personalized travel recommendations from Beaty.\nLet\'s make memories traveling together!',
    continueWithGoogle: 'Continue with Google',
    continueWithApple: 'Continue with Apple',

    // Beaty Level Section
    beatyTitle: 'Explorer Beaty',
    beatyMessage: 'The more you travel,\nthe more Beaty grows with you!',

    // Stats
    stats: {
      travelDistance: 'Distance',
      visitedPlaces: 'Places',
      travelTime: 'Time',
    },

    // Honey Points
    honey: {
      todayEarned: 'Today',
      totalOwned: 'Total',
    },

    // Action Buttons
    actions: {
      gift: 'Send Gift',
      closet: 'View Closet',
    },

    // Trip Record
    tripRecord: {
      title: 'Today\'s Trip Record',
      viewDetail: 'View Trip Details',
    },

    // Footer Menu
    footer: {
      logout: 'Logout',
      languageSetting: 'Language',
      editProfile: 'Edit Profile',
    },

    // Coming Soon Tooltip
    comingSoon: 'Coming soon 🚧',

    // EXP Modal
    expModal: {
      title: 'How to Earn EXP',
      howToEarn: '💫 Ways to earn EXP',
      earnList: [
        'Visit new places',
        'Record your travel emotions',
        'Share your trip with friends',
        'Upload reviews and photos',
      ],
      levelUpBenefits: '🎁 Level Up Benefits',
      benefitList: [
        'Beaty character growth',
        'Special badges',
        'Honey point bonus',
        'Hidden destination recommendations',
      ],
    },

    // Level Modal
    levelModal: {
      title: 'What is Beaty Level?',
      description: '🧠 Level represents how well Beaty understands you',
      descriptionList: [
        { title: 'Travel Preferences', desc: 'Learns your preferred place types, atmosphere, and activities' },
        { title: 'Emotional Understanding', desc: 'Understands your emotions and moods during travel' },
        { title: 'Pattern Analysis', desc: 'Analyzes your travel times, routes, and preferences' },
        { title: 'Personalized Recommendations', desc: 'Higher levels mean more accurate recommendations' },
      ],
      howToLevelUp: '📈 How to Level Up',
      levelUpList: [
        'Visit various places and gain experience',
        'Record your feelings after traveling',
        'Chat with Beaty and share your preferences',
        'Leave ratings and feedback for places',
      ],
      tip: '💡 As your level increases, Beaty better understands your travel style and recommends more personalized destinations and experiences.',
    },

    // Honey Points Modal
    honeyModal: {
      title: 'What are Honey Points?',
      description: '🍯 Honey Points are earned through travel activities',
      earnList: [
        { title: 'Visit Places', desc: 'Earn points every time you visit a new place' },
        { title: 'Write Reviews', desc: 'Get extra points for leaving reviews' },
        { title: 'Upload Photos', desc: 'Earn points by sharing travel photos' },
        { title: 'Daily Visits', desc: 'Get bonus points for traveling every day' },
      ],
      usage: '💰 How to Use Honey Points',
      usageList: [
        { title: 'Gift Beaty', desc: 'Dress up Beaty with various gifts (200 🍯~)' },
        { title: 'Unlock Special Spots', desc: 'Access hidden destination info' },
        { title: 'Premium Recommendations', desc: 'Get more refined personalized recommendations' },
        { title: 'Discount Coupons', desc: 'Partner discounts (Coming soon)' },
      ],
      tip: '💡 Collect Honey Points and create more enjoyable trips with Beaty!',
    },

    // Language Modal
    languageModal: {
      title: 'Select Language / 언어 선택',
      korean: '한국어',
      english: 'English',
      japanese: '日本語',
    },
  },

  // POI Detail
  poi: {
    rating: 'Rating',
    reviews: 'Reviews',
    photos: 'Photos',
    address: 'Address',
    phone: 'Phone',
    website: 'Website',
    hours: 'Hours',
    openNow: 'Open Now',
    closed: 'Closed',
    noInfo: 'No info',
    // Tabs
    tabs: {
      info: 'Info',
      reviews: 'Reviews',
      photos: 'Photos',
    },
    // Facilities
    facilities: {
      title: 'Facilities',
      available: 'Yes',
      unavailable: 'No',
      parking: 'Parking',
      children: 'Kid-friendly',
      wheelchair: 'Wheelchair',
      vegetarian: 'Vegetarian',
      takeout: 'Takeout',
      delivery: 'Delivery',
      dogs: 'Dogs allowed',
      reservable: 'Reservations',
    },
    // Others
    visitWebsite: 'Visit Website',
    noReviews: 'No reviews yet',
    noPhotos: 'No photos yet',
  },

  // Discovery Mode Messages
  discoveryMessages: {
    weather: {
      clear: 'Great weather today! Perfect for a walk.',
      clouds: 'A bit cloudy, but still great for traveling!',
      rain: 'It\'s raining. Let me recommend indoor attractions!',
      snow: 'It\'s snowing! How about a warm cafe?',
      default: 'Have a great trip today!',
    },
    searching: 'Exploring nearby...',
    found: 'Found an interesting place!',
  },
};
