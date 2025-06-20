import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import PaymentModal from './PaymentModal';

const BookingForm = ({ station, onSubmit, isBooking }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState(1); // in hours
  const [vehicleType, setVehicleType] = useState('car');
  const [totalPrice, setTotalPrice] = useState(station.pricePerHour);

  useEffect(() => {
    if (station && station.pricePerHour && duration > 0) {
      setTotalPrice(station.pricePerHour * duration);
    }
  }, [duration, station]);

  const checkSlotAvailability = async () => {
    const bookingStartTime = new Date(`${bookingDate}T${startTime}`);
    const bookingEndTime = new Date(bookingStartTime.getTime() + parseInt(duration) * 60 * 60 * 1000);

    // Query for overlapping bookings
    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('stationId', '==', station.id),
      where('status', 'in', ['confirmed', 'active'])
    );

    const querySnapshot = await getDocs(q);
    const bookings = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Check for overlapping bookings
    const hasOverlap = bookings.some(booking => {
      const existingBookingStart = booking.startTime.toDate();
      const existingBookingEnd = new Date(existingBookingStart.getTime() + booking.duration * 60 * 60 * 1000);
      
      return (
        (bookingStartTime >= existingBookingStart && bookingStartTime < existingBookingEnd) ||
        (bookingEndTime > existingBookingStart && bookingEndTime <= existingBookingEnd) ||
        (bookingStartTime <= existingBookingStart && bookingEndTime >= existingBookingEnd)
      );
    });

    if (hasOverlap) {
      toast.error('This time slot is already booked. Please choose another time.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please login to make a booking');
      navigate('/login');
      return;
    }

    if (station.availableSlots <= 0) {
      toast.error('No available slots at this station');
      return;
    }

    if (new Date(`${bookingDate}T${startTime}`) < new Date()) {
      toast.error('You cannot book a time in the past.');
      return;
    }

    setLoading(true);

    try {
      // Check slot availability
      const isAvailable = await checkSlotAvailability();
      if (!isAvailable) {
        setLoading(false);
        return;
      }

      // Show payment modal instead of directly calling onSubmit
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Error checking availability:', error);
      toast.error('Failed to check slot availability. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentConfirm = async () => {
    setLoading(true);

    try {
      const bookingStartTime = new Date(`${bookingDate}T${startTime}`);
      const bookingData = {
        stationId: station.id,
        stationName: station.name,
        userId: user.uid,
        userName: user.displayName || user.email,
        startTime: bookingStartTime,
        duration: parseInt(duration),
        vehicleType: vehicleType,
        notes: '',
        status: 'confirmed',
        totalPrice: totalPrice,
        createdAt: serverTimestamp(),
        paymentStatus: 'completed'
      };

      // Create booking
      const bookingRef = await addDoc(collection(db, 'bookings'), bookingData);

      // Update station's available slots
      await updateDoc(doc(db, 'stations', station.id), {
        availableSlots: station.availableSlots - 1
      });

      toast.success('Booking confirmed successfully!');
      setShowPaymentModal(false);
      navigate('/my-bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-white">
            Date
          </label>
          <input
            type="date"
            id="date"
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="mt-1 block w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-slate-700 text-white"
            required
          />
        </div>

        <div>
          <label htmlFor="start-time" className="block text-sm font-medium text-white">
            Start Time
          </label>
          <input
            type="time"
            id="start-time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-slate-700 text-white"
            required
          />
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-white">
            Duration (hours)
          </label>
          <input
            type="number"
            id="duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            min="1"
            max="8"
            className="mt-1 block w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-slate-700 text-white"
            required
          />
        </div>

        <div>
          <label htmlFor="vehicle-type" className="block text-sm font-medium text-white">
            Vehicle Type
          </label>
          <select
            id="vehicle-type"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md bg-slate-700 text-white"
          >
            <option value="car">Car</option>
            <option value="motorcycle">Motorcycle</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="border-t border-slate-600 pt-4">
          <div className="flex justify-between items-center">
            <p className="text-lg font-semibold text-white">Total Price:</p>
            <p className="text-2xl font-bold text-primary-400">${totalPrice.toFixed(2)}</p>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isBooking || station.availableSlots <= 0}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-opacity"
          >
            {isBooking ? 'Processing...' : (station.availableSlots > 0 ? 'Confirm & Book' : 'Slots Unavailable')}
          </button>
        </div>
      </form>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={totalPrice}
        onConfirm={handlePaymentConfirm}
        loading={loading}
      />
    </>
  );
};

export default BookingForm; 