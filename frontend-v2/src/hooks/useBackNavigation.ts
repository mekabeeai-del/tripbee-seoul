import { useEffect, useRef, useMemo } from 'react';
import { App } from '@capacitor/app';

interface PanelState {
  isOpen: boolean;
  close: () => void;
}

/**
 * 모바일 뒤로가기 네비게이션 훅
 * - 패널이 열릴 때 히스토리 추가
 * - 뒤로가기 시 열린 패널 순서대로 닫기
 * - Android 하드웨어 뒤로가기 버튼 지원 (Capacitor)
 */
export function useBackNavigation(panels: PanelState[]) {
  // 패널 상태를 ref로 저장 (이벤트 핸들러에서 최신 값 접근)
  const panelsRef = useRef(panels);
  panelsRef.current = panels;

  // 열린 패널 닫기 함수
  const closeOpenPanel = (): boolean => {
    for (const panel of panelsRef.current) {
      if (panel.isOpen) {
        panel.close();
        return true; // 패널을 닫았음
      }
    }
    return false; // 닫을 패널 없음
  };

  // 열린 패널 상태 배열 (dependency 최적화용)
  const openStates = useMemo(
    () => panels.map(p => p.isOpen),
    [panels.map(p => p.isOpen).join(',')]
  );
  const hasOpenPanel = openStates.some(Boolean);

  // 브라우저 히스토리 관리 (모바일 뒤로가기 지원)
  useEffect(() => {
    const handlePopState = () => {
      closeOpenPanel();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []); // 한 번만 등록

  // 뒤로가기 두 번 누르면 종료 (타이머)
  const lastBackPressRef = useRef<number>(0);
  const toastTimeoutRef = useRef<number | null>(null);

  // 토스트 메시지 표시 함수
  const showExitToast = () => {
    // 기존 토스트 제거
    const existingToast = document.getElementById('exit-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // 새 토스트 생성
    const toast = document.createElement('div');
    toast.id = 'exit-toast';
    toast.textContent = '뒤로가기를 한 번 더 누르면 종료됩니다';
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 24px;
      font-size: 14px;
      z-index: 9999;
      animation: fadeInOut 2s ease-in-out forwards;
    `;
    document.body.appendChild(toast);

    // 2초 후 자동 제거
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      toast.remove();
    }, 2000);
  };

  // Capacitor 하드웨어 뒤로가기 버튼 (Android)
  useEffect(() => {
    const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
      const closed = closeOpenPanel();
      if (!closed) {
        // 열린 패널이 없을 때
        if (canGoBack) {
          window.history.back();
        } else {
          // 2초 이내에 두 번 누르면 종료
          const now = Date.now();
          if (now - lastBackPressRef.current < 2000) {
            App.exitApp();
          } else {
            lastBackPressRef.current = now;
            showExitToast();
          }
        }
      }
    });

    return () => {
      backButtonListener.then(listener => listener.remove());
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // 패널이 열릴 때 히스토리 추가
  useEffect(() => {
    if (hasOpenPanel) {
      window.history.pushState(null, '', window.location.href);
    }
  }, [hasOpenPanel]);
}
