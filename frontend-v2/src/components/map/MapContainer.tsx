import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapContainer.css';
import { useTimeOfDay, getMapStyleByTimeOfDay } from '../../hooks/useTimeOfDay';

// Mapbox access token from CLAUDE.md
mapboxgl.accessToken = 'pk.eyJ1IjoieWVhaGhhIiwiYSI6ImNtZTk4bTY2czBvcjUya29pc2NmdzM2aDQifQ.Nv8VEnrxJ5BDqBDOHH518Q';

interface MapContainerProps {
  onMapLoad?: (map: mapboxgl.Map) => void;
  onGeolocateControlLoad?: (control: mapboxgl.GeolocateControl) => void;
}

export default function MapContainer({ onMapLoad, onGeolocateControlLoad }: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const geolocateControl = useRef<mapboxgl.GeolocateControl | null>(null);
  const timeOfDay = useTimeOfDay();

  // 지도 초기화
  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map centered on Seoul
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [126.9780, 37.5665],
      zoom: 15,
      pitch: 0,
      bearing: 0,
      language: 'ko'
    });

    // Add Geolocate control (hidden from UI)
    geolocateControl.current = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,  // GPS 사용
        timeout: 10000,            // 10초 동안 정확한 위치 기다림
        maximumAge: 0              // 캐시된 위치 사용 안함 (항상 새로운 위치 요청)
      },
      trackUserLocation: true,
      showUserLocation: true,
      showAccuracyCircle: true     // 정확도 원 표시
    });

    map.current.addControl(geolocateControl.current);

    // Notify parent components
    if (onMapLoad && map.current) {
      onMapLoad(map.current);
    }
    if (onGeolocateControlLoad && geolocateControl.current) {
      onGeolocateControlLoad(geolocateControl.current);
    }

    return () => {
      map.current?.remove();
    };
  }, []);

  // 시간대가 변경되면 지도 스타일 업데이트
  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      map.current.setStyle('mapbox://styles/mapbox/light-v11');
    }
  }, [timeOfDay]);

  return <div ref={mapContainer} className="map-container" />;
}
