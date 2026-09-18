import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Report from './pages/Report';
import Grievances from './pages/Grievances';
import OfficerDashboard from './pages/OfficerDashboard';
import Navbar from './components/Navbar';
import ChatbotWidget from './components/ChatbotWidget';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/report" element={<Report />} />
            <Route path="/grievances" element={<Grievances />} />
            <Route path="/officer" element={<OfficerDashboard />} />
          </Routes>
        </main>
        <ChatbotWidget />
      </div>
    </Router>
  );
}

export default App;
