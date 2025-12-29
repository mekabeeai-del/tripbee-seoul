import { useState, useEffect, useMemo } from 'react';
import { MdClose } from 'react-icons/md';
import { FaGoogle, FaApple } from 'react-icons/fa';
import StreamingText from '../common/StreamingText';
import ExpandableOverlay from '../common/ExpandableOverlay';
import { getTranslation, type Language } from '../../locales';
import './HomePanel.css';

interface HomePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onClosing?: (isClosing: boolean) => void;
  language?: 'ko' | 'en' | 'ja';
  onLanguageChange?: (lang: 'ko' | 'en' | 'ja') => void;
  isLoggedIn?: boolean;
  onLogin?: (provider: 'google' | 'apple') => Promise<void>;
  onLogout?: () => Promise<void>;
}

// 홈 패널 확장 시작 위치 (좌측 상단 - 비티 아바타 위치)
const HOME_EXPAND_FROM = { x: 70, y: 35 };

export default function HomePanel({ isOpen, onClose, onClosing, language = 'ko', onLanguageChange, isLoggedIn = false, onLogin, onLogout }: HomePanelProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [isHoneyModalOpen, setIsHoneyModalOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // 번역
  const t = useMemo(() => getTranslation(language as Language), [language]);

  // 더미 데이터
  const level = 5;
  const currentExp = 180;
  const maxExp = 200;
  const honeyPoints = 1234;
  const todayEarnedPoints = 50;
  const travelDistance = 15.01;
  const visitedPlaces = 3;
  const travelTime = 0.76;

  const fullMessage = t.home.beatyMessage;

  // 타이핑 효과
  useEffect(() => {
    if (!isOpen || isAnimating) return;

    setDisplayedText(''); // 텍스트 초기화
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= fullMessage.length) {
        setDisplayedText(fullMessage.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 50); // 50ms마다 한 글자씩

    return () => clearInterval(interval);
  }, [isOpen, isAnimating]);

  // 닫힐 때 상태 처리
  const handleClosing = (closing: boolean) => {
    setIsAnimating(closing);
    onClosing?.(closing);
  };

  const handleComingSoon = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowComingSoon(true);
    setTimeout(() => {
      setShowComingSoon(false);
    }, 1500);
  };

  return (
    <>
      <ExpandableOverlay
        isOpen={isOpen}
        onClose={onClose}
        onClosing={handleClosing}
        expandFrom={HOME_EXPAND_FROM}
        className="home-panel-overlay"
      >
        {/* 배경 (그라데이션) */}
        <div className="home-panel-background" />

        {/* 패널 */}
        <div className="home-panel">
          {/* 로그인 안되어있을 때 */}
          {!isLoggedIn ? (
            <div className="login-required-section">
              {/* 말풍선 */}
              <div className="login-speech-bubble">
                <StreamingText
                  text={t.home.loginRequired}
                  speed={80}
                  showCursor={false}
                  enabled={isOpen && !isAnimating}
                  highlights={[
                    { text: 'TripBee', color: '#0066CC' },
                    { text: '트립비', color: '#0066CC' }
                  ]}
                />
              </div>

              {/* 비티 캐릭터 */}
              <div className="login-beaty-image">
                <img src="/img/beaty/beaty_login.png" alt="Login Beaty" />
              </div>

              <p className="login-description">
                {t.home.loginDescription.split('\n').map((line, i) => (
                  <span key={i}>{line}{i === 0 && <br />}</span>
                ))}
              </p>
              <div className="login-buttons-container">
                {/* Google 로그인 버튼 */}
                <button
                  className="login-button google-login"
                  onClick={() => onLogin?.('google')}
                >
                  <FaGoogle size={20} />
                  <span>{t.home.continueWithGoogle}</span>
                </button>

                {/* Apple 로그인 버튼 */}
                <button
                  className="login-button apple-login"
                  onClick={() => onLogin?.('apple')}
                >
                  <FaApple size={22} />
                  <span>{t.home.continueWithApple}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 상단 헤더 */}
              <div className="home-panel-header">
                <div className="home-honey-container">
                  <div className="home-honey-points" onClick={handleComingSoon}>
                    🍯 {honeyPoints}
                  </div>
                  <button className="home-honey-help-btn" onClick={() => setIsHoneyModalOpen(true)}>
                    ❔
                  </button>
                </div>
              </div>

              {/* 스크롤 가능한 콘텐츠 */}
              <div className="home-panel-content">
          {/* 비티 레벨 영역 */}
          <div className="beaty-level-section">
            <div className="beaty-level-container">
              <div className="beaty-level">Lv. {level}</div>
              <button className="beaty-level-help-btn" onClick={() => setIsLevelModalOpen(true)}>
                ❔
              </button>
            </div>
            <div className="beaty-title">{t.home.beatyTitle}</div>

            {/* 말풍선 */}
            <div className="beaty-speech-bubble">
              {displayedText.split('\n').map((line, index) => (
                <span key={index}>
                  {line}
                  {index < displayedText.split('\n').length - 1 && <br />}
                </span>
              ))}
            </div>

            {/* 비티 캐릭터 */}
            <div className="beaty-character-area">
              <img src="/img/beaty/beaty_profile.png" alt="Beaty" className="beaty-character-image" />
            </div>

            <div className="beaty-exp-container">
              <div className="beaty-exp-bar">
                <div className="exp-bar-fill" style={{ width: `${(currentExp / maxExp) * 100}%` }}></div>
              </div>
              <button className="beaty-exp-help-btn" onClick={() => setIsExpModalOpen(true)}>
                ❔
              </button>
            </div>
            <div className="beaty-exp-text">{currentExp} / {maxExp} EXP</div>
          </div>

          {/* 스탯 카드 (3분할) */}
          <div className="beaty-stats-section">
            <div className="stat-card">
              <div className="stat-value">{travelDistance}km</div>
              <div className="stat-label">{t.home.stats.travelDistance}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{visitedPlaces}{language === 'ko' ? '개' : ''}</div>
              <div className="stat-label">{t.home.stats.visitedPlaces}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{travelTime}h</div>
              <div className="stat-label">{t.home.stats.travelTime}</div>
            </div>
          </div>

          {/* 허니포인트 정보 */}
          <div className="honey-info-section">
            <div className="honey-info-card">
              <div className="honey-today">
                {t.home.honey.todayEarned}: <span className="honey-earned">+{todayEarnedPoints} 🍯</span>
              </div>
              <div className="honey-total">
                {t.home.honey.totalOwned}: <span className="honey-amount">{honeyPoints} 🍯</span>
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="action-buttons-section">
            <button className="action-button gift-button" onClick={handleComingSoon}>
              <span className="button-icon">🎁</span>
              <span className="button-text">{t.home.actions.gift}</span>
              <span className="button-cost">200 🍯</span>
            </button>
            <button className="action-button closet-button" onClick={handleComingSoon}>
              <span className="button-icon">👔</span>
              <span className="button-text">{t.home.actions.closet}</span>
              <span className="button-badge">3{language === 'ko' ? '개' : ''}</span>
            </button>
          </div>

          {/* 여행 기록 미리보기 */}
          <div className="trip-record-section">
            <h3>{t.home.tripRecord.title}</h3>
            <div className="trip-map-thumbnail">
              <img
                src="https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/126.9780,37.5665,12,0/400x300@2x?access_token=pk.eyJ1IjoieWVhaGhhIiwiYSI6ImNtZTk4bTY2czBvcjUya29pc2NmdzM2aDQifQ.Nv8VEnrxJ5BDqBDOHH518Q"
                alt="Trip Map"
              />
            </div>
            <button className="view-detail-button" onClick={handleComingSoon}>{t.home.tripRecord.viewDetail}</button>
          </div>

          {/* 하단 메뉴 */}
          <div className="home-panel-footer">
            <button className="footer-menu-item" onClick={onLogout}>
              {t.home.footer.logout}
            </button>
            <span className="footer-divider">|</span>
            <button className="footer-menu-item" onClick={() => setIsLanguageModalOpen(true)}>
              {t.home.footer.languageSetting}
            </button>
            <span className="footer-divider">|</span>
            <button className="footer-menu-item" onClick={handleComingSoon}>
              {t.home.footer.editProfile}
            </button>
          </div>
        </div>
            </>
          )}
      </div>
      </ExpandableOverlay>

      {/* 경험치 설명 모달 - 홈패널 밖에 배치 */}
      {isExpModalOpen && (
        <div className="exp-modal-overlay" onClick={() => setIsExpModalOpen(false)}>
          <div className="exp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="exp-modal-header">
              <h3>{t.home.expModal.title}</h3>
              <button className="exp-modal-close" onClick={() => setIsExpModalOpen(false)}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="exp-modal-content">
              <div className="exp-modal-section">
                <h4>{t.home.expModal.howToEarn}</h4>
                <ul>
                  {t.home.expModal.earnList.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="exp-modal-section">
                <h4>{t.home.expModal.levelUpBenefits}</h4>
                <ul>
                  {t.home.expModal.benefitList.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 레벨 설명 모달 - 홈패널 밖에 배치 */}
      {isLevelModalOpen && (
        <div className="exp-modal-overlay" onClick={() => setIsLevelModalOpen(false)}>
          <div className="exp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="exp-modal-header">
              <h3>{t.home.levelModal.title}</h3>
              <button className="exp-modal-close" onClick={() => setIsLevelModalOpen(false)}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="exp-modal-content">
              <div className="exp-modal-section">
                <h4>{t.home.levelModal.description}</h4>
                <ul>
                  {t.home.levelModal.descriptionList.map((item, i) => (
                    <li key={i}><strong>{item.title}</strong> - {item.desc}</li>
                  ))}
                </ul>
              </div>
              <div className="exp-modal-section">
                <h4>{t.home.levelModal.howToLevelUp}</h4>
                <ul>
                  {t.home.levelModal.levelUpList.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="exp-modal-section">
                <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.6', margin: 0 }}>
                  {t.home.levelModal.tip}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 허니포인트 설명 모달 - 홈패널 밖에 배치 */}
      {isHoneyModalOpen && (
        <div className="exp-modal-overlay" onClick={() => setIsHoneyModalOpen(false)}>
          <div className="exp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="exp-modal-header">
              <h3>{t.home.honeyModal.title}</h3>
              <button className="exp-modal-close" onClick={() => setIsHoneyModalOpen(false)}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="exp-modal-content">
              <div className="exp-modal-section">
                <h4>{t.home.honeyModal.description}</h4>
                <ul>
                  {t.home.honeyModal.earnList.map((item, i) => (
                    <li key={i}><strong>{item.title}</strong> - {item.desc}</li>
                  ))}
                </ul>
              </div>
              <div className="exp-modal-section">
                <h4>{t.home.honeyModal.usage}</h4>
                <ul>
                  {t.home.honeyModal.usageList.map((item, i) => (
                    <li key={i}><strong>{item.title}</strong> - {item.desc}</li>
                  ))}
                </ul>
              </div>
              <div className="exp-modal-section">
                <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.6', margin: 0 }}>
                  {t.home.honeyModal.tip}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 언어 설정 모달 - 홈패널 밖에 배치 */}
      {isLanguageModalOpen && (
        <div className="exp-modal-overlay" onClick={() => setIsLanguageModalOpen(false)}>
          <div className="exp-modal language-modal" onClick={(e) => e.stopPropagation()}>
            <div className="exp-modal-header">
              <h3>{t.home.languageModal.title}</h3>
              <button className="exp-modal-close" onClick={() => setIsLanguageModalOpen(false)}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="exp-modal-content">
              <div className="language-options">
                <button
                  className={`language-option ${language === 'ko' ? 'active' : ''}`}
                  onClick={() => {
                    onLanguageChange?.('ko');
                    setIsLanguageModalOpen(false);
                  }}
                >
                  <span className="language-flag">🇰🇷</span>
                  <span className="language-name">{t.home.languageModal.korean}</span>
                  {language === 'ko' && <span className="language-check">✓</span>}
                </button>
                <button
                  className={`language-option ${language === 'en' ? 'active' : ''}`}
                  onClick={() => {
                    onLanguageChange?.('en');
                    setIsLanguageModalOpen(false);
                  }}
                >
                  <span className="language-flag">🇺🇸</span>
                  <span className="language-name">{t.home.languageModal.english}</span>
                  {language === 'en' && <span className="language-check">✓</span>}
                </button>
                <button
                  className={`language-option ${language === 'ja' ? 'active' : ''}`}
                  onClick={() => {
                    onLanguageChange?.('ja');
                    setIsLanguageModalOpen(false);
                  }}
                >
                  <span className="language-flag">🇯🇵</span>
                  <span className="language-name">{t.home.languageModal.japanese}</span>
                  {language === 'ja' && <span className="language-check">✓</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 준비중 툴팁 */}
      {showComingSoon && (
        <div className="coming-soon-tooltip">
          {t.home.comingSoon}
        </div>
      )}
    </>
  );
}
