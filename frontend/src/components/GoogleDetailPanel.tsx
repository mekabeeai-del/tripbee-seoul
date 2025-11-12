import React, { useState, useEffect } from 'react';

interface GooglePlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: string;
  user_rating_count?: number;
  image?: string;
  description?: string;
  editorial_summary?: string;
  phone_number?: string;
  website?: string;
  open_now?: boolean;
  price_level?: string;
  parking_available?: boolean;
  good_for_children?: boolean;
  wheelchair_accessible?: boolean;
  vegetarian_food?: boolean;
  takeout?: boolean;
  delivery?: boolean;
  allows_dogs?: boolean;
  reservable?: boolean;
  reviews?: Array<{
    author_name: string;
    author_photo?: string;
    rating: number;
    text: string;
    time: string;
    language?: string;
  }>;
  photos?: string[];
  menu_url?: string;
}

interface GoogleDetailPanelProps {
  place: GooglePlace | null;
  onClose: () => void;
  panelHeight: 'half' | 'full';
  onToggleHeight: () => void;
}

type TabType = 'info' | 'menu' | 'reviews' | 'photos';

const GoogleDetailPanel: React.FC<GoogleDetailPanelProps> = ({ place, onClose, panelHeight, onToggleHeight }) => {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  // place가 변경될 때마다 탭을 기본정보로 리셋
  useEffect(() => {
    if (place) {
      setActiveTab('info');
    }
  }, [place]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setStartY(clientY);
    setCurrentY(clientY);
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;
    setCurrentY(clientY);
  };

  const handleDragEnd = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;
    const deltaY = clientY - startY;

    // 50px 이상 드래그하면 동작
    if (Math.abs(deltaY) > 50) {
      if (deltaY > 0) {
        // 아래로 드래그
        if (panelHeight === 'full') {
          // full → half
          onToggleHeight();
        } else {
          // half → 닫기 (애니메이션 추가)
          setIsClosing(true);
          setTimeout(() => {
            onClose();
            setIsClosing(false);
          }, 300); // 애니메이션 시간과 동일
        }
      } else if (deltaY < 0 && panelHeight === 'half') {
        // 위로 드래그: half → full
        onToggleHeight();
      }
    }
  };

  // 전역 이벤트 리스너 등록/해제
  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, startY, panelHeight]);

  // place가 null이면 아무것도 렌더링하지 않음
  if (!place) return null;

  // 탭 구성 - menu_url이 있을 때만 메뉴 탭 표시
  const tabs = [
    { id: 'info' as TabType, label: '기본정보', icon: 'ℹ️' },
    ...(place.menu_url ? [{ id: 'menu' as TabType, label: '메뉴', icon: '🍽️' }] : []),
    { id: 'reviews' as TabType, label: '리뷰', icon: '⭐', count: place.reviews?.length },
    { id: 'photos' as TabType, label: '사진', icon: '📷', count: place.photos?.length }
  ];

  return (
    <>
      {/* Backdrop - half 모드일 때는 투명, full 모드일 때만 반투명 */}
      {panelHeight === 'full' && (
        <div
          onClick={() => {
            setIsClosing(true);
            setTimeout(() => {
              onClose();
              setIsClosing(false);
            }, 300);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            animation: 'fadeIn 0.3s ease-in-out'
          }}
        />
      )}

      {/* Bottom Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: isDragging
            ? `${Math.max(100, window.innerHeight - currentY)}px`
            : panelHeight === 'half' ? '50vh' : '85vh',
          backgroundColor: 'white',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          transition: isDragging ? 'none' : 'height 0.3s ease-out',
          animation: isClosing ? 'slideDown 0.3s ease-out' : 'slideUp 0.3s ease-out'
        }}
      >
        {/* Handle Bar - Sticky */}
        <div
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          style={{
            position: 'sticky',
            top: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: '12px',
            paddingBottom: '12px',
            backgroundColor: 'white',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            zIndex: 1,
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none'
          }}
        >
          <div
            style={{
              width: '40px',
              height: '4px',
              backgroundColor: '#E0E0E0',
              borderRadius: '2px',
              pointerEvents: 'none'
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: '20px',
              fontSize: '20px',
              color: '#999',
              cursor: 'pointer'
            }}
            onClick={() => {
              setIsClosing(true);
              setTimeout(() => {
                onClose();
                setIsClosing(false);
              }, 300);
            }}
          >
            ✕
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #E0E0E0',
          paddingLeft: '20px',
          paddingRight: '20px',
          backgroundColor: 'white',
          position: 'sticky',
          top: '48px',
          zIndex: 1
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '12px 8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? '#002B5C' : '#999',
                fontWeight: activeTab === tab.id ? '600' : '400',
                fontSize: '14px',
                cursor: 'pointer',
                borderBottom: activeTab === tab.id ? '3px solid #002B5C' : '3px solid transparent',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span style={{
                  fontSize: '11px',
                  color: activeTab === tab.id ? '#002B5C' : '#CCC'
                }}>
                  ({tab.count})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content - Scrollable */}
        <div style={{
          flex: 1,
          overflowY: 'auto'
        }}>
          {/* Title & Rating Row - 스크롤 가능 영역 안에 포함 */}
          <div style={{ padding: '20px 20px 16px' }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#002B5C',
              marginBottom: '12px',
              marginTop: '0'
            }}>
              {place.name}
            </h2>

            {/* Rating & Status */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {place.rating && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  backgroundColor: '#FFF9E6',
                  borderRadius: '8px',
                  border: '1px solid #FFE082'
                }}>
                  <span style={{ fontSize: '14px' }}>⭐</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#F57C00'
                  }}>
                    {place.rating}
                  </span>
                  {place.user_rating_count && (
                    <span style={{
                      fontSize: '11px',
                      color: '#999'
                    }}>
                      ({place.user_rating_count}명)
                    </span>
                  )}
                </div>
              )}

              {place.open_now !== undefined && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  backgroundColor: place.open_now ? '#E8F5E9' : '#FFEBEE',
                  borderRadius: '8px',
                  border: place.open_now ? '1px solid #81C784' : '1px solid #E57373'
                }}>
                  <span style={{ fontSize: '14px' }}>{place.open_now ? '🟢' : '🔴'}</span>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: place.open_now ? '#2E7D32' : '#C62828'
                  }}>
                    {place.open_now ? '영업 중' : '영업 종료'}
                  </span>
                </div>
              )}

              {place.price_level && (
                <div style={{
                  padding: '6px 10px',
                  backgroundColor: '#F3E5F5',
                  borderRadius: '8px',
                  border: '1px solid #CE93D8',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6A1B9A'
                }}>
                  {place.price_level.replace('PRICE_LEVEL_', '').replace('_', ' ')}
                </div>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div style={{ padding: '0 20px 20px' }}>
            {activeTab === 'info' && (
              <InfoTab place={place} />
            )}

            {activeTab === 'menu' && (
              <MenuTab place={place} />
            )}

            {activeTab === 'reviews' && (
              <ReviewsTab place={place} />
            )}

            {activeTab === 'photos' && (
              <PhotosTab place={place} />
            )}
          </div>
        </div>

        {/* CSS Animation */}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          @keyframes slideDown {
            from { transform: translateY(0); }
            to { transform: translateY(100%); }
          }
        `}</style>
      </div>
    </>
  );
};

// ===================== 기본정보 탭 =====================
const InfoTab: React.FC<{ place: GooglePlace }> = ({ place }) => (
  <div>
    {/* Representative Image */}
    {place.image && (
      <div style={{
        width: '100%',
        maxHeight: '250px',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '20px'
      }}>
        <img
          src={place.image}
          alt={place.name}
          style={{
            width: '100%',
            height: 'auto',
            objectFit: 'cover'
          }}
        />
      </div>
    )}

    {/* Address */}
    <div style={{
      marginBottom: '16px',
      padding: '12px',
      backgroundColor: '#F5F7FA',
      borderRadius: '8px'
    }}>
      <div style={{
        fontSize: '12px',
        color: '#999',
        marginBottom: '4px',
        fontWeight: '600'
      }}>
        📍 주소
      </div>
      <div style={{
        fontSize: '14px',
        color: '#333',
        lineHeight: '1.5'
      }}>
        {place.address}
      </div>
    </div>

    {/* Contact Info */}
    {(place.phone_number || place.website) && (
      <div style={{
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#F5F7FA',
        borderRadius: '8px'
      }}>
        <div style={{
          fontSize: '12px',
          color: '#999',
          marginBottom: '8px',
          fontWeight: '600'
        }}>
          📞 연락처
        </div>
        {place.phone_number && (
          <div style={{
            fontSize: '14px',
            color: '#333',
            marginBottom: '6px'
          }}>
            <a href={`tel:${place.phone_number}`} style={{ color: '#1976D2', textDecoration: 'none' }}>
              {place.phone_number}
            </a>
          </div>
        )}
        {place.website && (
          <div style={{
            fontSize: '14px',
            color: '#333'
          }}>
            <a href={place.website} target="_blank" rel="noopener noreferrer" style={{ color: '#1976D2', textDecoration: 'none' }}>
              웹사이트 방문 →
            </a>
          </div>
        )}
      </div>
    )}

    {/* Editorial Summary (Google Description) */}
    {place.editorial_summary && (
      <div style={{
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#F5F7FA',
        borderRadius: '8px'
      }}>
        <div style={{
          fontSize: '12px',
          color: '#999',
          marginBottom: '8px',
          fontWeight: '600'
        }}>
          💬 Google 소개
        </div>
        <div style={{
          fontSize: '14px',
          color: '#333',
          lineHeight: '1.6'
        }}>
          {place.editorial_summary}
        </div>
      </div>
    )}

    {/* Beaty Description */}
    {place.description && (
      <div style={{
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#E3F2FD',
        borderRadius: '8px'
      }}>
        <div style={{
          fontSize: '12px',
          color: '#1976D2',
          marginBottom: '8px',
          fontWeight: '600'
        }}>
          🤖 비티의 한마디
        </div>
        <div style={{
          fontSize: '14px',
          color: '#333',
          lineHeight: '1.6'
        }}>
          {place.description}
        </div>
      </div>
    )}

    {/* Amenities */}
    {(place.parking_available || place.good_for_children || place.wheelchair_accessible ||
      place.vegetarian_food || place.takeout || place.delivery || place.allows_dogs || place.reservable) && (
      <div style={{
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#F5F7FA',
        borderRadius: '8px'
      }}>
        <div style={{
          fontSize: '12px',
          color: '#999',
          marginBottom: '10px',
          fontWeight: '600'
        }}>
          ✨ 편의시설
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {place.parking_available && (
            <span style={{
              padding: '4px 10px',
              backgroundColor: '#E8F5E9',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#2E7D32',
              border: '1px solid #81C784'
            }}>
              🅿️ 주차 가능
            </span>
          )}
          {place.good_for_children && (
            <span style={{
              padding: '4px 10px',
              backgroundColor: '#FFF3E0',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#E65100',
              border: '1px solid #FFB74D'
            }}>
              👶 어린이 환영
            </span>
          )}
          {place.wheelchair_accessible && (
            <span style={{
              padding: '4px 10px',
              backgroundColor: '#E1F5FE',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#01579B',
              border: '1px solid #4FC3F7'
            }}>
              ♿ 휠체어 접근
            </span>
          )}
          {place.vegetarian_food && (
            <span style={{
              padding: '4px 10px',
              backgroundColor: '#F1F8E9',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#33691E',
              border: '1px solid #9CCC65'
            }}>
              🥗 채식 메뉴
            </span>
          )}
          {place.takeout && (
            <span style={{
              padding: '4px 10px',
              backgroundColor: '#FFF9C4',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#F57F17',
              border: '1px solid #FFF176'
            }}>
              📦 포장 가능
            </span>
          )}
          {place.delivery && (
            <span style={{
              padding: '4px 10px',
              backgroundColor: '#FCE4EC',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#880E4F',
              border: '1px solid #F48FB1'
            }}>
              🚚 배달 가능
            </span>
          )}
          {place.allows_dogs && (
            <span style={{
              padding: '4px 10px',
              backgroundColor: '#EFEBE9',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#4E342E',
              border: '1px solid #A1887F'
            }}>
              🐕 반려동물 환영
            </span>
          )}
          {place.reservable && (
            <span style={{
              padding: '4px 10px',
              backgroundColor: '#EDE7F6',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#4A148C',
              border: '1px solid #BA68C8'
            }}>
              📅 예약 가능
            </span>
          )}
        </div>
      </div>
    )}

    {/* Coordinates */}
    <div style={{
      padding: '12px',
      backgroundColor: '#F5F7FA',
      borderRadius: '8px',
      fontSize: '12px',
      color: '#666'
    }}>
      <div style={{ marginBottom: '4px' }}>
        🌐 좌표: {place.lat.toFixed(6)}, {place.lng.toFixed(6)}
      </div>
      <div style={{ fontSize: '11px', color: '#999' }}>
        Data source: Google Places API
      </div>
    </div>
  </div>
);

// ===================== 메뉴 탭 =====================
const MenuTab: React.FC<{ place: GooglePlace }> = ({ place }) => (
  <div>
    {place.menu_url ? (
      <div style={{
        padding: '12px',
        backgroundColor: '#F5F7FA',
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
        <div style={{
          fontSize: '14px',
          color: '#333',
          marginBottom: '12px'
        }}>
          이 장소의 메뉴를 확인하세요:
        </div>
        <a
          href={place.menu_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            backgroundColor: '#002B5C',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          메뉴 보기 →
        </a>
      </div>
    ) : (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: '#999'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍽️</div>
        <div style={{ fontSize: '14px' }}>
          메뉴 정보가 없습니다
        </div>
        {place.website && (
          <div style={{ marginTop: '16px' }}>
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#1976D2',
                textDecoration: 'none',
                fontSize: '13px'
              }}
            >
              웹사이트에서 확인하기 →
            </a>
          </div>
        )}
      </div>
    )}
  </div>
);

// ===================== 리뷰 탭 =====================
const ReviewsTab: React.FC<{ place: GooglePlace }> = ({ place }) => {
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set());

  const toggleReview = (index: number) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedReviews(newExpanded);
  };

  return (
    <div>
      {place.reviews && place.reviews.length > 0 ? (
        place.reviews.map((review, index) => {
          const isExpanded = expandedReviews.has(index);
          const needsExpansion = review.text && review.text.length > 150; // 약 3줄 기준

          return (
            <div key={index} style={{
              marginBottom: index < place.reviews!.length - 1 ? '20px' : '0',
              paddingBottom: index < place.reviews!.length - 1 ? '20px' : '0',
              borderBottom: index < place.reviews!.length - 1 ? '1px solid #E0E0E0' : 'none'
            }}>
              {/* Author Info */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                {review.author_photo && (
                  <img
                    src={review.author_photo}
                    alt={review.author_name}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '2px'
                  }}>
                    {review.author_name}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#999'
                  }}>
                    {review.time}
                  </div>
                </div>
                {/* Rating Stars */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  backgroundColor: '#FFF9E6',
                  borderRadius: '6px',
                  border: '1px solid #FFE082'
                }}>
                  <span style={{ fontSize: '12px' }}>⭐</span>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#F57C00'
                  }}>
                    {review.rating}
                  </span>
                </div>
              </div>

              {/* Review Text */}
              {review.text && (
                <div>
                  <div style={{
                    fontSize: '13px',
                    color: '#555',
                    lineHeight: '1.6',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: isExpanded ? 'unset' : 3,
                    WebkitBoxOrient: 'vertical',
                    textOverflow: 'ellipsis'
                  }}>
                    {review.text}
                  </div>
                  {needsExpansion && (
                    <button
                      onClick={() => toggleReview(index)}
                      style={{
                        marginTop: '8px',
                        padding: '4px 12px',
                        fontSize: '12px',
                        color: '#1976D2',
                        backgroundColor: 'transparent',
                        border: '1px solid #1976D2',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      {isExpanded ? '접기' : '더보기'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: '#999'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⭐</div>
          <div style={{ fontSize: '14px' }}>
            아직 리뷰가 없습니다
          </div>
        </div>
      )}
    </div>
  );
};

// ===================== 사진 탭 =====================
const PhotosTab: React.FC<{ place: GooglePlace }> = ({ place }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const openModal = (index: number) => {
    setCurrentPhotoIndex(index);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const goToPrevious = () => {
    if (place.photos) {
      setCurrentPhotoIndex((prev) => (prev === 0 ? place.photos!.length - 1 : prev - 1));
    }
  };

  const goToNext = () => {
    if (place.photos) {
      setCurrentPhotoIndex((prev) => (prev === place.photos!.length - 1 ? 0 : prev + 1));
    }
  };

  return (
    <div>
      {place.photos && place.photos.length > 0 ? (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px'
          }}>
            {place.photos.map((photoUrl, index) => (
              <div
                key={index}
                onClick={() => openModal(index)}
                style={{
                  width: '100%',
                  height: '150px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#F5F7FA',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <img
                  src={photoUrl}
                  alt={`${place.name} 사진 ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Photo Modal */}
          {modalOpen && (
            <>
              {/* Modal Backdrop */}
              <div
                onClick={closeModal}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  zIndex: 9999,
                  animation: 'fadeIn 0.3s ease-in-out'
                }}
              />

              {/* Modal Content */}
              <div
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10000,
                  width: '90vw',
                  maxWidth: '800px',
                  maxHeight: '90vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {/* Close Button */}
                <button
                  onClick={closeModal}
                  style={{
                    position: 'absolute',
                    top: '-40px',
                    right: '0',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: '32px',
                    cursor: 'pointer',
                    padding: '0',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>

                {/* Previous Button */}
                {place.photos.length > 1 && (
                  <button
                    onClick={goToPrevious}
                    style={{
                      position: 'absolute',
                      left: '-50px',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '20px',
                      color: '#333',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    ‹
                  </button>
                )}

                {/* Image */}
                <img
                  src={place.photos[currentPhotoIndex]}
                  alt={`${place.name} 사진 ${currentPhotoIndex + 1}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '90vh',
                    objectFit: 'contain',
                    borderRadius: '8px'
                  }}
                />

                {/* Next Button */}
                {place.photos.length > 1 && (
                  <button
                    onClick={goToNext}
                    style={{
                      position: 'absolute',
                      right: '-50px',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '20px',
                      color: '#333',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    ›
                  </button>
                )}

                {/* Photo Counter */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {currentPhotoIndex + 1} / {place.photos.length}
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: '#999'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
          <div style={{ fontSize: '14px' }}>
            사진이 없습니다
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleDetailPanel;
