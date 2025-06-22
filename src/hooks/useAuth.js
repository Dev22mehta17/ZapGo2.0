import { useState, useEffect, createContext, useContext } from 'react';
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get additional user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          setUser({
            ...user,
            role: userData?.role || 'user',
            profileComplete: userData?.profileComplete,
          });
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(user); // Still set the basic user data even if Firestore fetch fails
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const createUserProfile = async (userId, userData) => {
    try {
      await setDoc(doc(db, 'users', userId), {
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (email, password, displayName, role, stationDetails = {}) => {
    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Create user profile in Firestore 'users' collection
      const userProfile = {
        uid: user.uid,
        email,
        displayName,
        role,
        createdAt: new Date(),
      };

      if (role === 'stationManager') {
        userProfile.profileComplete = false;
      }

      await setDoc(doc(db, 'users', user.uid), userProfile);

      // 3. If role is stationManager, create a station in 'stations' collection
      if (role === 'stationManager' && stationDetails.name && stationDetails.location) {
        await addDoc(collection(db, 'stations'), {
          managerId: user.uid,
          name: stationDetails.name,
          address: stationDetails.address,
          location: stationDetails.location,
          totalSlots: 5, // Default value
          availableSlots: 5, // Default value
          pricePerHour: 150, // Default value
          status: 'available', // Default status
          createdAt: new Date(),
        });
      }

      return userCredential;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Add scopes
      provider.addScope('profile');
      provider.addScope('email');
      
      // Set custom parameters
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, provider);
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (!userDoc.exists()) {
        // Create user profile if it doesn't exist
        await createUserProfile(result.user.uid, {
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          role: 'user', // Default to user for Google sign-in
        });
      }
      
      return result;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const refreshAuthUser = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();
        setUser(prevUser => ({
          ...prevUser,
          ...user,
          role: userData?.role || 'user',
          profileComplete: userData?.profileComplete,
          displayName: userData?.displayName,
          phoneNumber: userData?.phoneNumber,
        }));
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
    }
  };

  const logout = async () => {
    try {
      return await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      signup,
      loginWithGoogle,
      logout,
      refreshAuthUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
}; 