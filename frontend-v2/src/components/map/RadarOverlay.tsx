import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import './RadarOverlay.css';

interface RadarOverlayProps {
  map: mapboxgl.Map | null;
  position: { latitude: number; longitude: number } | null;
  isActive: boolean;
}

export default function RadarOverlay({ map, position, isActive }: RadarOverlayProps) {
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!map || !position) return;

    if (isActive) {
      // 레이더 마커 생성
      const el = document.createElement('div');
      el.className = 'radar-overlay';
      el.innerHTML = `
        <div class="radar-circle-fixed"></div>
        <div class="radar-pulse"></div>
        <div class="radar-pulse radar-pulse-delay"></div>
        <div class="radar-sweep"></div>
        <div class="radar-center"></div>
      `;

      markerRef.current = new mapboxgl.Marker({
        element: el,
        anchor: 'center'
      })
        .setLngLat([position.longitude, position.latitude])
        .addTo(map);
    } else {
      // 레이더 마커 제거
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [map, position, isActive]);

  // 위치 업데이트
  useEffect(() => {
    if (markerRef.current && position && isActive) {
      markerRef.current.setLngLat([position.longitude, position.latitude]);
    }
  }, [position, isActive]);

  return null; // 마커로 렌더링하므로 JSX 반환 없음
}
