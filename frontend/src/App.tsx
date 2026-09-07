import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trains" element={<LiveTrains />} />
          <Route path="/trains/:trainId" element={<TrainDetails />} />
          <Route path="/passenger" element={<PassengerView />} />
          <Route path="/control-room" element={<ControlRoom />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/network" element={<Network />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
