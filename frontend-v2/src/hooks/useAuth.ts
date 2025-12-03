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
import { loginWithGoogle, loginWithApple } from '../services/googleAuth';

interface UseAuthReturn {
  isLoggedIn: boolean;
  currentUser: User | null;
  isLoading: boolean;
  login: (provider: 'google' | 'apple') => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<{ success: boolean; message?: string }>;
}

/**
 * 인증 상태 관리 훅
 * - 자동 로그인 체크
 * - Google/Apple OAuth 로그인
 * - 로그아웃
 */
export function useAuth(): UseAuthReturn {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 자동 로그인 체크 (세션 토큰이 있으면)
  useEffect(() => {
    const checkSession = async () => {
      const sessionToken = getSessionToken();
      if (sessionToken) {
        try {
          const response = await getCurrentUser(sessionToken);
          setCurrentUser(response.user);
          setIsLoggedIn(true);
          console.log('[AUTH] Auto-login successful:', response.user);
        } catch (error) {
          console.error('[AUTH] Auto-login failed:', error);
          // 세션이 만료되었으면 로그아웃 처리
          setIsLoggedIn(false);
          setCurrentUser(null);
        }
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  // 로그인 핸들러
  const login = useCallback(async (provider: 'google' | 'apple'): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log(`[AUTH] Starting ${provider} login...`);

      // Apple은 준비중
      if (provider === 'apple') {
        return { success: false, message: 'Apple 로그인은 준비중입니다! 🚧' };
      }

      // 1. OAuth 로그인 (Google/Apple)
      let authResponse;
      if (provider === 'google') {
        authResponse = await loginWithGoogle();
      } else {
        authResponse = await loginWithApple();
      }

      console.log('[AUTH] OAuth successful, logging in to backend...');

      // 2. 백엔드 로그인
      const loginResponse = await oauthLogin({
        provider,
        provider_user_id: authResponse.provider_user_id,
        provider_email: authResponse.provider_email,
        name: authResponse.name,
        profile_image_url: authResponse.profile_image_url,
        access_token: authResponse.access_token,
        refresh_token: authResponse.refresh_token,
        token_expires_at: authResponse.token_expires_at
      });

      // 3. 세션 토큰 저장
      saveSessionTokens(loginResponse.session_token, loginResponse.refresh_token);

      // 4. 상태 업데이트
      setCurrentUser(loginResponse.user);
      setIsLoggedIn(true);

      console.log('[AUTH] Login successful!', loginResponse.user);

      return { success: true, message: `환영합니다, ${loginResponse.user.name}님! 🎉` };

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
