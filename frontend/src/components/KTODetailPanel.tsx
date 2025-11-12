import React, { useEffect, useState } from 'react';
import { fetchPOIDetail } from '../services/beatmapApi';

interface KTODetailPanelProps {
  contentId: string | null;
  onClose: () => void;
  panelHeight: 'half' | 'full';
  onToggleHeight: () => void;
}

type TabType = 'info' | 'detail' | 'extra' | 'photos';

const KTODetailPanel: React.FC<KTODetailPanelProps> = ({ contentId, onClose, panelHeight, onToggleHeight }) => {
  const [detail, setDetail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!contentId) {
      setDetail(null);
      return;
    }

    const loadDetail = async () => {
      setIsLoading(true);
      setError(null);
      setActiveTab('info'); // 탭 초기화
      try {
        const data = await fetchPOIDetail(contentId);
        setDetail(data);
      } catch (err) {
        setError('상세 정보를 불러올 수 없습니다.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDetail();
  }, [contentId]);

  // 드래그 핸들러
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
          onToggleHeight(); // full → half
        } else {
          // half → 닫기
          setIsClosing(true);
          setTimeout(() => {
            onClose();
            setIsClosing(false);
          }, 300);
        }
      } else if (deltaY < 0 && panelHeight === 'half') {
        // 위로 드래그: half → full
        onToggleHeight();
      }
    }
  };

  // 전역 이벤트 리스너 등록/해제
  useEffect(() => {
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

  if (!contentId) return null;

  // 탭 정의
  const tabs = [
    { id: 'info' as TabType, label: '기본정보', icon: 'ℹ️' },
    { id: 'detail' as TabType, label: '상세정보', icon: '📝' },
    { id: 'extra' as TabType, label: '추가정보', icon: '📋' },
    { id: 'photos' as TabType, label: '사진', icon: '📷' },
  ];

  // 탭별 데이터 유무 확인
  const hasDetailData = detail?.intro_data?.item && Array.isArray(detail.intro_data.item) && detail.intro_data.item.length > 0;
  const hasExtraData = detail?.repeat_data?.item && Array.isArray(detail.repeat_data.item) && detail.repeat_data.item.length > 0;
  const hasPhotos = detail?.images_data?.item && Array.isArray(detail.images_data.item) && detail.images_data.item.length > 0;

  return (
    <>
      {/* Backdrop - full 모드일 때만 반투명 */}
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

        {/* Scrollable Content - 전체 영역 */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div>로딩 중...</div>
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#f44336' }}>
              {error}
            </div>
          )}

          {detail && (
            <>
              {/* Header - Title + First Image */}
              <div style={{ padding: '0 20px', marginBottom: '16px' }}>
                <h2 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 'bold' }}>
                  {detail.title}
                </h2>

                {/* Address */}
                {detail.addr1 && (
                  <div style={{ marginBottom: '12px', color: '#666', fontSize: '14px' }}>
                    📍 {detail.addr1}
                  </div>
                )}

                {/* First Image */}
                {detail.first_image && (
                  <img
                    src={detail.first_image}
                    alt={detail.title}
                    style={{
                      width: '100%',
                      maxHeight: '200px',
                      objectFit: 'cover',
                      borderRadius: '12px'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>

              {/* Tab Navigation - Sticky */}
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  display: 'flex',
                  borderBottom: '1px solid #E0E0E0',
                  marginBottom: '16px',
                  backgroundColor: 'white',
                  zIndex: 1,
                  gap: '0'
                }}
              >
                {tabs.map((tab) => {
                  // 데이터 없는 탭 비활성화
                  const isDisabled =
                    (tab.id === 'detail' && !hasDetailData) ||
                    (tab.id === 'extra' && !hasExtraData) ||
                    (tab.id === 'photos' && !hasPhotos);

                  return (
                    <button
                      key={tab.id}
                      onClick={() => !isDisabled && setActiveTab(tab.id)}
                      disabled={isDisabled}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        fontSize: '15px',
                        color: isDisabled ? '#CCC' : (activeTab === tab.id ? '#002B5C' : '#999'),
                        fontWeight: activeTab === tab.id ? '600' : '400',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        borderBottom: activeTab === tab.id ? '3px solid #002B5C' : '3px solid transparent',
                        opacity: isDisabled ? 0.4 : 1
                      }}
                    >
                      <span style={{
                        marginRight: '6px',
                        fontSize: '16px',
                        color: isDisabled ? '#DDD' : (activeTab === tab.id ? '#002B5C' : '#CCC')
                      }}>
                        {tab.icon}
                      </span>
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* 출처 표시 */}
              <div style={{
                padding: '8px 20px',
                fontSize: '11px',
                color: '#999',
                borderBottom: '1px solid #f0f0f0'
              }}>
                출처: 한국관광공사
              </div>

              {/* Tab Content */}
              <div style={{ padding: '0 20px 20px 20px' }}>
                {activeTab === 'info' && <InfoTab detail={detail} />}
                {activeTab === 'detail' && <DetailTab detail={detail} />}
                {activeTab === 'extra' && <ExtraInfoTab detail={detail} />}
                {activeTab === 'photos' && <PhotosTab detail={detail} />}
              </div>
            </>
          )}
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes slideUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }

          @keyframes slideDown {
            from {
              transform: translateY(0);
            }
            to {
              transform: translateY(100%);
            }
          }
        `}</style>
      </div>
    </>
  );
};

// ============================================================================
// 기본정보 탭 (common_data만 표시)
// ============================================================================
const InfoTab: React.FC<{ detail: any }> = ({ detail }) => (
  <div>
    {/* Common Data */}
    {detail.common_data && detail.common_data.item && Array.isArray(detail.common_data.item) && detail.common_data.item.length > 0 && (
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Object.entries(detail.common_data.item[0]).map(([key, value]: [string, any]) => {
            if (!value || key === 'contentid' || key === 'contenttypeid') return null;

            // 제외할 필드들
            const excludedFields = [
              'mapx', 'mapy', 'mlevel',
              'areacode', 'sigungucode',
              'modifiedtime', 'createdtime', 'zipcode',
              'cat1', 'cat2', 'cat3',  // 대분류, 중분류, 소분류
              'title', 'firstimage', 'firstimage2',  // 타이틀, 이미지
              'lcclsSystm', 'lcclsSystm1', 'lcclsSystm2', 'lcclsSystm3',  // 분류 시스템 (대문자 C)
              'lclsSystm', 'lclsSystm1', 'lclsSystm2', 'lclsSystm3',  // 분류 시스템 (소문자 c)
              'cpyrhtDivCd', 'lDongRegnCd', 'lDongSignguCd'  // 기타 코드값
            ];

            if (excludedFields.includes(key)) {
              return null;
            }

            // 필드명 한글화
            let fieldNames: { [key: string]: string } = {
              'homepage': '홈페이지',
              'tel': '전화번호',
              'telname': '전화번호명',
              'addr1': '주소',
              'addr2': '상세주소',
              'booktour': '교과서 속 여행지',
              'overview': '개요',
              'chkbabycarriage': '유모차',
              'chkpet': '반려동물',
              'chkcreditcard': '신용카드'
            };

            let displayName = fieldNames[key] || key;
            let displayValue = String(value);

            // 필드명에서 "가능" 제거
            displayName = displayName.replace(' 가능', '').replace('가능', '');

            // 0/1 값을 불가/가능으로 변환
            if (value === '0' || value === 0) {
              displayValue = '불가';
            } else if (value === '1' || value === 1) {
              displayValue = '가능';
            }

            // homepage는 링크로 표시
            if (key === 'homepage' && value) {
              return (
                <div key={key} style={{ display: 'flex', gap: '8px', fontSize: '14px', padding: '8px 12px', backgroundColor: '#F8F9FA', borderRadius: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#555', minWidth: '100px' }}>{displayName}</span>
                  <span
                    style={{ color: '#1976D2', flex: 1, wordBreak: 'break-all' }}
                    dangerouslySetInnerHTML={{ __html: String(value) }}
                  />
                </div>
              );
            }

            return (
              <div key={key} style={{ display: 'flex', gap: '8px', fontSize: '14px', padding: '8px 12px', backgroundColor: '#F8F9FA', borderRadius: '8px' }}>
                <span style={{ fontWeight: '600', color: '#555', minWidth: '100px' }}>{displayName}</span>
                <span style={{ color: '#333', flex: 1 }}>{displayValue}</span>
              </div>
            );
          })}
        </div>
      </div>
    )}
  </div>
);

// ============================================================================
// 상세정보 탭 (intro_data 표시)
// ============================================================================
const DetailTab: React.FC<{ detail: any }> = ({ detail }) => {
  if (!detail.intro_data || !detail.intro_data.item || detail.intro_data.item.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
        상세 정보가 없습니다.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {Object.entries(detail.intro_data.item[0]).map(([key, value]: [string, any]) => {
          if (!value || key === 'contentid' || key === 'contenttypeid') return null;

          // 필드명 한글화 (관광지/숙박/음식점 등 모든 content_type 포함)
          const fieldNames: { [key: string]: string } = {
            // 공통
            'heritage1': '세계문화유산',
            'heritage2': '세계자연유산',
            'heritage3': '세계기록유산',
            'infocenter': '문의 및 안내',
            'opendate': '개장일',
            'restdate': '휴무일',
            'expguide': '체험 안내',
            'expagerange': '체험 가능 연령',
            'accomcount': '수용인원',
            'useseason': '이용 시기',
            'usetime': '이용 시간',
            'parking': '주차 시설',
            'chkbabycarriage': '유모차 대여',
            'chkpet': '애완동물 동반',
            'chkcreditcard': '신용카드 가능',
            'discountinfo': '할인 정보',

            // 숙박 (content_type_id = 32)
            'sauna': '사우나',
            'beauty': '뷰티시설',
            'pickup': '픽업 서비스',
            'sports': '스포츠시설',
            'bicycle': '자전거 대여',
            'fitness': '피트니스',
            'karaoke': '노래방',
            'seminar': '세미나실',
            'barbecue': '바비큐장',
            'beverage': '식음료',
            'campfire': '캠프파이어',
            'publicpc': 'PC방',
            'roomtype': '객실 유형',
            'foodplace': '식당',
            'roomcount': '객실 수',
            'chkcooking': '조리 가능 여부',
            'publicbath': '공용 욕실',
            'checkintime': '체크인 시간',
            'subfacility': '부대시설',
            'checkouttime': '체크아웃 시간',
            'parkinglodging': '주차 가능 여부',
            'refundregulation': '환불 규정',
            'accomcountlodging': '수용 인원',
            'infocenterlodging': '문의 및 안내',
            'reservationlodging': '예약 안내',

            // 음식점 (content_type_id = 39)
            'opentimefood': '영업 시간',
            'restdatefood': '휴무일',
            'treatmenu': '대표 메뉴',
            'smoking': '흡연 가능',
            'packing': '포장 가능',
            'seat': '좌석 수',
            'kidsfacility': '어린이 시설',
            'reservationfood': '예약 안내',
            'infocenterfood': '문의 및 안내',
            'scalefood': '규모',
            'parkingfood': '주차 시설',
            'firstmenu': '대표 메뉴',
            'discountinfofood': '할인 정보',

            // 관광지 (content_type_id = 12)
            'chkbabycarriageculture': '유모차 대여',
            'chkpetculture': '애완동물 동반',
            'chkcreditcardculture': '신용카드 가능',
            'parkingculture': '주차 시설',
            'parkingfee': '주차 요금',
            'usetimeculture': '이용 시간',
            'restdateculture': '휴무일',
            'infocenterculture': '문의 및 안내',
            'scale': '규모',
            'spendtime': '관람 소요시간',

            // 레포츠 (content_type_id = 28)
            'openperiod': '개장 기간',
            'reservation': '예약 안내',
            'usetimeleports': '이용 시간',
            'restdateleports': '휴무일',
            'infocenterleports': '문의 및 안내',
            'accomcountleports': '수용 인원',
            'parkingleports': '주차 시설',
            'usefee': '이용 요금',
            'expagerangeleports': '체험 가능 연령',

            // 쇼핑 (content_type_id = 38)
            'opentime': '영업 시간',
            'shopguide': '매장 안내',
            'culturecenter': '문화센터',
            'restroom': '화장실',
            'infocentershopping': '문의 및 안내',
            'scaleshopping': '규모',
            'restdateshopping': '휴무일',
            'parkingshopping': '주차 시설',
            'chkbabycarriageshopping': '유모차 대여',
            'chkpetshopping': '애완동물 동반',
            'chkcreditcardshopping': '신용카드 가능',
            'fairday': '장서는 날',
            'saleitem': '판매 품목',
            'saleitemcost': '판매 품목 가격'
          };

          const displayName = fieldNames[key] || key;

          // 0/1 값을 한글로 변환
          let displayValue = value;
          if (value === '0' || value === 0) {
            displayValue = '없음';
          } else if (value === '1' || value === 1) {
            displayValue = '있음';
          }

          return (
            <div key={key} style={{ display: 'flex', gap: '8px', fontSize: '14px', padding: '8px 12px', backgroundColor: '#F8F9FA', borderRadius: '8px' }}>
              <span style={{ fontWeight: '600', color: '#555', minWidth: '120px' }}>{displayName}</span>
              <span style={{ color: '#333', flex: 1 }} dangerouslySetInnerHTML={{ __html: String(displayValue) }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 추가정보 탭
// ============================================================================
const ExtraInfoTab: React.FC<{ detail: any }> = ({ detail }) => {
  if (!detail.repeat_data || !detail.repeat_data.item || detail.repeat_data.item.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
        추가 정보가 없습니다.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {detail.repeat_data.item.map((item: any, index: number) => (
        <div key={index} style={{
          padding: '16px',
          backgroundColor: '#F8F9FA',
          borderRadius: '12px',
          fontSize: '14px'
        }}>
          {item.infoname && (
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontWeight: 'bold', color: '#002B5C', fontSize: '15px' }}>{item.infoname}</span>
            </div>
          )}
          {item.infotext && (
            <div style={{ color: '#555', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: item.infotext }} />
          )}
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// 사진 탭
// ============================================================================
const PhotosTab: React.FC<{ detail: any }> = ({ detail }) => {
  if (!detail.images_data || !detail.images_data.item || detail.images_data.item.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
        사진이 없습니다.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
      {detail.images_data.item.map((img: any, index: number) => (
        <img
          key={index}
          src={img.originimgurl || img.smallimageurl}
          alt={img.imgname || `Image ${index + 1}`}
          style={{
            width: '100%',
            height: '150px',
            objectFit: 'cover',
            borderRadius: '12px',
            cursor: 'pointer'
          }}
          onClick={() => {
            // 이미지 클릭 시 새 탭에서 열기
            window.open(img.originimgurl || img.smallimageurl, '_blank');
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ))}
    </div>
  );
};

export default KTODetailPanel;
