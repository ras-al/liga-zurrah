import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import logo from '../assets/logo_circle.png';
import poster from '../assets/poster_dynamic.png';

export default function Landing() {
    return (
        <div className="landing-hero">
            <img src={poster} alt="Liga Zurrah Stadium" className="hero-bg" />

            <div className="hero-content">
                <motion.img
                    src={logo}
                    alt="Liga Zurrah Logo"
                    className="liga-logo"
                    initial={{ opacity: 0, scale: 0.8, rotate: -180 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ duration: 1, ease: "backOut" }}
                />

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                >
                    <h3 className="hero-subtitle">ZURRAH PRESENTS</h3>
                    <h1 className="hero-title">LIGA ZURRAH</h1>
                </motion.div>

                <motion.div
                    className="hero-stats"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 1 }}
                >
                    <div className="stat-item">
                        <span className="stat-val">16</span>
                        <span className="stat-label">TEAMS</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-val">16</span>
                        <span className="stat-label">MANAGERS</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-val">144</span>
                        <span className="stat-label">PLAYERS</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-val">1</span>
                        <span className="stat-label">CHAMPION</span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                >
                    <Link to="/register" className="cta-btn">JOIN THE LEAGUE</Link>
                </motion.div>
            </div>
        </div>
    );
}