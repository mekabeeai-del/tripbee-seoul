import { useEffect, useRef } from 'react';
import { MdClose } from 'react-icons/md';
import { renderGoogleButton, type GoogleAuthResponse } from '../../services/googleAuth';
import './GoogleLoginModal.css';

interface GoogleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (response: GoogleAuthResponse) => void;
}

export default function GoogleLoginModal({ isOpen, onClose, onSuccess }: GoogleLoginModalProps) {
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && googleButtonRef.current) {
      // 버튼이 이미 렌더링되었는지 확인
      if (googleButtonRef.current.children.length > 0) {
        return;
      }

      // Google 버튼 렌더링
      renderGoogleButton(
        googleButtonRef.current,
        (response: GoogleAuthResponse) => {
          onSuccess(response);
          onClose();
        },
        (error: Error) => {
          console.error('[GoogleLoginModal] Error:', error);
        }
      );
    }
  }, [isOpen, onSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div className="google-login-modal-overlay" onClick={onClose}>
      <div className="google-login-modal" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="google-login-modal-header">
          <h2>Google 계정으로 로그인</h2>
          <button className="google-login-modal-close" onClick={onClose}>
            <MdClose size={24} />
          </button>
        </div>

        {/* 본문 */}
        <div className="google-login-modal-body">
          <p className="google-login-modal-description">
            트립비 서비스를 이용하려면 Google 계정으로 로그인해주세요.
          </p>

          {/* Google 버튼 컨테이너 */}
          <div ref={googleButtonRef} className="google-login-modal-button-container"></div>

          <p className="google-login-modal-notice">
            로그인하면 <a href="#" onClick={(e) => e.preventDefault()}>서비스 약관</a> 및{' '}
            <a href="#" onClick={(e) => e.preventDefault()}>개인정보 보호정책</a>에 동의하게 됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
