import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
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
            Error loading bookings: {error.message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {userRole === 'station_manager' ? 'Station Bookings' : 'My Bookings'}
        </h1>

        {bookings.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {userRole === 'station_manager'
                ? 'No bookings have been made to your stations yet.'
                : 'Get started by booking a charging slot.'}
            </p>
            {userRole !== 'station_manager' && (
            <div className="mt-6">
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Find a Station
              </Link>
            </div>
            )}
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {bookings.map((booking) => (
                <li key={booking.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-medium text-gray-900 truncate">
                          {booking.stationName}
                        </h2>
                        {userRole === 'station_manager' && booking.userDetails && (
                          <p className="mt-1 text-sm text-gray-500">
                            Booked by: {booking.userDetails.displayName || booking.userDetails.email}
                          </p>
                        )}
                        <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            {booking.startTime.toDate().toLocaleString()}
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            {booking.duration} hour{booking.duration > 1 ? 's' : ''}
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            ${booking.totalPrice}
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            {booking.vehicleType}
                          </div>
                        </div>
                        {booking.notes && (
                          <p className="mt-2 text-sm text-gray-500">
                            Notes: {booking.notes}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 flex-shrink-0 flex flex-col items-end">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'}`}>
                          {booking.status}
                        </span>
                        {userRole !== 'station_manager' && 
                         booking.status === 'confirmed' && 
                         booking.startTime.toDate() > new Date() && (
                          <button
                            onClick={() => handleCancelBooking(booking.id, booking.startTime)}
                            className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-4">
                      <Link
                        to={`/station/${booking.stationId}`}
                        className="text-sm font-medium text-primary-600 hover:text-primary-500"
                      >
                        View Station Details →
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;
 