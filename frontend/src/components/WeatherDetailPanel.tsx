import React, { useEffect, useState } from 'react';

interface WeatherDetailData {
  current: {
    temperature: number;
    feels_like: number;
    sky: string;
    precipitation: string;
    humidity: number;
    wind_speed: number;
    emoji: string;
    description: string;
  };
  hourly: Array<{
    time: string;
    hour: string;
    temperature: number;
    emoji: string;
  }>;
  sunrise: string;
  sunset: string;
}

interface WeatherDetailPanelProps {
  onClose: () => void;
}

const WeatherDetailPanel: React.FC<WeatherDetailPanelProps> = ({ onClose }) => {
  const [weatherData, setWeatherData] = useState<WeatherDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeatherDetail = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/weather/detailed');
        if (!response.ok) {
          throw new Error('날씨 정보를 가져올 수 없습니다');
        }
        const data = await response.json();
        setWeatherData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherDetail();
  }, []);

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div>날씨 정보를 가져오는 중...</div>
      </div>
    );
  }

  if (error || !weatherData) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        zIndex: 1000
      }}>
        <div>{error || '날씨 정보를 가져올 수 없습니다'}</div>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4A90E2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          닫기
        </button>
      </div>
    );
  }

  const { current, hourly, sunrise, sunset } = weatherData;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'white',
      overflowY: 'auto',
      zIndex: 1000
    }}>
      {/* 헤더 */}
      <div style={{
        position: 'sticky',
        top: 0,
        backgroundColor: 'white',
        borderBottom: '1px solid #eee',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1
      }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>서울 날씨</h2>
        <button
          onClick={onClose}
          style={{
            padding: '6px 12px',
            backgroundColor: '#f5f5f5',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          닫기
        </button>
      </div>

      {/* 현재 날씨 */}
      <div style={{
        padding: '24px 16px',
        textAlign: 'center',
        background: 'linear-gradient(to bottom, #E3F2FD, #ffffff)'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '8px' }}>{current.emoji}</div>
        <div style={{ fontSize: '48px', fontWeight: '700', marginBottom: '4px' }}>
          {current.temperature}°
        </div>
        <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>
          {current.description}
        </div>
        <div style={{ fontSize: '14px', color: '#888' }}>
          체감 온도 {current.feels_like}°
        </div>
      </div>

      {/* 상세 정보 그리드 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        padding: '16px',
        backgroundColor: '#f9f9f9'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>습도</div>
          <div style={{ fontSize: '20px', fontWeight: '600' }}>{current.humidity}%</div>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>풍속</div>
          <div style={{ fontSize: '20px', fontWeight: '600' }}>{current.wind_speed} m/s</div>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>일출</div>
          <div style={{ fontSize: '20px', fontWeight: '600' }}>🌅 {sunrise}</div>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>일몰</div>
          <div style={{ fontSize: '20px', fontWeight: '600' }}>🌇 {sunset}</div>
        </div>
      </div>

      {/* 시간별 예보 */}
      <div style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
          시간별 예보
        </h3>
        <div style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          {hourly.map((item, index) => (
            <div
              key={index}
              style={{
                minWidth: '70px',
                backgroundColor: 'white',
                border: '1px solid #eee',
                borderRadius: '12px',
                padding: '12px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                {item.hour}
              </div>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                {item.emoji}
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>
                {item.temperature}°
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeatherDetailPanel;
