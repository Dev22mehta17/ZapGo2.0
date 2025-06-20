import { useState } from 'react';
import { FiMapPin, FiNavigation, FiBatteryCharging, FiClock, FiPlayCircle, FiLoader, FiZap, FiTarget, FiThermometer, FiAlertCircle, FiTrendingUp, FiMenu, FiX } from 'react-icons/fi';
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

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50 relative">
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 bg-white p-2 rounded-lg shadow-lg border border-slate-200"
      >
        {sidebarOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
      </button>

      {/* Left Control Panel */}
      <aside className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 lg:static lg:z-10
        fixed top-0 left-0 h-full w-80 max-w-[90vw] 
        bg-white shadow-xl lg:shadow-lg z-40 
        transition-transform duration-300 ease-in-out
        flex flex-col
      `}>
        {/* Header */}
        <div className="p-4 lg:p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FiZap className="text-primary-600 h-6 w-6 lg:h-8 lg:w-8 mr-2 lg:mr-3" />
              <h1 className="text-xl lg:text-2xl font-bold text-slate-800">EV Route Planner</h1>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-slate-100 rounded"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-grow p-4 lg:p-6 overflow-y-auto space-y-6 lg:space-y-8">
          {/* Section 1: Journey */}
          <section>
            <h2 className="text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 lg:mb-4">Journey</h2>
            <div className="space-y-3 lg:space-y-4">
              <SearchBar onPlaceSelected={setOrigin} placeholder="Start Point" />
              <SearchBar onPlaceSelected={setDestination} placeholder="Destination" />
            </div>
          </section>

          {/* Section 2: Vehicle */}
          <section>
            <h2 className="text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 lg:mb-4">Vehicle</h2>
            <div className="space-y-3 p-3 lg:p-4 bg-slate-100 rounded-lg">
               <div className="flex items-center justify-between text-xs lg:text-sm">
                  <label className="text-slate-600 flex items-center"><FiBatteryCharging className="mr-2" /> Current Charge</label>
                  <input type="number" name="currentCharge" value={vehicleConfig.currentCharge} onChange={handleConfigChange} className="w-16 lg:w-20 rounded-md border-slate-300 text-center font-semibold text-xs lg:text-sm" />
              </div>
               <div className="flex items-center justify-between text-xs lg:text-sm">
                  <label className="text-slate-600 flex items-center"><FiTarget className="mr-2" /> Target Charge</label>
                  <input type="number" name="targetCharge" value={vehicleConfig.targetCharge} onChange={handleConfigChange} className="w-16 lg:w-20 rounded-md border-slate-300 text-center font-semibold text-xs lg:text-sm" />
              </div>
               <div className="flex items-center justify-between text-xs lg:text-sm">
                  <label className="text-slate-600 flex items-center"><FiThermometer className="mr-2" /> Max Range (km)</label>
                  <input type="number" name="maxRange" value={vehicleConfig.maxRange} onChange={handleConfigChange} className="w-16 lg:w-20 rounded-md border-slate-300 text-center font-semibold text-xs lg:text-sm" />
              </div>
            </div>
          </section>
          
          <button onClick={planRoute} disabled={!isLoaded || !origin || !destination || loading} 
            className="w-full flex items-center justify-center bg-primary-600 text-white py-2 lg:py-3 rounded-lg font-bold text-sm lg:text-lg hover:bg-primary-700 disabled:bg-slate-300 transition-all shadow-lg hover:shadow-primary-200">
            {loading ? <FiLoader className="animate-spin mr-2 lg:mr-3" /> : <FiNavigation className="mr-2 lg:mr-3" />}
            {loading ? 'Calculating...' : 'Plan Route'}
          </button>
        </div>

        {/* Results Section */}
        <div className="p-4 lg:p-6 border-t border-slate-200 flex-shrink-0">
          {directionsResponse ? (
            <div>
              {routeSummary && (
                <div className="mb-3 lg:mb-4">
                  <h3 className="text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Trip Summary</h3>
                  <div className="p-2 lg:p-3 bg-primary-50 text-primary-900 rounded-lg text-xs lg:text-sm space-y-1">
                    <div className="flex justify-between font-semibold"><span>Distance:</span> <span>{routeSummary.distance}</span></div>
                    <div className="flex justify-between font-semibold"><span>Duration:</span> <span>{routeSummary.duration}</span></div>
                    <div className="flex justify-between font-semibold"><span>Charging Stops:</span> <span>{routeDetails.length}</span></div>
                  </div>
                </div>
              )}
              {routeDetails.length > 0 && (
                <div className="text-center">
                  <button 
                    onClick={() => setSidebarOpen(false)}
                    className="text-xs lg:text-sm font-semibold text-primary-600 hover:underline"
                  >
                    View Charging Plan
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-xs lg:text-sm text-slate-400">
              <p>Enter your journey details to get started.</p>
            </div>
          )}
        </div>
      </aside>

      {/* Right Content Panel */}
      <main className="flex-grow h-full flex flex-col lg:flex-row">
        {/* Map Area */}
        <div className="flex-grow h-1/2 lg:h-full lg:w-2/3">
           <Map stations={allRouteStations} directionsResponse={directionsResponse} routeStops={routeStops} />
        </div>
        {/* Timeline Area */}
        <div className="flex-grow h-1/2 lg:h-full lg:w-1/3 bg-white p-4 lg:p-6 overflow-y-auto border-t-2 lg:border-l-2 lg:border-t-0 border-slate-200">
          {directionsResponse ? (
            routeDetails.length > 0 ? (
              <div>
                <h3 className="text-lg lg:text-xl font-bold text-slate-800 mb-3 lg:mb-4">Charging Timeline</h3>
                <ul className="relative border-l-2 border-primary-300 ml-3">
                  {routeDetails.map((stop, index) => (
                    <li key={index} className="mb-6 lg:mb-8 ml-4 lg:ml-6">
                       <span className="absolute flex items-center justify-center w-6 h-6 lg:w-8 lg:h-8 bg-primary-200 rounded-full -left-3 lg:-left-4 ring-4 lg:ring-8 ring-white">
                            <FiBatteryCharging className="w-3 h-3 lg:w-4 lg:h-4 text-primary-700" />
                       </span>
                       <h4 className="font-bold text-slate-800 text-sm lg:text-base">{stop.name}</h4>
                       <p className="text-xs lg:text-sm text-slate-500">{stop.address}</p>
                       <div className="flex flex-col lg:flex-row lg:items-center text-xs lg:text-sm text-slate-600 mt-1 space-y-1 lg:space-y-0 lg:space-x-4">
                           <span>Arrival: <strong>{stop.arrivalTime}</strong></span>
                           <span>Charge: <strong>{stop.chargeDuration}</strong></span>
                       </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                <FiAlertCircle className="h-8 w-8 lg:h-12 lg:w-12 mb-2" />
                <p className="font-semibold text-sm lg:text-base">No charging stops needed for this route.</p>
                <p className="text-xs lg:text-sm">Your vehicle has enough range to complete the journey.</p>
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
              <FiTrendingUp className="h-8 w-8 lg:h-12 lg:w-12 mb-2" />
              <p className="font-semibold text-sm lg:text-base">Your route and charging plan will appear here.</p>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default RoutePlanner; 
