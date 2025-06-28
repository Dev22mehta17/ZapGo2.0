import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiZap, FiLoader, FiAlertTriangle, FiInbox, FiMapPin, FiClock, FiDollarSign } from 'react-icons/fi';
import Map from '../components/Map';
import { useStations } from '../hooks/useFirestore';
import React from 'react';

// --- Station Card Component ---
const StationCard = ({ station }) => (
  <Link to={`/station/${station.id}`} className="block">
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-primary-500/50 hover:bg-slate-700/50 transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-bold text-white text-xl group-hover:text-primary-400 transition-colors">
          {station.name || 'Unnamed Station'}
        </h3>
        <div className={`flex items-center space-x-2 text-sm font-semibold px-3 py-1 rounded-full
          ${station.status === 'available' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 
            'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}
        >
          <FiZap className="w-4 h-4" />
          <span>{station.status || 'N/A'}</span>
        </div>
      </div>
      
      <div className="space-y-3 mb-4">
        <p className="flex items-start text-slate-400">
          <FiMapPin className="mr-3 mt-1 h-4 w-4 flex-shrink-0" />
          <span className="line-clamp-2">{station.location?.address || station.address || 'No address provided'}</span>
        </p>
        {typeof station.availableSlots === 'number' && typeof station.totalPorts === 'number' ? (
          <div className="flex items-center text-slate-400">
            <FiClock className="mr-3 h-4 w-4" />
            <span>{station.availableSlots} / {station.totalPorts} slots available</span>
          </div>
        ) : null}
        <div className="flex items-center text-slate-400">
          <FiDollarSign className="mr-3 h-4 w-4" />
          <span>${station.pricePerHour ?? 'N/A'}/hour</span>
        </div>
      </div>
      
      <div className="pt-4 border-t border-slate-700">
        <div className="bg-primary-600 text-white text-center py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors">
          View Details
        </div>
      </div>
    </div>
  </Link>
);

// --- Main Home Component ---
const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { stations, loading, error } = useStations();

  const filteredStations = useMemo(() => 
    stations.filter(station =>
      station.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.location?.address?.toLowerCase().includes(searchQuery.toLowerCase())
    ), 
    [stations, searchQuery]
  );

  return (
    <div className="min-h-screen-minus-nav bg-slate-900 text-white">
      {/* --- Header Section --- */}
      <div className="bg-slate-800/50 border-b border-slate-700 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">Find Charging Stations</h1>
            <p className="text-slate-400">Discover and book EV charging stations near you</p>
          </div>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by station name or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl pl-12 pr-4 py-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- Search Result Card Section --- */}
      {searchQuery && filteredStations.length > 0 && (
        <div className="px-4 pt-6 transition-all duration-300">
          <div className="max-w-7xl mx-auto">
            <div className="mb-4">
              <StationCard station={filteredStations[0]} />
            </div>
          </div>
        </div>
      )}

      {/* --- Map Section --- */}
      <div className={`px-4 py-6 transition-all duration-300 ${searchQuery && filteredStations.length > 0 ? 'pt-2' : ''}`}>
        <div className="max-w-7xl mx-auto">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden h-[400px] lg:h-[500px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <FiLoader className="animate-spin h-12 w-12 mx-auto text-primary-500 mb-4" />
                  <p className="text-slate-400">Loading stations...</p>
                </div>
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-red-400">
                  <FiAlertTriangle className="h-12 w-12 mx-auto mb-4" />
                  <p className="font-semibold">Failed to load stations</p>
                  <p className="text-red-300 text-sm">{error.message}</p>
                </div>
              </div>
            ) : (
              <Map stations={filteredStations} zoom={5} />
            )}
          </div>
        </div>
      </div>

      {/* --- Stations Grid Section --- */}
      <div className="px-4 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Available Stations</h2>
            <span className="text-slate-400">
              {filteredStations.length} station{filteredStations.length !== 1 && 's'} found
            </span>
          </div>

          {filteredStations.length === 0 ? (
            <div className="text-center py-12">
              <FiInbox className="h-16 w-16 mx-auto text-slate-500 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Stations Found</h3>
              <p className="text-slate-400 mb-6">
                {searchQuery ? `No stations match "${searchQuery}"` : 'No stations available in this area'}
              </p>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredStations.map(station => (
                <StationCard key={station.id} station={station} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home; 