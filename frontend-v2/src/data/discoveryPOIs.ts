/**
 * 발견모드 POI 데이터
 * - 실제 Google Place ID 사용
 * - 10초 간격으로 순차 표시
 */

// 발견모드에서 표시할 Place ID 목록
export const discoveryPlaceIds: string[] = [
  'ChIJM5WqW3ujfDURLhbapsR-hiE',
  'ChIJtxKT7qqjfDUR_n1KCOl2NfU',
  'ChIJXdbjAgCjfDURr3FPgjy9X8Y',
  'ChIJhUYO8mijfDURNKKaI3Pj89M',
  'ChIJhWTRehOjfDURl4JdCMtg-SU',
  'ChIJ4SmDVQCjfDURYFlP3jjJaB4',
  'ChIJT85ofeOifDURvbucXZoLiKE',
  'ChIJCfVlfeOifDURxV8JVhQbUK0'
];

export const DISCOVERY_POI_INTERVAL = 10000; // 10초
export const DISCOVERY_POI_START_DELAY = 9000; // 메시지 끝나고 시작 (9초 후)

// 장소 타입별 이모지 매핑
export const placeTypeEmoji: Record<string, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  bar: '🍺',
  bakery: '🥐',
  korean_restaurant: '🍚',
  japanese_restaurant: '🍣',
  chinese_restaurant: '🥟',
  italian_restaurant: '🍝',
  fast_food_restaurant: '🍔',
  coffee_shop: '☕',
  dessert_shop: '🍰',
  museum: '🏛️',
  park: '🌳',
  shopping_mall: '🛍️',
  tourist_attraction: '📸',
  store: '🏪',
  default: '📍'
};

/**
 * 장소 타입에서 이모지 가져오기
 */
export function getEmojiForPlaceType(placeType?: string): string {
  if (!placeType) return placeTypeEmoji.default;
  return placeTypeEmoji[placeType] || placeTypeEmoji.default;
}
