import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import { defaultCenter, defaultZoom } from '../config/googleMaps';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

const Map = ({ center = defaultCenter, zoom = defaultZoom, stations = [], onStationSelect, directionsResponse }) => {
  const [map, setMap] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [mapCenter, setMapCenter] = useState(center);
  const { isLoaded, loadError, google } = useGoogleMaps();

  useEffect(() => {
    if (map && center && typeof center.lat === 'number' && typeof center.lng === 'number') {
      map.panTo(center);
      setMapCenter(center);
    }
  }, [map, center]);

  const handleStationClick = (station) => {
    setSelectedStation(station);
    if (onStationSelect) {
      onStationSelect(station);
    }
  };

  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const mapContainerStyle = {
    width: '100%',
    height: '400px'
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-gray-100">
        <p className="text-red-600">Error loading maps: {loadError.message}</p>
      </div>
    );
  }

  if (!isLoaded || !google) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={mapCenter}
      zoom={zoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
      }}
    >
      {stations
        .filter(station => station.location && typeof station.location.lat === 'number' && typeof station.location.lng === 'number')
        .map((station) => (
        <Marker
          key={station.id}
          position={{
            lat: station.location.lat,
            lng: station.location.lng
          }}
          onClick={() => handleStationClick(station)}
        />
      ))}

      {selectedStation && (
        <InfoWindow
          position={{
            lat: selectedStation.location.lat,
            lng: selectedStation.location.lng
          }}
          onCloseClick={() => setSelectedStation(null)}
        >
          <div className="p-2">
            <h3 className="font-semibold">{selectedStation.name}</h3>
            <p className="text-sm text-gray-600">{selectedStation.location.address}</p>
            <p className="text-sm text-gray-600">
              Available slots: {selectedStation.availableSlots}
            </p>
          </div>
        </InfoWindow>
      )}

      {directionsResponse && <DirectionsRenderer directions={directionsResponse} />}
    </GoogleMap>
  );
};

export default Map; 