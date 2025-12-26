import { useEffect, useRef, useMemo } from 'react';

interface PanelState {
  isOpen: boolean;
  close: () => void;
}

/**
 * 모바일 뒤로가기 네비게이션 훅
 * - 패널이 열릴 때 히스토리 추가
 * - 뒤로가기 시 열린 패널 순서대로 닫기
 */
export function useBackNavigation(panels: PanelState[]) {
  // 패널 상태를 ref로 저장 (이벤트 핸들러에서 최신 값 접근)
  const panelsRef = useRef(panels);
  panelsRef.current = panels;

  // 열린 패널 상태 배열 (dependency 최적화용)
  const openStates = useMemo(
    () => panels.map(p => p.isOpen),
    [panels.map(p => p.isOpen).join(',')]
  );
  const hasOpenPanel = openStates.some(Boolean);

  // 브라우저 히스토리 관리 (모바일 뒤로가기 지원)
  useEffect(() => {
    const handlePopState = () => {
      // 열린 패널 중 첫 번째를 닫기
      for (const panel of panelsRef.current) {
        if (panel.isOpen) {
          panel.close();
          break;
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []); // 한 번만 등록

  // 패널이 열릴 때 히스토리 추가
  useEffect(() => {
    if (hasOpenPanel) {
      window.history.pushState(null, '', window.location.href);
    }
  }, [hasOpenPanel]);
}
