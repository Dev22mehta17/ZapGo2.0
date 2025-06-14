import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: '🔍',
    title: 'Find Stations',
    desc: 'Search for nearby EV charging stations, view details, and check real-time availability.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: '⚡',
    title: 'Book Instantly',
    desc: 'Reserve your charging slot in advance and avoid waiting in line at busy stations.',
    color: 'from-green-500 to-green-600',
  },
  {
    icon: '🛠️',
    title: 'Manage Stations',
    desc: 'Station managers can add, edit, and monitor their stations, bookings, and revenue.',
    color: 'from-purple-500 to-purple-600',
  },
];

const howItWorks = [
  {
    icon: '🗺️',
    title: 'Search',
    desc: 'Enter your location to discover nearby EV charging stations on the map.',
  },
  {
    icon: '📅',
    title: 'Book',
    desc: 'Choose your preferred station, select a time slot, and reserve instantly.',
  },
  {
    icon: '🔌',
    title: 'Charge',
    desc: 'Arrive at the station, plug in, and enjoy seamless charging.',
  },
  {
    icon: '🚗',
    title: 'Go!',
    desc: 'Unplug and continue your journey, fully charged and stress-free.',
  },
];

const faqs = [
  {
    q: 'Is ZapGo free to use?',
    a: 'Yes! Searching for stations and booking slots is completely free for users. Station managers may have premium features.',
  },
  {
    q: 'How do I become a station manager?',
    a: 'Sign up as a station manager during registration, and you can start adding and managing your own stations right away.',
  },
  {
    q: 'Can I cancel or change my booking?',
    a: 'Yes, you can manage your bookings from your dashboard, including cancellations and rescheduling.',
  },
  {
    q: 'What if a station is full?',
    a: 'ZapGo shows real-time availability. If a station is full, you can join a waitlist or find another nearby station.',
  },
];

const testimonials = [
  {
    name: 'Priya S.',
    text: 'ZapGo made my EV road trip so much easier! Booking a slot was a breeze and I never had to wait.',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    role: 'EV Owner',
  },
  {
    name: 'Rahul M.',
    text: 'As a station manager, I love how simple it is to manage bookings and see my station stats.',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    role: 'Station Manager',
  },
  {
    name: 'Ayesha K.',
    text: 'The interface is beautiful and intuitive. Highly recommend for all EV owners!',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    role: 'EV Enthusiast',
  },
];

const LandingPage = () => {
  const [faqOpen, setFaqOpen] = useState(null);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIdx((idx) => (idx + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      {/* Floating Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/80 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                ZapGo
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">Features</a>
              <a href="#how" className="text-gray-600 hover:text-blue-600 transition-colors">How it Works</a>
              <a href="#testimonials" className="text-gray-600 hover:text-blue-600 transition-colors">Testimonials</a>
              <a href="#faqs" className="text-gray-600 hover:text-blue-600 transition-colors">FAQs</a>
              <Link
                to="/login"
                className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
                Power Your Journey with{' '}
                <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  ZapGo
                </span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                The smartest way to find, book, and manage EV charging stations. Join thousands of EV owners and station managers who trust ZapGo for seamless charging experiences.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/login"
                  className="px-8 py-4 bg-blue-600 text-white rounded-full font-semibold text-lg hover:bg-blue-700 transition-colors text-center"
                >
                  Get Started
                </Link>
                <a
                  href="#how"
                  className="px-8 py-4 bg-white text-blue-600 rounded-full font-semibold text-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors text-center"
                >
                  Learn More
                </a>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl transform rotate-3"></div>
              <img
                src="https://images.unsplash.com/photo-1617704548623-340376564e68?auto=format&fit=crop&w=800&q=80"
                alt="Modern EV charging station"
                className="relative rounded-3xl shadow-2xl w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose ZapGo?</h2>
            <p className="text-xl text-gray-600">Everything you need for seamless EV charging</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`}></div>
                <div className="relative">
                  <span className="text-5xl mb-6 block">{feature.icon}</span>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How it Works</h2>
            <p className="text-xl text-gray-600">Simple steps to power your journey</p>
          </div>
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-blue-200"></div>
            <div className="space-y-12">
              {howItWorks.map((step, idx) => (
                <div
                  key={step.title}
                  className={`relative flex items-center ${
                    idx % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  <div className="w-1/2 px-8">
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                      <div className="text-4xl mb-4">{step.icon}</div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h3>
                      <p className="text-gray-600">{step.desc}</p>
                    </div>
                  </div>
                  <div className="absolute left-1/2 transform -translate-x-1/2">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {idx + 1}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Users Say</h2>
            <p className="text-xl text-gray-600">Join thousands of satisfied EV owners and station managers</p>
          </div>
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
              <div className="flex flex-col items-center">
                <img
                  src={testimonials[testimonialIdx].avatar}
                  alt={testimonials[testimonialIdx].name}
                  className="w-20 h-20 rounded-full border-4 border-blue-100 mb-6 object-cover"
                />
                <blockquote className="text-2xl text-gray-700 text-center mb-6">
                  "{testimonials[testimonialIdx].text}"
                </blockquote>
                <div className="text-center">
                  <div className="font-bold text-gray-900">{testimonials[testimonialIdx].name}</div>
                  <div className="text-blue-600">{testimonials[testimonialIdx].role}</div>
                </div>
              </div>
            </div>
            <div className="flex justify-center mt-8 space-x-2">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setTestimonialIdx(idx)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    idx === testimonialIdx ? 'bg-blue-600' : 'bg-blue-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faqs" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">Everything you need to know about ZapGo</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={faq.q}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
              >
                <button
                  className="w-full flex justify-between items-center p-6 text-left focus:outline-none"
                  onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                >
                  <span className="text-lg font-semibold text-gray-900">{faq.q}</span>
                  <span className={`ml-4 transform transition-transform duration-200 ${
                    faqOpen === idx ? 'rotate-180' : ''
                  }`}>
                    ▼
                  </span>
                </button>
                <div
                  className={`px-6 transition-all duration-200 ease-in-out ${
                    faqOpen === idx ? 'max-h-40 opacity-100 pb-6' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="text-gray-600">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Get in Touch</h2>
            <p className="text-xl text-gray-600">Have questions? We're here to help!</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="4"
                  placeholder="How can we help you?"
                ></textarea>
              </div>
              <div className="text-center">
                <button
                  type="submit"
                  className="px-8 py-4 bg-blue-600 text-white rounded-full font-semibold text-lg hover:bg-blue-700 transition-colors"
                >
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">ZapGo</h3>
              <p className="text-gray-400">Making EV charging simple and accessible for everyone.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#how" className="text-gray-400 hover:text-white transition-colors">How it Works</a></li>
                <li><a href="#testimonials" className="text-gray-400 hover:text-white transition-colors">Testimonials</a></li>
                <li><a href="#faqs" className="text-gray-400 hover:text-white transition-colors">FAQs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Twitter</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">LinkedIn</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Facebook</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} ZapGo. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 