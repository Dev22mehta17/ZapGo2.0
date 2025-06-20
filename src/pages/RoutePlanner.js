import { useState, useRef, useLayoutEffect } from 'react';
import { FiMapPin, FiNavigation, FiBatteryCharging, FiClock, FiPlayCircle, FiLoader, FiZap, FiTarget, FiThermometer, FiAlertCircle, FiTrendingUp, FiMenu, FiX, FiChevronUp, FiChevronDown, FiFlag, FiMap, FiPlus, FiTrash2 } from 'react-icons/fi';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import Map from '../components/Map';
import SearchBar from '../components/SearchBar';
import toast from 'react-hot-toast';
import { getAllStations } from '../hooks/useFirestore';

const RoutePlanner = () => {
  const { isLoaded, google } = useGoogleMaps();
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routeStops, setRouteStops] = useState([]);
  const [allRouteStations, setAllRouteStations] = useState([]);
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
    setRouteSummary(null);
    setJourneyPlan([]);
    setResultsPanelOpen(true);

    try {
      // 1. Get route
      const directionsService = new google.maps.DirectionsService();
      const routeResult = await directionsService.route({
        origin: origin.geometry.location,
        destination: destination.geometry.location,
        travelMode: google.maps.TravelMode.DRIVING,
      });
      setDirectionsResponse(routeResult);

      const route = routeResult.routes[0];
      const routeLeg = route.legs[0];
      const decodedPolyline = google.maps.geometry.encoding.decodePath(route.overview_polyline);
      
      // 2. Get all stations
      const firestoreStations = (await getAllStations())
        .filter(s => s.location && typeof s.location.lat === 'number')
        .map(s => ({ ...s, source: 'zapgo', id: s.id || s.name + s.location.lat }));
      
      console.log('ZapGo stations found:', firestoreStations.length);
      
      const allCombinedStations = [...firestoreStations];
      setAllRouteStations(allCombinedStations);

      // 3. Find and sort all stations along the route path
      const cumulativeDistances = [0];
      for (let i = 1; i < decodedPolyline.length; i++) {
          cumulativeDistances[i] = cumulativeDistances[i-1] + google.maps.geometry.spherical.computeDistanceBetween(decodedPolyline[i-1], decodedPolyline[i]);
      }

      const stationsAlongRoute = allCombinedStations.map(station => {
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
      
      console.log('ZapGo stations along route:', stationsAlongRoute.length);
      console.log('Route stations:', stationsAlongRoute.map(s => ({ name: s.name, distance: s.distanceAlongRoute, source: s.source })));
      
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
      
      // 4. Build final itinerary with ALL found stations
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
          stations={allRouteStations}
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
                <h3 className="text-lg font-semibold flex items-center">
                  <FiMap className="mr-3 h-5 w-5 text-primary-400" />
                  Stations Along Route
                </h3>
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
