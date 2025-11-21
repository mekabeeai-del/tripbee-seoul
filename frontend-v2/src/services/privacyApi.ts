/**
 * Privacy API Client
 * Gateway를 통해 Privacy Service와 통신
 */

import { API_ENDPOINTS } from '../config/api';

// =====================================================================================
// Types
// =====================================================================================

export interface OAuthLoginRequest {
  provider: 'google' | 'apple';
  provider_user_id: string;
  provider_email: string;
  name?: string;
  profile_image_url?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
}

export interface User {
  id: number;
  uuid: string;
  email: string;
  name: string;
  profile_image_url?: string;
  language_preference?: string;
  timezone?: string;
  status: string;
}

export interface LoginResponse {
  success: boolean;
  session_token: string;
  refresh_token: string;
  expires_at: string;
  user: User;
}

export interface UserResponse {
  success: boolean;
  user: User;
  session_id: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

// =====================================================================================
// API Functions
// =====================================================================================

/**
 * OAuth 로그인 (Google/Apple)
 */
export async function oauthLogin(request: OAuthLoginRequest): Promise<LoginResponse> {
  const response = await fetch(API_ENDPOINTS.AUTH_LOGIN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }

  return response.json();
}

/**
 * 로그아웃
 */
export async function logout(sessionToken: string): Promise<LogoutResponse> {
  const response = await fetch(API_ENDPOINTS.AUTH_LOGOUT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Logout failed');
  }

  return response.json();
}

/**
 * 현재 사용자 정보 조회
 */
export async function getCurrentUser(sessionToken: string): Promise<UserResponse> {
  const response = await fetch(API_ENDPOINTS.AUTH_ME, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get user info');
  }

  return response.json();
}

// =====================================================================================
// Session Storage Helpers
// =====================================================================================

const SESSION_TOKEN_KEY = 'tripbee_session_token';
const REFRESH_TOKEN_KEY = 'tripbee_refresh_token';

export function saveSessionTokens(sessionToken: string, refreshToken: string) {
  localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getSessionToken(): string | null {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearSessionTokens() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
