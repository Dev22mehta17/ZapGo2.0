import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { FiCalendar, FiClock, FiMapPin, FiUser, FiZap, FiX, FiTrash2, FiAlertTriangle, FiExternalLink, FiLoader, FiInbox } from 'react-icons/fi';

const BookingCard = ({ booking, userRole, openDeleteModal, onBookingUpdate }) => {
  const getStatusClasses = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'completed':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getPaymentTypeText = (paymentType) => {
    switch (paymentType) {
      case 'booking':
        return 'Partial (20%)';
      case 'full':
        return 'Full Payment';
      default:
        return 'Standard';
    }
  };

  const getPaymentMethodText = (paymentMethod) => {
    switch (paymentMethod) {
      case 'card':
        return 'Credit/Debit Card';
      case 'upi':
        return 'UPI';
      case 'wallet':
        return 'Digital Wallet';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'N/A';
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };
  
  const formatTime = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'N/A';
    return timestamp.toDate().toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="flex-grow">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-3">
          <h3 className="text-2xl font-bold text-white mb-2 sm:mb-0">
            {booking.stationName || 'Station Name Not Found'}
          </h3>
          <div className="flex items-center space-x-2">
            <div className={`px-3 py-1 text-sm font-bold rounded-full border ${getStatusClasses(booking.status)}`}>
              {booking.status}
            </div>
            {booking.bookingType === 'bid' && (
              <div className="px-3 py-1 text-sm font-bold rounded-full border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                🏆 Bid
              </div>
            )}
          </div>
        </div>
        
        <p className="flex items-center text-slate-400 mb-4">
          <FiMapPin className="mr-2 h-4 w-4" />
          {booking.stationAddress || 'Address not available'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-slate-300">
          <div className="flex items-center">
            <FiCalendar className="mr-2 h-5 w-5 text-primary-400" />
            <div>
              <p className="text-xs text-slate-400">Date</p>
              <p className="font-semibold">{formatDate(booking.date)}</p>
            </div>
          </div>
          <div className="flex items-center">
            <FiClock className="mr-2 h-5 w-5 text-primary-400" />
            <div>
              <p className="text-xs text-slate-400">Time & Port</p>
              <p className="font-semibold">{formatTime(booking.startTime)} - {formatTime(booking.endTime)} {booking.portNumber && `(Port ${booking.portNumber})`}</p>
            </div>
          </div>
          {userRole === 'stationManager' && booking.userDetails && (
             <div className="flex items-center">
              <FiUser className="mr-2 h-5 w-5 text-primary-400" />
              <div>
                <p className="text-xs text-slate-400">Booked By</p>
                <p className="font-semibold">{booking.userDetails.name} ({booking.userDetails.email})</p>
              </div>
            </div>
          )}
        </div>

        {/* Payment Information */}
        {booking.paymentType && (
          <div className="mt-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
            <h4 className="text-sm font-semibold text-white mb-2">Payment Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Type:</span>
                <span className="text-white font-medium">{getPaymentTypeText(booking.paymentType)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Method:</span>
                <span className="text-white font-medium">{getPaymentMethodText(booking.paymentMethod)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount Paid:</span>
                <span className="text-green-400 font-medium">${booking.paymentAmount?.toFixed(2) || booking.totalPrice?.toFixed(2) || 'N/A'}</span>
              </div>
              {booking.paymentType === 'booking' && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Remaining Balance:</span>
                  <span className="text-yellow-400 font-medium">${((booking.totalPrice || 0) - (booking.paymentAmount || 0)).toFixed(2)}</span>
                </div>
              )}
              {booking.dynamicPricing > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Dynamic Pricing:</span>
                  <span className="text-yellow-400 font-medium">+${booking.dynamicPricing.toFixed(2)}</span>
                </div>
              )}
              {booking.bookingType === 'bid' && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Bid Amount:</span>
                  <span className="text-yellow-400 font-medium">${booking.bidAmount || booking.totalPrice}</span>
                </div>
              )}
              {booking.penalty > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Late Payment Penalty:</span>
                  <span className="text-red-400 font-medium">+${booking.penalty.toFixed(2)}</span>
                </div>
              )}
              {booking.isRefundable === false && (
                <div className="col-span-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Refund Status:</span>
                    <span className="text-red-400 font-medium">Non-Refundable</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex-shrink-0 flex flex-col items-end gap-2 pt-4 md:pt-0 self-start md:self-center">
        <div className="flex items-center gap-2">
        <Link to={`/station/${booking.stationId}`} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors">
          <FiExternalLink className="h-5 w-5" />
        </Link>
        <button onClick={() => openDeleteModal(booking)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-700 rounded-full transition-colors">
          <FiTrash2 className="h-5 w-5" />
        </button>
        </div>
        {booking.transactionHash && (
          <a
            href={`https://sepolia.etherscan.io/tx/${booking.transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 text-xs text-blue-400 hover:underline flex items-center gap-1"
          >
            View On-Chain <FiExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
};

const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user) return;
      setLoading(true);
      
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};
        const userRole = userData.role;

        let bookingsQuery;
        
        if (userRole === 'stationManager') {
          // 1. Find all stations managed by this user
          const stationsQuery = query(collection(db, 'stations'), where('managerId', '==', user.uid));
          const stationsSnapshot = await getDocs(stationsQuery);
          const stationIds = stationsSnapshot.docs.map(doc => doc.id);

          // 2. Find all bookings for those stations
          if (stationIds.length > 0) {
          bookingsQuery = query(
            collection(db, 'bookings'),
              where('stationId', 'in', stationIds),
            orderBy('startTime', 'desc')
          );
          } else {
            // No stations found for this manager, so no bookings to fetch
            setBookings([]);
            setLoading(false);
            return;
          }
        } else {
          bookingsQuery = query(
            collection(db, 'bookings'),
            where('userId', '==', user.uid),
            orderBy('startTime', 'desc')
          );
        }

        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookingsData = await Promise.all(bookingsSnapshot.docs.map(async (bookingDoc) => {
          const booking = { id: bookingDoc.id, ...bookingDoc.data() };

          // Fetch station address with proper null checks
          try {
            const stationDocRef = doc(db, 'stations', booking.stationId);
            const stationDoc = await getDoc(stationDocRef);
            if (stationDoc.exists()) {
              const stationData = stationDoc.data();
              booking.stationAddress = stationData?.location?.address || stationData?.address || 'Address not available';
            } else {
              booking.stationAddress = 'Station not found';
            }
          } catch (stationError) {
            console.error('Error fetching station:', stationError);
            booking.stationAddress = 'Error loading address';
          }

          // Fetch user details if manager is viewing
          if (userRole === 'stationManager') {
            try {
              const userDetailsDoc = await getDoc(doc(db, 'users', booking.userId));
              booking.userDetails = userDetailsDoc.exists() ? userDetailsDoc.data() : null;
            } catch (userError) {
              console.error('Error fetching user details:', userError);
              booking.userDetails = null;
            }
          }
          return booking;
        }));

        setBookings(bookingsData);

      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError(err);
        toast.error('Failed to fetch bookings.');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user]);

  const handleDeleteBooking = async () => {
    if (!bookingToDelete) return;
    const toastId = toast.loading("Deleting booking...");

    try {
      const bookingRef = doc(db, 'bookings', bookingToDelete.id);
      await deleteDoc(bookingRef);

      // If the booking was confirmed and in the future, increment the station's available slots
      if (bookingToDelete.status === 'confirmed' && bookingToDelete.startTime.toDate() > new Date()) {
        const stationRef = doc(db, 'stations', bookingToDelete.stationId);
        const stationDoc = await getDoc(stationRef);
        if (stationDoc.exists()) {
          const stationData = stationDoc.data();
          const newSlotCount = (stationData.availableSlots || 0) + 1;
          const newStatus = newSlotCount > 0 ? 'available' : 'busy';
          await updateDoc(stationRef, {
            availableSlots: newSlotCount,
            status: newStatus
          });
        }
      }

      setBookings(prev => prev.filter(b => b.id !== bookingToDelete.id));
      toast.success('Booking deleted successfully!', { id: toastId });
      setShowDeleteModal(false);
      setBookingToDelete(null);

    } catch (err) {
      console.error('Error deleting booking:', err);
      toast.error(err.message || 'Failed to delete booking.', { id: toastId });
    }
  };

  const openDeleteModal = (booking) => {
    setBookingToDelete(booking);
    setShowDeleteModal(true);
  };
  
  const userRoleFromAuth = useAuth().user?.role;

  const handleBookingUpdate = (updatedBooking) => {
    setBookings(prev => prev.map(booking => 
      booking.id === updatedBooking.id ? updatedBooking : booking
    ));
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-grow flex items-center justify-center text-white">
          <FiLoader className="animate-spin h-12 w-12 text-primary-500" />
        </div>
      );
    }

    if (error) {
       return (
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="text-center text-red-400 bg-red-900/50 p-6 rounded-lg">
            <FiAlertTriangle className="h-12 w-12 mx-auto" />
            <p className="mt-4 text-lg font-semibold">Failed to load bookings</p>
            <p className="text-red-300">{error.message}</p>
          </div>
        </div>
      );
    }

    if (bookings.length === 0) {
      return (
        <div className="flex-grow flex items-center justify-center text-center text-slate-400 p-4">
          <div>
            <FiInbox className="h-20 w-20 mx-auto text-slate-600" />
            <h2 className="mt-4 text-2xl font-bold text-white">No Bookings Found</h2>
            <p className="mt-2">You haven't made any bookings yet. Let's find a station!</p>
            <Link to="/" className="mt-6 inline-block px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors">
              Find a Station
            </Link>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {bookings.map((booking) => (
          <BookingCard 
            key={booking.id} 
            booking={booking} 
            userRole={userRoleFromAuth} 
            openDeleteModal={openDeleteModal}
            onBookingUpdate={handleBookingUpdate}
          />
        ))}
      </div>
    );
  };
  
  return (
    <>
      <div className="min-h-screen-minus-nav bg-slate-900 text-white p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight">My Bookings</h1>
            <p className="mt-2 text-lg text-slate-400">
              {loading ? 'Loading your bookings...' : `You have ${bookings.length} booking(s).`}
            </p>
          </div>
          
          <div className="flex flex-col">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-w-md w-full mx-auto p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-500/20 mb-4">
                <FiAlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Delete Booking</h3>
              <p className="mt-2 text-slate-400">
                Are you sure you want to delete this booking? This action cannot be undone.
              </p>
            </div>
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-6 py-2.5 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBooking}
                className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MyBookings;
 