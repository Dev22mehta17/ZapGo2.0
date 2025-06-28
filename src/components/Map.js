import { useState, useEffect, useCallback, useMemo } from 'react';
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
const intermediateIcon = {
  url: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
  scaledSize: { width: 35, height: 35 },
};

const Map = ({ center = defaultCenter, zoom = defaultZoom, stations = [], onStationSelect, directionsResponse, routeStops = [], mapPadding }) => {
  const [map, setMap] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [mapCenter, setMapCenter] = useState(center);
  const { isLoaded, loadError, google } = useGoogleMaps();

  const mapOptions = useMemo(() => ({
    disableDefaultUI: true,
    zoomControl: true,
    clickableIcons: false,
    styles: [
        {
            "featureType": "all",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#ffffff"
                }
            ]
        },
        {
            "featureType": "all",
            "elementType": "labels.text.stroke",
            "stylers": [
                {
                    "color": "#000000"
                },
                {
                    "lightness": 13
                }
            ]
        },
        {
            "featureType": "administrative",
            "elementType": "geometry.fill",
            "stylers": [
                {
                    "color": "#000000"
                }
            ]
        },
        {
            "featureType": "administrative",
            "elementType": "geometry.stroke",
            "stylers": [
                {
                    "color": "#144b53"
                },
                {
                    "lightness": 14
                },
                {
                    "weight": 1.4
                }
            ]
        },
        {
            "featureType": "landscape",
            "elementType": "all",
            "stylers": [
                {
                    "color": "#08304b"
                }
            ]
        },
        {
            "featureType": "poi",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#0c4152"
                },
                {
                    "lightness": 5
                }
            ]
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry.fill",
            "stylers": [
                {
                    "color": "#000000"
                }
            ]
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry.stroke",
            "stylers": [
                {
                    "color": "#0b434f"
                },
                {
                    "lightness": 25
                }
            ]
        },
        {
            "featureType": "road.arterial",
            "elementType": "geometry.fill",
            "stylers": [
                {
                    "color": "#000000"
                }
            ]
        },
        {
            "featureType": "road.arterial",
            "elementType": "geometry.stroke",
            "stylers": [
                {
                    "color": "#0b3d51"
                },
                {
                    "lightness": 16
                }
            ]
        },
        {
            "featureType": "road.local",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#000000"
                }
            ]
        },
        {
            "featureType": "transit",
            "elementType": "all",
            "stylers": [
                {
                    "color": "#146474"
                }
            ]
        },
        {
            "featureType": "water",
            "elementType": "all",
            "stylers": [
                {
                    "color": "#021019"
                }
            ]
        }
    ],
    padding: mapPadding,
  }), [mapPadding]);

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
    <div className="relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
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
              icon={station.isRegistered ? zapgoIcon : intermediateIcon}
              onClick={() => handleStationClick(station)}
              title={`${station.name}${station.isRegistered ? ' (ZapGo Station)' : ' (Intermediate City)'}`}
            />
          ))}

        {/* Route Stops Markers (start, end, charging stops, intermediate cities) */}
        {routeStops.map((stop, idx) => (
          <Marker
            key={`stop-${idx}`}
            position={{ lat: stop.lat, lng: stop.lng }}
            icon={
              stop.type === 'start'
                ? startIcon
                : stop.type === 'end'
                ? endIcon
                : stop.type === 'charging'
                ? electricIcon
                : stop.type === 'intermediate'
                ? intermediateIcon
                : electricIcon
            }
            title={`${stop.name}${stop.isRegistered ? ' (ZapGo Station)' : ' (Intermediate City)'}`}
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
            <div className="p-4 text-gray-800 min-w-[280px] max-w-[320px]">
              <h3 className="font-semibold text-lg mb-3 text-gray-900">{selectedStation.name}</h3>
              <div className="space-y-2">
                <p className="text-sm mb-2">
                  <span className="font-bold text-gray-700">Type:</span> 
                  <span className={`ml-1 font-bold ${selectedStation.isRegistered ? 'text-green-600' : 'text-blue-600'}`}>
                    {selectedStation.isRegistered ? 'ZapGo Station' : 'Intermediate City'}
                  </span>
                </p>
                {selectedStation.isRegistered && (
                  <>
                    {selectedStation.source === 'google' && selectedStation.rating && (
                      <p className="text-sm">
                        <span className="font-bold text-gray-700">Rating:</span> 
                        <span className="ml-1 text-gray-600">⭐ {selectedStation.rating}/5 ({selectedStation.user_ratings_total} reviews)</span>
                      </p>
                    )}
                    {selectedStation.status && (
                      <p className="text-sm">
                        <span className="font-bold text-gray-700">Status:</span> 
                        <span className={`ml-1 font-bold ${
                          selectedStation.status === 'available' ? 'text-green-600' :
                          selectedStation.status === 'busy' ? 'text-red-600' :
                          'text-gray-500'
                        }`}>{selectedStation.status?.charAt(0).toUpperCase() + selectedStation.status?.slice(1)}</span>
                      </p>
                    )}
                    {selectedStation.totalPorts && (
                      <p className="text-sm">
                        <span className="font-bold text-gray-700">Total Ports:</span> 
                        <span className="ml-1 text-gray-600">{selectedStation.totalPorts ?? 'N/A'}</span>
                      </p>
                    )}
                    {selectedStation.availableSlots && (
                      <p className="text-sm">
                        <span className="font-bold text-gray-700">Available Slots:</span> 
                        <span className="ml-1 text-gray-600">{selectedStation.availableSlots ?? 'N/A'}</span>
                      </p>
                    )}
                  </>
                )}
                {!selectedStation.isRegistered && (
                  <p className="text-sm text-blue-600 font-medium">
                    This is an intermediate city along your route. ZapGo stations may be available here in the future.
                  </p>
                )}
                {selectedStation.location.address && (
                  <p className="text-sm mt-3 text-gray-600 border-t pt-2">{selectedStation.location.address}</p>
                )}
                {selectedStation.distanceAlongRoute && (
                  <p className="text-sm">
                    <span className="font-bold text-gray-700">Distance along route:</span> 
                    <span className="ml-1 text-gray-600">{selectedStation.distanceAlongRoute.toFixed(1)} km</span>
                  </p>
                )}
              </div>
              {selectedStation.isRegistered && selectedStation.source !== 'google' && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <Link
                    to={`/station/${selectedStation.id}`}
                    className="inline-block px-4 py-2 bg-primary-600 text-white text-sm font-bold rounded-md hover:bg-primary-700 transition-colors"
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
      
      {/* Map Legend */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Legend</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center">
            <img src={startIcon.url} alt="Start" className="w-4 h-4 mr-2" />
            <span className="text-gray-700">Start Point</span>
          </div>
          <div className="flex items-center">
            <img src={endIcon.url} alt="End" className="w-4 h-4 mr-2" />
            <span className="text-gray-700">End Point</span>
          </div>
          <div className="flex items-center">
            <img src={zapgoIcon.url} alt="ZapGo" className="w-4 h-4 mr-2" />
            <span className="text-gray-700">ZapGo Station</span>
          </div>
          <div className="flex items-center">
            <img src={intermediateIcon.url} alt="Intermediate" className="w-4 h-4 mr-2" />
            <span className="text-gray-700">Intermediate City</span>
          </div>
          <div className="flex items-center">
            <img src={electricIcon.url} alt="Charging" className="w-4 h-4 mr-2" />
            <span className="text-gray-700">Charging Stop</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map;