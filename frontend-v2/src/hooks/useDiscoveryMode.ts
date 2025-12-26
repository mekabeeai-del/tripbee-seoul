import { useState, useCallback, useRef } from 'react';
import { generateDiscoveryMessages, DISCOVERY_MESSAGE_INTERVAL } from '../data/discoveryMessages';
import { discoveryPlaceIds, DISCOVERY_POI_INTERVAL, DISCOVERY_POI_START_DELAY, getEmojiForPlaceType } from '../data/discoveryPOIs';
import { getPlaceById } from '../services/poiApi';

export interface VisiblePOI {
  id: string;
  name: string;
  description: string;
  emoji: string;
  lat: number;
  lng: number;
  image?: string;
  rating?: number;
  // 추가 정보
  address?: string;
  phone_number?: string;
  website?: string;
  open_now?: boolean;
  opening_hours?: string[];
  user_rating_count?: number;
  price_level?: string;
  editorial_summary?: string;
  // 편의시설
  parking_available?: boolean;
  good_for_children?: boolean;
  wheelchair_accessible?: boolean;
  vegetarian_food?: boolean;
  takeout?: boolean;
  delivery?: boolean;
  allows_dogs?: boolean;
  reservable?: boolean;
  // 리뷰 & 사진
  reviews?: {
    author_name: string;
    author_photo?: string;
    rating?: number;
    text: string;
    time: string;
    language?: string;
  }[];
  photos?: string[];
  // 비티 한마디
  beaty_comment?: string;
}

interface WeatherInfo {
  temp?: number;
  weather?: { main?: string; description?: string }[];
}

interface UseDiscoveryModeProps {
  map: React.MutableRefObject<mapboxgl.Map | null>;
  position: { latitude: number; longitude: number } | null;
  weather?: WeatherInfo | null;
  onMessage?: (message: string) => void;
}

interface UseDiscoveryModeReturn {
  isDiscovering: boolean;
  toggleDiscovery: () => void;
  visiblePOIs: VisiblePOI[];
  clearPOIs: () => void;
}

/**
 * 발견모드 상태 관리 훅
 * - 발견모드 토글
 * - 500m 반경에 맞춰 지도 줌 조정
 * - 비티 버블 메시지 순차 표시 (3초 간격)
 * - POI 마커 순차 표시 (10초 간격) - 실제 Google Place API 사용
 */
export function useDiscoveryMode({
  map,
  position,
  weather,
  onMessage
}: UseDiscoveryModeProps): UseDiscoveryModeReturn {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [visiblePOIs, setVisiblePOIs] = useState<VisiblePOI[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current = [];
  };

  const showSequentialMessages = useCallback(() => {
    const messages = generateDiscoveryMessages(weather || undefined);
    messages.forEach((message, index) => {
      const timer = setTimeout(() => {
        onMessage?.(message);
      }, index * DISCOVERY_MESSAGE_INTERVAL);
      timersRef.current.push(timer);
    });
  }, [onMessage, weather]);

  const showSequentialPOIs = useCallback(() => {
    // Place ID 순차 조회 및 표시
    discoveryPlaceIds.forEach((placeId, index) => {
      const timer = setTimeout(async () => {
        try {
          const place = await getPlaceById(placeId);

          if (place) {
            console.log('[Discovery] Place found:', place.name, 'lat:', place.lat, 'lng:', place.lng);

            const newPOI: VisiblePOI = {
              id: place.place_id || placeId,
              name: place.name,
              description: `${place.name} - ${place.address}`,
              emoji: getEmojiForPlaceType(place.place_type),
              lat: place.lat,
              lng: place.lng,
              image: place.image,
              rating: place.rating,
              // 추가 정보
              address: place.address,
              phone_number: place.phone_number,
              website: place.website,
              open_now: place.open_now,
              opening_hours: place.opening_hours,
              user_rating_count: place.user_rating_count,
              price_level: place.price_level,
              editorial_summary: place.editorial_summary,
              // 편의시설
              parking_available: place.parking_available,
              good_for_children: place.good_for_children,
              wheelchair_accessible: place.wheelchair_accessible,
              vegetarian_food: place.vegetarian_food,
              takeout: place.takeout,
              delivery: place.delivery,
              allows_dogs: place.allows_dogs,
              reservable: place.reservable,
              // 리뷰 & 사진
              reviews: place.reviews,
              photos: place.photos,
              // 비티 한마디
              beaty_comment: place.beaty_comment
            };

            setVisiblePOIs(prev => [...prev, newPOI]);

            // 해당 POI 위치로 지도 이동
            if (map.current) {
              console.log('[Discovery] Flying to:', place.lng, place.lat);
              map.current.flyTo({
                center: [place.lng, place.lat],
                zoom: 16,
                duration: 1500
              });
            }

            // 발견 메시지 표시 (비티 한마디가 있으면 사용)
            if (place.beaty_comment) {
              onMessage?.(`${newPOI.emoji} ${place.name} 발견! ${place.beaty_comment}`);
            } else {
              const ratingText = place.rating ? ` (⭐${place.rating})` : '';
              onMessage?.(`${newPOI.emoji} ${place.name}${ratingText}을(를) 발견했어요!`);
            }
          } else {
            console.log('[Discovery] Place not found for:', placeId);
          }
        } catch (error) {
          console.error(`Failed to fetch place ${placeId}:`, error);
        }
      }, DISCOVERY_POI_START_DELAY + index * DISCOVERY_POI_INTERVAL);
      timersRef.current.push(timer);
    });
  }, [map, onMessage]);

  // 마커 전체 제거
  const clearPOIs = useCallback(() => {
    setVisiblePOIs([]);
    onMessage?.('발견한 장소를 모두 지웠어요!');
  }, [onMessage]);

  const toggleDiscovery = useCallback(() => {
    if (isDiscovering) {
      // 발견모드 종료 (마커는 유지)
      setIsDiscovering(false);
      clearAllTimers();
      onMessage?.('발견모드를 종료했어요!');
    } else {
      // 발견모드 시작
      setIsDiscovering(true);
      setVisiblePOIs([]);

      // 순차 메시지 표시
      showSequentialMessages();

      // POI 순차 표시
      showSequentialPOIs();

      // 현재 위치로 이동하고 500m 반경에 맞게 줌 조정
      if (map.current && position) {
        map.current.flyTo({
          center: [position.longitude, position.latitude],
          zoom: 15.5, // 약 500m 반경
          duration: 1000
        });
      }
    }
  }, [isDiscovering, map, position, onMessage, showSequentialMessages, showSequentialPOIs]);

  return {
    isDiscovering,
    toggleDiscovery,
    visiblePOIs,
    clearPOIs
  };
}
