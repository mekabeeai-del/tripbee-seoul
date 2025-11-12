import { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import BeatyBubble from '../beaty/BeatyBubble';
import './POIDetailPanel.css';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface POIDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onClosing?: (isClosing: boolean) => void;
  name: string;
  imageUrl: string;
  description?: string;
}

export default function POIDetailPanel({ isOpen, onClose, onClosing, name, imageUrl, description }: POIDetailPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // isOpen 변경 감지
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsClosing(false);
      onClosing?.(false);
    } else if (isVisible) {
      // 열려있다가 닫히는 경우
      setIsClosing(true);
      onClosing?.(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
        onClosing?.(false);
      }, 800);
    }
  }, [isOpen, isVisible]);

  const handleClose = () => {
    onClose();
  };

  if (!isVisible) return null;

  // 레이더 차트 데이터 (6각형)
  const radarData = {
    labels: ['분위기', '조용함', '풍경', '문화성', '접근성', '특색'],
    datasets: [
      {
        label: name,
        data: [96, 72, 91, 94, 96, 88],
        backgroundColor: 'rgba(255, 152, 0, 0.2)',
        borderColor: '#FF9800',
        borderWidth: 2,
        pointBackgroundColor: '#FF9800',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#FF9800'
      }
    ]
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          display: false,
          backdropColor: 'transparent'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        angleLines: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        pointLabels: {
          font: {
            size: 11,
            weight: 'bold' as const
          },
          color: '#666'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true
      }
    }
  };

  return (
    <div className={`poi-detail-overlay ${isClosing ? 'closing' : ''}`}>
      {/* 배경 */}
      <div className="poi-detail-background" onClick={handleClose} />

      {/* 패널 */}
      <div className="poi-detail-panel">
        {/* 헤더 */}
        <div className="poi-detail-header">
          <h2>{name}</h2>
          <button className="poi-detail-close" onClick={handleClose}>
            <MdClose size={24} />
          </button>
        </div>

        {/* 스크롤 가능한 콘텐츠 */}
        <div className="poi-detail-content">
          {/* 비티 말풍선 */}
          <BeatyBubble
            variant="panel"
            message="비 내리는 경복궁은 유난히 고즈넉합니다. 분위기 끝내주는 산책 어떠신가요?"
            isVisible={isVisible}
          />

          {/* 상단 섹션: 이미지 + 파라미터 */}
          <div className="poi-stats-section">
            {/* 왼쪽: 대표 이미지 */}
            <div className="poi-portrait">
              <img src={imageUrl} alt={name} />
            </div>

            {/* 오른쪽: 차트만 */}
            <div className="poi-parameters">
              {/* 6각형 차트 */}
              <div className="poi-radar-chart">
                <Radar data={radarData} options={radarOptions} />
              </div>
            </div>
          </div>

          {/* 추천 이유 섹션 */}
          <div className="poi-reasons-section">
            <h3>추천 이유</h3>
            <div className="reason-item">
              <span className="reason-label">분위기 96</span>
              <p>전통 한옥의 고즈넉한 분위기가 일품입니다</p>
            </div>
            <div className="reason-item">
              <span className="reason-label">조용함 72</span>
              <p>관광객이 많지만 넓은 공간으로 여유로운 관람이 가능합니다</p>
            </div>
            <div className="reason-item">
              <span className="reason-label">풍경 91</span>
              <p>사계절 아름다운 전통 건축물과 자연의 조화</p>
            </div>
            <div className="reason-item">
              <span className="reason-label">문화성 94</span>
              <p>조선시대 왕궁의 역사와 문화를 체험할 수 있습니다</p>
            </div>
            <div className="reason-item">
              <span className="reason-label">접근성 96</span>
              <p>지하철역에서 도보 5분, 대중교통 이용이 편리합니다</p>
            </div>
            <div className="reason-item">
              <span className="reason-label">특색 88</span>
              <p>야간 특별 관람 등 다양한 프로그램이 운영됩니다</p>
            </div>
          </div>

        </div>

        {/* Footer - 상세정보 토글 버튼 (고정) */}
        <div className="poi-detail-footer">
          <button
            className="poi-detail-toggle-btn"
            onClick={() => setIsDetailOpen(!isDetailOpen)}
          >
            상세정보 보기 <span>{isDetailOpen ? '▼' : '▲'}</span>
          </button>
        </div>

        {/* 상세정보 패널 (아래에서 위로) */}
        <div className={`poi-detail-drawer ${isDetailOpen ? 'open' : ''}`}>
          {/* Drawer 콘텐츠 */}
          <div className="poi-detail-drawer-content">
            <h3>상세 정보</h3>
            <div className="detail-section">
              <p><strong>주소:</strong> 서울특별시 종로구 사직로 161</p>
              <p><strong>운영시간:</strong> 09:00 - 18:00</p>
              <p><strong>입장료:</strong> 성인 3,000원</p>
              <p><strong>주차:</strong> 가능 (유료)</p>
            </div>

            {/* 이미지 갤러리 */}
            <div className="detail-gallery">
              <h4>추가 이미지</h4>
              <div className="gallery-grid">
                <img src={imageUrl} alt="gallery1" />
                <img src={imageUrl} alt="gallery2" />
                <img src={imageUrl} alt="gallery3" />
                <img src={imageUrl} alt="gallery4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
