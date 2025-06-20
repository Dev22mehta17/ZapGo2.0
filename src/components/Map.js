import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import { Link } from 'react-router-dom';
import { defaultCenter, defaultZoom } from '../config/googleMaps';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

const electricIcon = {
  url: 'https://i.ibb.co/WGHKvFP/Untitled-design-4.png',
  scaledSize: { width: 40, height: 40 },
};
const startIcon = {
  url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
  scaledSize: { width: 40, height: 40 },
};
const endIcon = {
  url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
  scaledSize: { width: 40, height: 40 },
};
const zapgoIcon = {
  url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
  scaledSize: { width: 40, height: 40 },
};
const googleIcon = {
  url: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
  scaledSize: { width: 40, height: 40 },
};

const getMarkerIcon = (status, google) => {
  if (!google) return null;
  const icons = {
    available: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
    busy: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
    offline: 'http://maps.google.com/mapfiles/ms/icons/grey-dot.png',
  };
  return {
    url: icons[status] || icons.offline,
    scaledSize: new google.maps.Size(40, 40),
  };
};

const Map = ({ center = defaultCenter, zoom = defaultZoom, stations = [], onStationSelect, directionsResponse, routeStops = [] }) => {
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
    height: '400px',
  };

  console.log('Map stations:', stations);

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
      {/* Station Markers */}
      {stations
        .filter(station => station.location && typeof station.location.lat === 'number' && typeof station.location.lng === 'number')
        .map((station) => (
          <Marker
            key={station.id}
            position={{
              lat: station.location.lat,
              lng: station.location.lng,
            }}
            icon={station.source === 'google' ? googleIcon : zapgoIcon}
            onClick={() => handleStationClick(station)}
          />
        ))}

      {/* Route Stops Markers (start, end, charging stops) */}
      {routeStops.map((stop, idx) => (
        <Marker
          key={`stop-${idx}`}
          position={{ lat: stop.lat, lng: stop.lng }}
          icon={
            stop.type === 'start'
              ? startIcon
              : stop.type === 'end'
              ? endIcon
              : electricIcon
          }
          title={stop.name}
        />
      ))}

      {selectedStation && selectedStation.location && (
        <InfoWindow
          position={{
            lat: selectedStation.location.lat,
            lng: selectedStation.location.lng,
          }}
          onCloseClick={() => setSelectedStation(null)}
        >
          <div className="p-2 text-gray-800">
            <h3 className="font-semibold text-lg mb-2">{selectedStation.name}</h3>
            <p className="text-sm mb-1">
              <span className="font-bold">Source:</span> {selectedStation.source === 'google' ? 'Google Maps' : 'ZapGo'}
            </p>
            {selectedStation.status && (
              <p className="text-sm">
                Status: <span className={`font-bold ${
                  selectedStation.status === 'available' ? 'text-green-600' :
                  selectedStation.status === 'busy' ? 'text-red-600' :
                  'text-gray-500'
                }`}>{selectedStation.status?.charAt(0).toUpperCase() + selectedStation.status?.slice(1)}</span>
              </p>
            )}
            {selectedStation.totalPorts && (
              <p className="text-sm">
                Total Ports: {selectedStation.totalPorts ?? 'N/A'}
              </p>
            )}
            {selectedStation.availableSlots && (
              <p className="text-sm">
                Available Slots: {selectedStation.availableSlots ?? 'N/A'}
              </p>
            )}
            {selectedStation.location.address && (
              <p className="text-sm mt-1">{selectedStation.location.address}</p>
            )}
            {selectedStation.source !== 'google' && (
              <div className="mt-3">
                <Link
                  to={`/station/${selectedStation.id}`}
                  className="inline-block px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-md hover:bg-primary-700 transition-colors"
                >
                  Book Now
                </Link>
              </div>
            )}
          </div>
        </InfoWindow>
      )}

      {directionsResponse && <DirectionsRenderer directions={directionsResponse} />}
    </GoogleMap>
  );
};

export default Map; 