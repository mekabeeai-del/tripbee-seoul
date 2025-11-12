/**
 * KTO 카테고리 코드를 이모지로 매핑
 */

export const getCategoryEmoji = (cat1?: string | null): string => {
  if (!cat1) return '📍';

  const emojiMap: { [key: string]: string } = {
    'A01': '🏞️', // 자연
    'A02': '🏛️', // 인문(문화/관광지)
    'A03': '⚽', // 레포츠
    'A04': '🛍️', // 쇼핑
    'A05': '🍽️', // 음식점
    'B02': '🏨', // 숙박
    'C01': '🎉', // 추천코스
  };

  return emojiMap[cat1] || '📍';
};

export const getCategoryColor = (cat1?: string | null): string => {
  if (!cat1) return '#4A90E2';

  const colorMap: { [key: string]: string } = {
    'A01': '#4CAF50', // 자연 - 녹색
    'A02': '#9C27B0', // 인문 - 보라
    'A03': '#FF9800', // 레포츠 - 주황
    'A04': '#E91E63', // 쇼핑 - 핑크
    'A05': '#F44336', // 음식 - 빨강
    'B02': '#2196F3', // 숙박 - 파랑
    'C01': '#FFC107', // 추천코스 - 노랑
  };

  return colorMap[cat1] || '#4A90E2';
};
