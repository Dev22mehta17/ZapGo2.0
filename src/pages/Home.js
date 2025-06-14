import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin, FiClock, FiDollarSign } from 'react-icons/fi';
import Map from '../components/Map';
import SearchBar from '../components/SearchBar';
import { useStations } from '../hooks/useFirestore';

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const { stations, loading, error } = useStations();

  const filteredStations = stations.filter(station =>
    (station.name && station.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (station.location && station.location.address && station.location.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handlePlaceSelected = (place) => {
    setSelectedLocation(place);
  };

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
            Find Charging Stations
          </h1>
          <SearchBar onPlaceSelected={handlePlaceSelected} />
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <Map center={selectedLocation} />
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