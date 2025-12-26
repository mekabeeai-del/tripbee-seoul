/**
 * 데모용 카페 place_id 목록
 * - 채팅에서 "카페" 키워드 입력 시 이 목록의 카페를 지도에 표시
 */

export const DEMO_CAFE_PLACE_IDS = [
  'ChIJc6f-EU-jfDURfNPXqBpY-Iw',
  'ChIJn1wlswSjfDURNrfOL9DesWk',
  'ChIJ6cyLQM-jfDUR6flIpUuzZhI',
];

// 카페 키워드 목록
export const CAFE_KEYWORDS = ['카페', '커피', 'cafe', 'coffee', '커피숍'];

// 비티 메시지
export const CAFE_BEATY_MESSAGES = {
  searching: '근처 카페를 찾고 있어요... ☕',
  found: (count: number) => `${count}개의 카페를 찾았어요! 마커를 눌러 자세히 확인해보세요 ☕`,
  error: '카페 정보를 불러오는데 실패했어요. 다시 시도해주세요!',
};
