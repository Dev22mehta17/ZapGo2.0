import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';

const CompleteProfileModal = ({ onProfileComplete }) => {
  const { user, refreshAuthUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName || !phoneNumber) {
      toast.error("Please fill in all fields.");
      return;
    }
    setLoading(true);
    const toastId = toast.loading("Updating profile...");

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName,
        phoneNumber: phoneNumber,
        profileComplete: true,
        updatedAt: new Date().toISOString()
      });
      
      await refreshAuthUser();
      toast.success("Profile updated successfully!", { id: toastId });
      onProfileComplete();

    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-700 m-4">
        <h2 className="text-3xl font-bold text-white mb-2">Complete Your Profile</h2>
        <p className="text-slate-400 mb-6">Please provide a few more details to continue.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-slate-700/50 border border-slate-700 rounded-lg py-3 px-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label>
            <input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g., +1 234 567 890"
              className="w-full bg-slate-700/50 border border-slate-700 rounded-lg py-3 px-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              required
            />
          </div>
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save and Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfileModal; 