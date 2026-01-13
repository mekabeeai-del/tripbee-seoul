import { useMemo } from 'react';
import { MdClose, MdCheck, MdLocalOffer } from 'react-icons/md';
import { getTranslation, type Language } from '../../locales';
import './CouponModal.css';

export interface Coupon {
  id: string;
  title: string;
  discount: string;
  description: string;
  validUntil: string;
  code: string;
  emoji?: string;
}

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: Coupon;
  language?: Language;
}

export default function CouponModal({
  isOpen,
  onClose,
  coupon,
  language = 'ko'
}: CouponModalProps) {
  const t = useMemo(() => getTranslation(language), [language]);

  if (!isOpen) return null;

  return (
    <div className="coupon-modal">
      <div className="coupon-backdrop" onClick={onClose} />
      <div className="coupon-content">
        {/* 닫기 버튼 */}
        <button className="coupon-close" onClick={onClose}>
          <MdClose size={24} />
        </button>

        {/* 비티 캐릭터 */}
        <div className="coupon-beaty">
          <div className="beaty-character">
            <img
              src="/img/beaty/beaty_login.png"
              alt="Beaty"
              className="beaty-image"
            />
            <div className="beaty-sparkles">✨</div>
          </div>
        </div>

        {/* 쿠폰 발급 메시지 */}
        <div className="coupon-header">
          <h2 className="coupon-title">{t.coupon.issued}</h2>
          <p className="coupon-subtitle">{t.coupon.congratulations}</p>
        </div>

        {/* 쿠폰 카드 */}
        <div className="coupon-card">
          <div className="coupon-card-header">
            {coupon.emoji ? (
              <span className="coupon-icon" style={{ fontSize: '36px' }}>{coupon.emoji}</span>
            ) : (
              <MdLocalOffer className="coupon-icon" />
            )}
            <div className="coupon-discount">{coupon.discount}</div>
          </div>

          <div className="coupon-card-body">
            <h3 className="coupon-card-title">{coupon.title}</h3>
            <p className="coupon-card-description">{coupon.description}</p>

            <div className="coupon-details">
              <div className="detail-item">
                <span className="detail-label">{t.coupon.code}:</span>
                <span className="detail-value coupon-code">{coupon.code}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">{t.coupon.validUntil}:</span>
                <span className="detail-value">{coupon.validUntil}</span>
              </div>
            </div>
          </div>

          {/* 쿠폰 스탬프 */}
          <div className="coupon-stamp">
            <MdCheck size={32} />
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="coupon-notice">
          <p>{t.coupon.howToUse}</p>
        </div>

        {/* 확인 버튼 */}
        <button className="coupon-confirm-button" onClick={onClose}>
          {t.coupon.confirm}
        </button>
      </div>
    </div>
  );
}
