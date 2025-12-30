import { useState, useEffect, useCallback } from 'react';
import type { User } from '../services/privacyApi';
import {
  getSessionToken,
  getCurrentUser,
  oauthLogin,
  saveSessionTokens,
  logout as apiLogout,
  clearSessionTokens
} from '../services/privacyApi';
import { loginWithGoogle, handleOAuthCallback } from '../services/googleAuth';

interface UseAuthReturn {
  isLoggedIn: boolean;
  currentUser: User | null;
  isLoading: boolean;
  login: (provider: 'google' | 'apple') => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<{ success: boolean; message?: string }>;
}

/**
 * 인증 상태 관리 훅
 * - OAuth 콜백 처리
 * - 자동 로그인 체크
 * - Google/Apple OAuth 로그인
 * - 로그아웃
 */
export function useAuth(): UseAuthReturn {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // OAuth 콜백 처리 + 자동 로그인 체크
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1. OAuth 콜백 확인 (URL에 access_token이 있는 경우)
        const oauthResponse = await handleOAuthCallback();

        if (oauthResponse) {
          console.log('[AUTH] OAuth callback detected, logging in...');

          // 백엔드 로그인
          const loginResponse = await oauthLogin({
            provider: 'google',
            provider_user_id: oauthResponse.provider_user_id,
            provider_email: oauthResponse.provider_email,
            name: oauthResponse.name,
            profile_image_url: oauthResponse.profile_image_url,
            access_token: oauthResponse.access_token,
            refresh_token: oauthResponse.refresh_token,
            token_expires_at: oauthResponse.token_expires_at
          });

          // 세션 토큰 저장
          saveSessionTokens(loginResponse.session_token, loginResponse.refresh_token);

          // 상태 업데이트
          setCurrentUser(loginResponse.user);
          setIsLoggedIn(true);

          console.log('[AUTH] OAuth login successful!', loginResponse.user);
          setIsLoading(false);
          return;
        }

        // 2. 기존 세션 확인 (자동 로그인)
        const sessionToken = getSessionToken();
        if (sessionToken) {
          try {
            const response = await getCurrentUser(sessionToken);
            setCurrentUser(response.user);
            setIsLoggedIn(true);
            console.log('[AUTH] Auto-login successful:', response.user);
          } catch (error) {
            console.error('[AUTH] Auto-login failed:', error);
            setIsLoggedIn(false);
            setCurrentUser(null);
          }
        }
      } catch (error) {
        console.error('[AUTH] Init auth error:', error);
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  // 로그인 핸들러
  const login = useCallback(async (provider: 'google' | 'apple'): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log(`[AUTH] Starting ${provider} login...`);

      // Apple은 준비중
      if (provider === 'apple') {
        return { success: false, message: 'Apple 로그인은 준비중입니다! 🚧' };
      }

      // Google 로그인
      const result = loginWithGoogle();

      // Native: Promise 반환, Web: void (리다이렉트)
      if (result instanceof Promise) {
        // Android: Deep Link 콜백 대기
        const oauthResponse = await result;

        // 백엔드 로그인
        const loginResponse = await oauthLogin({
          provider: 'google',
          provider_user_id: oauthResponse.provider_user_id,
          provider_email: oauthResponse.provider_email,
          name: oauthResponse.name,
          profile_image_url: oauthResponse.profile_image_url,
          access_token: oauthResponse.access_token,
          refresh_token: oauthResponse.refresh_token,
          token_expires_at: oauthResponse.token_expires_at
        });

        // 세션 토큰 저장
        saveSessionTokens(loginResponse.session_token, loginResponse.refresh_token);

        // 상태 업데이트
        setCurrentUser(loginResponse.user);
        setIsLoggedIn(true);

        console.log('[AUTH] Native login successful!', loginResponse.user);
        return { success: true };
      }

      // Web: 페이지 리다이렉트됨
      return { success: true };

    } catch (error) {
      console.error('[AUTH] Login failed:', error);
      return { success: false, message: '로그인에 실패했어요. 다시 시도해주세요.' };
    }
  }, []);

  // 로그아웃 핸들러
  const logout = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log('[AUTH] Logging out...');

      const sessionToken = getSessionToken();
      if (sessionToken) {
        await apiLogout(sessionToken);
      }

      // 세션 토큰 제거
      clearSessionTokens();

      // 상태 초기화
      setCurrentUser(null);
      setIsLoggedIn(false);

      console.log('[AUTH] Logout successful');

      return { success: true, message: '안전하게 로그아웃되었습니다!' };

    } catch (error) {
      console.error('[AUTH] Logout failed:', error);
      return { success: false, message: '로그아웃에 실패했어요.' };
    }
  }, []);

  return {
    isLoggedIn,
    currentUser,
    isLoading,
    login,
    logout
  };
}
