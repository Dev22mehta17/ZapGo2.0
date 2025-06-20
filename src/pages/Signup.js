import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FcGoogle } from 'react-icons/fc';
import { FiMail, FiLock, FiUser, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('user'); // 'user' or 'stationManager'
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    setLoading(true);
    try {
      await signup(email, password, displayName, role);
      toast.success('Account created successfully!');
      navigate('/');
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(error.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle(role); // Pass role to Google sign-in
      toast.success('Signed up with Google successfully!');
      navigate('/');
    } catch (error) {
      console.error('Google signup error:', error);
       if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        toast.error(error.message || 'Failed to sign up with Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-sans p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="flex justify-center items-center mb-4">
            <FiZap className="h-10 w-10 text-primary-500" />
            <span className="text-3xl font-bold ml-2">ZapGo</span>
          </Link>
          <h2 className="text-3xl font-bold text-white">Create Your Account</h2>
          <p className="mt-2 text-slate-400">Join the EV revolution today.</p>
        </div>

        {/* Form */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 space-y-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Role Selector */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`py-3 rounded-lg font-semibold transition-colors ${
                  role === 'user' ? 'bg-primary-600 text-white' : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                I'm an EV Owner
              </button>
              <button
                type="button"
                onClick={() => setRole('stationManager')}
                className={`py-3 rounded-lg font-semibold transition-colors ${
                  role === 'stationManager' ? 'bg-primary-600 text-white' : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                I'm a Station Manager
              </button>
            </div>

            {/* Input Fields */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <div className="relative">
                <FiUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Your Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Email address</label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="6+ characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
             <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 mt-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-slate-800 text-slate-400">Or continue with</span></div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center py-3 px-4 border border-slate-600 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <FcGoogle className="h-5 w-5 mr-3" />
            <span className="font-medium">{googleLoading ? 'Redirecting...' : 'Sign up with Google'}</span>
          </button>
        </div>

        {/* Login Link */}
        <div className="text-center mt-8">
          <p className="text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-400 hover:text-primary-300 transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup; 