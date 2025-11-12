/**
 * POI Service - KTO API Client
 * KTO POI 메타데이터 및 상세정보 조회
 */

import axios from 'axios';

const POI_API_URL = 'http://localhost:8001';

export interface POIMetadata {
  content_id: string;
  title: string;
  lat: number;
  lng: number;
  cat1?: string | null;
  cat2?: string | null;
  cat3?: string | null;
  content_type_id?: string | null;
  addr1?: string | null;
  first_image?: string | null;
}

export interface POIDetail extends POIMetadata {
  overview?: string;
}

/**
 * 전체 POI 메타데이터 조회 (경량)
 * 최초 로딩 1회만 호출, 지도 렌더링에 사용
 */
export const fetchAllPOIsMetadata = async (): Promise<POIMetadata[]> => {
  try {
    const response = await axios.get<POIMetadata[]>(`${POI_API_URL}/api/kto/list`);
    return response.data;
  } catch (error) {
    console.error('POI 메타데이터 로드 실패:', error);
    throw error;
  }
};

/**
 * 개별 POI 상세 정보 조회
 * 필요할 때만 호출
 */
export const fetchPOIDetail = async (contentId: string): Promise<POIDetail> => {
  try {
    const response = await axios.get<POIDetail>(`${POI_API_URL}/api/kto/detail/${contentId}`);
    return response.data;
  } catch (error) {
    console.error(`POI 상세 정보 로드 실패 (${contentId}):`, error);
    throw error;
  }
};

export type { POIMetadata, POIDetail };
