import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin, FiClock, FiDollarSign, FiSearch } from 'react-icons/fi';
import Map from '../components/Map';
import { useStations } from '../hooks/useFirestore';

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { stations, loading, error } = useStations();

  const filteredStations = stations.filter(station =>
    (station.name && station.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (station.location && station.location.address && station.location.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] text-red-600 px-4">
        <p className="text-sm sm:text-base">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="mb-6 sm:mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
                Find Charging Stations Near You
            </h1>
            <p className="mt-2 text-sm sm:text-base lg:text-lg text-gray-500 max-w-2xl mx-auto">
                Explore available EV charging stations on the map or in the list below.
            </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 sm:mb-8">
          <div className="relative max-w-md mx-auto">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search stations by name or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>
        </div>
        
        {/* Map Section */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6 sm:mb-8 h-[300px] sm:h-[400px] lg:h-[500px]">
          <Map stations={filteredStations} zoom={5} />
        </div>

        {/* Stations List Section */}
        <div className="mt-6 sm:mt-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Available Stations
            </h2>
            <span className="text-sm sm:text-base text-gray-500">
              {filteredStations.length} station{filteredStations.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredStations.map((station) => (
              <div
                key={station.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 border border-gray-100"
              >
                <div className="p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 line-clamp-2">
                    {station.name || 'No name'}
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    <p className="flex items-start text-gray-600 text-sm sm:text-base">
                      <FiMapPin className="mr-2 mt-0.5 flex-shrink-0 h-4 w-4" />
                      <span className="line-clamp-2">
                        {station.location && station.location.address ? station.location.address : (station.address || 'No address')}
                      </span>
                    </p>
                    <p className="flex items-center text-gray-600 text-sm sm:text-base">
                      <FiClock className="mr-2 flex-shrink-0 h-4 w-4" />
                      <span>
                        {station.availableSlots !== undefined ? station.availableSlots : (station.totalPorts !== undefined ? station.totalPorts : 'N/A')} slots available
                      </span>
                    </p>
                    <p className="flex items-center text-gray-600 text-sm sm:text-base">
                      <FiDollarSign className="mr-2 flex-shrink-0 h-4 w-4" />
                      <span>
                        ${station.pricePerHour !== undefined ? station.pricePerHour : 'N/A'}/hour
                      </span>
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-6">
                    <Link
                      to={`/station/${station.id}`}
                      className="inline-flex items-center justify-center w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* No Results */}
          {filteredStations.length === 0 && searchQuery && (
            <div className="text-center py-8 sm:py-12">
              <p className="text-gray-500 text-sm sm:text-base">
                No stations found matching "{searchQuery}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home; 