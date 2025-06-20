import { Fragment, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Toaster } from 'react-hot-toast';
import { FiZap, FiLogOut, FiUser, FiMenu, FiX, FiMap, FiList, FiCompass, FiSettings, FiBarChart } from 'react-icons/fi';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', href: '/', icon: FiMap },
    { name: 'My Bookings', href: '/my-bookings', icon: FiList },
    { name: 'Route Planner', href: '/route-planner', icon: FiCompass },
  ];

  if (user?.role === 'admin') {
    navLinks.push({ name: 'Admin', href: '/admin', icon: FiSettings });
  } else if (user?.role === 'stationManager') {
    navLinks.push({ name: 'My Stations', href: '/station-manager-dashboard', icon: FiBarChart });
  }

  const isNavLinkActive = (path) => location.pathname === path;
  
  const NavItems = ({ isMobile = false }) => (
    <>
      {navLinks.map((link) => (
        <Link
          key={link.name}
          to={link.href}
          onClick={() => isMobile && setMobileMenuOpen(false)}
          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isNavLinkActive(link.href)
              ? 'bg-primary-600 text-white'
              : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          <link.icon className="mr-3 h-5 w-5" />
          {link.name}
        </Link>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-900">
      <Toaster position="top-center" reverseOrder={false} />
      
      {user && (
        <nav className="bg-slate-800/80 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              
              {/* Logo */}
              <div className="flex-shrink-0">
                <Link to="/" className="flex items-center space-x-2">
                  <FiZap className="h-8 w-8 text-primary-500" />
                  <span className="text-2xl font-bold text-white">ZapGo</span>
                </Link>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex md:items-center md:space-x-4">
                <NavItems />
              </div>

              {/* User Menu & Logout (Desktop) */}
              <div className="hidden md:flex items-center space-x-4">
                 <span className="text-slate-300">Hi, {user.displayName || 'User'}</span>
                 <button
                    onClick={logout}
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                   <FiLogOut className="mr-2 h-5 w-5" />
                   Logout
                 </button>
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <button 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 focus:outline-none"
                >
                  {mobileMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
                </button>
              </div>

            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <NavItems isMobile />
              </div>
              <div className="pt-4 pb-3 border-t border-slate-700">
                <div className="flex items-center px-5">
                  <div className="ml-3">
                    <div className="text-base font-medium text-white">{user.displayName || 'User'}</div>
                    <div className="text-sm font-medium text-slate-400">{user.email}</div>
                  </div>
                </div>
                <div className="mt-3 px-2 space-y-1">
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left flex items-center px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    <FiLogOut className="mr-3 h-5 w-5" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </nav>
      )}

      {/* Main Content */}
      <main className={!user ? '' : 'h-full'}>
        {children}
      </main>
    </div>
  );
};

export default Layout; 