import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './InstallPage.css';

export default function InstallPage() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert('이미 설치되어 있거나 브라우저가 PWA 설치를 지원하지 않습니다.');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA 설치 완료');
      navigate('/');
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="install-page">
      <div className="install-container">
        <div className="install-logo">
          <img src="/img/beaty/beaty_profile.png" alt="TripBee" />
        </div>

        <h1>TripBee Seoul</h1>
        <p className="install-subtitle">서울 여행 가이드 앱</p>

        <div className="install-features">
          <div className="feature-item">
            <span className="feature-icon">📍</span>
            <span>실시간 장소 추천</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🗺️</span>
            <span>맞춤형 여행 코스</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🐝</span>
            <span>AI 비티와 함께</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📱</span>
            <span>오프라인 지원</span>
          </div>
        </div>

        <div className="install-actions">
          {isInstallable ? (
            <>
              <button className="install-button primary" onClick={handleInstall}>
                앱 설치하기
              </button>
              <button className="install-button secondary" onClick={handleSkip}>
                나중에 하기
              </button>
            </>
          ) : (
            <>
              <p className="install-note">
                이미 설치되었거나 브라우저가 PWA 설치를 지원하지 않습니다.
              </p>
              <button className="install-button primary" onClick={handleSkip}>
                앱 시작하기
              </button>
            </>
          )}
        </div>

        <div className="install-guide">
          <p>💡 iOS Safari 사용자는 <strong>공유 버튼 → 홈 화면에 추가</strong>를 눌러주세요</p>
        </div>
      </div>
    </div>
  );
}
