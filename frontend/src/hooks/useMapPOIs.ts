/**
 * POI T�pt0 \�  D0� Hook
 */

import { useState, useEffect, useMemo } from 'react';
import { fetchAllPOIsMetadata } from '../services/beatmapApi';
import type { POIMetadata } from '../services/beatmapApi';
import type { Map, LngLatBounds } from 'mapbox-gl';

export const useMapPOIs = (
  map: Map | null,
  minZoom: number = 14
) => {
  const [allPOIs, setAllPOIs] = useState<POIMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentZoom, setCurrentZoom] = useState(12);
  const [bounds, setBounds] = useState<LngLatBounds | null>(null);

  // 1. q ܑ� � POI T�pt0 \� (1�)
  useEffect(() => {
    const loadPOIs = async () => {
      setIsLoading(true);
      try {
        const pois = await fetchAllPOIsMetadata();
        setAllPOIs(pois);
      } catch (err) {
        setError(err as Error);
        console.error('[useMapPOIs] POI \� �(:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPOIs();
  }, []);

  // 2. �� Zoom/Bounds �� �
  useEffect(() => {
    if (!map) return;

    const handleMove = () => {
      setCurrentZoom(map.getZoom());
      setBounds(map.getBounds());
    };

    map.on('zoomend', handleMove);
    map.on('moveend', handleMove);

    // 0 $
    handleMove();

    return () => {
      map.off('zoomend', handleMove);
      map.off('moveend', handleMove);
    };
  }, [map]);

  // 3. 표시할 POI 필터링 (Zoom + BBOX + Category)
  const visiblePOIs = useMemo(() => {
    // 줌이 minZoom 미만이면 POI 숨김
    if (currentZoom < minZoom) {
      return [];
    }

    if (!bounds) {
      return [];
    }

    // 줌 레벨별 표시할 카테고리 정의
    let allowedCategories: string[] = [];

    if (currentZoom >= 16) {
      // 줌 16+: 모든 카테고리
      allowedCategories = ['12', '14', '15', '25', '28', '32', '38', '39'];
    } else if (currentZoom >= 15) {
      // 줌 15: 음식점, 쇼핑 제외
      allowedCategories = ['12', '14', '15', '25', '28', '32'];
    } else if (currentZoom >= 14) {
      // 줌 14: 여행코스만
      allowedCategories = ['25'];
    }

    // BBOX 및 카테고리 필터링
    return allPOIs.filter((poi) => {
      const inBounds = bounds.contains([poi.lng, poi.lat]);
      const categoryAllowed = allowedCategories.includes(poi.content_type_id || '');
      return inBounds && categoryAllowed;
    });
  }, [allPOIs, currentZoom, bounds, minZoom]);

  return {
    allPOIs,
    visiblePOIs,
    isLoading,
    error,
    currentZoom,
    shouldShowPOIs: currentZoom >= minZoom,
  };
};
