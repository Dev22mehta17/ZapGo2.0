import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStation } from '../hooks/useFirestore';
import { useAuth } from '../hooks/useAuth';
import { collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';
import { FiMapPin, FiClock, FiDollarSign, FiZap, FiX, FiLoader, FiAlertTriangle, FiWifi, FiCoffee, FiShoppingCart } from 'react-icons/fi';

import Map from '../components/Map';
import BookingForm from '../components/BookingForm';

// A simple component to map amenity strings to icons
const AmenityIcon = ({ amenity }) => {
  const iconMap = {
    wifi: <FiWifi className="mr-2 h-5 w-5 text-primary-400" />,
    cafe: <FiCoffee className="mr-2 h-5 w-5 text-primary-400" />,
    store: <FiShoppingCart className="mr-2 h-5 w-5 text-primary-400" />,
  };
  const lowerCaseAmenity = amenity.toLowerCase();
  return iconMap[lowerCaseAmenity] || <FiZap className="mr-2 h-5 w-5 text-primary-400" />;
};

const StationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { station, loading, error } = useStation(id);
  const [isBooking, setIsBooking] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [userBid, setUserBid] = useState('');
  const [auctionResult, setAuctionResult] = useState(null);
  const [isAuctionRunning, setIsAuctionRunning] = useState(false);

  const handleBooking = async (bookingDetails) => {
    if (!user) {
      toast.error('You must be logged in to book a station.');
      navigate('/login');
      return;
    }

    setIsBooking(true);
    const toastId = toast.loading('Processing your booking...');
    try {
      const stationRef = doc(db, 'stations', id);
      const stationDoc = await getDoc(stationRef);
      const currentStation = stationDoc.data();

      if (currentStation.availableSlots <= 0) {
        toast.error('Sorry, no slots are available at this station.', { id: toastId });
        setIsBooking(false);
        return;
      }

      const bookingData = {
        ...bookingDetails,
        userId: user.uid,
        stationId: id,
        stationName: currentStation.name,
        stationManagerId: currentStation.managerId,
        status: 'confirmed',
        paymentStatus: 'completed',
        createdAt: new Date()
      };
      await addDoc(collection(db, 'bookings'), bookingData);

      const newSlotCount = currentStation.availableSlots - 1;
      const newStatus = newSlotCount > 0 ? 'available' : 'busy';

      await updateDoc(stationRef, {
        availableSlots: newSlotCount,
        status: newStatus,
      });

      toast.success('Booking successful! Redirecting...', { id: toastId });
      navigate('/my-bookings');

    } catch (err) {
      console.error('Booking failed:', err);
      toast.error(err.message || 'Failed to book the station. Please try again.', { id: toastId });
    } finally {
      setIsBooking(false);
    }
  };

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    if (!userBid || Number(userBid) <= 0) {
        toast.error("Please enter a valid bid amount.");
        return;
    }
    setIsAuctionRunning(true);
    setAuctionResult(null);
    const dummyBids = Array.from({ length: 3 }, () => ({
      name: `User${Math.random().toString(36).substring(7)}`,
      bid: Math.floor(Math.random() * 150) + 50,
    }));
    const yourBid = { name: user?.displayName || 'You', bid: Number(userBid) };
    const allBids = [...dummyBids, yourBid];
    allBids.sort((a, b) => b.bid - a.bid);
    const winner = allBids[0];
    const isWinner = winner.name === yourBid.name && winner.bid === yourBid.bid;
    
    setTimeout(async () => {
      setAuctionResult({
        winner,
        yourBid,
        allBids,
        isWinner,
      });
      setIsAuctionRunning(false);
      
      // If user won the bid, save it as a booking
      if (isWinner && user) {
        try {
          const stationRef = doc(db, 'stations', id);
          const stationDoc = await getDoc(stationRef);
          const currentStation = stationDoc.data();
          
          if (currentStation.availableSlots <= 0) {
            toast.error('Sorry, no slots are available at this station.');
            return;
          }

          // Create booking data for the winning bid
          const bookingData = {
            userId: user.uid,
            userName: user.displayName || user.email,
            stationId: id,
            stationName: currentStation.name,
            stationManagerId: currentStation.managerId,
            startTime: new Date(), // Default to current time, can be adjusted later
            duration: 1, // Default 1 hour, can be adjusted
            vehicleType: 'car', // Default vehicle type
            status: 'pending', // Pending confirmation by station master
            paymentStatus: 'completed', // Bid payment is completed
            totalPrice: winner.bid, // The winning bid amount
            bookingType: 'bid', // Mark this as a bid-based booking
            bidAmount: winner.bid,
            bidWinner: user.displayName || user.email,
            createdAt: new Date(),
            notes: `Won auction with bid of $${winner.bid}`,
            // Additional bid-specific fields
            auctionResult: {
              winner: winner,
              allBids: allBids,
              auctionDate: new Date()
            }
          };

          // Save the booking to Firestore
          await addDoc(collection(db, 'bookings'), bookingData);

          // Update station's available slots
          const newSlotCount = currentStation.availableSlots - 1;
          const newStatus = newSlotCount > 0 ? 'available' : 'busy';

          await updateDoc(stationRef, {
            availableSlots: newSlotCount,
            status: newStatus,
          });

          toast.success(`Bid won! Booking created for $${winner.bid}. Station master will confirm shortly.`);
          
        } catch (error) {
          console.error('Error creating bid booking:', error);
          toast.error('Failed to create booking for winning bid. Please try again.');
        }
      }
    }, 1500);
  };

  const MemoizedMap = useMemo(() => {
    if (loading || !station?.location) return null;
    return (
       <div className="rounded-xl overflow-hidden border-2 border-slate-700 h-[300px] md:h-[400px]">
        <Map 
          center={station.location} 
          stations={[station]} 
          zoom={15}
        />
       </div>
    );
  }, [station, loading]);

  if (loading) {
    return (
      <div className="h-screen-minus-nav flex items-center justify-center text-white">
        <FiLoader className="animate-spin h-12 w-12 text-primary-500" />
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="h-screen-minus-nav flex items-center justify-center p-4">
        <div className="text-center text-red-400 bg-red-900/50 p-6 rounded-lg">
          <FiAlertTriangle className="h-12 w-12 mx-auto" />
          <p className="mt-4 text-lg font-semibold">{error ? 'Failed to load station' : 'Station Not Found'}</p>
          {error && <p className="text-red-300">{error.message}</p>}
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'available': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'busy': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };
  
  return (
    <div className="min-h-screen-minus-nav bg-slate-900 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight">{station.name}</h1>
          <p className="mt-2 text-lg text-slate-400 flex items-center">
            <FiMapPin className="mr-2 h-5 w-5" />
            {station.location?.address}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Station Info & Map */}
          <div className="lg:col-span-2 space-y-8">
            {MemoizedMap}

            {/* Station Details */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-6">Station Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg">
                <div className="flex items-center"><FiZap className="mr-3 h-6 w-6 text-primary-400" /><span>Total Ports: <strong className="font-semibold text-white">{station.totalPorts ?? 'N/A'}</strong></span></div>
                <div className="flex items-center"><FiZap className="mr-3 h-6 w-6 text-green-400" /><span>Available Slots: <strong className="font-semibold text-white">{station.availableSlots ?? 'N/A'}</strong></span></div>
                <div className="flex items-center"><FiDollarSign className="mr-3 h-6 w-6 text-yellow-400" /><span>Price: <strong className="font-semibold text-white">${station.pricePerHour}/hour</strong></span></div>
                <div className="flex items-center">
                  <FiClock className="mr-3 h-6 w-6 text-cyan-400" />
                  <span>Status: 
                    <span className={`ml-2 px-3 py-1 text-sm font-bold rounded-full border ${getStatusColor(station.status)}`}>
                        {station.status}
                    </span>
                  </span>
                </div>
              </div>
              {station.amenities && station.amenities.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-bold mb-4">Amenities</h3>
                  <div className="flex flex-wrap gap-4">
                    {station.amenities.map(item => (
                      <div key={item} className="flex items-center bg-slate-700/50 px-4 py-2 rounded-lg">
                        <AmenityIcon amenity={item} /> {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Booking Form + Auction */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 lg:sticky lg:top-24">
              <h2 className="text-2xl font-bold mb-6 text-center text-white">Book Your Slot</h2>
              <BookingForm 
                station={station} 
                onSubmit={handleBooking} 
                isBooking={isBooking}
              />
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700" /></div>
                <div className="relative flex justify-center text-sm"><span className="px-2 bg-slate-800 text-slate-400">Or</span></div>
              </div>
              <button
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:opacity-90 transition-opacity"
                onClick={() => setShowBidModal(true)}
              >
                Bid for a Priority Slot
              </button>
            </div>
          </div>
        </div>

        {/* --- Auction Modal --- */}
        {showBidModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-w-md w-full mx-auto p-6 relative">
              <button
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
                onClick={() => {
                  setShowBidModal(false);
                  setAuctionResult(null);
                  setUserBid('');
                }}
              >
                <FiX className="h-6 w-6" />
              </button>
              <h2 className="text-2xl font-bold text-white mb-4">E-Auction for Priority Slot</h2>
              
              {!auctionResult ? (
                <form onSubmit={handleBidSubmit} className="space-y-4">
                   <p className="text-slate-400">Place a bid. The highest bidder wins the next available slot automatically.</p>
                  <div>
                    <label htmlFor="bid" className="block text-sm font-medium text-slate-300 mb-2">Your Bid (in $)</label>
                    <input
                      id="bid"
                      type="number"
                      value={userBid}
                      onChange={(e) => setUserBid(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      placeholder="e.g., 50"
                    />
                  </div>
                  <button type="submit" disabled={isAuctionRunning} className="w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                    {isAuctionRunning ? <FiLoader className="animate-spin mx-auto h-6 w-6" /> : 'Place Bid'}
                  </button>
                </form>
              ) : (
                <div className="text-center">
                  <h3 className={`text-3xl font-bold mb-4 ${auctionResult.isWinner ? 'text-green-400' : 'text-red-400'}`}>
                    {auctionResult.isWinner ? 'You Won!' : 'Auction Lost'}
                  </h3>
                  <p className="text-slate-300 mb-4">The winning bid was <strong className="text-white">${auctionResult.winner.bid}</strong> by <strong className="text-white">{auctionResult.winner.name}</strong>.</p>
                  <p className="text-slate-400 text-sm mb-6">Your bid was <strong className="text-white">${auctionResult.yourBid.bid}</strong>.</p>
                  {auctionResult.isWinner && <p className="text-green-400 font-semibold mb-6">Congratulations! The slot is yours. You will be notified shortly.</p>}
                  <button onClick={() => { setShowBidModal(false); setAuctionResult(null); setUserBid(''); }} className="w-full py-3 px-4 bg-slate-700 rounded-lg font-semibold hover:bg-slate-600 transition-colors">
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StationDetails; 