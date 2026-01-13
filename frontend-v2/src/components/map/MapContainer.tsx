import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapContainer.css';
import { useTimeOfDay } from '../../hooks/useTimeOfDay';

// Mapbox access token from CLAUDE.md
mapboxgl.accessToken = 'pk.eyJ1IjoieWVhaGhhIiwiYSI6ImNtZTk4bTY2czBvcjUya29pc2NmdzM2aDQifQ.Nv8VEnrxJ5BDqBDOHH518Q';

interface RouteData {
  from: { lat: number; lng: number; name: string };
  to: { lat: number; lng: number; name: string };
  path: Array<[number, number]>;
}

interface MapContainerProps {
  onMapLoad?: (map: mapboxgl.Map) => void;
  onGeolocateControlLoad?: (control: mapboxgl.GeolocateControl) => void;
  routeData?: RouteData | null;
}

export default function MapContainer({ onMapLoad, onGeolocateControlLoad, routeData }: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const geolocateControl = useRef<mapboxgl.GeolocateControl | null>(null);
  const timeOfDay = useTimeOfDay();
  const routeMarkersRef = useRef<mapboxgl.Marker[]>([]);

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

    // Add Geolocate control (내 위치 마커만 표시)
    geolocateControl.current = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: false,    // 자동 추적 안 함
      showUserLocation: true,      // 내 위치 마커 표시
      showAccuracyCircle: false    // 정확도 원 숨김
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

  // 경로 표시
  useEffect(() => {
    if (!map.current || !routeData) return;

    const mapInstance = map.current;

    // 기존 마커 제거
    routeMarkersRef.current.forEach(marker => marker.remove());
    routeMarkersRef.current = [];

    // 기존 레이어 제거
    if (mapInstance.getLayer('route-line')) {
      mapInstance.removeLayer('route-line');
    }
    if (mapInstance.getSource('route')) {
      mapInstance.removeSource('route');
    }

    if (!routeData) return;

    const waitForStyleLoad = () => {
      if (!mapInstance.isStyleLoaded()) {
        setTimeout(waitForStyleLoad, 100);
        return;
      }

      // 출발지 마커 (초록색)
      const startMarker = document.createElement('div');
      startMarker.className = 'route-marker start';
      startMarker.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          background: #4CAF50;
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">출발</div>
      `;

      const startMapMarker = new mapboxgl.Marker({ element: startMarker })
        .setLngLat([routeData.from.lng, routeData.from.lat])
        .addTo(mapInstance);
      routeMarkersRef.current.push(startMapMarker);

      // 도착지 마커 (빨간색)
      const endMarker = document.createElement('div');
      endMarker.className = 'route-marker end';
      endMarker.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          background: #F44336;
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">도착</div>
      `;

      const endMapMarker = new mapboxgl.Marker({ element: endMarker })
        .setLngLat([routeData.to.lng, routeData.to.lat])
        .addTo(mapInstance);
      routeMarkersRef.current.push(endMapMarker);

      // 경로선 추가
      mapInstance.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeData.path
          }
        }
      });

      mapInstance.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#2196F3',
          'line-width': 6,
          'line-opacity': 0.8
        }
      });

      // 경로 전체를 보이도록 지도 조정
      const bounds = new mapboxgl.LngLatBounds();
      routeData.path.forEach(coord => bounds.extend(coord as [number, number]));
      mapInstance.fitBounds(bounds, {
        padding: { top: 100, bottom: 100, left: 50, right: 50 },
        duration: 1000
      });
    };

    waitForStyleLoad();

    return () => {
      // 클린업
      routeMarkersRef.current.forEach(marker => marker.remove());
      routeMarkersRef.current = [];
    };
  }, [routeData]);

  return <div ref={mapContainer} className="map-container" />;
}
