import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { FiClock, FiCheckCircle, FiXCircle, FiAlertTriangle, FiMapPin } from 'react-icons/fi';

const ArrivalTracker = ({ booking, onStatusUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isLate, setIsLate] = useState(false);
  const [isNoShow, setIsNoShow] = useState(false);

  useEffect(() => {
    if (!booking || !booking.startTime) return;

    const checkArrivalStatus = () => {
      const now = new Date();
      const bookingTime = booking.startTime.toDate ? booking.startTime.toDate() : new Date(booking.startTime);
      const timeDiff = now - bookingTime;
      const minutesDiff = Math.floor(timeDiff / (1000 * 60));

      // 10 minutes late threshold
      if (minutesDiff > 10 && minutesDiff <= 15) {
        setIsLate(true);
        setTimeRemaining(`Late by ${minutesDiff} minutes`);
      }
      // 15 minutes = no-show
      else if (minutesDiff > 15) {
        setIsNoShow(true);
        setTimeRemaining('No-show (15+ minutes late)');
      }
      // On time or early
      else if (minutesDiff >= -15 && minutesDiff <= 10) {
        setTimeRemaining(`Arrival window: ${Math.max(0, 10 - minutesDiff)} minutes remaining`);
      }
      // Too early
      else {
        setTimeRemaining(`Too early: ${Math.abs(minutesDiff)} minutes before booking`);
      }
    };

    checkArrivalStatus();
    const interval = setInterval(checkArrivalStatus, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [booking]);

  const handleArrival = async () => {
    if (!booking) return;
    
    setLoading(true);
    try {
      const now = new Date();
      const bookingTime = booking.startTime.toDate ? booking.startTime.toDate() : new Date(booking.startTime);
      const timeDiff = now - bookingTime;
      const minutesDiff = Math.floor(timeDiff / (1000 * 60));

      let arrivalStatus = 'arrived';
      let penaltyAmount = 0;
      let penaltyType = null;

      // Determine penalty based on arrival time
      if (minutesDiff > 15) {
        arrivalStatus = 'no_show';
        penaltyAmount = booking.noShowPenalty || (booking.totalPrice * 0.15);
        penaltyType = 'no_show';
      } else if (minutesDiff > 10) {
        arrivalStatus = 'late';
        penaltyAmount = booking.lateArrivalPenalty || (booking.totalPrice * 0.10);
        penaltyType = 'late_arrival';
      }

      const updateData = {
        arrivalStatus,
        arrivalTime: now,
        penaltyApplied: penaltyAmount > 0,
        penaltyAmount,
        penaltyType
      };

      await updateDoc(doc(db, 'bookings', booking.id), updateData);

      if (penaltyAmount > 0) {
        toast.error(`Penalty applied: $${penaltyAmount.toFixed(2)} for ${penaltyType === 'no_show' ? 'no-show' : 'late arrival'}`);
      } else {
        toast.success('Arrival recorded successfully!');
      }

      if (onStatusUpdate) {
        onStatusUpdate({ ...booking, ...updateData });
      }
    } catch (error) {
      console.error('Error recording arrival:', error);
      toast.error('Failed to record arrival. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (isNoShow) return 'text-red-400';
    if (isLate) return 'text-orange-400';
    return 'text-green-400';
  };

  const getStatusIcon = () => {
    if (isNoShow) return <FiXCircle className="h-5 w-5" />;
    if (isLate) return <FiAlertTriangle className="h-5 w-5" />;
    return <FiCheckCircle className="h-5 w-5" />;
  };

  if (!booking || booking.arrivalStatus === 'arrived') {
    return null;
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <FiMapPin className="mr-2 h-5 w-5 text-primary-400" />
          Arrival Tracking
        </h3>
        <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="text-sm font-medium">
            {isNoShow ? 'No-Show' : isLate ? 'Late' : 'On Time'}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Booking Time:</span>
          <span className="text-white">
            {booking.startTime.toDate ? 
              booking.startTime.toDate().toLocaleTimeString() : 
              new Date(booking.startTime).toLocaleTimeString()
            }
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Status:</span>
          <span className={`font-medium ${getStatusColor()}`}>
            {timeRemaining}
          </span>
        </div>

        {booking.isRefundable === false && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-red-400 mb-1">
              <FiAlertTriangle className="h-4 w-4" />
              <span className="text-sm font-semibold">Non-Refundable Booking</span>
            </div>
            <p className="text-red-300 text-xs">
              Booking payment is non-refundable. Penalties apply for no-shows and late arrivals.
            </p>
          </div>
        )}

        <div className="flex space-x-2">
          <button
            onClick={handleArrival}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Recording...</span>
              </>
            ) : (
              <>
                <FiCheckCircle className="h-4 w-4" />
                <span>Record Arrival</span>
              </>
            )}
          </button>
        </div>

        {/* Penalty Information */}
        <div className="bg-slate-700/30 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-white mb-2">Penalty Information</h4>
          <div className="space-y-1 text-xs text-slate-300">
            <div className="flex justify-between">
              <span>No-show penalty (15+ min late):</span>
              <span className="text-red-400">${(booking.totalPrice * 0.15).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Late arrival penalty (10-15 min):</span>
              <span className="text-orange-400">${(booking.totalPrice * 0.10).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>On-time arrival:</span>
              <span className="text-green-400">No penalty</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArrivalTracker; 