/**
 * POI content_type_id별 이모지 매핑
 * 한국관광공사 API content_type_id 기준
 */

// content_type_id 기준 이모지 매핑
const contentTypeEmojiMap: { [key: string]: string } = {
  '12': '🏛️', // 관광지
  '14': '🎭', // 문화시설
  '15': '🎪', // 축제공연행사
  '25': '🗺️', // 여행코스
  '28': '⚽', // 레포츠
  '32': '🏨', // 숙박
  '38': '🛍️', // 쇼핑
  '39': '🍽️', // 음식점
};

/**
 * POI content_type_id로부터 이모지 반환
 */
export const getPOIEmoji = (content_type_id?: string | null): string => {
  if (content_type_id && contentTypeEmojiMap[content_type_id]) {
    return contentTypeEmojiMap[content_type_id];
  }

  // 기본 이모지
  return '📍';
};
