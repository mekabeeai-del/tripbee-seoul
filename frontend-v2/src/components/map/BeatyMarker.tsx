import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import './BeatyMarker.css';

interface BeatyMarkerProps {
  map: mapboxgl.Map | null;
  position: { latitude: number; longitude: number } | null;
  flyToOnUpdate?: boolean;
}

/**
 * 비티 마커 컴포넌트
 * - GPS 위치에 비티 이미지 마커 표시
 * - 파동 효과 애니메이션
 */
function BeatyMarker({ map, position, flyToOnUpdate = true }: BeatyMarkerProps) {
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!position || !map) return;

    const { latitude, longitude } = position;

    // 지도 이동 (옵션)
    if (flyToOnUpdate) {
      map.flyTo({
        center: [longitude, latitude],
        zoom: 17,
        duration: 1000,
        essential: true
      });
    }

    // 마커 생성/업데이트
    if (markerRef.current) {
      // 기존 마커 위치 업데이트
      markerRef.current.setLngLat([longitude, latitude]);
    } else {
      // 새 마커 생성
      const el = document.createElement('div');
      el.className = 'beaty-marker';

      // 파동 효과 (3개 원)
      for (let i = 0; i < 3; i++) {
        const ripple = document.createElement('div');
        ripple.className = 'beaty-marker-ripple';
        ripple.style.animationDelay = `${i * 0.6}s`;
        el.appendChild(ripple);
      }

      // 비티 이미지
      const beatyImg = document.createElement('div');
      beatyImg.className = 'beaty-marker-image';
      el.appendChild(beatyImg);

      markerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([longitude, latitude])
        .addTo(map);
    }

    // cleanup
    return () => {
      // 컴포넌트 언마운트 시에만 마커 제거
    };
  }, [map, position, flyToOnUpdate]);

  // 컴포넌트 언마운트 시 마커 제거
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, []);

  return null; // 마커는 Mapbox에 직접 추가되므로 렌더링 없음
}

export default BeatyMarker;
