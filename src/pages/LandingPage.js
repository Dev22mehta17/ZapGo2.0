import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiZap, FiSearch, FiCalendar, FiMapPin, FiChevronDown, FiMenu, FiX, FiCpu } from 'react-icons/fi';

// Main features of the app
const features = [
  {
    icon: <FiSearch className="h-8 w-8 text-primary-500" />,
    title: 'Find Stations Instantly',
    desc: 'Our interactive map helps you locate the nearest EV charging stations with just a tap.',
  },
  {
    icon: <FiCalendar className="h-8 w-8 text-green-500" />,
    title: 'Seamless Booking',
    desc: 'Reserve your charging slot in advance. No more waiting, just plug and charge.',
  },
  {
    icon: <FiCpu className="h-8 w-8 text-indigo-500" />,
    title: 'Advanced Route Planning',
    desc: 'Plan your long-distance trips with automatic charging stops calculated for your journey.',
  },
];

// FAQ data
const faqs = [
  {
    q: 'Is ZapGo free for EV owners?',
    a: 'Absolutely! Searching, booking, and route planning are completely free for all users. You only pay for the electricity at the station.',
  },
  {
    q: 'How does the route planner work?',
    a: 'Just enter your destination and current battery level. Our smart algorithm calculates the optimal route, including necessary charging stops.',
  },
  {
    q: 'Can I add my own station to ZapGo?',
    a: 'Yes! We welcome new station partners. Sign up as a "Station Manager" to list your station and start earning.',
  },
];

// Main Landing Page Component
const LandingPage = () => {
  const [faqOpen, setFaqOpen] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how' },
    { name: 'FAQs', href: '#faqs' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {/* --- Navigation --- */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || mobileMenuOpen ? 'bg-slate-900/80 backdrop-blur-lg shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <FiZap className="h-8 w-8 text-primary-500" />
              <span className="text-2xl font-bold">ZapGo</span>
            </Link>
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map(link => (
                <a key={link.name} href={link.href} className="text-slate-300 hover:text-primary-400 transition-colors">{link.name}</a>
              ))}
            </div>
            {/* Auth Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Link to="/login" className="text-slate-300 hover:text-white transition-colors">Log In</Link>
              <Link to="/signup" className="px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
                Sign Up
              </Link>
            </div>
            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-2 pb-4 space-y-4">
             {navLinks.map(link => (
                <a key={link.name} href={link.href} onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 hover:text-primary-400 transition-colors">{link.name}</a>
              ))}
              <div className="border-t border-slate-700 pt-4 flex items-center space-x-4">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center py-2.5 border border-slate-700 rounded-lg">Log In</Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center py-2.5 bg-primary-600 rounded-lg">Sign Up</Link>
              </div>
          </div>
        )}
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-r from-primary-600/50 to-purple-600/50 rounded-full filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-l from-green-500/50 to-cyan-500/50 rounded-full filter blur-3xl opacity-30 animate-pulse animation-delay-4000"></div>

        <div className="relative max-w-4xl mx-auto">
          <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight">
            The Future of EV Charging is Here
          </h1>
          <p className="mt-6 text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto">
            ZapGo makes electric vehicle charging simple, reliable, and accessible. Find stations, plan your route, and book a slot with ease.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              to="/signup"
              className="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg"
            >
              Get Started for Free
            </Link>
          </div>
        </div>
      </section>

      {/* --- Features Section --- */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">Why You'll Love ZapGo</h2>
            <p className="mt-4 text-lg text-slate-400">Everything you need for a seamless charging experience.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 hover:border-primary-500/50 transition-colors"
              >
                <div className="mb-6">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- How it Works Section --- */}
      <section id="how" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">Get Charged in 3 Easy Steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-20 h-20 bg-slate-800 rounded-full border-2 border-primary-500 mb-4">
                <FiMapPin className="h-8 w-8 text-primary-500" />
              </div>
              <h3 className="text-xl font-bold">1. Find</h3>
              <p className="text-slate-400 mt-2">Locate a station on our interactive map.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-20 h-20 bg-slate-800 rounded-full border-2 border-green-500 mb-4">
                <FiCalendar className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold">2. Book</h3>
              <p className="text-slate-400 mt-2">Reserve your slot and pay securely.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-20 h-20 bg-slate-800 rounded-full border-2 border-indigo-500 mb-4">
                <FiZap className="h-8 w-8 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold">3. Charge</h3>
              <p className="text-slate-400 mt-2">Plug in your EV and power up your journey.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FAQs Section --- */}
      <section id="faqs" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-lg">
                <button
                  className="w-full flex justify-between items-center p-6 text-left"
                  onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                >
                  <span className="text-lg font-medium">{faq.q}</span>
                  <FiChevronDown className={`transform transition-transform ${faqOpen === idx ? 'rotate-180' : ''}`} />
                </button>
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${faqOpen === idx ? 'max-h-40' : 'max-h-0'}`}>
                  <p className="px-6 pb-6 text-slate-400">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-400">&copy; {new Date().getFullYear()} ZapGo. All rights reserved.</p>
          <p className="mt-2 text-sm text-slate-500">Powering the future of electric mobility.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 