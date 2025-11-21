/**
 * API Configuration
 *
 * 환경에 따라 Gateway URL 자동 선택
 */

// Gateway Base URL (환경변수에서 로드)
export const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8080';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth (Privacy Service)
  AUTH_LOGIN: `${API_GATEWAY_URL}/privacy/auth/oauth/login`,
  AUTH_LOGOUT: `${API_GATEWAY_URL}/privacy/auth/logout`,
  AUTH_ME: `${API_GATEWAY_URL}/privacy/auth/me`,

  // Beaty Service
  BEATY_CHAT: `${API_GATEWAY_URL}/beaty/chat`,
  BEATY_STREAM: `${API_GATEWAY_URL}/beaty/stream`,

  // POI Service
  POI_SEARCH: `${API_GATEWAY_URL}/poi/search`,
  POI_RECOMMEND: `${API_GATEWAY_URL}/poi/recommend`,

  // Route Service
  ROUTE_SEARCH: `${API_GATEWAY_URL}/route/search`,

  // Beatmap Service
  BEATMAP_POIS: `${API_GATEWAY_URL}/beatmap/pois/metadata`,
} as const;

// Helper function
export function getApiUrl(endpoint: keyof typeof API_ENDPOINTS): string {
  return API_ENDPOINTS[endpoint];
}

// Log current configuration (dev only)
if (import.meta.env.DEV) {
  console.log('[API Config] Gateway URL:', API_GATEWAY_URL);
  console.log('[API Config] Environment:', import.meta.env.MODE);
}
