import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

// Collection references
export const usersCollection = collection(db, 'users');
export const stationsCollection = collection(db, 'stations');
export const bookingsCollection = collection(db, 'bookings');

// Sample station data
const sampleStations = [
  {
    id: 'station1',
    name: 'Downtown Charging Hub',
    location: {
      lat: 40.7128,
      lng: -74.0060,
      address: '123 Main St, New York, NY'
    },
    totalSlots: 4,
    availableSlots: 4,
    pricePerHour: 5.99,
    amenities: ['Restrooms', 'Coffee Shop', 'WiFi'],
    status: 'active'
  },
  {
    id: 'station2',
    name: 'Westside EV Station',
    location: {
      lat: 40.7589,
      lng: -73.9851,
      address: '456 West Ave, New York, NY'
    },
    totalSlots: 2,
    availableSlots: 2,
    pricePerHour: 4.99,
    amenities: ['Restrooms', 'Convenience Store'],
    status: 'active'
  }
];

// Initialize collections with sample data
export const initializeFirestore = async () => {
  try {
    // Check if stations already exist
    const stationsSnapshot = await getDocs(stationsCollection);
    if (stationsSnapshot.empty) {
      // Add sample stations
      for (const station of sampleStations) {
        await setDoc(doc(stationsCollection, station.id), station);
      }
      console.log('Sample stations added successfully');
    }

    // Create indexes for better query performance
    // Note: These need to be created in the Firebase Console
    // 1. stations: location (geopoint)
    // 2. bookings: userId, stationId, bookingDate
    // 3. bookings: stationId, bookingDate

  } catch (error) {
    console.error('Error initializing Firestore:', error);
  }
};

// Helper functions for common operations
export const createUserProfile = async (userId, userData) => {
  try {
    await setDoc(doc(usersCollection, userId), {
      ...userData,
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const createBooking = async (bookingData) => {
  try {
    const bookingRef = doc(bookingsCollection);
    await setDoc(bookingRef, {
      ...bookingData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return bookingRef.id;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};

export const updateStationAvailability = async (stationId, availableSlots) => {
  try {
    await setDoc(doc(stationsCollection, stationId), {
      availableSlots,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating station availability:', error);
    throw error;
  }
}; 