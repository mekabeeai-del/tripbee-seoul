import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import circle from '@turf/circle';
import './BeatyMarker.css';

interface BeatyMarkerProps {
  map: mapboxgl.Map | null;
  position: { latitude: number; longitude: number } | null;
  flyToOnUpdate?: boolean;
  isDiscovering?: boolean;
}

/**
 * 비티 마커 컴포넌트
 * - GPS 위치에 비티 이미지 마커 표시
 * - 파동 효과 애니메이션
 * - 발견모드 레이더 표시
 */
function BeatyMarker({ map, position, flyToOnUpdate = true, isDiscovering = false }: BeatyMarkerProps) {
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

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
      elementRef.current = el;

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

  // 발견모드 레이더 토글
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!elementRef.current || !map || !position) return;

    const el = elementRef.current;
    const PULSE_SOURCE_1 = 'radar-pulse-source-1';
    const PULSE_SOURCE_2 = 'radar-pulse-source-2';
    const PULSE_LAYER_1 = 'radar-pulse-layer-1';
    const PULSE_LAYER_2 = 'radar-pulse-layer-2';

    if (isDiscovering) {
      el.classList.add('discovering');

      const center: [number, number] = [position.longitude, position.latitude];
      const maxRadius = 0.5; // 500m = 0.5km

      // 확장 파장 원 추가 (2개)
      const createPulseCircle = (sourceId: string, layerId: string) => {
        const initialCircle = circle(center, 0.01, { steps: 64, units: 'kilometers' });
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'geojson',
            data: initialCircle
          });
          map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': 'rgba(0, 168, 107, 0.6)',
              'line-width': 2,
              'line-opacity': 0.8
            }
          });
        }
      };

      createPulseCircle(PULSE_SOURCE_1, PULSE_LAYER_1);
      createPulseCircle(PULSE_SOURCE_2, PULSE_LAYER_2);

      // 파장 애니메이션
      let pulse1Radius = 0;
      let pulse2Radius = maxRadius / 2;
      const pulseSpeed = 0.003;

      const animate = () => {
        // 파장 1
        pulse1Radius += pulseSpeed;
        if (pulse1Radius > maxRadius) pulse1Radius = 0;
        const opacity1 = 1 - (pulse1Radius / maxRadius);

        if (map.getSource(PULSE_SOURCE_1)) {
          const pulseCircle1 = circle(center, Math.max(pulse1Radius, 0.01), { steps: 64, units: 'kilometers' });
          (map.getSource(PULSE_SOURCE_1) as mapboxgl.GeoJSONSource).setData(pulseCircle1);
          if (map.getLayer(PULSE_LAYER_1)) {
            map.setPaintProperty(PULSE_LAYER_1, 'line-opacity', opacity1 * 0.6);
          }
        }

        // 파장 2
        pulse2Radius += pulseSpeed;
        if (pulse2Radius > maxRadius) pulse2Radius = 0;
        const opacity2 = 1 - (pulse2Radius / maxRadius);

        if (map.getSource(PULSE_SOURCE_2)) {
          const pulseCircle2 = circle(center, Math.max(pulse2Radius, 0.01), { steps: 64, units: 'kilometers' });
          (map.getSource(PULSE_SOURCE_2) as mapboxgl.GeoJSONSource).setData(pulseCircle2);
          if (map.getLayer(PULSE_LAYER_2)) {
            map.setPaintProperty(PULSE_LAYER_2, 'line-opacity', opacity2 * 0.6);
          }
        }

        animationRef.current = requestAnimationFrame(animate);
      };
      animate();

    } else {
      el.classList.remove('discovering');

      // 애니메이션 중지
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      // Mapbox 레이어/소스 제거
      const layersToRemove = [PULSE_LAYER_1, PULSE_LAYER_2];
      const sourcesToRemove = [PULSE_SOURCE_1, PULSE_SOURCE_2];

      layersToRemove.forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      sourcesToRemove.forEach(id => {
        if (map.getSource(id)) map.removeSource(id);
      });
    }

    // cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDiscovering, map, position]);

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
