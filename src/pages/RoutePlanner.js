import { useState, useRef, useLayoutEffect } from 'react';
import { FiMapPin, FiNavigation, FiBatteryCharging, FiClock, FiPlayCircle, FiLoader, FiZap, FiTarget, FiThermometer, FiAlertCircle, FiTrendingUp, FiMenu, FiX, FiChevronUp, FiChevronDown, FiFlag, FiMap, FiPlus, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { getAllStations } from '../hooks/useFirestore';
import Map from '../components/Map';
import SearchBar from '../components/SearchBar';
import toast from 'react-hot-toast';

const RoutePlanner = () => {
  const { isLoaded, google } = useGoogleMaps();
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routeStops, setRouteStops] = useState([]);
  const [allRouteStations, setAllRouteStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resultsPanelOpen, setResultsPanelOpen] = useState(true);
  const [mapPadding, setMapPadding] = useState({ bottom: 0 });
  const [journeyPlan, setJourneyPlan] = useState([]);
  const [vehicleConfig, setVehicleConfig] = useState({
    currentCharge: 80,
    finalCharge: 20,
    maxRange: 300
  });
  const [routeOptions, setRouteOptions] = useState({
    avoidHighways: false,
    avoidTolls: false,
    routeType: 'fastest' // 'fastest', 'shortest', 'avoidHighways'
  });
  const resultsPanelRef = useRef(null);

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setVehicleConfig(prev => ({ ...prev, [name]: Number(value) }));
  };

  const planRoute = async () => {
    if (!origin || !destination) {
      toast.error("Please select an origin and a destination.");
      return;
    }
    setLoading(true);
    // Reset states
    setDirectionsResponse(null);
    setRouteStops([]);
    setAllRouteStations([]);
    setFilteredStations([]);
    setRouteSummary(null);
    setJourneyPlan([]);
    setResultsPanelOpen(true);

    try {
      // 1. Get route
      const directionsService = new google.maps.DirectionsService();
      
      // Configure route request based on options
      const routeRequest = {
        origin: origin.geometry.location,
        destination: destination.geometry.location,
        travelMode: google.maps.TravelMode.DRIVING,
      };

      // Add route options
      if (routeOptions.avoidHighways) {
        routeRequest.avoidHighways = true;
      }
      if (routeOptions.avoidTolls) {
        routeRequest.avoidTolls = true;
      }

      // For shortest distance, we'll try multiple route strategies
      let routeResult;
      if (routeOptions.routeType === 'shortest') {
        // Try different route strategies to find the shortest one
        const routeStrategies = [
          { avoidHighways: true, avoidTolls: false },
          { avoidHighways: true, avoidTolls: true },
          { avoidHighways: false, avoidTolls: true },
          { avoidHighways: false, avoidTolls: false }
        ];

        let shortestRoute = null;
        let shortestDistance = Infinity;

        for (const strategy of routeStrategies) {
          try {
            const testRequest = {
              origin: origin.geometry.location,
              destination: destination.geometry.location,
              travelMode: google.maps.TravelMode.DRIVING,
              ...strategy
            };

            const testResult = await directionsService.route(testRequest);
            const totalDistance = testResult.routes[0].legs.reduce((sum, leg) => sum + leg.distance.value, 0);

            if (totalDistance < shortestDistance) {
              shortestDistance = totalDistance;
              shortestRoute = testResult;
            }
          } catch (error) {
            console.warn('Route strategy failed:', strategy, error);
            // Continue with next strategy
          }
        }

        routeResult = shortestRoute || await directionsService.route(routeRequest);
      } else {
        routeResult = await directionsService.route(routeRequest);
      }

      setDirectionsResponse(routeResult);

      const route = routeResult.routes[0];
      const routeLeg = route.legs[0];
      const decodedPolyline = google.maps.geometry.encoding.decodePath(route.overview_polyline);
      
      // 2. Get ZapGo stations
      const allFirestoreStations = await getAllStations();
      console.log('All raw stations from database:', allFirestoreStations);
      
      const firestoreStations = allFirestoreStations
        .filter(s => {
          // Check if station has valid location data
          if (!s.location) {
            console.warn('Station missing location:', s);
            return false;
          }
          
          // Handle different location formats
          if (typeof s.location.lat === 'number' && typeof s.location.lng === 'number') {
            return true;
          } else if (s.location.latitude && s.location.longitude) {
            return true;
          } else if (Array.isArray(s.location) && s.location.length >= 2) {
            return true;
          } else {
            console.warn('Station has invalid location format:', s);
            return false;
          }
        })
        .map(s => {
          // Normalize location format
          let lat, lng;
          if (typeof s.location.lat === 'number' && typeof s.location.lng === 'number') {
            lat = s.location.lat;
            lng = s.location.lng;
          } else if (s.location.latitude && s.location.longitude) {
            lat = s.location.latitude;
            lng = s.location.longitude;
          } else if (Array.isArray(s.location) && s.location.length >= 2) {
            lat = s.location[0];
            lng = s.location[1];
          }
          
          return { 
            ...s, 
            source: 'zapgo', 
            id: s.id || s.name + lat + lng,
            location: { lat, lng }
          };
        });
      
      console.log('All ZapGo stations found:', firestoreStations.length);
      console.log('ZapGo stations:', firestoreStations.map(s => ({ name: s.name, lat: s.location.lat, lng: s.location.lng })));
      
      // 3. Get stations along the route path (not within radius)
      const routePath = route.overview_path;
      const routeStations = await getStationsAlongRoute(routePath);
      setFilteredStations(routeStations);
      
      // 4. Find and sort all stations along the route path
      const cumulativeDistances = [0];
      for (let i = 1; i < decodedPolyline.length; i++) {
          cumulativeDistances[i] = cumulativeDistances[i-1] + google.maps.geometry.spherical.computeDistanceBetween(decodedPolyline[i-1], decodedPolyline[i]);
      }

      const stationsAlongRoute = routeStations.map(station => {
          const stationLatLng = new google.maps.LatLng(station.location.lat, station.location.lng);
          let closestPointIndex = 0;
          let minDistance = Infinity;

          decodedPolyline.forEach((point, index) => {
              const distance = google.maps.geometry.spherical.computeDistanceBetween(stationLatLng, point);
              if (distance < minDistance) {
                  minDistance = distance;
                  closestPointIndex = index;
              }
          });
          
          if (minDistance > 25000) return null; // Max 25km detour

          return {
              ...station,
              type: 'charging',
              distanceAlongRoute: cumulativeDistances[closestPointIndex] / 1000,
          };
      }).filter(Boolean).sort((a, b) => a.distanceAlongRoute - b.distanceAlongRoute);
      
      console.log('Total stations along route:', stationsAlongRoute.length);
      console.log('Route stations:', stationsAlongRoute.map(s => ({ name: s.name, distance: s.distanceAlongRoute })));
      
      // Calculate which stations are reachable with current charge
      const currentRangeKm = (vehicleConfig.currentCharge / 100) * vehicleConfig.maxRange;
      const finalRangeKm = (vehicleConfig.finalCharge / 100) * vehicleConfig.maxRange;
      const totalRouteDistanceKm = routeLeg.distance.value / 1000;
      
      const reachableStations = stationsAlongRoute.map(station => {
        const distanceFromStart = station.distanceAlongRoute;
        const distanceToDestination = totalRouteDistanceKm - distanceFromStart;
        const isReachable = distanceFromStart <= currentRangeKm;
        const remainingRangeAfterStop = currentRangeKm - distanceFromStart;
        const needsChargingToReachDestination = distanceToDestination > finalRangeKm;
        
        let recommendation = '';
        if (!isReachable) {
          recommendation = 'Not reachable with current charge';
        } else if (needsChargingToReachDestination) {
          recommendation = 'Recommended to charge here (needed for destination)';
        } else if (remainingRangeAfterStop < 50) {
          recommendation = 'Recommended to charge here (low remaining range)';
        } else {
          recommendation = 'Optional stop';
        }
        
        return {
          ...station,
          isReachable,
          remainingRangeAfterStop,
          needsChargingToReachDestination,
          recommendation
        };
      });
      
      console.log('Reachable stations:', reachableStations.filter(s => s.isReachable).length);
      
      // 5. Build final itinerary with ALL found stations
      const finalItinerary = [
          { type: 'origin', name: origin.name || routeLeg.start_address, address: routeLeg.start_address },
          ...reachableStations,
          { type: 'destination', name: destination.name || routeLeg.end_address, address: routeLeg.end_address }
      ];
      setJourneyPlan(finalItinerary);
      
      const finalRouteStops = [
          { lat: origin.geometry.location.lat(), lng: origin.geometry.location.lng(), name: 'Start', type: 'start' },
          ...reachableStations.map(s => ({ lat: s.location.lat, lng: s.location.lng, name: s.name, type: 'charging' })),
          { lat: destination.geometry.location.lat(), lng: destination.geometry.location.lng(), name: 'End', 'type': 'end' }
      ];
      setRouteStops(finalRouteStops);
      setRouteSummary({ distance: routeLeg.distance.text, duration: routeLeg.duration.text });

    } catch (error) {
        console.error("Route planning error:", error);
        toast.error("An error occurred during route planning.");
    } finally {
        setLoading(false);
    }
  };

  // Function to get ZapGo stations along the route
  const getStationsAlongRoute = async (routePath) => {
    try {
      const allStations = await getAllStations();
      console.log('Raw stations from database:', allStations);
      
      // Filter stations to only those along the route path
      return allStations.filter(station => {
        // Check if station has valid location data
        if (!station.location) {
          console.warn('Station missing location:', station);
          return false;
        }
        
        // Handle different location formats
        let lat, lng;
        if (typeof station.location.lat === 'number' && typeof station.location.lng === 'number') {
          lat = station.location.lat;
          lng = station.location.lng;
        } else if (station.location.latitude && station.location.longitude) {
          lat = station.location.latitude;
          lng = station.location.longitude;
        } else if (Array.isArray(station.location) && station.location.length >= 2) {
          lat = station.location[0];
          lng = station.location[1];
        } else {
          console.warn('Station has invalid location format:', station);
          return false;
        }
        
        const stationLatLng = new google.maps.LatLng(lat, lng);
        return isPointAlongPath(stationLatLng, routePath, 5000); // 5km tolerance
      });
    } catch (error) {
      console.error('Error fetching ZapGo stations along route:', error);
      return [];
    }
  };

  // Function to check if a point is along a path
  const isPointAlongPath = (point, path, toleranceMeters = 5000) => {
    if (!path || path.length < 2) return false;
    
    for (let i = 0; i < path.length - 1; i++) {
      const segmentStart = path[i];
      const segmentEnd = path[i + 1];
      
      // Calculate distance from point to line segment
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        point,
        new google.maps.LatLng(
          (segmentStart.lat() + segmentEnd.lat()) / 2,
          (segmentStart.lng() + segmentEnd.lng()) / 2
        )
      );
      
      if (distance <= toleranceMeters) {
        return true;
      }
    }
    return false;
  };

  useLayoutEffect(() => {
    if (routeSummary && resultsPanelRef.current) {
      const panelHeight = resultsPanelRef.current.offsetHeight;
      setMapPadding({ bottom: panelHeight });
    } else {
      setMapPadding({ bottom: 0 });
    }
  }, [routeSummary, resultsPanelOpen, resultsPanelRef]);

  return (
    <div className="h-screen-minus-nav bg-slate-900 text-white flex relative">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-24 left-4 z-50 bg-slate-800/90 backdrop-blur-lg p-3 rounded-xl border border-slate-700 shadow-lg"
      >
        {sidebarOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
      </button>

      {/* Left Control Panel */}
      <aside className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 lg:static lg:z-10
        fixed top-0 left-0 h-full w-80 max-w-[85vw] 
        bg-slate-900/95 backdrop-blur-lg border-r border-slate-700 z-40 
        transition-transform duration-300 ease-in-out
        flex flex-col lg:w-96
      `}>
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FiZap className="text-primary-500 h-8 w-8 mr-3" />
              <h1 className="text-2xl font-bold">Route Planner</h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Origin</label>
              <SearchBar
                placeholder="Enter starting point..."
                onPlaceSelected={setOrigin}
                selectedPlace={origin}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Destination</label>
              <SearchBar
                placeholder="Enter destination..."
                onPlaceSelected={setDestination}
                selectedPlace={destination}
              />
            </div>
          </div>

          {/* Vehicle Settings */}
          <div className="bg-slate-800/50 rounded-xl p-4 space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <FiZap className="mr-2 h-5 w-5 text-primary-400" />
              Vehicle Settings
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Current Charge (%)</label>
                <input
                  type="number"
                  name="currentCharge"
                  min="0"
                  max="100"
                  value={vehicleConfig.currentCharge}
                  onChange={handleConfigChange}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Final Charge (%)</label>
                <input
                  type="number"
                  name="finalCharge"
                  min="0"
                  max="100"
                  value={vehicleConfig.finalCharge}
                  onChange={handleConfigChange}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Max Range (km)</label>
                <input
                  type="number"
                  name="maxRange"
                  min="50"
                  max="1000"
                  value={vehicleConfig.maxRange}
                  onChange={handleConfigChange}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Route Options */}
          <div className="bg-slate-800/50 rounded-xl p-4 space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <FiNavigation className="mr-2 h-5 w-5 text-primary-400" />
              Route Options
            </h3>
            <div className="space-y-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={routeOptions.avoidHighways}
                  onChange={(e) => setRouteOptions(prev => ({ ...prev, avoidHighways: e.target.checked }))}
                  className="mr-3 h-4 w-4 text-primary-600 bg-slate-700 border-slate-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-slate-300">Avoid Highways</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={routeOptions.avoidTolls}
                  onChange={(e) => setRouteOptions(prev => ({ ...prev, avoidTolls: e.target.checked }))}
                  className="mr-3 h-4 w-4 text-primary-600 bg-slate-700 border-slate-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-slate-300">Avoid Tolls</span>
              </label>
            </div>
            <div className="pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-400 mb-2">Route Type:</p>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="routeType"
                    value="fastest"
                    checked={routeOptions.routeType === 'fastest'}
                    onChange={(e) => setRouteOptions(prev => ({ ...prev, routeType: e.target.value }))}
                    className="mr-3 h-4 w-4 text-primary-600 bg-slate-700 border-slate-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-300">Fastest Route (Default)</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="routeType"
                    value="shortest"
                    checked={routeOptions.routeType === 'shortest'}
                    onChange={(e) => setRouteOptions(prev => ({ ...prev, routeType: e.target.value }))}
                    className="mr-3 h-4 w-4 text-primary-600 bg-slate-700 border-slate-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-300">Shortest Distance</span>
                </label>
              </div>
            </div>
          </div>

          <button
            onClick={planRoute}
            disabled={loading || !origin || !destination}
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold py-3 px-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <><FiLoader className="animate-spin h-5 w-5 mr-2" /> Planning...</>
            ) : (
              <><FiPlayCircle className="h-5 w-5 mr-2" /> Plan Route</>
            )}
          </button>
        </div>
      </aside>

      {/* Map Section */}
      <main className="flex-1 relative">
        <Map
          stations={filteredStations}
          directionsResponse={directionsResponse}
          routeStops={routeStops}
          zoom={5}
          mapPadding={mapPadding}
        />

        {/* Floating Results Panel */}
        {routeSummary && (
          <div ref={resultsPanelRef} className="absolute bottom-0 left-0 right-0 p-4 z-10">
            <div className="max-w-4xl mx-auto bg-slate-800/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
              <button 
                onClick={() => setResultsPanelOpen(!resultsPanelOpen)}
                className="w-full p-4 flex justify-between items-center cursor-pointer hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center">
                  <h3 className="text-lg font-semibold flex items-center">
                    <FiMap className="mr-3 h-5 w-5 text-primary-400" />
                    Stations Along Route
                  </h3>
                  <div className="ml-4 flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Route:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      routeOptions.routeType === 'shortest' 
                        ? 'bg-blue-500/20 text-blue-300' 
                        : 'bg-green-500/20 text-green-300'
                    }`}>
                      {routeOptions.routeType === 'shortest' ? 'Shortest Distance' : 'Fastest Route'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2 text-sm">
                    <FiMapPin className="text-slate-400"/>
                    <span>{routeSummary.distance}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <FiClock className="text-slate-400"/>
                    <span>{routeSummary.duration}</span>
                  </div>
                  {resultsPanelOpen ? <FiChevronDown className="h-6 w-6" /> : <FiChevronUp className="h-6 w-6" />}
                </div>
              </button>

              {resultsPanelOpen && (
                <div className="p-6 bg-slate-800/50 max-h-[40vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-semibold text-white">Journey Steps</h4>
                    <button
                      onClick={planRoute}
                      disabled={loading}
                      className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {loading ? (
                        <><FiLoader className="animate-spin h-4 w-4 mr-1" /> Replanning...</>
                      ) : (
                        <><FiRefreshCw className="h-4 w-4 mr-1" /> Replan Route</>
                      )}
                    </button>
                  </div>
                  <div className="space-y-4">
                    {journeyPlan.map((step, index) => (
                      <JourneyStep key={index} step={step} index={index} isLast={index === journeyPlan.length - 1} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

// A new component to render each step of the journey for clarity
const JourneyStep = ({ step, index, isLast }) => {
    let icon;
    let titleColor = 'text-white';
    let bgColor = 'bg-slate-700/50';
    
    switch (step.type) {
        case 'origin':
            icon = <FiFlag className="text-green-400" />;
            titleColor = 'text-green-400';
            bgColor = 'bg-green-900/20';
            break;
        case 'charging':
            if (step.isReachable) {
                icon = <FiZap className="text-yellow-400" />;
                titleColor = 'text-yellow-400';
                if (step.needsChargingToReachDestination) {
                    bgColor = 'bg-red-900/20';
                    titleColor = 'text-red-400';
                } else if (step.remainingRangeAfterStop < 50) {
                    bgColor = 'bg-orange-900/20';
                } else {
                    bgColor = 'bg-yellow-900/20';
                }
            } else {
                icon = <FiZap className="text-red-400" />;
                titleColor = 'text-red-400';
                bgColor = 'bg-red-900/20';
            }
            break;
        case 'destination':
            icon = <FiMapPin className="text-red-400" />;
            titleColor = 'text-red-400';
            bgColor = 'bg-red-900/20';
            break;
        default:
            icon = <FiMapPin />;
    }

    return (
        <div className="flex">
            <div className="flex flex-col items-center mr-4">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-slate-700 ${titleColor}`}>
                    {icon}
                </div>
                {!isLast && <div className="w-px h-full bg-slate-600" />}
            </div>
            <div className={`${bgColor} rounded-lg p-4 w-full border border-slate-600`}>
                <h4 className={`font-semibold ${titleColor}`}>{step.name}</h4>
                <p className="text-slate-400 text-sm">{step.address}</p>
                {step.type === 'charging' && (
                    <div className="mt-2 text-xs">
                        <p className={`${step.isReachable ? 'text-green-400' : 'text-red-400'}`}>
                            {step.recommendation}
                        </p>
                        {step.isReachable && (
                            <p className="text-slate-300">
                                Distance: {step.distanceAlongRoute.toFixed(1)}km | 
                                Remaining range: {step.remainingRangeAfterStop.toFixed(1)}km
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default RoutePlanner; 
