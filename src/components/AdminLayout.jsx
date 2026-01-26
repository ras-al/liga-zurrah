import { Link, useLocation } from 'react-router-dom';

export default function AdminLayout({ children }) {
    const location = useLocation();

    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <nav className="sidebar">
                <h2 style={{ color: '#fff', marginBottom: '40px', textAlign: 'center' }}>ADMIN PANEL</h2>

                <Link to="/admin" className={`sidebar-link ${isActive('/admin')}`}>
                    DASHBOARD
                </Link>
                <Link to="/admin/teams" className={`sidebar-link ${isActive('/admin/teams')}`}>
                    TEAMS MANAGER
                </Link>
                <Link to="/admin/auction" className={`sidebar-link ${isActive('/admin/auction')}`}>
                    AUCTION CONTROL
                </Link>
                <Link to="/" className="sidebar-link" style={{ marginTop: 'auto', border: '1px solid #333' }}>
                    EXIT PANEL
                </Link>
            </nav>

            {/* Main Content */}
            <main className="dashboard-content">
                {children}
            </main>
        </div>
    );
}