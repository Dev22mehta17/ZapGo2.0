import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';
import AddStationForm from '../components/AddStationForm';

const StationManagerDashboard = () => {
  const { user } = useAuth();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [activeBookings, setActiveBookings] = useState([]);
  const [stats, setStats] = useState({
    totalStations: 0,
    activeBookings: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    totalBookings: 0,
    todayBookings: 0
  });

  useEffect(() => {
    fetchStations();
    fetchActiveBookings();
  }, [user.uid]);

  const fetchStations = async () => {
    try {
      setLoading(true);
      // Fetch stations
      const stationsQuery = query(
        collection(db, 'stations'),
        where('managerId', '==', user.uid)
      );
      
      const stationsSnapshot = await getDocs(stationsQuery);
      const stationsData = stationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setStations(stationsData);

      // Fetch bookings for all stations
      const stationIds = stationsData.map(station => station.id);
      if (stationIds.length > 0) {
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('stationId', 'in', stationIds)
        );
        
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookingsData = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calculate statistics
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const stats = {
          totalStations: stationsData.length,
          activeBookings: bookingsData.filter(booking => 
            booking.status === 'confirmed' && 
            booking.startTime.toDate() > now
          ).length,
          totalRevenue: bookingsData.reduce((sum, booking) => 
            sum + (booking.totalPrice || 0), 0
          ),
          todayRevenue: bookingsData
            .filter(booking => booking.startTime.toDate() >= startOfDay)
            .reduce((sum, booking) => sum + (booking.totalPrice || 0), 0),
          totalBookings: bookingsData.length,
          todayBookings: bookingsData.filter(booking => 
            booking.startTime.toDate() >= startOfDay
          ).length
        };

        setStats(stats);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveBookings = async () => {
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('stationManagerId', '==', user.uid),
        where('status', '==', 'active')
      );
      
      const querySnapshot = await getDocs(bookingsQuery);
      const bookingsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setActiveBookings(bookingsData);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleDeleteStation = async (stationId) => {
    if (window.confirm('Are you sure you want to delete this station?')) {
      try {
        await deleteDoc(doc(db, 'stations', stationId));
        toast.success('Station deleted successfully');
        fetchStations();
      } catch (error) {
        toast.error('Error deleting station');
        console.error('Error deleting station:', error);
      }
    }
  };

  const handleEditStation = (station) => {
    setSelectedStation(station);
    setShowAddForm(true);
  };

  const handleFormSuccess = () => {
    setShowAddForm(false);
    setSelectedStation(null);
    fetchStations();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Station Manager Dashboard</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Add New Station
          </button>
        </div>

        {showAddForm && (
          <div className="mb-8">
            <AddStationForm onSuccess={() => {
              setShowAddForm(false);
              fetchStations();
            }} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Total Stations</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalStations}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Bookings</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeBookings}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${stats.totalRevenue.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Today's Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Stats</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Today's Bookings</p>
                <p className="text-2xl font-bold text-blue-600">{stats.todayBookings}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Today's Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ${stats.todayRevenue.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Booking Value</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${stats.todayBookings > 0 
                    ? (stats.todayRevenue / stats.todayBookings).toFixed(2) 
                    : '0.00'}
                </p>
              </div>
            </div>
          </div>

          {/* Station Management */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Station Management</h2>
            {stations.length === 0 ? (
              <p className="text-gray-600">No stations added yet</p>
            ) : (
              <div className="space-y-4">
                {stations.map(station => (
                  <div key={station.id} className="border rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">{station.name}</h3>
                    <p className="text-sm text-gray-600">
                      Available Slots: {station.availableSlots} / {station.totalSlots}
                    </p>
                    <p className="text-sm text-gray-600">
                      Price: ${station.pricePerHour}/hour
                    </p>
                    <div className="mt-2">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${station.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {station.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StationManagerDashboard; 