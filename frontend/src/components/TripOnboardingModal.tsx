import { useState, useEffect } from 'react';
import {
  getCategories,
  createTripSession,
  getSessionToken,
  type Category,
  type TripSessionCreate
} from '../services/authApi';

interface TripOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

// 국적 옵션
const NATIONALITIES = [
  { code: 'KR', label: '대한민국', flag: '🇰🇷' },
  { code: 'US', label: '미국', flag: '🇺🇸' },
  { code: 'JP', label: '일본', flag: '🇯🇵' },
  { code: 'CN', label: '중국', flag: '🇨🇳' },
  { code: 'GB', label: '영국', flag: '🇬🇧' },
  { code: 'FR', label: '프랑스', flag: '🇫🇷' },
  { code: 'DE', label: '독일', flag: '🇩🇪' },
  { code: 'ES', label: '스페인', flag: '🇪🇸' },
  { code: 'IT', label: '이탈리아', flag: '🇮🇹' },
  { code: 'CA', label: '캐나다', flag: '🇨🇦' },
  { code: 'AU', label: '호주', flag: '🇦🇺' },
  { code: 'SG', label: '싱가포르', flag: '🇸🇬' },
  { code: 'TH', label: '태국', flag: '🇹🇭' },
  { code: 'VN', label: '베트남', flag: '🇻🇳' },
  { code: 'OTHER', label: '기타', flag: '🌍' },
];

// 동행 옵션
const COMPANIONS = [
  { id: 'solo', label: '혼자', icon: '🚶' },
  { id: 'friends', label: '친구와', icon: '👯' },
  { id: 'couple', label: '연인과', icon: '💑' },
  { id: 'family', label: '가족과', icon: '👨‍👩‍👧‍👦' },
];

export default function TripOnboardingModal({ isOpen, onClose, onComplete }: TripOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form data
  const [nationality, setNationality] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [companion, setCompanion] = useState('');

  // Categories from DB
  const [categories, setCategories] = useState<Category[]>([]);

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, []);

  if (!isOpen) return null;

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        alert('로그인이 필요합니다.');
        return;
      }

      const tripData: TripSessionCreate = {
        nationality,
        purpose: [], // 여행 목적은 이번엔 생략 (categories로 대체)
        interests: selectedCategories,
        companions: companion,
        start_date: startDate,
        end_date: endDate,
      };

      await createTripSession(sessionToken, tripData);
      onComplete();
    } catch (error) {
      console.error('Failed to create trip session:', error);
      alert('여행 정보 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (catCode: string) => {
    if (selectedCategories.includes(catCode)) {
      setSelectedCategories(selectedCategories.filter(c => c !== catCode));
    } else {
      setSelectedCategories([...selectedCategories, catCode]);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return nationality !== '';
      case 2:
        return startDate !== '' && endDate !== '' && new Date(startDate) <= new Date(endDate);
      case 3:
        return selectedCategories.length > 0;
      case 4:
        return companion !== '';
      default:
        return false;
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#999',
          }}
        >
          ✕
        </button>

        {/* Progress bar */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{
            height: '8px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: '#667eea',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <p style={{
            textAlign: 'center',
            color: '#666',
            fontSize: '14px',
            marginTop: '10px',
          }}>
            Step {currentStep} / {totalSteps}
          </p>
        </div>

        {/* Step 1: Nationality */}
        {currentStep === 1 && (
          <div>
            <h2 style={{ fontSize: '28px', marginBottom: '10px', textAlign: 'center' }}>
              🌍 어느 나라에서 오셨나요?
            </h2>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
              국적을 선택해주세요
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              {NATIONALITIES.map((nat) => (
                <button
                  key={nat.code}
                  onClick={() => setNationality(nat.code)}
                  style={{
                    padding: '16px',
                    border: nationality === nat.code ? '2px solid #667eea' : '2px solid #e0e0e0',
                    borderRadius: '12px',
                    background: nationality === nat.code ? '#f0f4ff' : 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: nationality === nat.code ? '600' : '400',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '32px' }}>{nat.flag}</span>
                  <span>{nat.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Date Range */}
        {currentStep === 2 && (
          <div>
            <h2 style={{ fontSize: '28px', marginBottom: '10px', textAlign: 'center' }}>
              📅 여행 기간을 알려주세요
            </h2>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
              서울 여행 일정을 선택해주세요
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                  시작일
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    fontSize: '16px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                  종료일
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    fontSize: '16px',
                  }}
                />
              </div>
              {startDate && endDate && new Date(startDate) <= new Date(endDate) && (
                <p style={{
                  textAlign: 'center',
                  color: '#667eea',
                  fontWeight: '600',
                  fontSize: '16px',
                }}>
                  총 {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1}일 여행
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Interests (Categories from DB) */}
        {currentStep === 3 && (
          <div>
            <h2 style={{ fontSize: '28px', marginBottom: '10px', textAlign: 'center' }}>
              ❤️ 어떤 장소에 관심있으세요?
            </h2>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
              중복 선택 가능해요
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              {categories.map((cat) => (
                <button
                  key={cat.cat_code}
                  onClick={() => toggleCategory(cat.cat_code)}
                  style={{
                    padding: '20px',
                    border: selectedCategories.includes(cat.cat_code) ? '2px solid #667eea' : '2px solid #e0e0e0',
                    borderRadius: '12px',
                    background: selectedCategories.includes(cat.cat_code) ? '#f0f4ff' : 'white',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: selectedCategories.includes(cat.cat_code) ? '600' : '400',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Companion */}
        {currentStep === 4 && (
          <div>
            <h2 style={{ fontSize: '28px', marginBottom: '10px', textAlign: 'center' }}>
              👥 누구와 함께 하시나요?
            </h2>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
              동행 정보를 선택해주세요
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
            }}>
              {COMPANIONS.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => setCompanion(comp.id)}
                  style={{
                    padding: '30px',
                    border: companion === comp.id ? '2px solid #667eea' : '2px solid #e0e0e0',
                    borderRadius: '12px',
                    background: companion === comp.id ? '#f0f4ff' : 'white',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: companion === comp.id ? '600' : '400',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <span style={{ fontSize: '48px' }}>{comp.icon}</span>
                  <span>{comp.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '40px',
        }}>
          {currentStep > 1 && (
            <button
              onClick={handlePrev}
              style={{
                flex: 1,
                padding: '16px',
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                background: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              이전
            </button>
          )}
          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              style={{
                flex: 1,
                padding: '16px',
                border: 'none',
                borderRadius: '12px',
                background: canProceed() ? '#667eea' : '#e0e0e0',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: canProceed() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
              }}
            >
              다음
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canProceed() || isLoading}
              style={{
                flex: 1,
                padding: '16px',
                border: 'none',
                borderRadius: '12px',
                background: canProceed() && !isLoading ? '#667eea' : '#e0e0e0',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: canProceed() && !isLoading ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
              }}
            >
              {isLoading ? '저장 중...' : '완료'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
