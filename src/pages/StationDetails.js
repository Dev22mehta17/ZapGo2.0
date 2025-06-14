import { useParams } from 'react-router-dom';
import { useStation } from '../hooks/useFirestore';
import BookingForm from '../components/BookingForm';
import Map from '../components/Map';

const StationDetails = () => {
  const { id } = useParams();
  const { station, loading, error } = useStation(id);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-red-600">
            Error loading station: {error.message}
          </div>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-gray-600">
            Station not found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {station.name}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {station.location && station.location.address
                ? station.location.address
                : (station.address || 'No address')}
            </p>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Available Slots</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {station.availableSlots} / {station.totalSlots}
                </dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Price per Hour</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  ${station.pricePerHour}
                </dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Charger Types</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {Array.isArray(station.chargerTypes) ? station.chargerTypes.join(', ') : 'N/A'}
                </dd>
              </div>
              
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${station.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {station.status}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="border-t border-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">Location</h2>
              <div className="mt-4 h-96">
                <Map center={station.location} zoom={15} />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">Book a Slot</h2>
              <div className="mt-4">
                <BookingForm station={station} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StationDetails; 