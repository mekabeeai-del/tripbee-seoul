import { useState, useMemo } from 'react';
import { MdClose, MdPhone, MdLanguage, MdAccessTime, MdStar, MdLocationOn, MdDirections, MdEventAvailable } from 'react-icons/md';
import type { VisiblePOI } from '../../hooks/useDiscoveryMode';
import ExpandableOverlay from '../common/ExpandableOverlay';
import BeatyBubble from '../beaty/BeatyBubble';
import { getTranslation, type Language } from '../../locales';
import './POIDetailPanel.css';

type TabType = 'info' | 'reviews' | 'photos';

interface POIDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onClosing?: (isClosing: boolean) => void;
  name: string;
  imageUrl: string;
  description?: string;
  expandFrom?: { x: number; y: number } | null;
  poi?: VisiblePOI | null;
  language?: Language;
  onNavigateClick?: () => void;
  onReservationClick?: () => void;
}

export default function POIDetailPanel({
  isOpen,
  onClose,
  onClosing,
  name,
  imageUrl,
  expandFrom,
  poi,
  language = 'ko',
  onNavigateClick,
  onReservationClick
}: POIDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const t = useMemo(() => getTranslation(language), [language]);

  // 편의시설 아이템 렌더링
  const renderFacilityItem = (label: string, value: boolean | undefined, emoji: string) => {
    if (value === undefined) return null;
    return (
      <div className={`facility-item ${value ? 'available' : 'unavailable'}`}>
        <span className="facility-emoji">{emoji}</span>
        <span className="facility-label">{label}</span>
        <span className="facility-status">{value ? t.poi.facilities.available : t.poi.facilities.unavailable}</span>
      </div>
    );
  };

  // 탭 콘텐츠 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <div className="tab-content tab-info">
            {/* 비티 한마디 */}
            {poi?.beaty_comment && (
              <div className="poi-beaty-comment">
                <BeatyBubble
                  variant="panel"
                  message={poi.beaty_comment}
                  isVisible={true}
                />
              </div>
            )}

            {/* 대표 이미지 */}
            <div className="poi-main-image">
              <img src={poi?.image || imageUrl} alt={name} />
              {poi?.rating && (
                <div className="poi-rating-badge">
                  <MdStar /> {poi.rating.toFixed(1)}
                  {poi.user_rating_count && (
                    <span className="rating-count">({poi.user_rating_count})</span>
                  )}
                </div>
              )}
              {poi?.open_now !== undefined && (
                <div className={`poi-open-badge ${poi.open_now ? 'open' : 'closed'}`}>
                  {poi.open_now ? t.poi.openNow : t.poi.closed}
                </div>
              )}
            </div>

            {/* 기본 정보 */}
            <div className="info-section">
              {poi?.address && (
                <div className="info-row">
                  <MdLocationOn className="info-icon" />
                  <span>{poi.address}</span>
                </div>
              )}
              {poi?.phone_number && (
                <div className="info-row clickable" onClick={() => window.open(`tel:${poi.phone_number}`)}>
                  <MdPhone className="info-icon" />
                  <span>{poi.phone_number}</span>
                </div>
              )}
              {poi?.website && (
                <div className="info-row clickable" onClick={() => window.open(poi.website, '_blank')}>
                  <MdLanguage className="info-icon" />
                  <span>{t.poi.visitWebsite}</span>
                </div>
              )}
            </div>

            {/* 액션 버튼 */}
            {(onNavigateClick || onReservationClick) && (
              <div className="action-buttons">
                {onNavigateClick && (
                  <button className="action-button navigate" onClick={onNavigateClick}>
                    <MdDirections size={20} />
                    <span>{t.route.navigate}</span>
                  </button>
                )}
                {onReservationClick && (
                  <button className="action-button reservation" onClick={onReservationClick}>
                    <MdEventAvailable size={20} />
                    <span>{t.reservation.makeReservation}</span>
                  </button>
                )}
              </div>
            )}

            {/* 영업시간 */}
            {poi?.opening_hours && poi.opening_hours.length > 0 && (
              <div className="hours-section">
                <h4><MdAccessTime /> {t.poi.hours}</h4>
                <div className="hours-list">
                  {poi.opening_hours.map((hour, idx) => (
                    <div key={idx} className="hour-item">{hour}</div>
                  ))}
                </div>
              </div>
            )}

            {/* 설명 */}
            {poi?.editorial_summary && (
              <div className="summary-section">
                <p>{poi.editorial_summary}</p>
              </div>
            )}

            {/* 편의시설 (기본정보에 포함) */}
            <div className="facilities-section">
              <h4>🏷️ {t.poi.facilities.title}</h4>
              <div className="facilities-grid">
                {renderFacilityItem(t.poi.facilities.parking, poi?.parking_available, '🅿️')}
                {renderFacilityItem(t.poi.facilities.children, poi?.good_for_children, '👶')}
                {renderFacilityItem(t.poi.facilities.wheelchair, poi?.wheelchair_accessible, '♿')}
                {renderFacilityItem(t.poi.facilities.vegetarian, poi?.vegetarian_food, '🥗')}
                {renderFacilityItem(t.poi.facilities.takeout, poi?.takeout, '🥡')}
                {renderFacilityItem(t.poi.facilities.delivery, poi?.delivery, '🛵')}
                {renderFacilityItem(t.poi.facilities.dogs, poi?.allows_dogs, '🐕')}
                {renderFacilityItem(t.poi.facilities.reservable, poi?.reservable, '📅')}
              </div>
            </div>
          </div>
        );

      case 'reviews':
        return (
          <div className="tab-content tab-reviews">
            {poi?.reviews && poi.reviews.length > 0 ? (
              <div className="reviews-list">
                {poi.reviews.map((review, idx) => (
                  <div key={idx} className="review-item">
                    <div className="review-header">
                      {review.author_photo && (
                        <img src={review.author_photo} alt={review.author_name} className="review-avatar" />
                      )}
                      <div className="review-author">
                        <span className="author-name">{review.author_name}</span>
                        <span className="review-time">{review.time}</span>
                      </div>
                      {review.rating && (
                        <div className="review-rating">
                          <MdStar /> {review.rating}
                        </div>
                      )}
                    </div>
                    <p className="review-text">{review.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">{t.poi.noReviews}</div>
            )}
          </div>
        );

      case 'photos':
        return (
          <div className="tab-content tab-photos">
            {poi?.photos && poi.photos.length > 0 ? (
              <div className="photos-grid">
                {poi.photos.map((photo, idx) => (
                  <div key={idx} className="photo-item">
                    <img src={photo} alt={`${name} ${idx + 1}`} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">{t.poi.noPhotos}</div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // 닫힐 때 탭 초기화
  const handleClosing = (isClosing: boolean) => {
    onClosing?.(isClosing);
    if (!isClosing) {
      setActiveTab('info');
    }
  };

  return (
    <ExpandableOverlay
      isOpen={isOpen}
      onClose={onClose}
      onClosing={handleClosing}
      expandFrom={expandFrom}
      className="poi-detail-overlay"
    >
      {/* 헤더 */}
      <div className="poi-detail-header">
        <h2>{name}</h2>
        <button className="poi-detail-close" onClick={onClose}>
          <MdClose size={24} />
        </button>
      </div>

      {/* 탭 헤더 */}
      <div className="poi-tabs">
        <button
          className={`poi-tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          {t.poi.tabs.info}
        </button>
        <button
          className={`poi-tab ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          {t.poi.tabs.reviews} {poi?.reviews?.length ? `(${poi.reviews.length})` : ''}
        </button>
        <button
          className={`poi-tab ${activeTab === 'photos' ? 'active' : ''}`}
          onClick={() => setActiveTab('photos')}
        >
          {t.poi.tabs.photos} {poi?.photos?.length ? `(${poi.photos.length})` : ''}
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="poi-detail-content">
        {renderTabContent()}
      </div>
    </ExpandableOverlay>
  );
}
