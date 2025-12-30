/**
 * 日本語翻訳
 */
export const ja = {
  // 共通
  common: {
    loading: '読み込み中...',
    error: 'エラーが発生しました',
    confirm: '確認',
    cancel: 'キャンセル',
    close: '閉じる',
  },

  // チャットバー
  chatBar: {
    placeholder: 'ビーティに聞いてください！',
  },

  // チャットデモメッセージ
  chatDemo: [
    { type: 'beaty', text: 'こんにちは！今日は天気がいいですね！どんな旅行をしていますか？' },
    { type: 'user', text: '景福宮近くのレストランを教えて' },
    { type: 'beaty', text: '景福宮近くのレストランをお探しですね！トソクチョン参鶏湯、広蔵市場、通仁市場が有名です。' },
    { type: 'user', text: '韓国料理で' },
    { type: 'beaty', text: '韓国料理ですね！トソクチョン参鶏湯をおすすめします。景福宮から徒歩10分です。' },
    { type: 'user', text: '営業時間は？' },
    { type: 'beaty', text: 'トソクチョンは午前10時から午後10時まで営業しています。ランチタイムは待ち時間があるかもしれません！' },
    { type: 'user', text: '近くのカフェも教えて' },
    { type: 'beaty', text: '三清洞には素敵なカフェがたくさんあります。「コーヒー韓薬房」「植物」などが人気です。' },
    { type: 'user', text: '韓屋カフェいいね！場所を教えて' },
    { type: 'beaty', text: '三清洞の韓屋カフェ「北村の森」をおすすめします。景福宮から徒歩15分ほどです。' },
  ],

  // 音声認識
  voice: {
    title: 'こう言ってみてください',
    examples: ['近くのカフェを探して', '景福宮への行き方', 'おすすめのレストラン'],
    errors: {
      notAllowed: 'マイクの許可が必要です',
      noSpeech: '音声が検出されませんでした',
      audioCapture: 'マイクが見つかりません',
      network: 'ネットワークエラーが発生しました',
      default: '音声認識エラーが発生しました',
    },
  },

  // 発見モード
  discovery: {
    clearButton: '発見情報を消す',
    cleared: '発見した場所をすべて消しました！',
    ended: '発見モードを終了しました！',
    found: (emoji: string, name: string, comment?: string) =>
      comment ? `${emoji} ${name}を発見！${comment}` : `${emoji} ${name}を発見しました！`,
    // 発見モード開始メッセージ
    startMessage: '🔍 発見モードを開始します！',
    weatherMessage: (time: string, weather: string, temp: string, comment: string) =>
      `今は${time}です。天気は${weather}、${temp}です。${comment}`,
    searchingMessage: (timeOfDay: string) => `${timeOfDay}にぴったりの場所を探してみますね！✨`,
    // 時間帯
    timeOfDay: {
      dawn: '早朝',
      morning: '午前',
      lunch: 'ランチタイム',
      afternoon: '午後',
      evening: '夕方',
      night: '夜',
    },
    // 時間フォーマット
    timeFormat: {
      am: '午前',
      pm: '午後',
      hourMinute: (period: string, hour: number, minute: number) =>
        `${period}${hour}時${minute}分`,
    },
    // 気温コメント
    tempComments: {
      veryCold: 'とても寒いです！暖かくしてくださいね〜',
      cold: '肌寒いです！温かい食べ物が恋しい天気ですね〜',
      cool: '涼しいです！散歩にぴったりの天気ですね〜',
      warm: '暖かいです！アウトドア活動にぴったりです〜',
      hot: '暑いです！涼しい場所を探してみますね〜',
    },
    // 気温テキスト
    tempText: (temp: number) => `${temp}度`,
  },

  // ビティメッセージ
  beaty: {
    defaultMessage: '素敵な旅行をしていますか？どんな場所をお探しですか？',
    gpsError: '位置情報を取得できません',
    searchResponse: (query: string) => `「${query}」についてお答えします！ビティがすぐにおすすめします。`,
  },

  // カフェ検索
  cafe: {
    searching: '周辺のカフェを探しています...',
    found: (count: number) => `周辺に${count}件のカフェを見つけました！`,
    error: 'カフェを探す際にエラーが発生しました',
    defaultComment: 'コーヒー一杯のひとときをお楽しみください！',
  },

  // 天気
  weather: {
    title: '天気情報',
    temperature: '気温',
    humidity: '湿度',
    wind: '風',
    forecast: '予報',
    loading: '天気情報を読み込み中...',
    error: '天気情報を取得できません 😢',
    headerTitle: (city: string) => `${city}の天気`,
    now: '今',
    hourSuffix: '時',
    hourlyForecast: '· 時間別予報 ·',
    provider: '天気情報提供: OpenWeatherMap',
    feelsLike: '体感',
    clouds: '雲',
    // 天気メッセージ
    message: (weather: string, temp: number) =>
      `現在の天気は${weather}、気温は${temp}度です！こんな日は温かいスープ料理はいかがですか？`,
    // 食べ物のおすすめ
    foodRecommendation: {
      title: '人参豚プルコギ',
      description: '人参豚プルコギは味と栄養が絶妙に出会った料理で、新鮮な豚肉に人参が調和してさらに風味が深まります。こうして作ったプルコギは一口でも豊かな味を楽しめる特別メニューです。',
    },
    // 天気状態
    conditions: {
      Clear: '晴れ',
      Clouds: '曇り',
      Rain: '雨',
      Drizzle: '小雨',
      Thunderstorm: '雷雨',
      Snow: '雪',
      Mist: '霧',
      Smoke: '煙',
      Haze: 'もや',
      Dust: '埃',
      Fog: '霧',
      Sand: '砂嵐',
      Ash: '火山灰',
      Squall: '突風',
      Tornado: '竜巻',
    },
    // 風向
    windDirections: ['北', '北東', '東', '南東', '南', '南西', '西', '北西'],
  },

  // ホームパネル
  home: {
    title: '設定',
    language: '言語',
    languageChange: '言語変更',
    languageChangeConfirm: '言語を変更するとアプリが再起動されます。続けますか？',
    login: 'ログイン',
    logout: 'ログアウト',
    loginWith: (provider: string) => `${provider}でログイン`,
    logoutSuccess: 'ログアウトしました',
    loginSuccess: 'ログインしました',

    // ログイン必要セクション
    loginRequired: 'TripBeeにログインしてください！',
    loginDescription: 'ログインすると、ビティがあなたに合った旅行をおすすめします。\n一緒に旅行して思い出を作りましょう！',
    continueWithGoogle: 'Googleで続ける',
    continueWithApple: 'Appleで続ける',

    // ビティレベルセクション
    beatyTitle: '探検家ビティ',
    beatyMessage: '新しい旅行をするほど\nビティも一緒に成長します！',

    // スタッツ
    stats: {
      travelDistance: '移動距離',
      visitedPlaces: '訪問場所',
      travelTime: '旅行時間',
    },

    // ハニーポイント
    honey: {
      todayEarned: '今日獲得',
      totalOwned: '合計',
    },

    // アクションボタン
    actions: {
      gift: 'プレゼント',
      closet: 'クローゼット',
    },

    // 旅行記録
    tripRecord: {
      title: '今日の旅行記録',
      viewDetail: '旅行記録を詳しく見る',
    },

    // フッターメニュー
    footer: {
      logout: 'ログアウト',
      languageSetting: '言語設定',
      editProfile: '情報修正',
    },

    // 準備中ツールチップ
    comingSoon: '準備中の機能です 🚧',

    // 経験値モーダル
    expModal: {
      title: '経験値の獲得方法',
      howToEarn: '💫 経験値を獲得する方法',
      earnList: [
        '新しい場所を訪問する',
        '感情的な旅行記録を残す',
        '友達と旅行を共有する',
        'レビューと写真をアップロードする',
      ],
      levelUpBenefits: '🎁 レベルアップ特典',
      benefitList: [
        'ビティキャラクターの成長',
        '特別なバッジ獲得',
        'ハニーポイントボーナス',
        '隠れた旅行先のおすすめ',
      ],
    },

    // レベルモーダル
    levelModal: {
      title: 'ビティレベルとは？',
      description: '🧠 レベルはビティの学習度を表します',
      descriptionList: [
        { title: '旅行嗜好の学習', desc: '好みの場所タイプ、雰囲気、アクティビティなどを学習します' },
        { title: '感情の理解度', desc: '旅行中の感情や気分を把握します' },
        { title: 'パターン分析', desc: '旅行時間帯、動線、好みのルートなどを分析します' },
        { title: 'パーソナライズ推薦', desc: 'レベルが高いほど正確なおすすめを提供します' },
      ],
      howToLevelUp: '📈 レベルアップ方法',
      levelUpList: [
        'さまざまな場所を訪れて経験を積みましょう',
        '旅行後に感情や感想を記録しましょう',
        'ビティと会話して好みを共有しましょう',
        '場所への評価とフィードバックを残しましょう',
      ],
      tip: '💡 レベルが上がるほど、ビティはあなたの旅行スタイルをよりよく理解し、よりパーソナライズされた旅行先と体験をおすすめします。',
    },

    // ハニーポイントモーダル
    honeyModal: {
      title: 'ハニーポイントとは？',
      description: '🍯 ハニーポイントは旅行活動で獲得できるポイントです',
      earnList: [
        { title: '場所訪問', desc: '新しい場所を訪問するたびにポイント獲得' },
        { title: 'レビュー作成', desc: '訪問した場所にレビューを残すと追加ポイント' },
        { title: '写真アップロード', desc: '旅行写真を共有するとポイント獲得' },
        { title: '連続訪問', desc: '毎日旅行するとボーナスポイント支給' },
      ],
      usage: '💰 ハニーポイントの使い道',
      usageList: [
        { title: 'ビティにプレゼント', desc: 'さまざまなプレゼントでビティを飾りましょう (200 🍯~)' },
        { title: '特別な旅行先の解放', desc: '隠れた名所情報を確認' },
        { title: 'プレミアム推薦', desc: 'より精巧なパーソナライズ推薦を受ける' },
        { title: '割引クーポン', desc: '提携企業の割引特典（準備中）' },
      ],
      tip: '💡 ハニーポイントを貯めて、ビティと一緒にもっと楽しい旅行を作りましょう！',
    },

    // 言語設定モーダル
    languageModal: {
      title: '言語選択 / Language',
      korean: '한국어',
      english: 'English',
      japanese: '日本語',
    },
  },

  // POI詳細
  poi: {
    rating: '評価',
    reviews: 'レビュー',
    photos: '写真',
    address: '住所',
    phone: '電話',
    website: 'ウェブサイト',
    hours: '営業時間',
    openNow: '営業中',
    closed: '営業終了',
    noInfo: '情報なし',
    // タブ
    tabs: {
      info: '基本情報',
      reviews: 'レビュー',
      photos: '写真',
    },
    // 便利施設
    facilities: {
      title: '便利施設',
      available: '可能',
      unavailable: '不可',
      parking: '駐車場',
      children: 'お子様連れ',
      wheelchair: '車椅子',
      vegetarian: 'ベジタリアン',
      takeout: 'テイクアウト',
      delivery: 'デリバリー',
      dogs: 'ペット可',
      reservable: '予約',
    },
    // その他
    visitWebsite: 'ウェブサイトへ',
    noReviews: 'レビューがありません',
    noPhotos: '写真がありません',
  },

  // 発見モードメッセージ
  discoveryMessages: {
    weather: {
      clear: '今日は天気がいいですね！散歩にぴったりの日です。',
      clouds: '少し曇っていますが、旅行に良い天気です！',
      rain: '雨が降っています。室内の観光地をおすすめします！',
      snow: '雪が降っています！暖かいカフェはいかがですか？',
      default: '今日も良い旅行を！',
    },
    searching: '周辺を探索しています...',
    found: '面白い場所を発見しました！',
  },
};
