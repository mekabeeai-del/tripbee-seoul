/**
 * Google OAuth Helper
 * Using Google Identity Services (One Tap)
 */

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
const GOOGLE_CLIENT_ID = '705475916887-lakb540kvt3u10im58f1a5113kvu29de.apps.googleusercontent.com';

/**
 * Google Identity Services 스크립트 로드
 */
function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('google-identity-script')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google 스크립트 로드 실패'));
    document.head.appendChild(script);
  });
}

/**
 * Google 로그인 (OAuth Token Client with Popup)
 */
export async function loginWithGoogle(): Promise<GoogleAuthResponse> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('[GoogleAuth] Starting Google login...');

      // Google 스크립트 로드
      await loadGoogleScript();

      // @ts-ignore
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        reject(new Error('Google 스크립트가 로드되지 않았습니다.'));
        return;
      }

      console.log('[GoogleAuth] Google script loaded, initializing Token client...');

      // Token Client 초기화 (팝업 방식)
      // @ts-ignore
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        callback: async (response: any) => {
          try {
            console.log('[GoogleAuth] Token callback received:', response);

            if (response.error) {
              reject(new Error(response.error));
              return;
            }

            // Access token으로 사용자 정보 가져오기
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: {
                'Authorization': `Bearer ${response.access_token}`
              }
            });

            if (!userInfoResponse.ok) {
              throw new Error('Failed to fetch user info');
            }

            const userInfo = await userInfoResponse.json();
            console.log('[GoogleAuth] User info:', userInfo);

            // Token 만료 시간 계산 (expires_in은 초 단위)
            const expiresAt = response.expires_in
              ? new Date(Date.now() + response.expires_in * 1000).toISOString()
              : undefined;

            resolve({
              provider_user_id: userInfo.sub,
              provider_email: userInfo.email,
              name: userInfo.name || userInfo.email.split('@')[0],
              profile_image_url: userInfo.picture || '',
              access_token: response.access_token,
              token_expires_at: expiresAt
            });
          } catch (error) {
            console.error('[GoogleAuth] Error in callback:', error);
            reject(error);
          }
        },
      });

      console.log('[GoogleAuth] Requesting access token...');
      // 팝업 열기
      client.requestAccessToken({ prompt: 'consent' });

    } catch (error) {
      console.error('[GoogleAuth] Login error:', error);
      reject(error);
    }
  });
}


/**
 * Apple 로그인 (준비중)
 */
export async function loginWithApple(): Promise<GoogleAuthResponse> {
  throw new Error('Apple 로그인은 준비중입니다.');
}
