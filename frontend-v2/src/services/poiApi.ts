/**
 * POI Service API 클라이언트
 * - Google Place ID로 장소 상세정보 조회
 * - Gateway를 통해 라우팅
 */

// 개발: Gateway(8080) 통해 라우팅, 프로덕션: Render
const GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8080';
const POI_SERVICE_URL = `${GATEWAY_URL}/poi`;

export interface PlaceInfo {
  name: string;
  address: string;
  lat: number;
  lng: number;
  category?: string;
  place_type?: string;
  place_id?: string;
  rating?: number;
  user_rating_count?: number;
  price_level?: string;
  open_now?: boolean;
  phone_number?: string;
  website?: string;
  parking_available?: boolean;
  good_for_children?: boolean;
  wheelchair_accessible?: boolean;
  vegetarian_food?: boolean;
  takeout?: boolean;
  delivery?: boolean;
  allows_dogs?: boolean;
  reservable?: boolean;
  editorial_summary?: string;
  image?: string;
  photos?: string[];
  reviews?: {
    author_name: string;
    author_photo?: string;
    rating?: number;
    text: string;
    time: string;
    language?: string;
  }[];
  opening_hours?: string[];
  beaty_comment?: string;
}

/**
 * Google Place ID로 장소 상세정보 조회
 */
export async function getPlaceById(placeId: string, language: string = 'ko'): Promise<PlaceInfo | null> {
  try {
    const response = await fetch(
      `${POI_SERVICE_URL}/api/google/place/${placeId}?language=${language}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Place not found: ${placeId}`);
        return null;
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.place as PlaceInfo;
  } catch (error) {
    console.error(`Failed to fetch place ${placeId}:`, error);
    return null;
  }
}

/**
 * 여러 Place ID를 순차적으로 조회
 */
export async function getPlacesByIds(placeIds: string[], language: string = 'ko'): Promise<PlaceInfo[]> {
  const places: PlaceInfo[] = [];

  for (const placeId of placeIds) {
    const place = await getPlaceById(placeId, language);
    if (place) {
      places.push(place);
    }
  }

  return places;
}
