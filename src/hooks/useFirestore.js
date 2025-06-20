import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './useAuth';

export const getAllStations = async () => {
  const stationsRef = collection(db, 'stations');
  const q = query(stationsRef);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const useStations = () => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const stationsRef = collection(db, 'stations');
    const q = query(stationsRef);

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const stationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStations(stationsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching stations:', error);
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { stations, loading, error };
};

export const useStation = (stationId) => {
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!stationId) {
      setLoading(false);
      return;
    }

    const stationRef = doc(db, 'stations', stationId);
    
    const unsubscribe = onSnapshot(stationRef,
      (doc) => {
        if (doc.exists()) {
          setStation({ id: doc.id, ...doc.data() });
        } else {
          setStation(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching station:', error);
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [stationId]);

  return { station, loading, error };
};

export const useUserBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('userId', '==', user.uid),
      orderBy('bookingDate', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const bookingsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBookings(bookingsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching bookings:', error);
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return { bookings, loading, error };
};

export const useStationBookings = (stationId) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!stationId) {
      setLoading(false);
      return;
    }

    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('stationId', '==', stationId),
      orderBy('bookingDate', 'asc')
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const bookingsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBookings(bookingsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching station bookings:', error);
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [stationId]);

  return { bookings, loading, error };
}; 