import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin, FiClock, FiDollarSign } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Map from '../components/Map';
import SearchBar from '../components/SearchBar';
import { useStations } from '../hooks/useFirestore';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const { stations, loading, error } = useStations();
  const { isLoaded, google } = useGoogleMaps();
  const [directionsResponse, setDirectionsResponse] = useState(null);

  const filteredStations = stations.filter(station =>
    (station.name && station.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (station.location && station.location.address && station.location.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  async function calculateRoute() {
    if (!origin || !destination) {
      return;
    }
    const directionsService = new google.maps.DirectionsService();
    try {
      const results = await directionsService.route({
        origin: origin.geometry.location,
        destination: destination.geometry.location,
        travelMode: google.maps.TravelMode.DRIVING,
      });
      setDirectionsResponse(results);
    } catch (error) {
      if (error.code === 'ZERO_RESULTS') {
        toast.error('No route could be found between the origin and destination.');
      } else {
        toast.error('An error occurred while fetching directions.');
      }
      console.error('Directions request failed:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] text-red-600">
        Error loading stations: {error.message}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Find Charging Stations & Routes
          </h1>
          <div className="space-y-4">
            <SearchBar onPlaceSelected={(place) => setOrigin(place)} placeholder="Enter origin" />
            <SearchBar onPlaceSelected={(place) => setDestination(place)} placeholder="Enter destination" />
          </div>
          <div className="mt-4">
            <button
              onClick={calculateRoute}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!isLoaded || !origin || !destination}
            >
              Get Directions
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <Map center={origin?.geometry?.location} stations={filteredStations} directionsResponse={directionsResponse} />
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Nearby Stations
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStations.map((station) => (
              <div
                key={station.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {station.name || 'No name'}
                  </h3>
                  <div className="space-y-2">
                    <p className="flex items-center text-gray-600">
                      <FiMapPin className="mr-2" />
                      {station.location && station.location.address ? station.location.address : (station.address || 'No address')}
                    </p>
                    <p className="flex items-center text-gray-600">
                      <FiClock className="mr-2" />
                      {station.availableSlots !== undefined ? station.availableSlots : (station.totalPorts !== undefined ? station.totalPorts : 'N/A')} slots available
                    </p>
                    <p className="flex items-center text-gray-600">
                      <FiDollarSign className="mr-2" />
                      ${station.pricePerHour !== undefined ? station.pricePerHour : 'N/A'}/hour
                    </p>
                  </div>
                  <div className="mt-4">
                    <Link
                      to={`/station/${station.id}`}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 