/**
 * Google Places API 서비스
 * - Nearby Search로 주변 장소 검색
 */

const GOOGLE_API_KEY = 'AIzaSyBIQVYNLnbSdjIN2agdGeo0K10cbseBXoM';

export interface GooglePlace {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  photos?: {
    photo_reference: string;
  }[];
}

export interface NearbySearchResponse {
  results: GooglePlace[];
  status: string;
}

// 장소 타입별 이모지 매핑
const typeEmojiMap: Record<string, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  bar: '🍺',
  museum: '🏛️',
  park: '🌳',
  shopping_mall: '🛍️',
  tourist_attraction: '📸',
  subway_station: '🚇',
  bus_station: '🚌',
  lodging: '🏨',
  convenience_store: '🏪',
  bakery: '🥐',
  book_store: '📚',
  clothing_store: '👕',
  art_gallery: '🎨',
  temple: '🛕',
  church: '⛪',
  default: '📍'
};

// 장소 타입별 설명 템플릿
const typeDescriptionMap: Record<string, string> = {
  restaurant: '맛있는 음식을 즐길 수 있는 곳이에요! 🍴',
  cafe: '커피 한 잔의 여유를 즐겨보세요! ☕',
  bar: '분위기 좋은 술집이에요! 🍻',
  museum: '역사와 문화를 느낄 수 있는 박물관이에요! 🎭',
  park: '산책하기 좋은 공원이에요! 🌿',
  shopping_mall: '쇼핑을 즐길 수 있는 곳이에요! 🛒',
  tourist_attraction: '꼭 방문해보세요! 인기 관광지예요! ⭐',
  default: '이 근처에 있는 장소예요!'
};

/**
 * 장소 타입에서 이모지 가져오기
 */
export function getEmojiForPlace(types: string[]): string {
  for (const type of types) {
    if (typeEmojiMap[type]) {
      return typeEmojiMap[type];
    }
  }
  return typeEmojiMap.default;
}

/**
 * 장소 타입에서 설명 생성
 */
export function getDescriptionForPlace(name: string, types: string[]): string {
  for (const type of types) {
    if (typeDescriptionMap[type]) {
      return `${name} - ${typeDescriptionMap[type]}`;
    }
  }
  return `${name} - ${typeDescriptionMap.default}`;
}

/**
 * 주변 장소 검색 (Nearby Search)
 */
export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  radius: number = 500,
  maxResults: number = 10
): Promise<GooglePlace[]> {
  try {
    // CORS 문제로 프록시 필요 - 일단 직접 호출 시도
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${GOOGLE_API_KEY}&language=ko`;

    const response = await fetch(url);
    const data: NearbySearchResponse = await response.json();

    if (data.status === 'OK') {
      return data.results.slice(0, maxResults);
    } else {
      console.error('Google Places API error:', data.status);
      return [];
    }
  } catch (error) {
    console.error('Failed to fetch nearby places:', error);
    return [];
  }
}

/**
 * 장소 사진 URL 가져오기
 */
export function getPlacePhotoUrl(photoReference: string, maxWidth: number = 400): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
}
