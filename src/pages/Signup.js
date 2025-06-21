import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiUser, FiMail, FiLock, FiBriefcase, FiMapPin, FiLogIn } from 'react-icons/fi';
import { Autocomplete, useLoadScript } from '@react-google-maps/api';

const libraries = ['places'];

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('user'); // 'user' or 'stationManager'
  const [stationDetails, setStationDetails] = useState({
    name: '',
    address: '',
    location: null,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth();
  const navigate = useNavigate();
  const autocompleteRef = useRef(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const handlePlaceSelect = () => {
    if (autocompleteRef.current) {
        const place = autocompleteRef.current.getPlace();
        if (place && place.geometry) {
            setStationDetails(prev => ({
                ...prev,
                address: place.formatted_address,
                location: {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                }
            }));
        }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }
    if (role === 'stationManager' && (!stationDetails.name || !stationDetails.location)) {
        return setError("Please fill in all station details.");
    }
    setError('');
    setLoading(true);
    try {
      await signup(email, password, displayName, role, stationDetails);
      toast.success('Account created successfully! Welcome.');
      navigate(role === 'stationManager' ? '/station-manager' : '/');
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStationManagerFields = () => (
    <>
        <div className="relative mb-4">
            <FiBriefcase className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" />
            <input
                type="text"
                value={stationDetails.name}
                onChange={(e) => setStationDetails(prev => ({...prev, name: e.target.value}))}
                placeholder="Your Station's Name"
                className="w-full bg-slate-700/50 border border-slate-700 rounded-lg py-3 pl-12 pr-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                required
            />
        </div>
        <div className="relative mb-4">
            <FiMapPin className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" />
             {isLoaded && (
                <Autocomplete
                    onLoad={(ref) => autocompleteRef.current = ref}
                    onPlaceChanged={handlePlaceSelect}
                >
                    <input
                        type="text"
                        defaultValue={stationDetails.address}
                        placeholder="Station Address"
                        className="w-full bg-slate-700/50 border border-slate-700 rounded-lg py-3 pl-12 pr-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        required
                    />
                </Autocomplete>
            )}
            {loadError && <p className="text-red-500 text-xs mt-1">Error loading address search.</p>}
        </div>
    </>
  );

  return (
    <div className="min-h-screen-minus-nav flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl shadow-2xl p-8 backdrop-blur-lg">
          <h2 className="text-4xl font-bold text-center text-white mb-2">Create Account</h2>
          <p className="text-center text-slate-400 mb-8">Join ZapGo and power up your journey.</p>
          
          <form onSubmit={handleSubmit}>
            {error && <p className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-4 text-sm">{error}</p>}
            
            <div className="relative mb-4">
              <FiUser className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-slate-700/50 border border-slate-700 rounded-lg py-3 pl-12 pr-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                required
              />
            </div>
            
            <div className="relative mb-4">
              <FiMail className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full bg-slate-700/50 border border-slate-700 rounded-lg py-3 pl-12 pr-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                required
              />
            </div>

            <div className="relative mb-4">
              <FiLock className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-slate-700/50 border border-slate-700 rounded-lg py-3 pl-12 pr-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                required
              />
            </div>

            <div className="relative mb-4">
              <FiLock className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="w-full bg-slate-700/50 border border-slate-700 rounded-lg py-3 pl-12 pr-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                required
              />
            </div>

            <div className="mb-6">
                <label className="text-slate-300 mb-2 block font-medium">I am a...</label>
                <div className="flex items-center space-x-4">
                    <label className="flex items-center cursor-pointer">
                        <input type="radio" name="role" value="user" checked={role === 'user'} onChange={() => setRole('user')} className="hidden" />
                        <div className={`py-2 px-5 rounded-lg transition-all ${role === 'user' ? 'bg-primary-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                            Regular User
                        </div>
                    </label>
                    <label className="flex items-center cursor-pointer">
                        <input type="radio" name="role" value="stationManager" checked={role === 'stationManager'} onChange={() => setRole('stationManager')} className="hidden" />
                         <div className={`py-2 px-5 rounded-lg transition-all ${role === 'stationManager' ? 'bg-primary-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                            Station Manager
                        </div>
                    </label>
                </div>
            </div>

            {role === 'stationManager' && renderStationManagerFields()}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
            >
                {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <p className="text-center text-slate-400 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-400 hover:text-primary-300">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup; 