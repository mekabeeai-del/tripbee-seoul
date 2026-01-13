import { useMemo } from 'react';
import { MdClose, MdLocalOffer } from 'react-icons/md';
import { getTranslation, type Language } from '../../locales';
import type { Coupon } from './CouponModal';
import './CouponListPanel.css';

interface CouponListPanelProps {
  isOpen: boolean;
  onClose: () => void;
  coupons: Coupon[];
  language?: Language;
  onCouponClick?: (coupon: Coupon) => void;
}

export default function CouponListPanel({
  isOpen,
  onClose,
  coupons,
  language = 'ko',
  onCouponClick
}: CouponListPanelProps) {
  const t = useMemo(() => getTranslation(language), [language]);

  if (!isOpen) return null;

  return (
    <div className="coupon-list-panel">
      <div className="coupon-list-backdrop" onClick={onClose} />
      <div className="coupon-list-content">
        {/* 헤더 */}
        <div className="coupon-list-header">
          <div className="header-info">
            <h2>{t.couponList.title}</h2>
            <p className="coupon-count">
              {t.couponList.available(coupons.length)}
            </p>
          </div>
          <button className="coupon-list-close" onClick={onClose}>
            <MdClose size={24} />
          </button>
        </div>

        {/* 쿠폰 목록 */}
        <div className="coupon-list-body">
          {coupons.length > 0 ? (
            <div className="coupon-grid">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="coupon-thumbnail"
                  onClick={() => onCouponClick?.(coupon)}
                >
                  {/* 쿠폰 카드 */}
                  <div className="coupon-thumbnail-card">
                    {/* 할인율 */}
                    <div className="thumbnail-discount">
                      {coupon.emoji ? (
                        <span className="discount-icon" style={{ fontSize: '24px' }}>{coupon.emoji}</span>
                      ) : (
                        <MdLocalOffer className="discount-icon" />
                      )}
                      <span className="discount-value">{coupon.discount}</span>
                    </div>

                    {/* 쿠폰 정보 */}
                    <div className="thumbnail-info">
                      <h3 className="thumbnail-title">{coupon.title}</h3>
                    </div>

                    {/* 쿠폰 코드 */}
                    <div className="thumbnail-code">
                      <span className="code-value">{coupon.code}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-coupons">
              <div className="no-coupons-icon">🎫</div>
              <p className="no-coupons-title">{t.couponList.noCoupons}</p>
              <p className="no-coupons-desc">{t.couponList.noCouponsDesc}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
