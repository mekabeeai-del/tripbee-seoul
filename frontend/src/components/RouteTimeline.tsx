/**
 * RouteTimeline - 경로 타임라인 UI 컴포넌트
 * 지하철 노선, 버스, 도보 구간을 세로/가로 타임라인 형식으로 표시
 */

import React from 'react';

interface RouteTimelineProps {
  routeData: any;
  mode?: 'horizontal' | 'vertical'; // horizontal: 간단한 가로 뷰, vertical: 상세한 세로 뷰
}

// 지하철 노선 색상 매핑 (공식 색상 코드)
const SUBWAY_LINE_COLORS: { [key: string]: string } = {
  '1호선': '#0052A4',
  '2호선': '#00A84D',
  '3호선': '#EF7C1C',
  '4호선': '#00A5DE',
  '5호선': '#996CAC',
  '6호선': '#CD7C2F',
  '7호선': '#747F00',
  '8호선': '#E6186C',
  '9호선': '#BDB092',
  '경의중앙선': '#77C4A3',
  '경춘선': '#0C8E72',
  '수인분당선': '#F5A200',
  '신분당선': '#D4003B',
  '우이신설선': '#B0CE18',
  '공항철도': '#0090D2',
  '인천1호선': '#7CA8D5',
  '인천2호선': '#ED8B00',
  '김포골드라인': '#A17E00',
  '에버라인': '#6CAC3D',
  '경강선': '#0054A6',
  '서해선': '#8FC31F',
  '신림선': '#6789CA',
};

const RouteTimeline: React.FC<RouteTimelineProps> = ({ routeData, mode = 'vertical' }) => {
  if (!routeData || !routeData.subPath || !Array.isArray(routeData.subPath)) {
    return null;
  }

  const subPaths = routeData.subPath;

  // Horizontal 모드 (간략한 가로 뷰)
  if (mode === 'horizontal') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        padding: '12px 0',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {subPaths.map((sub: any, index: number) => {
          const isLastItem = index === subPaths.length - 1;

          // 지하철
          if (sub.trafficType === 1) {
            const lane = sub.lane?.[0];
            const lineName = lane?.name || '지하철';
            const lineColor = SUBWAY_LINE_COLORS[lineName] || '#999';
            const lineNumber = lineName.match(/\d+/)?.[0] || lineName.charAt(0);

            return (
              <React.Fragment key={index}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: lineColor,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: '2px solid white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {lineNumber}
                  </div>
                  <div style={{ fontSize: '12px', color: '#333', whiteSpace: 'nowrap' }}>
                    {sub.startName}
                  </div>
                </div>
                {!isLastItem && (
                  <div style={{
                    width: '20px',
                    height: '2px',
                    backgroundColor: lineColor,
                    opacity: 0.4,
                    flexShrink: 0
                  }} />
                )}
              </React.Fragment>
            );
          }
          // 버스
          else if (sub.trafficType === 2) {
            const lane = sub.lane?.[0];
            const busNo = lane?.busNo || '버스';
            const busColor = '#E74C3C';

            return (
              <React.Fragment key={index}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    backgroundColor: busColor,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    border: '2px solid white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    🚌
                  </div>
                  <div style={{ fontSize: '12px', color: '#333', whiteSpace: 'nowrap' }}>
                    {sub.startName}
                  </div>
                </div>
                {!isLastItem && (
                  <div style={{
                    width: '20px',
                    height: '2px',
                    backgroundColor: busColor,
                    opacity: 0.4,
                    flexShrink: 0
                  }} />
                )}
              </React.Fragment>
            );
          }
          // 도보
          else if (sub.trafficType === 3) {
            const walkColor = '#95A5A6';

            return (
              <React.Fragment key={index}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: walkColor,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    border: '2px solid white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    🚶
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>
                    도보 {sub.sectionTime}분
                  </div>
                </div>
                {!isLastItem && (
                  <div style={{
                    width: '20px',
                    height: '2px',
                    backgroundColor: walkColor,
                    opacity: 0.4,
                    borderTop: '2px dashed #95A5A6',
                    flexShrink: 0
                  }} />
                )}
              </React.Fragment>
            );
          }

          return null;
        })}
        {/* 도착지 마지막 표시 */}
        {subPaths.length > 0 && subPaths[subPaths.length - 1].endName && (
          <div style={{
            fontSize: '12px',
            color: '#333',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            → {subPaths[subPaths.length - 1].endName}
          </div>
        )}
      </div>
    );
  }

  // Vertical 모드 (상세한 세로 뷰)
  return (
    <div style={{
      padding: '16px 0',
      position: 'relative'
    }}>
      {subPaths.map((sub: any, index: number) => {
        const isLastItem = index === subPaths.length - 1;

        // 지하철
        if (sub.trafficType === 1) {
          const lane = sub.lane?.[0];
          const lineName = lane?.name || '지하철';
          const lineColor = SUBWAY_LINE_COLORS[lineName] || '#999';

          // 노선 번호 추출 (예: "7호선" -> "7")
          const lineNumber = lineName.match(/\d+/)?.[0] || lineName.charAt(0);

          return (
            <div key={index} style={{ position: 'relative', marginBottom: '20px' }}>
              {/* 출발역 */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: lineColor,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '700',
                  flexShrink: 0,
                  border: '3px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  {lineNumber}
                </div>
                <div style={{ marginLeft: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#333' }}>
                    {sub.startName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {lineName}
                  </div>
                </div>
              </div>

              {/* 연결선 */}
              {!isLastItem && (
                <div style={{
                  position: 'absolute',
                  left: '15px',
                  top: '32px',
                  width: '3px',
                  height: 'calc(100% - 12px)',
                  backgroundColor: lineColor,
                  opacity: 0.3
                }} />
              )}

              {/* 도착역 */}
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px', marginLeft: '0' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: lineColor,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '700',
                  flexShrink: 0,
                  border: '3px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  {lineNumber}
                </div>
                <div style={{ marginLeft: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#333' }}>
                    {sub.endName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {sub.sectionTime}분 · 정류장 {sub.stationCount}개
                  </div>
                </div>
              </div>
            </div>
          );
        }
        // 버스
        else if (sub.trafficType === 2) {
          const lane = sub.lane?.[0];
          const busNo = lane?.busNo || '버스';
          const busColor = '#E74C3C'; // 버스 기본 색상

          return (
            <div key={index} style={{ position: 'relative', marginBottom: '20px' }}>
              {/* 출발 정류장 */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: busColor,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: '700',
                  flexShrink: 0,
                  border: '3px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  🚌
                </div>
                <div style={{ marginLeft: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#333' }}>
                    {sub.startName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {busNo}번 버스
                  </div>
                </div>
              </div>

              {/* 연결선 */}
              {!isLastItem && (
                <div style={{
                  position: 'absolute',
                  left: '15px',
                  top: '32px',
                  width: '3px',
                  height: 'calc(100% - 12px)',
                  backgroundColor: busColor,
                  opacity: 0.3
                }} />
              )}

              {/* 도착 정류장 */}
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: busColor,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: '700',
                  flexShrink: 0,
                  border: '3px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  🚌
                </div>
                <div style={{ marginLeft: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#333' }}>
                    {sub.endName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {sub.sectionTime}분 · 정류장 {sub.stationCount}개
                  </div>
                </div>
              </div>
            </div>
          );
        }
        // 도보
        else if (sub.trafficType === 3) {
          const walkColor = '#95A5A6';

          return (
            <div key={index} style={{ position: 'relative', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: walkColor,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  flexShrink: 0,
                  border: '3px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  🚶
                </div>
                <div style={{ marginLeft: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#333' }}>
                    도보 이동
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {sub.distance}m · 약 {sub.sectionTime}분
                  </div>
                </div>
              </div>

              {/* 연결선 */}
              {!isLastItem && (
                <div style={{
                  position: 'absolute',
                  left: '15px',
                  top: '32px',
                  width: '3px',
                  height: 'calc(100% - 12px)',
                  backgroundColor: walkColor,
                  opacity: 0.3,
                  borderLeft: '3px dashed #95A5A6'
                }} />
              )}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

export default RouteTimeline;
