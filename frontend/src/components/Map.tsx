import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapPOIs } from '../hooks/useMapPOIs';
import { getPOIEmoji } from '../utils/poiEmoji';

mapboxgl.accessToken = 'pk.eyJ1IjoieWVhaGhhIiwiYSI6ImNtZTk4bTY2czBvcjUya29pc2NmdzM2aDQifQ.Nv8VEnrxJ5BDqBDOHH518Q';

interface MapProps {
  onMapLoad?: (map: mapboxgl.Map) => void;
  onLocationUpdate?: (location: { lat: number; lng: number }) => void;
  onKTOPOIClick?: (contentId: string) => void;
  selectedKTOContentId?: string | null;
}

export interface MarkerData {
  lng: number;
  lat: number;
  title?: string;
  address?: string;
  description?: string;
  color?: string;
  rank?: number;
  image?: string;
  // SelectedPlace 정보 추가
  name?: string;
  rating?: number;
  contentId?: string;
  contentTypeId?: string;
  placeId?: string;
  menu_url?: string;
  website?: string;
  phone?: string;
  opening_hours?: any;
  reviews?: any[];
  photos?: any[];
  routeData?: any;
}

const Map: React.FC<MapProps> = ({ onMapLoad, onLocationUpdate, onKTOPOIClick, selectedKTOContentId }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const poiMarkers = useRef<mapboxgl.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // POI 데이터 로드
  const { allPOIs, currentZoom } = useMapPOIs(map.current, 14);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // 서울 경계 설정 (약간의 여유 포함)
    const seoulBounds: mapboxgl.LngLatBoundsLike = [
      [126.70, 37.40], // Southwest coordinates (여유)
      [127.20, 37.70]  // Northeast coordinates (여유)
    ];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [126.9780, 37.5665], // Seoul
      zoom: 12,
      maxBounds: seoulBounds, // 서울 밖으로 못 나가게 제한
      language: 'ko' // 한국어 레이블 표시
    });

    map.current.addControl(new mapboxgl.NavigationControl({
      showCompass: true,
      showZoom: false
    }), 'top-right');

    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserLocation: true
    });

    map.current.addControl(geolocateControl, 'top-right');

    // 브라우저 Geolocation API로 직접 위치 가져오기
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const longitude = position.coords.longitude;
          const latitude = position.coords.latitude;
          if (onLocationUpdate) {
            onLocationUpdate({ lat: latitude, lng: longitude });
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );

      // 위치 변경 추적
      navigator.geolocation.watchPosition(
        (position) => {
          const longitude = position.coords.longitude;
          const latitude = position.coords.latitude;
          if (onLocationUpdate) {
            onLocationUpdate({ lat: latitude, lng: longitude });
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }

    map.current.on('load', () => {
      if (!map.current) return;

      // POI 레이블만 숨기기 (도로명, 지역명은 유지)
      const style = map.current.getStyle();
      if (style && style.layers) {
        style.layers.forEach((layer) => {
          // poi- 로 시작하는 레이어만 숨김
          if (layer.id.startsWith('poi-')) {
            map.current!.setLayoutProperty(layer.id, 'visibility', 'none');
          }
        });
      }

      // 서울 밖을 어둡게 하는 레이어 추가
      // 전체 세계를 덮는 사각형을 만들고, 서울 부분을 hole로 뚫기
      map.current.addSource('seoul-mask', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              // 외곽선 (전체 세계)
              [
                [-180, -90],
                [-180, 90],
                [180, 90],
                [180, -90],
                [-180, -90]
              ],
              // Hole (서울 박스 - 여기는 투명하게)
              [
                [126.70, 37.40],
                [127.20, 37.40],
                [127.20, 37.70],
                [126.70, 37.70],
                [126.70, 37.40]
              ]
            ]
          }
        }
      });

      map.current.addLayer({
        id: 'seoul-mask-layer',
        type: 'fill',
        source: 'seoul-mask',
        paint: {
          'fill-color': '#808080',
          'fill-opacity': 0.4
        }
      });

      setIsLoaded(true);
      if (onMapLoad && map.current) {
        onMapLoad(map.current);
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // POI 데이터를 GeoJSON으로 변환하여 Source 업데이트
  useEffect(() => {
    if (!map.current || !isLoaded || allPOIs.length === 0) return;

    const mapInstance = map.current;

    // GeoJSON FeatureCollection 생성
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: allPOIs.map(poi => ({
        type: 'Feature',
        id: poi.content_id,
        geometry: {
          type: 'Point',
          coordinates: [poi.lng, poi.lat]
        },
        properties: {
          content_id: poi.content_id,
          title: poi.title,
          content_type_id: poi.content_type_id || '',
          emoji: getPOIEmoji(poi.content_type_id),
          addr1: poi.addr1 || '',
          first_image: poi.first_image || '',
          is_selected: poi.content_id === selectedKTOContentId // 선택 상태를 properties에 추가
        }
      }))
    };

    // Source가 없으면 추가, 있으면 업데이트
    if (!mapInstance.getSource('pois')) {
      mapInstance.addSource('pois', {
        type: 'geojson',
        data: geojson
      });

      // content_type_id별 레이어 설정
      const poiLayers = [
        { id: '12', emoji: '🏛️', name: '관광지', color: '#CC0000', minZoom: 15 },
        { id: '14', emoji: '🎭', name: '문화시설', color: '#008B8B', minZoom: 15 },
        { id: '15', emoji: '🎪', name: '축제공연행사', color: '#CC9900', minZoom: 15 },
        { id: '25', emoji: '🗺️', name: '여행코스', color: '#00A86B', minZoom: 14 },
        { id: '28', emoji: '⚽', name: '레포츠', color: '#228B22', minZoom: 15 },
        { id: '32', emoji: '🏨', name: '숙박', color: '#66BB6A', minZoom: 15 },
        { id: '38', emoji: '🛍️', name: '쇼핑', color: '#C71585', minZoom: 16 },
        { id: '39', emoji: '🍽️', name: '음식점', color: '#FF6347', minZoom: 16 }
      ];

      // 이모지를 Canvas 이미지로 변환하여 등록
      poiLayers.forEach(layer => {
        // 일반 아이콘 (테두리 없음)
        const canvas = document.createElement('canvas');
        const size = 40;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // 흰색 원 배경
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
          ctx.fill();

          // 이모지 그리기
          ctx.font = '24px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(layer.emoji, size / 2, size / 2);

          // Mapbox 이미지로 등록
          mapInstance.addImage(`poi-icon-${layer.id}`, {
            width: size,
            height: size,
            data: ctx.getImageData(0, 0, size, size).data
          });
        }

        // 선택된 아이콘 (테두리 있음)
        const canvasSelected = document.createElement('canvas');
        canvasSelected.width = size;
        canvasSelected.height = size;
        const ctxSelected = canvasSelected.getContext('2d');
        if (ctxSelected) {
          // 테두리 (카테고리 색상)
          ctxSelected.strokeStyle = layer.color;
          ctxSelected.lineWidth = 4;
          ctxSelected.beginPath();
          ctxSelected.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI);
          ctxSelected.stroke();

          // 흰색 원 배경
          ctxSelected.fillStyle = 'white';
          ctxSelected.beginPath();
          ctxSelected.arc(size / 2, size / 2, size / 2 - 3, 0, 2 * Math.PI);
          ctxSelected.fill();

          // 이모지 그리기
          ctxSelected.font = '24px Arial';
          ctxSelected.textAlign = 'center';
          ctxSelected.textBaseline = 'middle';
          ctxSelected.fillText(layer.emoji, size / 2, size / 2);

          // Mapbox 이미지로 등록
          mapInstance.addImage(`poi-icon-${layer.id}-selected`, {
            width: size,
            height: size,
            data: ctxSelected.getImageData(0, 0, size, size).data
          });
        }
      });

      // 각 content_type_id별로 레이어 생성 (아이콘 + 텍스트)
      poiLayers.forEach(layer => {
        mapInstance.addLayer({
          id: `poi-${layer.id}`,
          type: 'symbol',
          source: 'pois',
          filter: ['==', ['get', 'content_type_id'], layer.id],
          minzoom: layer.minZoom,
          layout: {
            'icon-image': [
              'case',
              ['get', 'is_selected'],
              `poi-icon-${layer.id}-selected`,  // 선택된 경우 테두리 있는 아이콘
              `poi-icon-${layer.id}`  // 기본 아이콘
            ],
            'icon-size': [
              'case',
              ['get', 'is_selected'],
              0.8,  // 선택된 경우 2배 크기
              0.4   // 기본 크기
            ],
            'icon-allow-overlap': true,
            'text-field': ['get', 'title'],
            'text-size': 10,
            'text-anchor': 'top',
            'text-offset': [0, 1.2],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold']
          },
          paint: {
            'text-color': layer.color,
            'text-halo-color': '#ffffff',
            'text-halo-width': 2
          }
        });

        // 클릭 이벤트 추가
        mapInstance.on('click', `poi-${layer.id}`, (e) => {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            const contentId = feature.properties?.content_id;
            if (contentId && onKTOPOIClick) {
              onKTOPOIClick(contentId);
            }
          }
        });

        // 마우스 커서 변경
        mapInstance.on('mouseenter', `poi-${layer.id}`, () => {
          mapInstance.getCanvas().style.cursor = 'pointer';
        });
        mapInstance.on('mouseleave', `poi-${layer.id}`, () => {
          mapInstance.getCanvas().style.cursor = '';
        });
      });

    } else {
      (mapInstance.getSource('pois') as mapboxgl.GeoJSONSource).setData(geojson);
    }
  }, [allPOIs, isLoaded, selectedKTOContentId]);

  return (
    <>
      <div
        ref={mapContainer}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
      />
    </>
  );
};

export const clearMarkers = (markers: mapboxgl.Marker[]) => {
  markers.forEach(marker => marker.remove());
  markers.length = 0;
};

export const addMarkers = (
  map: mapboxgl.Map,
  markersArray: mapboxgl.Marker[],
  data: MarkerData[],
  onMarkerClick?: (markerData: MarkerData, index: number) => void
): mapboxgl.LngLatBounds | null => {
  clearMarkers(markersArray);

  if (!data || data.length === 0) return null;

  const bounds = new mapboxgl.LngLatBounds();

  data.forEach((markerData, index) => {
    const el = document.createElement('div');
    el.style.width = '35px';
    el.style.height = '35px';
    el.style.backgroundColor = markerData.color || '#4A90E2';
    el.style.borderRadius = '50%';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.fontSize = '14px';
    el.style.fontWeight = 'bold';
    el.style.color = 'white';
    el.style.cursor = 'pointer';

    if (markerData.rank) {
      el.textContent = String(markerData.rank);
    }

    // 마커 클릭 이벤트
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onMarkerClick) {
        onMarkerClick(markerData, index);
      }
    });

    let popupHtml = '<div style="font-size: 13px; max-width: 250px;">';

    if (markerData.title) {
      popupHtml += `<strong>${markerData.title}</strong><br>`;
    }

    if (markerData.address) {
      popupHtml += `<div style="color: #666; margin-top: 4px;">${markerData.address}</div>`;
    }

    if (markerData.image) {
      popupHtml += `
        <div style="margin-top: 8px;">
          <img src="${markerData.image}"
               style="width: 100%; max-width: 250px; border-radius: 6px;"
               onerror="this.style.display='none'">
        </div>
      `;
    }

    if (markerData.description) {
      popupHtml += `<div style="margin-top: 5px; color: #666;">${markerData.description}</div>`;
    }

    popupHtml += '</div>';

    const marker = new mapboxgl.Marker(el)
      .setLngLat([markerData.lng, markerData.lat])
      .setPopup(new mapboxgl.Popup({ offset: 30 }).setHTML(popupHtml))
      .addTo(map);

    markersArray.push(marker);
    bounds.extend([markerData.lng, markerData.lat]);
  });

  return bounds;
};

export type { MarkerData };
export default Map;
