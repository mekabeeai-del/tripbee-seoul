import { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import { FaGoogle, FaApple } from 'react-icons/fa';
import StreamingText from '../common/StreamingText';
import ExpandableOverlay from '../common/ExpandableOverlay';
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

  // 더미 데이터
  const level = 5;
  const currentExp = 180;
  const maxExp = 200;
  const honeyPoints = 1234;
  const todayEarnedPoints = 50;
  const travelDistance = 15.01;
  const visitedPlaces = 3;
  const travelTime = 0.76;

  const fullMessage = '새로운 여행을 할수록\n비티가 함께 성장해요!';

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
                  text="트립비에 로그인해주세요!"
                  speed={80}
                  showCursor={false}
                  enabled={isOpen && !isAnimating}
                  highlights={[
                    { text: '트립비', color: '#0066CC' }
                  ]}
                />
              </div>

              {/* 비티 캐릭터 */}
              <div className="login-beaty-image">
                <img src="/img/beaty/beaty_login.png" alt="Login Beaty" />
              </div>

              <p className="login-description">
                로그인 하시면 비티가 맞춤형 여행을 추천해드립니다.<br />
                함께 여행하면서 추억을 만들어봐요!
              </p>
              <div className="login-buttons-container">
                {/* Google 로그인 버튼 */}
                <button
                  className="login-button google-login"
                  onClick={() => onLogin?.('google')}
                >
                  <FaGoogle size={20} />
                  <span>Google로 계속하기</span>
                </button>

                {/* Apple 로그인 버튼 */}
                <button
                  className="login-button apple-login"
                  onClick={() => onLogin?.('apple')}
                >
                  <FaApple size={22} />
                  <span>Apple로 계속하기</span>
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
            <div className="beaty-title">탐험가 비티</div>

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
              <div className="stat-label">여행거리</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{visitedPlaces}개</div>
              <div className="stat-label">방문장소</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{travelTime}h</div>
              <div className="stat-label">여행시간</div>
            </div>
          </div>

          {/* 허니포인트 정보 */}
          <div className="honey-info-section">
            <div className="honey-info-card">
              <div className="honey-today">
                오늘 획득: <span className="honey-earned">+{todayEarnedPoints} 🍯</span>
              </div>
              <div className="honey-total">
                총 보유: <span className="honey-amount">{honeyPoints} 🍯</span>
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="action-buttons-section">
            <button className="action-button gift-button" onClick={handleComingSoon}>
              <span className="button-icon">🎁</span>
              <span className="button-text">선물하기</span>
              <span className="button-cost">200 🍯</span>
            </button>
            <button className="action-button closet-button" onClick={handleComingSoon}>
              <span className="button-icon">👔</span>
              <span className="button-text">옷장 보기</span>
              <span className="button-badge">3개</span>
            </button>
          </div>

          {/* 여행 기록 미리보기 */}
          <div className="trip-record-section">
            <h3>오늘의 여행 기록</h3>
            <div className="trip-map-thumbnail">
              <img
                src="https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/126.9780,37.5665,12,0/400x300@2x?access_token=pk.eyJ1IjoieWVhaGhhIiwiYSI6ImNtZTk4bTY2czBvcjUya29pc2NmdzM2aDQifQ.Nv8VEnrxJ5BDqBDOHH518Q"
                alt="Trip Map"
              />
            </div>
            <button className="view-detail-button" onClick={handleComingSoon}>여행 기록 자세히 보기</button>
          </div>

          {/* 하단 메뉴 */}
          <div className="home-panel-footer">
            <button className="footer-menu-item" onClick={onLogout}>
              로그아웃
            </button>
            <span className="footer-divider">|</span>
            <button className="footer-menu-item" onClick={() => setIsLanguageModalOpen(true)}>
              언어설정
            </button>
            <span className="footer-divider">|</span>
            <button className="footer-menu-item" onClick={handleComingSoon}>
              정보수정
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
              <h3>경험치 획득 방법</h3>
              <button className="exp-modal-close" onClick={() => setIsExpModalOpen(false)}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="exp-modal-content">
              <div className="exp-modal-section">
                <h4>💫 경험치를 얻는 방법</h4>
                <ul>
                  <li>새로운 장소 방문하기</li>
                  <li>감정적인 여행 기록 남기기</li>
                  <li>친구와 여행 공유하기</li>
                  <li>리뷰와 사진 업로드하기</li>
                </ul>
              </div>
              <div className="exp-modal-section">
                <h4>🎁 레벨업 혜택</h4>
                <ul>
                  <li>비티 캐릭터 성장</li>
                  <li>특별한 뱃지 획득</li>
                  <li>허니포인트 보너스</li>
                  <li>숨겨진 여행지 추천</li>
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
              <h3>비티 레벨이란?</h3>
              <button className="exp-modal-close" onClick={() => setIsLevelModalOpen(false)}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="exp-modal-content">
              <div className="exp-modal-section">
                <h4>🧠 레벨은 비티의 학습 정도를 나타냅니다</h4>
                <ul>
                  <li><strong>여행 취향 학습</strong> - 선호하는 장소 유형, 분위기, 활동 등을 학습합니다</li>
                  <li><strong>감정 이해도</strong> - 여행 중 느끼는 감정과 기분을 파악합니다</li>
                  <li><strong>패턴 분석</strong> - 여행 시간대, 동선, 선호 루트 등을 분석합니다</li>
                  <li><strong>개인화 추천</strong> - 레벨이 높을수록 더 정확한 맞춤 추천을 제공합니다</li>
                </ul>
              </div>
              <div className="exp-modal-section">
                <h4>📈 레벨업 방법</h4>
                <ul>
                  <li>다양한 장소를 방문하고 경험을 쌓으세요</li>
                  <li>여행 후 감정과 느낌을 기록하세요</li>
                  <li>비티와 대화하며 선호도를 공유하세요</li>
                  <li>장소에 대한 평가와 피드백을 남기세요</li>
                </ul>
              </div>
              <div className="exp-modal-section">
                <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.6', margin: 0 }}>
                  💡 레벨이 높아질수록 비티는 당신의 여행 스타일을 더 잘 이해하게 되어,
                  더욱 개인화된 여행지와 경험을 추천해드립니다.
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
              <h3>허니포인트란?</h3>
              <button className="exp-modal-close" onClick={() => setIsHoneyModalOpen(false)}>
                <MdClose size={20} />
              </button>
            </div>
            <div className="exp-modal-content">
              <div className="exp-modal-section">
                <h4>🍯 허니포인트는 여행 활동으로 획득하는 포인트입니다</h4>
                <ul>
                  <li><strong>장소 방문</strong> - 새로운 장소를 방문할 때마다 포인트 획득</li>
                  <li><strong>리뷰 작성</strong> - 방문한 장소에 리뷰를 남기면 추가 포인트</li>
                  <li><strong>사진 업로드</strong> - 여행 사진을 공유하면 포인트 적립</li>
                  <li><strong>연속 방문</strong> - 매일 여행하면 보너스 포인트 지급</li>
                </ul>
              </div>
              <div className="exp-modal-section">
                <h4>💰 허니포인트 사용처</h4>
                <ul>
                  <li><strong>비티 선물하기</strong> - 다양한 선물로 비티를 꾸며보세요 (200 🍯~)</li>
                  <li><strong>특별 여행지 잠금 해제</strong> - 숨겨진 명소 정보 확인</li>
                  <li><strong>프리미엄 추천</strong> - 더욱 정교한 맞춤 추천 받기</li>
                  <li><strong>할인 쿠폰</strong> - 제휴 업체 할인 혜택 (준비중)</li>
                </ul>
              </div>
              <div className="exp-modal-section">
                <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.6', margin: 0 }}>
                  💡 허니포인트를 모아 비티와 함께 더 즐거운 여행을 만들어보세요!
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
              <h3>언어 선택 / Language</h3>
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
                  <span className="language-name">한국어</span>
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
                  <span className="language-name">English</span>
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
                  <span className="language-name">日本語</span>
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
          준비중인 기능입니다 🚧
        </div>
      )}
    </>
  );
}
