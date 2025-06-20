import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { FiCalendar, FiClock, FiMapPin, FiUser, FiZap, FiX, FiTrash2, FiAlertTriangle, FiExternalLink } from 'react-icons/fi';

const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setError(error);
      }
    };

    if (user) {
      fetchUserRole();
    }
  }, [user]);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user || !userRole) return;

      setLoading(true);
      try {
        let bookingsQuery;
        
        if (userRole === 'station_manager') {
          // For station managers: get their stations first
          const stationsQuery = query(
            collection(db, 'stations'),
            where('managerId', '==', user.uid)
          );
          const stationsSnapshot = await getDocs(stationsQuery);
          const stationIds = stationsSnapshot.docs.map(doc => doc.id);

          if (stationIds.length === 0) {
            setBookings([]);
            setLoading(false);
            return;
          }

          // Then get bookings for those stations
          bookingsQuery = query(
            collection(db, 'bookings'),
            where('stationId', 'in', stationIds)
          );
        } else {
          // For regular users: get their own bookings
          bookingsQuery = query(
            collection(db, 'bookings'),
            where('userId', '==', user.uid)
          );
        }

        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookingsData = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // For station managers, fetch user details for each booking
        if (userRole === 'station_manager') {
          const bookingsWithUserDetails = await Promise.all(
            bookingsData.map(async (booking) => {
              const userDoc = await getDoc(doc(db, 'users', booking.userId));
              return {
                ...booking,
                userDetails: userDoc.exists() ? userDoc.data() : null
              };
            })
          );
          setBookings(bookingsWithUserDetails);
        } else {
          setBookings(bookingsData);
        }
      } catch (error) {
        console.error('Error fetching bookings:', error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user, userRole]);

  const handleCancelBooking = async (bookingId, startTime) => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingDoc = await getDoc(bookingRef);
      
      if (!bookingDoc.exists()) {
        toast.error('Booking not found');
        return;
      }

      const bookingData = bookingDoc.data();
      const bookingStartTime = bookingData.startTime.toDate();
      
      // Check if booking is in the future
      if (bookingStartTime <= new Date()) {
        toast.error('Cannot cancel past bookings');
        return;
      }

      // Update booking status
      await updateDoc(bookingRef, {
        status: 'cancelled'
      });

      // Update station's available slots
      const stationRef = doc(db, 'stations', bookingData.stationId);
      const stationDoc = await getDoc(stationRef);
      if (stationDoc.exists()) {
        const stationData = stationDoc.data();
        await updateDoc(stationRef, {
          availableSlots: stationData.availableSlots + 1
        });
      }

      // Update local state
      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking.id === bookingId
            ? { ...booking, status: 'cancelled' }
            : booking
        )
      );

      toast.success('Booking cancelled successfully');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  const handleDeleteBooking = async () => {
    if (!bookingToDelete) return;

    try {
      const bookingRef = doc(db, 'bookings', bookingToDelete.id);
      const bookingDoc = await getDoc(bookingRef);
      
      if (!bookingDoc.exists()) {
        toast.error('Booking not found');
        return;
      }

      const bookingData = bookingDoc.data();
      
      // If booking is confirmed and in the future, update station slots
      if (bookingData.status === 'confirmed' && bookingData.startTime.toDate() > new Date()) {
        const stationRef = doc(db, 'stations', bookingData.stationId);
        const stationDoc = await getDoc(stationRef);
        if (stationDoc.exists()) {
          const stationData = stationDoc.data();
          await updateDoc(stationRef, {
            availableSlots: stationData.availableSlots + 1
          });
        }
      }

      // Delete the booking
      await deleteDoc(bookingRef);

      // Update local state
      setBookings(prevBookings =>
        prevBookings.filter(booking => booking.id !== bookingToDelete.id)
      );

      toast.success('Booking deleted successfully');
      setShowDeleteModal(false);
      setBookingToDelete(null);
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Failed to delete booking');
    }
  };

  const openDeleteModal = (booking) => {
    setBookingToDelete(booking);
    setShowDeleteModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-6 sm:h-8 bg-gray-200 rounded w-1/3 sm:w-1/4 mb-4 sm:mb-6"></div>
            <div className="space-y-3 sm:space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 sm:h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-red-600 text-sm sm:text-base">
            Error loading bookings: {error.message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
          {userRole === 'station_manager' ? 'Station Bookings' : 'My Bookings'}
        </h1>

        {bookings.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 max-w-md mx-auto">
              <FiCalendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">No bookings found</h3>
              <p className="text-sm sm:text-base text-gray-500 mb-6">
                {userRole === 'station_manager'
                  ? 'No bookings have been made to your stations yet.'
                  : 'Get started by booking a charging slot.'}
              </p>
              {userRole !== 'station_manager' && (
                <Link
                  to="/"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  <FiZap className="mr-2 h-4 w-4" />
                  Find Stations
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 sm:p-6">
                  {/* Header Section */}
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
                    {/* Left Content */}
                    <div className="flex-1 mb-4 lg:mb-0">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                          {booking.stationName}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)} ml-3`}>
                          {booking.status}
                        </span>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 text-sm sm:text-base text-gray-600 mb-3">
                        <div className="flex items-center mb-2 sm:mb-0">
                          <FiCalendar className="mr-2 h-4 w-4" />
                          {formatDate(booking.startTime)}
                        </div>
                        <div className="flex items-center mb-2 sm:mb-0">
                          <FiClock className="mr-2 h-4 w-4" />
                          {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                        </div>
                        <div className="flex items-center">
                          <FiMapPin className="mr-2 h-4 w-4" />
                          {booking.stationAddress || 'Address not available'}
                        </div>
                      </div>

                      {userRole === 'station_manager' && booking.userDetails && (
                        <div className="flex items-center text-sm text-gray-600 mb-3">
                          <FiUser className="mr-2 h-4 w-4" />
                          <span className="font-medium">Booked by:</span>
                          <span className="ml-1">{booking.userDetails.name || booking.userDetails.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Right Side - Action Buttons */}
                    <div className="flex flex-col space-y-2 lg:items-end">
                      <Link
                        to={`/station/${booking.stationId}`}
                        className="inline-flex items-center px-3 py-2 border border-primary-300 shadow-sm text-sm font-medium rounded-lg text-primary-700 bg-primary-50 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                      >
                        <FiExternalLink className="mr-2 h-4 w-4" />
                        View Station
                      </Link>
                      
                      <div className="flex space-x-2">
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => handleCancelBooking(booking.id, booking.startTime)}
                            className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                          >
                            <FiX className="mr-2 h-4 w-4" />
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => openDeleteModal(booking)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                        >
                          <FiTrash2 className="mr-2 h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm sm:text-base bg-gray-50 p-4 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-700">Duration:</span>
                      <p className="text-gray-600">{booking.duration} hours</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Total Cost:</span>
                      <p className="text-gray-600">${booking.totalCost || booking.totalPrice || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Payment Status:</span>
                      <p className="text-gray-600">{booking.paymentStatus}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Booking ID:</span>
                      <p className="text-gray-600 font-mono text-xs">{booking.id.slice(-8)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && bookingToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-sm sm:max-w-md w-full mx-auto p-4 sm:p-6 relative">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <FiAlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">Delete Booking</h3>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm sm:text-base text-gray-600">
                  Are you sure you want to delete this booking for <strong>{bookingToDelete.stationName}</strong>?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => { setShowDeleteModal(false); setBookingToDelete(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteBooking}
                  className="flex-1 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;
 