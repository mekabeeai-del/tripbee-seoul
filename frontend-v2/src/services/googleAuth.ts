/**
 * Google OAuth Helper
 * - Web: 리다이렉트 방식
 * - Android: Chrome Custom Tabs + Deep Link
 */

import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

export interface GoogleAuthResponse {
  provider_user_id: string;
  provider_email: string;
  name: string;
  profile_image_url: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
}

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// Android: Vercel 페이지를 거쳐서 Deep Link로 복귀
const VERCEL_OAUTH_CALLBACK = 'https://tripbee-seoul.vercel.app/oauth-callback.html';

// OAuth 콜백 리스너
let oauthResolver: ((response: GoogleAuthResponse) => void) | null = null;
let oauthRejecter: ((error: Error) => void) | null = null;
let listenerSetup = false;

/**
 * Deep Link 리스너 설정 (앱 시작시 1회)
 */
function setupDeepLinkListener() {
  if (listenerSetup) return;
  listenerSetup = true;

  App.addListener('appUrlOpen', async ({ url }) => {
    console.log('[GoogleAuth] Deep link received:', url);

    if (url.startsWith('com.tripbee.seoul://oauth/callback')) {
      try {
        // URL fragment에서 토큰 추출
        const hashPart = url.split('#')[1];
        if (!hashPart) {
          oauthRejecter?.(new Error('No token in callback'));
          return;
        }

        const params = new URLSearchParams(hashPart);
        const accessToken = params.get('access_token');

        if (!accessToken) {
          oauthRejecter?.(new Error(params.get('error') || 'No access token'));
          return;
        }

        // 사용자 정보 가져오기
        const userInfo = await fetchUserInfo(accessToken);

        const expiresIn = params.get('expires_in');
        const expiresAt = expiresIn
          ? new Date(Date.now() + parseInt(expiresIn) * 1000).toISOString()
          : undefined;

        const response: GoogleAuthResponse = {
          provider_user_id: userInfo.sub,
          provider_email: userInfo.email,
          name: userInfo.name || userInfo.email.split('@')[0],
          profile_image_url: userInfo.picture || '',
          access_token: accessToken,
          token_expires_at: expiresAt
        };

        // 브라우저 닫기
        await Browser.close();

        oauthResolver?.(response);
      } catch (error) {
        oauthRejecter?.(error as Error);
      }
    }
  });
}

/**
 * Google 로그인 시작
 */
export function loginWithGoogle(): void | Promise<GoogleAuthResponse> {
  if (Capacitor.isNativePlatform()) {
    // Android: Chrome Custom Tabs + Deep Link
    return loginWithDeepLink();
  } else {
    // Web: 리다이렉트 방식
    loginWithRedirect();
  }
}

/**
 * Android: Chrome Custom Tabs로 로그인
 */
async function loginWithDeepLink(): Promise<GoogleAuthResponse> {
  setupDeepLinkListener();

  return new Promise((resolve, reject) => {
    oauthResolver = resolve;
    oauthRejecter = reject;

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: VERCEL_OAUTH_CALLBACK,  // Vercel 페이지로 먼저 이동
      response_type: 'token',
      scope: 'openid email profile',
      prompt: 'select_account'
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    console.log('[GoogleAuth] Opening Chrome Custom Tabs:', authUrl);

    Browser.open({ url: authUrl });
  });
}

/**
 * Web: 리다이렉트 방식 로그인
 */
function loginWithRedirect(): void {
  const redirectUri = window.location.origin + '/';

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: 'openid email profile',
    state: encodeURIComponent(window.location.pathname),
    prompt: 'select_account'
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  console.log('[GoogleAuth] Redirecting to:', authUrl);
  window.location.href = authUrl;
}

/**
 * OAuth 콜백 처리 (웹 전용 - 페이지 로드 시 호출)
 */
export async function handleOAuthCallback(): Promise<GoogleAuthResponse | null> {
  // Native는 Deep Link로 처리
  if (Capacitor.isNativePlatform()) {
    return null;
  }

  const hash = window.location.hash;

  if (!hash || !hash.includes('access_token')) {
    return null;
  }

  console.log('[GoogleAuth] Processing OAuth callback...');

  try {
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');
    const state = params.get('state');

    if (!accessToken) {
      console.error('[GoogleAuth] OAuth error:', params.get('error'));
      return null;
    }

    const cleanUrl = window.location.origin + (state ? decodeURIComponent(state) : '/');
    window.history.replaceState({}, '', cleanUrl);

    const userInfo = await fetchUserInfo(accessToken);

    const expiresAt = expiresIn
      ? new Date(Date.now() + parseInt(expiresIn) * 1000).toISOString()
      : undefined;

    const response: GoogleAuthResponse = {
      provider_user_id: userInfo.sub,
      provider_email: userInfo.email,
      name: userInfo.name || userInfo.email.split('@')[0],
      profile_image_url: userInfo.picture || '',
      access_token: accessToken,
      token_expires_at: expiresAt
    };

    console.log('[GoogleAuth] Login successful:', response.provider_email);
    return response;

  } catch (error) {
    console.error('[GoogleAuth] Callback processing error:', error);
    return null;
  }
}

/**
 * 사용자 정보 가져오기
 */
async function fetchUserInfo(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }

  return response.json();
}

/**
 * Apple 로그인 (준비중)
 */
export async function loginWithApple(): Promise<GoogleAuthResponse> {
  throw new Error('Apple 로그인은 준비중입니다.');
}
