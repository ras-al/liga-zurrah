import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Landing from './pages/Landing';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import AuctionController from './pages/AuctionController';
import AuctionScreen from './pages/AuctionScreen';
import Login from './pages/Login';

// Protected Route Component
const AdminRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <div className="flex-center" style={{ height: '100vh' }}><h1>LOADING...</h1></div>;

  return user ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/screen" element={<AuctionScreen />} />
        <Route path="/login" element={<Login />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/auction" element={<AdminRoute><AuctionController /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  );
}