import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStation } from '../hooks/useFirestore';
import { useAuth } from '../hooks/useAuth';
import { collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';
import { FiMapPin, FiClock, FiDollarSign, FiZap, FiX } from 'react-icons/fi';

import Map from '../components/Map';
import BookingForm from '../components/BookingForm';

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
    try {
      // 1. Check for availability one last time
      const stationRef = doc(db, 'stations', id);
      const stationDoc = await getDoc(stationRef);
      const currentStation = stationDoc.data();

      if (currentStation.availableSlots <= 0) {
        toast.error('Sorry, no slots are available at this station.');
        setIsBooking(false);
        return;
      }

      // 2. Create booking document
      const bookingData = {
        ...bookingDetails,
        userId: user.uid,
        stationId: id,
        stationName: currentStation.name,
        stationManagerId: currentStation.managerId,
        status: 'confirmed',
        paymentStatus: 'completed', // Assuming payment is handled
        createdAt: new Date()
      };
      await addDoc(collection(db, 'bookings'), bookingData);

      // 3. Update station's available slots
      await updateDoc(stationRef, {
        availableSlots: currentStation.availableSlots - 1
      });

      toast.success('Booking successful!');
      navigate('/my-bookings');

    } catch (err) {
      console.error('Booking failed:', err);
      toast.error(err.message || 'Failed to book the station. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  // Auction logic
  const handleBidSubmit = (e) => {
    e.preventDefault();
    setIsAuctionRunning(true);
    setAuctionResult(null);
    // Simulate 3-4 dummy user bids
    const dummyBids = [
      { name: 'UserA', bid: Math.floor(Math.random() * 100) + 50 },
      { name: 'UserB', bid: Math.floor(Math.random() * 100) + 50 },
      { name: 'UserC', bid: Math.floor(Math.random() * 100) + 50 },
      { name: 'UserD', bid: Math.floor(Math.random() * 100) + 50 },
    ];
    const yourBid = { name: user?.displayName || user?.email || 'You', bid: Number(userBid) };
    const allBids = [...dummyBids, yourBid];
    allBids.sort((a, b) => b.bid - a.bid);
    const winner = allBids[0];
    setTimeout(() => {
      setAuctionResult({
        winner,
        yourBid,
        allBids,
        isWinner: winner.name === yourBid.name && winner.bid === yourBid.bid,
      });
      setIsAuctionRunning(false);
    }, 1200);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] text-red-600 px-4">
        <p className="text-sm sm:text-base">Error: {error ? error.message : 'Station not found.'}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">{station.name}</h1>
          <p className="mt-2 text-sm sm:text-base lg:text-lg text-gray-500 flex items-center">
            <FiMapPin className="mr-2 h-4 w-4" />
            {station.location?.address}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
          {/* Left Column: Station Info & Map */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* Map */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden h-[300px] sm:h-[400px] lg:h-[500px]">
              <Map 
                center={station.location} 
                stations={[station]} 
                zoom={15}
              />
            </div>

            {/* Station Details */}
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Station Info</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-sm sm:text-base text-gray-600">
                <div className="flex items-center">
                  <FiDollarSign className="mr-2 h-4 w-4 text-green-600" />
                  <span><strong>Price:</strong> ${station.pricePerHour}/hour</span>
                </div>
                <div className="flex items-center">
                  <FiZap className="mr-2 h-4 w-4 text-blue-600" />
                  <span><strong>Total Ports:</strong> {station.totalPorts ?? 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <FiClock className="mr-2 h-4 w-4 text-orange-600" />
                  <span><strong>Available Slots:</strong> {station.availableSlots ?? 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span><strong>Status:</strong> <span className={`font-bold ${
                    station.status === 'available' ? 'text-green-600' :
                    station.status === 'busy' ? 'text-red-600' :
                    'text-gray-500'
                  }`}>{station.status}</span></span>
                </div>
                {station.amenities && (
                  <div className="col-span-1 sm:col-span-2">
                    <strong>Amenities:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {station.amenities.map(item => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Booking Form + Auction */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:sticky lg:top-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Book a Slot</h2>
              <BookingForm 
                station={station} 
                onSubmit={handleBooking} 
                isBooking={isBooking}
              />
              {/* Auction Button */}
              <div className="mt-6 sm:mt-8">
                <button
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg shadow-md transition-colors text-sm sm:text-base"
                  onClick={() => setShowBidModal(true)}
                >
                  Bid for Slot 
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Simple Modal for Auction */}
        {showBidModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-sm sm:max-w-md w-full mx-auto p-4 sm:p-6 lg:p-8 relative">
              <button
                className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold p-1"
                onClick={() => { setShowBidModal(false); setAuctionResult(null); setUserBid(''); }}
                aria-label="Close"
              >
                <FiX className="h-6 w-6" />
              </button>
              <h2 className="text-xl sm:text-2xl font-bold mb-4">E-Auction: Bid for Slot</h2>
              <ol className="mb-4 text-gray-700 text-sm sm:text-base list-decimal list-inside space-y-1">
                <li>Enter your max bid (₹).</li>
                <li>System will simulate 4-5 users bidding.</li>
                <li>Highest bidder wins the slot!</li>
              </ol>
              {!auctionResult ? (
                <form onSubmit={handleBidSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="bid" className="block text-sm font-medium text-gray-700 mb-1">
                      Your Bid (₹)
                    </label>
                    <input
                      type="number"
                      id="bid"
                      value={userBid}
                      onChange={(e) => setUserBid(e.target.value)}
                      className="w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="Enter your bid amount"
                      required
                      min="1"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAuctionRunning || !userBid}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    {isAuctionRunning ? 'Running Auction...' : 'Submit Bid'}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg text-center ${
                    auctionResult.isWinner ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    <h3 className="font-bold text-lg">
                      {auctionResult.isWinner ? '🎉 You Won!' : '😔 You Lost'}
                    </h3>
                    <p className="text-sm sm:text-base">
                      Winning bid: ₹{auctionResult.winner.bid} by {auctionResult.winner.name}
                    </p>
                    <p className="text-sm sm:text-base">
                      Your bid: ₹{auctionResult.yourBid.bid}
                    </p>
                  </div>
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <h4 className="font-semibold text-sm sm:text-base mb-2">All Bids:</h4>
                    <ul className="text-xs sm:text-sm space-y-1">
                      {auctionResult.allBids.map((bid, index) => (
                        <li key={index} className={`${bid.name === auctionResult.yourBid.name ? 'font-bold' : ''}`}>
                          {bid.name}: ₹{bid.bid}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={() => { setShowBidModal(false); setAuctionResult(null); setUserBid(''); }}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg transition-colors text-sm sm:text-base"
                  >
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