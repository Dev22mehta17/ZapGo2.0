import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import PaymentModal from './PaymentModal';

const BookingForm = ({ station }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [formData, setFormData] = useState({
    startTime: '',
    duration: '1', // Default 1 hour
    vehicleType: 'car',
    notes: ''
  });

  const checkSlotAvailability = async () => {
    const startTime = new Date(formData.startTime);
    const endTime = new Date(startTime.getTime() + parseInt(formData.duration) * 60 * 60 * 1000);

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
      const bookingStart = booking.startTime.toDate();
      const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60 * 60 * 1000);
      
      return (
        (startTime >= bookingStart && startTime < bookingEnd) ||
        (endTime > bookingStart && endTime <= bookingEnd) ||
        (startTime <= bookingStart && endTime >= bookingEnd)
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

    setLoading(true);

    try {
      // Check slot availability
      const isAvailable = await checkSlotAvailability();
      if (!isAvailable) {
        setLoading(false);
        return;
      }

      // Calculate total price
      const totalPrice = station.pricePerHour * parseInt(formData.duration);
      
      // Show payment modal
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
      const startTime = new Date(formData.startTime);
      const bookingData = {
        stationId: station.id,
        stationName: station.name,
        userId: user.uid,
        userName: user.displayName || user.email,
        startTime: startTime,
        duration: parseInt(formData.duration),
        vehicleType: formData.vehicleType,
        notes: formData.notes,
        status: 'confirmed',
        totalPrice: station.pricePerHour * parseInt(formData.duration),
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
            Start Time
          </label>
          <input
            type="datetime-local"
            id="startTime"
            name="startTime"
            required
            min={new Date().toISOString().slice(0, 16)}
            value={formData.startTime}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
            Duration (hours)
          </label>
          <select
            id="duration"
            name="duration"
            required
            value={formData.duration}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="1">1 hour</option>
            <option value="2">2 hours</option>
            <option value="3">3 hours</option>
            <option value="4">4 hours</option>
          </select>
        </div>

        <div>
          <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700">
            Vehicle Type
          </label>
          <select
            id="vehicleType"
            name="vehicleType"
            required
            value={formData.vehicleType}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="car">Car</option>
            <option value="suv">SUV</option>
            <option value="truck">Truck</option>
            <option value="motorcycle">Motorcycle</option>
          </select>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Additional Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows="3"
            value={formData.notes}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            placeholder="Any special requirements or notes..."
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading || station.availableSlots <= 0}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
              ${loading || station.availableSlots <= 0 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
              }`}
          >
            {loading ? 'Processing...' : 'Book Now'}
          </button>
        </div>
      </form>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={station.pricePerHour * parseInt(formData.duration)}
        onConfirm={handlePaymentConfirm}
        loading={loading}
      />
    </>
  );
};

export default BookingForm; 