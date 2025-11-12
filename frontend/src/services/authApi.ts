/**
 * Auth API - Privacy Service (8100번 포트) 연동
 */

const PRIVACY_SERVICE_URL = 'http://localhost:8100';
const BEATY_SERVICE_URL = 'http://localhost:8000';

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
  profile_image_url: string | null;
  language_preference: string | null;
  timezone: string | null;
  status: string;
}

export interface LoginResponse {
  success: boolean;
  session_token: string;
  refresh_token: string;
  expires_at: string;
  user: User;
}

/**
 * OAuth 로그인 (Google/Apple)
 */
export async function oauthLogin(request: OAuthLoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${PRIVACY_SERVICE_URL}/api/auth/oauth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * 로그아웃
 */
export async function logout(sessionToken: string): Promise<void> {
  const response = await fetch(`${PRIVACY_SERVICE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Logout failed: ${response.statusText}`);
  }
}

/**
 * 현재 사용자 정보 조회
 */
export async function getCurrentUser(sessionToken: string): Promise<User> {
  const response = await fetch(`${PRIVACY_SERVICE_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Get user failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.user;
}

/**
 * 세션 토큰 저장 (localStorage)
 */
export function saveSession(sessionToken: string, refreshToken: string, expiresAt: string): void {
  localStorage.setItem('session_token', sessionToken);
  localStorage.setItem('refresh_token', refreshToken);
  localStorage.setItem('session_expires_at', expiresAt);
}

/**
 * 세션 토큰 조회
 */
export function getSessionToken(): string | null {
  return localStorage.getItem('session_token');
}

/**
 * 세션 삭제
 */
export function clearSession(): void {
  localStorage.removeItem('session_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('session_expires_at');
}

/**
 * 세션 유효성 확인
 */
export function isSessionValid(): boolean {
  const expiresAt = localStorage.getItem('session_expires_at');
  if (!expiresAt) return false;

  const expiryDate = new Date(expiresAt);
  return expiryDate > new Date();
}

// =====================================================================================
// TRIP SESSION API
// =====================================================================================

export interface TripSession {
  id: number;
  trip_id: string;
  user_id: number;
  nationality: string;
  purpose: string[];
  interests: string[];
  companions: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface TripSessionCreate {
  nationality: string;
  purpose: string[];
  interests: string[];
  companions: string;
  start_date: string;  // "YYYY-MM-DD"
  end_date: string;    // "YYYY-MM-DD"
}

export interface Category {
  cat_code: string;
  name: string;
  keywords: string;
}

/**
 * KTO 카테고리 목록 조회 (CAT_LEVEL=0)
 */
export async function getCategories(): Promise<Category[]> {
  const response = await fetch(`${PRIVACY_SERVICE_URL}/api/trip/categories`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Get categories failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.categories;
}

/**
 * 현재 활성 여행 세션 조회
 */
export async function getActiveTripSession(sessionToken: string): Promise<TripSession | null> {
  const response = await fetch(`${PRIVACY_SERVICE_URL}/api/trip/active`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Get active trip failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.trip;
}

/**
 * 새 여행 세션 생성
 */
export async function createTripSession(
  sessionToken: string,
  tripData: TripSessionCreate
): Promise<TripSession> {
  const response = await fetch(`${PRIVACY_SERVICE_URL}/api/trip/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify(tripData),
  });

  if (!response.ok) {
    throw new Error(`Create trip failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.trip;
}

/**
 * 여행 세션 수정
 */
export async function updateTripSession(
  sessionToken: string,
  tripId: string,
  tripData: TripSessionCreate
): Promise<TripSession> {
  const response = await fetch(`${PRIVACY_SERVICE_URL}/api/trip/${tripId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify(tripData),
  });

  if (!response.ok) {
    throw new Error(`Update trip failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.trip;
}

/**
 * 여행 세션 삭제 (비활성화)
 */
export async function deleteTripSession(
  sessionToken: string,
  tripId: string
): Promise<void> {
  const response = await fetch(`${PRIVACY_SERVICE_URL}/api/trip/${tripId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Delete trip failed: ${response.statusText}`);
  }
}

export interface TripContext {
  trip_id: string;
  current_day: number;
  total_days: number;
  interests: string[];
  companions: string;
  purpose: string[];
  nationality: string;
  start_date: string;
  end_date: string;
}

export interface TripContextResponse {
  success: boolean;
  has_active_trip: boolean;
  trip_context: TripContext | null;
}

/**
 * 여행 컨텍스트 조회 (현재 몇일차인지, 관심사, 동행인, 여행목적 등)
 */
export async function getTripContext(sessionToken: string): Promise<TripContextResponse> {
  const response = await fetch(`${PRIVACY_SERVICE_URL}/api/trip/context`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Get trip context failed: ${response.statusText}`);
  }

  return await response.json();
}

// =====================================================================================
// QUERY HISTORY API
// =====================================================================================

export interface QueryHistory {
  id: number;
  query_text: string;
  intent: string;
  result_count: number;
  beaty_response_text: string;
  beaty_response_type: string;
  final_result: any;
  created_at: string;
}

export interface QueryHistoryResponse {
  success: boolean;
  queries: QueryHistory[];
}

/**
 * 대화기록 조회 (query_logs 테이블에서)
 * Note: beaty-service에서 query_logs를 관리하므로 beaty-service로 요청
 */
export async function getQueryHistory(sessionToken: string, limit: number = 20, offset: number = 0): Promise<QueryHistoryResponse> {
  const response = await fetch(`${BEATY_SERVICE_URL}/api/history/queries?limit=${limit}&offset=${offset}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Get query history failed: ${response.statusText}`);
  }

  return await response.json();
}
