import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Toaster } from 'react-hot-toast';

import Landing from './pages/Landing';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import AuctionController from './pages/AuctionController';
import AuctionScreen from './pages/AuctionScreen';
import TeamRegistration from './pages/admin/TeamRegistration';
import TeamSquads from './pages/admin/TeamSquads';
import Login from './pages/Login';

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
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/screen" element={<AuctionScreen />} />
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/auction" element={<AdminRoute><AuctionController /></AdminRoute>} />
          <Route path="/admin/teams" element={<AdminRoute><TeamRegistration /></AdminRoute>} />
          <Route path="/admin/squads" element={<AdminRoute><TeamSquads /></AdminRoute>} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#111',
            color: '#fff',
            border: '1px solid var(--neon-red)',
            fontFamily: 'Rajdhani, sans-serif'
          },
        }}
      />
    </>
  );
}