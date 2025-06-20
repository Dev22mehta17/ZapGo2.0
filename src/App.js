import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import StationDetails from './pages/StationDetails';
import MyBookings from './pages/MyBookings';
import AdminDashboard from './pages/AdminDashboard';
import StationManagerDashboard from './pages/StationManagerDashboard';
import RoutePlanner from './pages/RoutePlanner';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Helper function to determine the dashboard based on user role
  const getDashboard = () => {
    if (!user) return <Navigate to="/login" />;
    
    switch (user.role) {
      case 'station_manager':
        return (
          <Layout>
            <StationManagerDashboard />
          </Layout>
        );
      case 'admin':
        return (
          <Layout>
            <AdminDashboard />
          </Layout>
        );
      default:
        return (
          <Layout>
            <Home />
          </Layout>
        );
    }
  };

  return (
    <Router>
      <Toaster position="top-center" />
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <Login />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/" /> : <Signup />}
        />
        <Route
          path="/"
          element={user ? getDashboard() : <LandingPage />}
        />
        <Route
          path="/station/:id"
          element={
            user ? (
              <Layout>
                <StationDetails />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/my-bookings"
          element={
            user ? (
              <Layout>
                <MyBookings />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/route-planner"
          element={
            user ? (
              <Layout>
                <RoutePlanner />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/admin"
          element={
            user?.role === 'admin' ? (
              <Layout>
                <AdminDashboard />
              </Layout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/station-manager"
          element={
            user?.role === 'station_manager' ? (
              <Layout>
                <StationManagerDashboard />
              </Layout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
