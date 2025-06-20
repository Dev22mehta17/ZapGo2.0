import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

// Collection references
export const usersCollection = collection(db, 'users');
export const stationsCollection = collection(db, 'stations');
export const bookingsCollection = collection(db, 'bookings');

const dummyManagers = [
  {
    uid: 'manager1',
    email: 'manager1@zapgo.com',
    displayName: 'Manager One',
    role: 'station_manager',
  },
  {
    uid: 'manager2',
    email: 'manager2@zapgo.com',
    displayName: 'Manager Two',
    role: 'station_manager',
  },
];

const dummyStations = [
  {
    name: 'ZapGo Chennai',
    location: { lat: 13.0827, lng: 80.2707, address: 'Chennai, Tamil Nadu' },
    totalSlots: 4,
    availableSlots: 3,
    pricePerHour: 8,
    status: 'available',
    amenities: ['Restrooms', 'WiFi'],
    managerId: 'manager1',
  },
  {
    name: 'ZapGo Patiala',
    location: { lat: 30.3398, lng: 76.3869, address: 'Patiala, Punjab' },
    totalSlots: 3,
    availableSlots: 2,
    pricePerHour: 7,
    status: 'available',
    amenities: ['Coffee Shop'],
    managerId: 'manager2',
  },
  {
    name: 'ZapGo Hyderabad',
    location: { lat: 17.385, lng: 78.4867, address: 'Hyderabad, Telangana' },
    totalSlots: 5,
    availableSlots: 5,
    pricePerHour: 9,
    status: 'busy',
    amenities: ['Restrooms'],
    managerId: 'manager1',
  },
  {
    name: 'ZapGo Mumbai',
    location: { lat: 19.076, lng: 72.8777, address: 'Mumbai, Maharashtra' },
    totalSlots: 6,
    availableSlots: 4,
    pricePerHour: 10,
    status: 'available',
    amenities: ['WiFi', 'Parking'],
    managerId: 'manager2',
  },
  {
    name: 'ZapGo Ambala',
    location: { lat: 30.3782, lng: 76.7767, address: 'Ambala, Haryana' },
    totalSlots: 4,
    availableSlots: 3,
    pricePerHour: 8,
    status: 'available',
    amenities: ['Restrooms', 'WiFi'],
    managerId: 'manager1',
  },
  {
    name: 'ZapGo Bareilly',
    location: { lat: 28.367, lng: 79.4304, address: 'Bareilly, Uttar Pradesh' },
    totalSlots: 3,
    availableSlots: 2,
    pricePerHour: 7,
    status: 'available',
    amenities: ['Coffee Shop'],
    managerId: 'manager2',
  },
  {
    name: 'ZapGo Kanpur',
    location: { lat: 26.4499, lng: 80.3319, address: 'Kanpur, Uttar Pradesh' },
    totalSlots: 5,
    availableSlots: 5,
    pricePerHour: 9,
    status: 'available',
    amenities: ['Restrooms'],
    managerId: 'manager1',
  }
];

// Initialize collections with sample data
export const initializeFirestore = async () => {
  try {
    // Check if stations already exist
    const stationsSnapshot = await getDocs(stationsCollection);
    if (stationsSnapshot.empty) {
      // Add sample stations
      for (const station of dummyStations) {
        const stationId = station.name.replace(/\s+/g, '-').toLowerCase();
        await setDoc(doc(stationsCollection, stationId), station);
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

export const seedDemoData = async () => {
  // Seed managers
  for (const manager of dummyManagers) {
    await setDoc(doc(collection(db, 'users'), manager.uid), manager);
  }
  // Seed stations
  for (const station of dummyStations) {
    const stationId = station.name.replace(/\s+/g, '-').toLowerCase();
    await setDoc(doc(collection(db, 'stations'), stationId), station);
  }
  // eslint-disable-next-line no-console
  console.log('Demo managers and stations seeded!');
}; 