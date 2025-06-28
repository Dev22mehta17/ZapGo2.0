import { useState, useRef, useLayoutEffect } from 'react';
import { FiMapPin, FiNavigation, FiClock, FiPlayCircle, FiLoader, FiZap, FiX, FiChevronUp, FiChevronDown, FiFlag, FiMap, FiRefreshCw, FiInfo } from 'react-icons/fi';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { getAllStations } from '../hooks/useFirestore';
import { toast } from 'react-hot-toast';
import SearchBar from '../components/SearchBar';
import MapComponent from '../components/Map';

// Clean display name for better presentation
const cleanDisplayName = (cityName) => {
  return cityName
    .replace(/\s*\([^)]*\)\s*/g, '') // Remove anything in parentheses
    .replace(/\s*\[[^\]]*\]\s*/g, '') // Remove anything in brackets
    .replace(/\s*\(zapgo\s*station\)\s*/gi, '') // Remove "(ZapGo Station)"
    .replace(/\s*\(zapgo\)\s*/gi, '') // Remove "(ZapGo)"
    .replace(/\s*\(station\)\s*/gi, '') // Remove "(Station)"
    .replace(/\s*division\s*/gi, '') // Remove "Division"
    .replace(/\s*district\s*/gi, '') // Remove "District"
    .replace(/\s*state\s*/gi, '') // Remove "State"
    .replace(/\s*india\s*/gi, '') // Remove "India"
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
};

const RoutePlanner = () => {
  const { google } = useGoogleMaps();
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routeStops, setRouteStops] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [resultsPanelOpen, setResultsPanelOpen] = useState(true);
  const [mapPadding, setMapPadding] = useState({ bottom: 0 });
  const [journeyPlan, setJourneyPlan] = useState([]);
  const [reachablePoints, setReachablePoints] = useState([]);
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
    setFilteredStations([]);
    setRouteSummary(null);
    setJourneyPlan([]);
    setReachablePoints([]);
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
      
      // Validate route polyline
      console.log('Route polyline validation:');
      console.log('- Polyline points:', decodedPolyline.length);
      console.log('- Route distance:', routeLeg.distance.text);
      console.log('- Route duration:', routeLeg.duration.text);
      console.log('- Start:', routeLeg.start_address);
      console.log('- End:', routeLeg.end_address);
      
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
            location: { lat, lng },
            isRegistered: true // Mark as registered ZapGo station
          };
        });
      
      console.log('All ZapGo stations found:', firestoreStations.length);
      console.log('ZapGo stations:', firestoreStations.map(s => ({ name: s.name, lat: s.location.lat, lng: s.location.lng })));
      
      // 3. Get stations along the route path (not within radius)
      const routePath = route.overview_path;
      const routeStations = await getStationsAlongRoute(routePath);
      setFilteredStations(routeStations);
      
      // 4. Generate intermediate cities along the route using reverse geocoding
      const intermediateCities = await generateIntermediateCities(decodedPolyline, routeLeg);
      console.log('Intermediate cities generated:', intermediateCities.length);
      console.log('Intermediate cities:', intermediateCities.map(c => ({ 
        name: c.name, 
        distanceAlongRoute: c.distanceAlongRoute,
        source: c.source 
      })));
      
      // 5. Find and sort all stations along the route path with strict validation
      const cumulativeDistances = [0];
      for (let i = 1; i < decodedPolyline.length; i++) {
          cumulativeDistances[i] = cumulativeDistances[i-1] + google.maps.geometry.spherical.computeDistanceBetween(decodedPolyline[i-1], decodedPolyline[i]);
      }

      const stationsAlongRoute = routeStations.map(station => {
          const stationLatLng = new google.maps.LatLng(station.location.lat, station.location.lng);
          let closestPointIndex = 0;
          let minDistance = Infinity;

          // Find the closest point on the route polyline
          decodedPolyline.forEach((point, index) => {
              const distance = google.maps.geometry.spherical.computeDistanceBetween(stationLatLng, point);
              if (distance < minDistance) {
                  minDistance = distance;
                  closestPointIndex = index;
              }
          });
          
          // Strict validation: station must be within 10km of the route
          if (minDistance > 10000) {
            console.log(`Station ${station.name} rejected: too far from route (${(minDistance/1000).toFixed(1)}km)`);
            return null;
          }

          console.log(`Station ${station.name} accepted: distance from route ${(minDistance/1000).toFixed(1)}km`);

          return {
              ...station,
              type: 'charging',
              distanceAlongRoute: cumulativeDistances[closestPointIndex] / 1000,
              distanceFromRoute: minDistance / 1000, // Store actual distance from route
              isRegistered: true
          };
      }).filter(Boolean).sort((a, b) => a.distanceAlongRoute - b.distanceAlongRoute);
      
      console.log('Total stations along route after strict filtering:', stationsAlongRoute.length);
      console.log('Route stations with distances:', stationsAlongRoute.map(s => ({ 
        name: s.name, 
        distanceAlongRoute: s.distanceAlongRoute.toFixed(1),
        distanceFromRoute: s.distanceFromRoute.toFixed(1)
      })));
      
      // 6. Smart deduplication and filtering system
      const smartRoutePoints = await generateSmartRoutePoints(stationsAlongRoute, intermediateCities, decodedPolyline, cumulativeDistances, google);
      
      console.log('Total route points after smart filtering:', smartRoutePoints.length);
      
      // 7. Calculate which stations are reachable with current charge
      const currentRangeKm = (vehicleConfig.currentCharge / 100) * vehicleConfig.maxRange;
      const finalRangeKm = (vehicleConfig.finalCharge / 100) * vehicleConfig.maxRange;
      const totalRouteDistanceKm = routeLeg.distance.value / 1000;
      
      const reachablePoints = smartRoutePoints.map(point => {
        const distanceFromStart = point.distanceAlongRoute;
        const distanceToDestination = totalRouteDistanceKm - distanceFromStart;
        const isReachable = distanceFromStart <= currentRangeKm;
        const remainingRangeAfterStop = currentRangeKm - distanceFromStart;
        const needsChargingToReachDestination = distanceToDestination > finalRangeKm;
        
        let recommendation = '';
        if (point.isRegistered) {
          if (!isReachable) {
            recommendation = 'Not reachable with current charge';
          } else if (needsChargingToReachDestination) {
            recommendation = 'Recommended to charge here (needed for destination)';
          } else if (remainingRangeAfterStop < 50) {
            recommendation = 'Recommended to charge here (low remaining range)';
          } else {
            recommendation = 'Optional stop';
          }
        } else {
          recommendation = 'Intermediate city - no charging available';
        }
        
        return {
          ...point,
          isReachable,
          remainingRangeAfterStop,
          needsChargingToReachDestination,
          recommendation
        };
      });
      
      console.log('Reachable points:', reachablePoints.filter(s => s.isReachable).length);
      
      // Store reachable points in state for use in render
      setReachablePoints(reachablePoints);
      
      // 8. Build final itinerary with stations and intermediate cities
      const finalItinerary = [
          { type: 'origin', name: cleanDisplayName(origin.name || routeLeg.start_address), address: routeLeg.start_address, isRegistered: false },
          ...reachablePoints.map(point => ({
            ...point,
            name: cleanDisplayName(point.name)
          })),
          { type: 'destination', name: cleanDisplayName(destination.name || routeLeg.end_address), address: routeLeg.end_address, isRegistered: false }
      ];
      setJourneyPlan(finalItinerary);
      
      const finalRouteStops = [
          { lat: origin.geometry.location.lat(), lng: origin.geometry.location.lng(), name: 'Start', type: 'start' },
          ...reachablePoints.map(s => ({ 
            lat: s.location.lat, 
            lng: s.location.lng, 
            name: cleanDisplayName(s.name), 
            type: s.isRegistered ? 'charging' : 'intermediate',
            isRegistered: s.isRegistered
          })),
          { lat: destination.geometry.location.lat(), lng: destination.geometry.location.lng(), name: 'End', 'type': 'end' }
      ];
      setRouteStops(finalRouteStops);
      setRouteSummary({ 
        distance: routeLeg.distance.text, 
        duration: routeLeg.duration.text,
        stations: reachablePoints.filter(p => p.isRegistered).length,
        totalPoints: reachablePoints.length
      });

      // Log final route summary for debugging
      console.log('=== FINAL ROUTE SUMMARY ===');
      console.log('Total route distance:', routeLeg.distance.text);
      console.log('Total route duration:', routeLeg.duration.text);
      console.log('ZapGo stations on route:', reachablePoints.filter(p => p.isRegistered).length);
      console.log('Intermediate cities on route:', reachablePoints.filter(p => !p.isRegistered).length);
      console.log('Total route points:', reachablePoints.length);
      console.log('Route points breakdown:');
      reachablePoints.forEach((point, index) => {
        console.log(`${index + 1}. ${cleanDisplayName(point.name)} (${point.isRegistered ? 'ZapGo Station' : 'Intermediate City'}) - ${point.distanceAlongRoute.toFixed(1)}km from start`);
      });
      
      // Log final itinerary breakdown
      console.log('Final itinerary breakdown:');
      finalItinerary.forEach((step, index) => {
        if (step.type === 'origin') {
          console.log(`${index + 1}. ${step.name} (START)`);
        } else if (step.type === 'destination') {
          console.log(`${index + 1}. ${step.name} (END)`);
        } else {
          console.log(`${index + 1}. ${step.name} (${step.isRegistered ? 'ZapGo Station' : 'Intermediate City'}) - ${step.isReachable ? 'Reachable' : 'Not Reachable'}`);
        }
      });
      console.log('=== PROTOTYPE FEATURE ===');
      console.log('Intermediate cities are shown as orange markers to demonstrate potential future ZapGo station locations.');
      console.log('This helps visualize the complete charging network coverage along the route.');
      console.log('===========================');

    } catch (error) {
        console.error("Route planning error:", error);
        toast.error("An error occurred during route planning.");
    } finally {
        setLoading(false);
    }
  };

  // Function to check if a point is along a path with proper distance calculation
  const isPointAlongPath = (point, path, toleranceMeters = 10000) => {
    if (!path || path.length < 2) return false;
    
    let minDistance = Infinity;
    
    for (let i = 0; i < path.length - 1; i++) {
      const segmentStart = path[i];
      const segmentEnd = path[i + 1];
      
      // Calculate distance from point to line segment using proper geometry
      const distance = pointToLineSegmentDistance(point, segmentStart, segmentEnd);
      
      if (distance < minDistance) {
        minDistance = distance;
      }
      
      // Early exit if we find a point within tolerance
      if (minDistance <= toleranceMeters) {
        return true;
      }
    }
    
    return minDistance <= toleranceMeters;
  };

  // Calculate distance from a point to a line segment
  const pointToLineSegmentDistance = (point, lineStart, lineEnd) => {
    const A = point.lat() - lineStart.lat();
    const B = point.lng() - lineStart.lng();
    const C = lineEnd.lat() - lineStart.lat();
    const D = lineEnd.lng() - lineStart.lng();

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      // Line segment is actually a point
      return google.maps.geometry.spherical.computeDistanceBetween(point, lineStart);
    }

    let param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = lineStart.lat();
      yy = lineStart.lng();
    } else if (param > 1) {
      xx = lineEnd.lat();
      yy = lineEnd.lng();
    } else {
      xx = lineStart.lat() + param * C;
      yy = lineStart.lng() + param * D;
    }

    const dx = point.lat() - xx;
    const dy = point.lng() - yy;
    
    // Convert to meters using spherical distance
    const closestPoint = new google.maps.LatLng(xx, yy);
    return google.maps.geometry.spherical.computeDistanceBetween(point, closestPoint);
  };

  // Create a bounding box around the route for efficient filtering
  const createRouteBoundingBox = (routePath, bufferKm = 15) => {
    if (!routePath || routePath.length === 0) return null;
    
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    
    routePath.forEach(point => {
      minLat = Math.min(minLat, point.lat());
      maxLat = Math.max(maxLat, point.lat());
      minLng = Math.min(minLng, point.lng());
      maxLng = Math.max(maxLng, point.lng());
    });
    
    // Add buffer (convert km to degrees, rough approximation)
    const bufferDegrees = bufferKm / 111; // 1 degree ≈ 111 km
    minLat -= bufferDegrees;
    maxLat += bufferDegrees;
    minLng -= bufferDegrees;
    maxLng += bufferDegrees;
    
    return { minLat, maxLat, minLng, maxLng };
  };

  // Check if a point is within a bounding box
  const isPointInBoundingBox = (point, boundingBox) => {
    if (!boundingBox) return false;
    
    return point.lat() >= boundingBox.minLat && 
           point.lat() <= boundingBox.maxLat && 
           point.lng() >= boundingBox.minLng && 
           point.lng() <= boundingBox.maxLng;
  };

  const getStationsAlongRoute = async (routePath) => {
    try {
      const allStations = await getAllStations();
      console.log('Raw stations from database:', allStations);
      
      // Create bounding box for efficient pre-filtering
      const boundingBox = createRouteBoundingBox(routePath, 50); // Increased buffer to 50km
      
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
        
        // First, check if station is within bounding box (fast pre-filter)
        if (!isPointInBoundingBox(stationLatLng, boundingBox)) {
          return false;
        }
        
        // Then, check if station is actually along the route path (accurate check)
        return isPointAlongPath(stationLatLng, routePath, 50000); // Increased tolerance to 50km
      });
    } catch (error) {
      console.error('Error fetching ZapGo stations along route:', error);
      return [];
    }
  };

  // Function to generate intermediate cities along the route using reverse geocoding
  const generateIntermediateCities = async (decodedPolyline, routeLeg) => {
    const intermediateCities = [];
    const totalDistance = routeLeg.distance.value / 1000; // Convert to km
    
    // Generate intermediate points every 100-150 km along the route (reduced frequency)
    const intervalKm = 120; // Generate a point every 120km instead of 30km
    const numIntervals = Math.min(Math.floor(totalDistance / intervalKm), 10); // Limit to max 10 cities
    
    for (let i = 1; i <= numIntervals; i++) {
      const targetDistance = i * intervalKm * 1000; // Convert back to meters
      let cumulativeDistance = 0;
      let targetPoint = null;
      
      // Find the point along the polyline at the target distance
      for (let j = 1; j < decodedPolyline.length; j++) {
        const segmentDistance = google.maps.geometry.spherical.computeDistanceBetween(
          decodedPolyline[j-1], 
          decodedPolyline[j]
        );
        
        if (cumulativeDistance + segmentDistance >= targetDistance) {
          // Interpolate to find the exact point
          const ratio = (targetDistance - cumulativeDistance) / segmentDistance;
          const lat = decodedPolyline[j-1].lat() + ratio * (decodedPolyline[j].lat() - decodedPolyline[j-1].lat());
          const lng = decodedPolyline[j-1].lng() + ratio * (decodedPolyline[j].lng() - decodedPolyline[j-1].lng());
          targetPoint = { lat, lng };
          break;
        }
        cumulativeDistance += segmentDistance;
      }
      
      if (targetPoint) {
        try {
          // Use reverse geocoding to get actual city name
          const geocoder = new google.maps.Geocoder();
          const result = await geocoder.geocode({
            location: { lat: targetPoint.lat, lng: targetPoint.lng }
          });
          
          if (result.results.length > 0) {
            const addressComponents = result.results[0].address_components;
            let cityName = 'Unknown City';
            let stateName = '';
            
            // Extract city and state names from address components
            for (const component of addressComponents) {
              if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
                cityName = component.long_name;
              }
              if (component.types.includes('administrative_area_level_1')) {
                stateName = component.long_name;
              }
            }
            
            // Only include if it's a significant city (not just a village or small town)
            // Check if the city name suggests it's a significant location
            const significantCityKeywords = ['city', 'town', 'nagar', 'pur', 'garh', 'pura', 'chowk'];
            const isSignificantCity = significantCityKeywords.some(keyword => 
              cityName.toLowerCase().includes(keyword) || 
              cityName.length > 3 // Most significant cities have names longer than 3 characters
            );
            
            if (isSignificantCity) {
              intermediateCities.push({
                id: `intermediate_${i}`,
                name: cityName,
                location: targetPoint,
                type: 'intermediate',
                distanceAlongRoute: i * intervalKm,
                isRegistered: false, // Mark as non-registered intermediate city
                address: `${cityName}, ${stateName}`,
                source: 'geocoded'
              });
            }
          }
        } catch (error) {
          console.warn('Reverse geocoding failed for point:', targetPoint, error);
          // Fallback to generated name if geocoding fails
          const cityName = generateCityName(targetPoint, i);
          intermediateCities.push({
            id: `intermediate_${i}`,
            name: cityName,
            location: targetPoint,
            type: 'intermediate',
            distanceAlongRoute: i * intervalKm,
            isRegistered: false,
            address: `${cityName}, India`,
            source: 'generated'
          });
        }
      }
    }
    
    return intermediateCities;
  };

  // Function to generate realistic city names based on location
  const generateCityName = (point, index) => {
    // This is a simplified approach - in a real app, you'd use reverse geocoding
    // For now, we'll generate names based on common Indian city patterns
    const cityPrefixes = ['Rajpura', 'Bahadurgarh', 'Zirakpur', 'Kharar', 'Mohali', 'Panchkula', 'Ambala', 'Karnal', 'Panipat', 'Sonipat', 'Banur', 'Dera Bassi', 'Kurali', 'Ropar', 'Nawanshahr', 'Hoshiarpur', 'Jalandhar', 'Ludhiana', 'Moga', 'Bathinda'];
    const citySuffixes = ['City', 'Town', 'Village', 'Nagar', 'Pur', 'Garh', 'Pura', 'Chowk', 'Road', 'Market'];
    
    // Use the index to select a name, cycling through the array
    const prefix = cityPrefixes[index % cityPrefixes.length];
    const suffix = citySuffixes[Math.floor(index / citySuffixes.length) % citySuffixes.length];
    
    return `${prefix} ${suffix}`;
  };

  // Smart route points generation with deduplication and filtering
  const generateSmartRoutePoints = async (stationsAlongRoute, intermediateCities, decodedPolyline, cumulativeDistances, google) => {
    try {
      // Ensure Google Maps API is available
      if (!google || !google.maps) {
        console.error('Google Maps API not available');
        return [];
      }

      // Important cities that should be force-included if near the route
      const importantCities = [
        { name: 'Rajpura', lat: 30.4847, lng: 76.5947 },
        { name: 'Banur', lat: 30.5547, lng: 76.7187 },
        { name: 'Zirakpur', lat: 30.6427, lng: 76.8177 },
        { name: 'Kharar', lat: 30.7467, lng: 76.6477 },
        { name: 'Mohali', lat: 30.7047, lng: 76.7177 },
        { name: 'Panchkula', lat: 30.6947, lng: 76.8577 },
        { name: 'Ambala', lat: 30.3747, lng: 76.7977 },
        { name: 'Karnal', lat: 29.6947, lng: 76.9877 },
        { name: 'Panipat', lat: 29.3947, lng: 76.9877 },
        { name: 'Sonipat', lat: 28.9947, lng: 77.0177 }
      ];

      // Check if important cities are near the route and add them
      const nearbyImportantCities = importantCities.map(city => {
        try {
          const cityLatLng = new google.maps.LatLng(city.lat, city.lng);
          let minDistance = Infinity;
          let closestPointIndex = 0;

          // Find closest point on route
          decodedPolyline.forEach((point, index) => {
            const distance = google.maps.geometry.spherical.computeDistanceBetween(cityLatLng, point);
            if (distance < minDistance) {
              minDistance = distance;
              closestPointIndex = index;
            }
          });

          // Only include if within 10km of route
          if (minDistance <= 10000) {
            return {
              id: `important_${city.name}`,
              name: city.name,
              location: { lat: city.lat, lng: city.lng },
              type: 'intermediate',
              distanceAlongRoute: cumulativeDistances[closestPointIndex] / 1000,
              distanceFromRoute: minDistance / 1000,
              isRegistered: false,
              source: 'important_city'
            };
          }
        } catch (error) {
          console.warn(`Error processing important city ${city.name}:`, error);
        }
        return null;
      }).filter(Boolean);

      console.log('Nearby important cities found:', nearbyImportantCities.map(c => c.name));

      // Combine all points
      const allPoints = [...stationsAlongRoute, ...intermediateCities, ...nearbyImportantCities];
      
      // Create a map to track cities by normalized name
      const cityNameMap = new Map();
      
      allPoints.forEach(point => {
        // Normalize city name for comparison
        const normalizedName = normalizeCityName(point.name);
        
        if (!cityNameMap.has(normalizedName)) {
          cityNameMap.set(normalizedName, []);
        }
        cityNameMap.get(normalizedName).push(point);
      });

      // For each city, prefer ZapGo station over generic city
      const deduplicatedPoints = [];
      cityNameMap.forEach((points, normalizedName) => {
        if (points.length === 1) {
          // Single point, add it
          deduplicatedPoints.push(points[0]);
        } else {
          // Multiple points for same city, prefer ZapGo station
          const zapgoStation = points.find(p => p.isRegistered);
          const genericCity = points.find(p => !p.isRegistered);
          
          if (zapgoStation) {
            // Prefer ZapGo station
            deduplicatedPoints.push(zapgoStation);
            console.log(`Preferring ZapGo station "${zapgoStation.name}" over generic city "${genericCity?.name}"`);
          } else if (genericCity) {
            // No ZapGo station, use generic city
            deduplicatedPoints.push(genericCity);
          }
        }
      });

      // Sort by distance along route
      const sortedPoints = deduplicatedPoints.sort((a, b) => a.distanceAlongRoute - b.distanceAlongRoute);
      
      // Smart filtering to get 10-12 meaningful points with good spacing
      const totalRouteDistance = cumulativeDistances[cumulativeDistances.length - 1] / 1000;
      const targetPointCount = Math.min(12, Math.max(8, Math.floor(totalRouteDistance / 25))); // 1 point every 25km, min 8, max 12
      
      const smartFilteredPoints = [];
      const minSpacing = totalRouteDistance / (targetPointCount + 1); // Minimum spacing between points
      
      for (let i = 0; i < sortedPoints.length && smartFilteredPoints.length < targetPointCount; i++) {
        const point = sortedPoints[i];
        
        // Check if this point is far enough from the last added point
        if (smartFilteredPoints.length === 0 || 
            (point.distanceAlongRoute - smartFilteredPoints[smartFilteredPoints.length - 1].distanceAlongRoute) >= minSpacing * 0.5) {
          smartFilteredPoints.push(point);
        }
      }
      
      // If we don't have enough points, add more with less strict spacing
      if (smartFilteredPoints.length < Math.min(8, targetPointCount)) {
        for (let i = 0; i < sortedPoints.length && smartFilteredPoints.length < targetPointCount; i++) {
          const point = sortedPoints[i];
          if (!smartFilteredPoints.find(p => p.id === point.id)) {
            smartFilteredPoints.push(point);
          }
        }
      }
      
      // Sort again by distance
      const finalPoints = smartFilteredPoints.sort((a, b) => a.distanceAlongRoute - b.distanceAlongRoute);
      
      console.log('Smart filtering results:');
      console.log('- Total route distance:', totalRouteDistance.toFixed(1), 'km');
      console.log('- Target point count:', targetPointCount);
      console.log('- Total unique cities found:', cityNameMap.size);
      console.log('- Points after deduplication:', deduplicatedPoints.length);
      console.log('- Final smart filtered points:', finalPoints.length);
      console.log('- Final points:', finalPoints.map(p => `${cleanDisplayName(p.name)} (${p.isRegistered ? 'ZapGo' : 'City'}) - ${p.distanceAlongRoute.toFixed(1)}km`));
      
      return finalPoints;
    } catch (error) {
      console.error('Error in generateSmartRoutePoints:', error);
      // Fallback to original stations if smart filtering fails
      return stationsAlongRoute.slice(0, 10);
    }
  };

  // Normalize city name for comparison and display
  const normalizeCityName = (cityName) => {
    return cityName
      .toLowerCase()
      .replace(/\s+(city|town|village|nagar|pur|garh|pura|chowk|road|market|division|district|state|india)\s*$/i, '')
      .replace(/^the\s+/i, '')
      .replace(/\s*\([^)]*\)\s*/g, '') // Remove anything in parentheses
      .replace(/\s*\[[^\]]*\]\s*/g, '') // Remove anything in brackets
      .replace(/\s*\(zapgo\s*station\)\s*/gi, '') // Remove "(ZapGo Station)"
      .replace(/\s*\(zapgo\)\s*/gi, '') // Remove "(ZapGo)"
      .replace(/\s*\(station\)\s*/gi, '') // Remove "(Station)"
      .trim();
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
    <div className="min-h-screen bg-slate-900 text-white flex flex-col lg:flex-row">
      {/* Sidebar: Route Planner */}
      <aside className="w-full lg:w-96 flex-shrink-0 bg-slate-900/95 backdrop-blur-lg border-r border-slate-700 z-40 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FiZap className="text-primary-500 h-8 w-8 mr-3" />
              <h1 className="text-2xl font-bold">Route Planner</h1>
            </div>
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

      {/* Main Content: Map and Summary */}
      <div className="flex-1 flex flex-col">
        <main className="relative" style={{ height: '40vh' }}>
          <MapComponent
            stations={[...filteredStations, ...reachablePoints.filter(point => !point.isRegistered)]}
            directionsResponse={directionsResponse}
            routeStops={routeStops}
            zoom={5}
            mapPadding={mapPadding}
          />
        </main>
        {/* Route Summary Panel BELOW the map with proper alignment */}
        {routeSummary && (
          <div className="w-full mt-2 max-h-[40vh]">
            <div ref={resultsPanelRef} className="w-full bg-slate-800/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
              <button 
                onClick={() => setResultsPanelOpen(!resultsPanelOpen)}
                className="w-full p-4 flex justify-between items-center cursor-pointer hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center">
                  <h3 className="text-lg font-semibold flex items-center">
                    <FiMap className="mr-3 h-5 w-5 text-primary-400" />
                    Route Summary
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
                    <div className="flex items-center space-x-4 text-sm text-slate-400">
                      <span className="flex items-center">
                        <FiZap className="mr-1" />
                        {routeSummary.stations} ZapGo Stations
                      </span>
                      <span className="flex items-center">
                        <FiMapPin className="mr-1" />
                        {routeSummary.totalPoints - routeSummary.stations} Intermediate Stations
                      </span>
                      <span className="flex items-center">
                        <FiMapPin className="mr-1" />
                        {routeSummary.totalPoints} Total Points
                      </span>
                    </div>
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
      </div>
    </div>
  );
};

// A new component to render each step of the journey for clarity
const JourneyStep = ({ step, index, isLast }) => {
    let icon;
    let titleColor = 'text-white';
    let bgColor = 'bg-slate-700/50';
    let statusBadge = null;
    
    // Clean the display name
    const displayName = cleanDisplayName(step.name);
    
    switch (step.type) {
        case 'origin':
            icon = <FiFlag className="text-green-400" />;
            titleColor = 'text-green-400';
            bgColor = 'bg-green-900/20';
            break;
        case 'charging':
            if (step.isRegistered) {
                icon = <FiZap className="text-yellow-400" />;
                titleColor = 'text-yellow-400';
                statusBadge = (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/30">
                        ✅ Registered
                    </span>
                );
                if (step.isReachable) {
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
            } else {
                // Non-registered intermediate city
                icon = <FiMapPin className="text-blue-400" />;
                titleColor = 'text-blue-400';
                bgColor = 'bg-blue-900/20';
                statusBadge = (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-500/30">
                        ❌ Not Registered
                    </span>
                );
            }
            break;
        case 'intermediate':
            icon = <FiMapPin className="text-blue-400" />;
            titleColor = 'text-blue-400';
            bgColor = 'bg-blue-900/20';
            statusBadge = (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-500/30">
                    ❌ Not Registered
                </span>
            );
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
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h4 className={`font-semibold ${titleColor}`}>{displayName}</h4>
                        {statusBadge}
                    </div>
                    {step.isRegistered && step.type === 'charging' && (
                        <button
                            onClick={() => handleBookStation(step)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                                step.isReachable 
                                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white' 
                                    : 'bg-slate-600 hover:bg-slate-500 text-slate-300 cursor-not-allowed'
                            }`}
                            disabled={!step.isReachable}
                            title={!step.isReachable ? 'Not reachable with current charge' : 'Book this station'}
                        >
                            {step.isReachable ? 'Book Now' : 'Not Reachable'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
};

// Function to handle booking a station
const handleBookStation = (station) => {
    // Navigate to station details page with booking intent
    window.open(`/station/${station.id}`, '_blank');
};

export default RoutePlanner; 
