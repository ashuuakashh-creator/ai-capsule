import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public: explains AI Capsule */}
      <Route path="/" element={<Landing />} />
      {/* Public: starts OAuth login */}
      <Route path="/login" element={<Login />} />
      {/* Protected: the dashboard checks the session itself and redirects to
          /login if the user is not authenticated. */}
      <Route path="/dashboard" element={<Dashboard />} />
      {/* Fallback */}
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
