import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FcGoogle } from 'react-icons/fc';
import { FiMail, FiLock, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Logged in successfully!');
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Logged in with Google successfully!');
      navigate('/');
    } catch (error) {
      console.error('Google login error:', error);
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        toast.error(error.message || 'Failed to sign in with Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen-minus-nav flex items-center justify-center text-white font-sans p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="flex justify-center items-center mb-4">
            <FiZap className="h-10 w-10 text-primary-500" />
            <span className="text-3xl font-bold ml-2">ZapGo</span>
          </Link>
          <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
          <p className="mt-2 text-slate-400">Sign in to continue your journey.</p>
        </div>

        {/* Form */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 space-y-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email address
              </label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="text-center mt-8">
            <p className="text-slate-400">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-primary-400 hover:text-primary-300 transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 