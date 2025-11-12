import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapContainer.css';

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

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map centered on Seoul
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [126.9780, 37.5665],
      zoom: 15,
      pitch: 0,
      bearing: 0,
      language: 'ko'
    });

    // Add Geolocate control (hidden from UI)
    geolocateControl.current = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserLocation: true
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

  return <div ref={mapContainer} className="map-container" />;
}
