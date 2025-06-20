import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';
import AddStationForm from '../components/AddStationForm';
import { FiEdit, FiTrash2, FiPlus, FiBarChart2, FiDollarSign, FiZap, FiBookOpen, FiLoader } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const StationManagerDashboard = () => {
  const { user } = useAuth();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    totalStations: 0,
    activeBookings: 0,
    totalRevenue: 0,
    weeklyRevenueData: [],
  });

  useEffect(() => {
    if (user?.uid) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
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
        const bookingsData = bookingsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Ensure startTime and endTime are JS Date objects
                startTime: data.startTime?.toDate ? data.startTime.toDate() : new Date(),
                endTime: data.endTime?.toDate ? data.endTime.toDate() : new Date(),
            }
        });
        setBookings(bookingsData);

        // Calculate statistics
        const now = new Date();
        const totalRevenue = bookingsData.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);
        const activeBookings = bookingsData.filter(b => b.status === 'confirmed' && b.startTime > now).length;

        // Calculate weekly revenue for chart
        const weeklyRevenueData = Array(7).fill(0).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
          const revenue = bookingsData
            .filter(b => b.startTime.toDateString() === d.toDateString())
            .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
          return { name: dayName, revenue };
        }).reverse();
        
        setStats({
          totalStations: stationsData.length,
          activeBookings: activeBookings,
          totalRevenue: totalRevenue,
          weeklyRevenueData: weeklyRevenueData,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStation = async (stationId) => {
    if (window.confirm('Are you sure you want to delete this station?')) {
      try {
        await deleteDoc(doc(db, 'stations', stationId));
        toast.success('Station deleted successfully');
        fetchData();
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
    fetchData();
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setSelectedStation(null);
  };
  
  const upcomingBookings = bookings
    .filter(b => b.startTime > new Date())
    .sort((a,b) => a.startTime - b.startTime)
    .slice(0, 5);

  if (loading) {
    return <div className="min-h-screen-minus-nav bg-slate-900 flex items-center justify-center"><FiLoader className="text-primary-500 animate-spin h-12 w-12"/></div>;
  }

  return (
    <div className="min-h-screen-minus-nav bg-slate-900 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Manager Dashboard</h1>
          <button
            onClick={() => {
              setSelectedStation(null);
              setShowAddForm(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg shadow-lg hover:opacity-90 transition-opacity"
          >
            <FiPlus className="mr-2 -ml-1 h-5 w-5" />
            Add Station
          </button>
        </div>

        {showAddForm && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
             <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-2xl border border-slate-700 m-4">
                <AddStationForm 
                  stationToEdit={selectedStation} 
                  onSuccess={handleFormSuccess}
                  onClose={handleCloseForm}
                />
            </div>
          </div>
        )}
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard icon={<FiZap />} title="Total Stations" value={stats.totalStations} color="blue" />
            <StatCard icon={<FiBookOpen />} title="Active Bookings" value={stats.activeBookings} color="green" />
            <StatCard icon={<FiDollarSign />} title="Total Revenue" value={`₹${stats.totalRevenue.toFixed(2)}`} color="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: My Stations */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <h2 className="text-xl font-semibold mb-4">My Stations</h2>
                    <div className="space-y-4">
                        {stations.length > 0 ? stations.map(station => (
                            <div key={station.id} className="bg-slate-700/50 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <h3 className="font-semibold text-lg">{station.name}</h3>
                                    <p className="text-sm text-slate-400">{station.address}</p>
                                    <p className="text-sm text-slate-300 mt-1">
                                        Slots: {station.availableSlots}/{station.totalSlots} | Price: ₹{station.pricePerHour}/hr
                                    </p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button onClick={() => handleEditStation(station)} className="p-2 hover:bg-slate-600 rounded-full transition-colors"><FiEdit /></button>
                                    <button onClick={() => handleDeleteStation(station.id)} className="p-2 hover:bg-slate-600 rounded-full transition-colors"><FiTrash2 /></button>
                                </div>
                            </div>
                        )) : <p>No stations found. Add one to get started!</p>}
                    </div>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <h2 className="text-xl font-semibold mb-4">Upcoming Bookings</h2>
                    <div className="space-y-3">
                        {upcomingBookings.length > 0 ? upcomingBookings.map(b => (
                            <div key={b.id} className="bg-slate-700/50 p-3 rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="font-semibold">{stations.find(s=>s.id === b.stationId)?.name || 'Station'}</p>
                                    <p className="text-sm text-slate-400">{b.userEmail || 'User'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm">{b.startTime.toLocaleString()}</p>
                                    <p className="font-semibold text-primary-400">₹{b.totalPrice}</p>
                                </div>
                            </div>
                        )) : <p>No upcoming bookings.</p>}
                    </div>
                </div>
            </div>

            {/* Right Column: Revenue Chart */}
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <h2 className="text-xl font-semibold mb-4">Weekly Revenue</h2>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={stats.weeklyRevenueData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                            <Legend />
                            <Bar dataKey="revenue" fill="#6366f1" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, color }) => {
    const colors = {
        blue: 'text-blue-400',
        green: 'text-green-400',
        purple: 'text-purple-400',
    }
    return (
        <div className="bg-slate-800/50 p-6 rounded-xl flex items-center space-x-4 border border-slate-700">
            <div className={`p-3 rounded-full bg-slate-700 ${colors[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-slate-400">{title}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>
        </div>
    )
}

export default StationManagerDashboard; 