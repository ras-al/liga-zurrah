import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import '../pages/Admin.css';

export default function AdminLayout({ children }) {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <div className="dashboard-layout">
            {/* Mobile Menu Button */}
            <button className="mobile-menu-btn" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? '✕' : '☰ MENU'}
            </button>

            {/* Sidebar */}
            <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
                <h2 style={{ color: '#fff', marginBottom: '40px', textAlign: 'center' }}>ADMIN PANEL</h2>

                <Link to="/admin" className={`sidebar-link ${isActive('/admin')}`} onClick={() => setIsOpen(false)}>
                    DASHBOARD
                </Link>
                <Link to="/admin/teams" className={`sidebar-link ${isActive('/admin/teams')}`} onClick={() => setIsOpen(false)}>
                    TEAMS MANAGER
                </Link>
                <Link to="/admin/auction" className={`sidebar-link ${isActive('/admin/auction')}`} onClick={() => setIsOpen(false)}>
                    AUCTION CONTROL
                </Link>
                <Link to="/admin/squads" className={`sidebar-link ${isActive('/admin/squads')}`} onClick={() => setIsOpen(false)}>
                    TEAM SQUADS
                </Link>
                <Link to="/" className="sidebar-link" style={{ marginTop: 'auto', border: '1px solid #333' }} onClick={() => setIsOpen(false)}>
                    EXIT PANEL
                </Link>
            </nav>

            {/* Main Content */}
            <main className="dashboard-content">
                {children}
            </main>

            {/* Overlay for mobile when sidebar is open */}
            {isOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }} onClick={() => setIsOpen(false)}></div>}
        </div>
    );
}