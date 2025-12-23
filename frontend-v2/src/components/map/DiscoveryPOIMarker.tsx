import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { VisiblePOI } from '../../hooks/useDiscoveryMode';
import './DiscoveryPOIMarker.css';

interface DiscoveryPOIMarkerProps {
  map: mapboxgl.Map | null;
  pois: VisiblePOI[];
  onMarkerClick?: (poi: VisiblePOI, clickPosition: { x: number; y: number }) => void;
}

/**
 * 발견모드 POI 마커 컴포넌트
 * - mapboxgl.Marker 기반
 * - 커스텀 마커 이미지 + pop-in 애니메이션
 */
export default function DiscoveryPOIMarker({ map, pois, onMarkerClick }: DiscoveryPOIMarkerProps) {
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!map) return;

    // 새로 추가된 POI만 마커 생성
    pois.forEach((poi, index) => {
      // 이미 생성된 마커는 스킵
      if (markersRef.current[index]) return;

      // 마커 컨테이너 (Mapbox가 위치 조정)
      const el = document.createElement('div');
      el.className = 'discovery-poi-wrapper';

      // 애니메이션 컨테이너 (CSS 애니메이션 적용)
      const inner = document.createElement('div');
      inner.className = 'discovery-poi-marker';

      // 마커 이미지
      const img = document.createElement('img');
      img.src = '/img/map/map-marker-icon.png';
      img.className = 'discovery-poi-icon';
      inner.appendChild(img);

      // 라벨
      const label = document.createElement('div');
      label.className = 'discovery-poi-label';
      label.textContent = poi.name;
      inner.appendChild(label);

      el.appendChild(inner);

      // 클릭 이벤트
      el.addEventListener('click', (e) => {
        const rect = el.getBoundingClientRect();
        const clickPos = {
          x: rect.left + rect.width / 2,
          y: rect.top
        };
        onMarkerClick?.(poi, clickPos);
      });

      console.log('[POIMarker] Adding marker:', poi.name, 'at', poi.lng, poi.lat);

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom'
      })
        .setLngLat([poi.lng, poi.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [map, pois]);

  // POI 초기화 시 마커 제거
  useEffect(() => {
    if (pois.length === 0 && markersRef.current.length > 0) {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    }
  }, [pois]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, []);

  return null;
}
