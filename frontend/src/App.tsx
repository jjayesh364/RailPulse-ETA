import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import TrainDetails from './pages/TrainDetails';
import LiveTrains from './pages/LiveTrains';
import PassengerView from './pages/PassengerView';
import ControlRoom from './pages/ControlRoom';
import Analytics from './pages/Analytics';
import Network from './pages/Network';
import Alerts from './pages/Alerts';
import About from './pages/About';
import AssistantPage from './pages/AssistantPage';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public auth routes (no layout) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes with layout */}
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/trains" element={<LiveTrains />} />
                  <Route path="/trains/:trainId" element={<TrainDetails />} />
                  <Route path="/passenger" element={<PassengerView />} />
                  <Route path="/assistant" element={<AssistantPage />} />
                  <Route path="/control-room" element={
                    <ProtectedRoute allowedRoles={['RAILWAY_STAFF']}>
                      <ControlRoom />
                    </ProtectedRoute>
                  } />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/network" element={<Network />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/about" element={<About />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
