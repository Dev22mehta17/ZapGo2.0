import { useState, useRef, useLayoutEffect } from 'react';
import { FiMapPin, FiNavigation, FiBatteryCharging, FiClock, FiPlayCircle, FiLoader, FiZap, FiTarget, FiThermometer, FiAlertCircle, FiTrendingUp, FiMenu, FiX, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import Map from '../components/Map';
import SearchBar from '../components/SearchBar';
import toast from 'react-hot-toast';
import { getAllStations } from '../hooks/useFirestore';

// Helper to fetch public charging stations along the route
async function fetchPublicStationsAlongRoute(google, decodedPolyline) {
  const service = new google.maps.places.PlacesService(document.createElement('div'));
  const bounds = new google.maps.LatLngBounds();
  decodedPolyline.forEach(point => bounds.extend(point));

  return new Promise((resolve) => {
    service.nearbySearch({
      bounds,
      type: 'electric_vehicle_charging_station'
    }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        resolve(results);
      } else {
        resolve([]);
      }
    });
  });
}

const RoutePlanner = () => {
  const { isLoaded, google } = useGoogleMaps();
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [routeDetails, setRouteDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vehicleConfig, setVehicleConfig] = useState({
    currentCharge: 25,
    maxRange: 250,
    targetCharge: 75,
    startTime: '09:00'
  });
  const [routeStops, setRouteStops] = useState([]);
  const [allRouteStations, setAllRouteStations] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resultsPanelOpen, setResultsPanelOpen] = useState(true);
  const [mapPadding, setMapPadding] = useState({ bottom: 0 });
  const resultsPanelRef = useRef(null);

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setVehicleConfig(prev => ({ ...prev, [name]: value ? Number(value) : value }));
  };

  const planRoute = async () => {
    if (!origin || !destination) {
      toast.error("Please select both origin and destination.");
      return;
    }
    setLoading(true);
    setRouteDetails([]);
    setDirectionsResponse(null);
    setRouteStops([]);
    setAllRouteStations([]);
    setRouteSummary(null);
    setResultsPanelOpen(true);

    try {
      const directionsService = new google.maps.DirectionsService();
      const routeResult = await directionsService.route({
        origin: origin.geometry.location,
        destination: destination.geometry.location,
        travelMode: google.maps.TravelMode.DRIVING,
      });
      setDirectionsResponse(routeResult);

      const routeLeg = routeResult.routes[0].legs[0];
      
      const allStations = await getAllStations();
      const routePolyline = routeResult.routes[0].overview_polyline;
      const decodedPolyline = google.maps.geometry.encoding.decodePath(routePolyline);

      const firestoreStations = allStations.filter(station => {
        return station.location && typeof station.location.lat === 'number' && typeof station.location.lng === 'number';
      }).map(s => ({ ...s, source: 'zapgo', id: s.id || s.name + s.location.lat + s.location.lng }));

      const publicStations = await fetchPublicStationsAlongRoute(google, decodedPolyline);
      const googleStations = publicStations.filter(p => {
        const name = p.name ? p.name.toLowerCase() : '';
        return name.includes('charge') || name.includes('charging') || name.includes('ev') || name.includes('electric') || name.includes('plug');
      }).map(p => ({
        id: p.place_id, name: p.name, location: { lat: p.geometry.location.lat(), lng: p.geometry.location.lng(), address: p.vicinity },
        source: 'google', status: 'available', availableSlots: 1
      }));
      
      const allCombinedStations = [...firestoreStations];
      googleStations.forEach(gs => {
        if (!firestoreStations.some(fs => Math.abs(fs.location.lat - gs.location.lat) < 0.0001 && Math.abs(fs.location.lng - gs.location.lng) < 0.0001)) {
          allCombinedStations.push(gs);
        }
      });

      setAllRouteStations(allCombinedStations);

      let usedStationIds = new Set();
      let currentRange = (vehicleConfig.currentCharge / 100) * vehicleConfig.maxRange;
      let distanceCovered = 0;
      let calculatedStops = [];
      let journeyStartTime = new Date();
      const [hours, minutes] = vehicleConfig.startTime.split(':');
      journeyStartTime.setHours(hours, minutes, 0, 0);

      while (distanceCovered < routeLeg.distance.value / 1000) {
        if (currentRange >= ((routeLeg.distance.value / 1000) - distanceCovered)) {
          distanceCovered = (routeLeg.distance.value / 1000);
          continue;
        }
        const currentPointOnRoute = decodedPolyline[Math.floor(decodedPolyline.length * (distanceCovered / (routeLeg.distance.value / 1000)))];
        let reachableStations = allCombinedStations
          .filter(s => {
            const distToStation = google.maps.geometry.spherical.computeDistanceBetween(currentPointOnRoute, new google.maps.LatLng(s.location.lat, s.location.lng)) / 1000;
            return distToStation < currentRange && s.status === 'available' && s.availableSlots > 0 && !usedStationIds.has(s.id);
          })
          .sort((a, b) => {
            const distA = google.maps.geometry.spherical.computeDistanceBetween(currentPointOnRoute, new google.maps.LatLng(a.location.lat, a.location.lng));
            const distB = google.maps.geometry.spherical.computeDistanceBetween(currentPointOnRoute, new google.maps.LatLng(b.location.lat, b.location.lng));
            return distB - distA;
          });
        if (reachableStations.length === 0) {
          break;
        }
        const nextStop = reachableStations[0];
        usedStationIds.add(nextStop.id);
        const distToStop = google.maps.geometry.spherical.computeDistanceBetween(currentPointOnRoute, new google.maps.LatLng(nextStop.location.lat, nextStop.location.lng)) / 1000;
        const chargeNeeded = ((vehicleConfig.targetCharge / 100) * vehicleConfig.maxRange) - (currentRange - distToStop);
        const chargeDurationMins = Math.ceil((chargeNeeded / 50) * 60);
        distanceCovered += distToStop;
        currentRange -= distToStop;
        const arrivalTime = new Date(journeyStartTime.getTime() + (distanceCovered / 80) * 60 * 60 * 1000);
        calculatedStops.push({
          name: nextStop.name,
          address: nextStop.location.address,
          lat: nextStop.location.lat,
          lng: nextStop.location.lng,
          type: 'charging',
          arrivalTime: arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          chargeDuration: `${chargeDurationMins} mins`
        });
        journeyStartTime = new Date(arrivalTime.getTime() + chargeDurationMins * 60000);
        currentRange = (vehicleConfig.targetCharge / 100) * vehicleConfig.maxRange;
      }

      setRouteDetails(calculatedStops);
      
      const stopsArr = [];
      stopsArr.push({ lat: routeLeg.start_location.lat(), lng: routeLeg.start_location.lng(), name: 'Start', type: 'start' });
      calculatedStops.forEach(stop => stopsArr.push({ lat: stop.lat, lng: stop.lng, name: stop.name, type: 'charging' }));
      stopsArr.push({ lat: routeLeg.end_location.lat(), lng: routeLeg.end_location.lng(), name: 'End', type: 'end' });
      setRouteStops(stopsArr);
      
      setRouteSummary({
        distance: routeLeg.distance.text,
        duration: routeLeg.duration.text,
      });

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

          <div className="bg-slate-800/50 rounded-xl p-4 space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <FiBatteryCharging className="mr-2 h-5 w-5 text-primary-400" />
              Vehicle Settings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Current Charge (%)</label>
                <input
                  type="number"
                  name="currentCharge"
                  value={vehicleConfig.currentCharge}
                  onChange={handleConfigChange}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Max Range (km)</label>
                <input
                  type="number"
                  name="maxRange"
                  value={vehicleConfig.maxRange}
                  onChange={handleConfigChange}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Target Charge (%)</label>
                <input
                  type="number"
                  name="targetCharge"
                  value={vehicleConfig.targetCharge}
                  onChange={handleConfigChange}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Start Time</label>
                <input
                  type="time"
                  name="startTime"
                  value={vehicleConfig.startTime}
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
                  <FiTrendingUp className="mr-3 h-5 w-5 text-primary-400" />
                  Route Summary
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
                   <div className="flex items-center space-x-2 text-sm">
                      <FiBatteryCharging className="text-slate-400"/>
                      <span>{routeDetails.length} stops</span>
                   </div>
                   {resultsPanelOpen ? <FiChevronDown className="h-6 w-6" /> : <FiChevronUp className="h-6 w-6" />}
                </div>
              </button>

              {resultsPanelOpen && (
                <div className="p-6 bg-slate-800/50">
                  {routeDetails.length > 0 ? (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <FiMapPin className="mr-2 h-5 w-5 text-primary-400" />
                        Charging Stops
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {routeDetails.map((stop, index) => (
                          <div key={index} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="font-semibold text-white text-sm flex-1 mr-2">{stop.name}</h4>
                              <span className="text-xs bg-primary-500/20 text-primary-300 px-2 py-1 rounded-full flex-shrink-0">
                                Stop {index + 1}
                              </span>
                            </div>
                            <p className="text-slate-400 text-xs mb-3">{stop.address}</p>
                            <div className="flex items-center justify-between text-xs text-slate-300">
                              <span className="flex items-center"><FiClock className="mr-1 h-3 w-3" /> {stop.arrivalTime}</span>
                              <span className="flex items-center"><FiBatteryCharging className="mr-1 h-3 w-3" /> {stop.chargeDuration}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                       <FiAlertCircle className="mx-auto h-10 w-10 text-slate-500 mb-3" />
                       <p className="font-semibold">No charging stops needed.</p>
                       <p className="text-sm text-slate-400">Your vehicle has enough range for this trip.</p>
                    </div>
                  )}
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

export default RoutePlanner; 
