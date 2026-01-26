import { Link, useNavigate } from 'react-router-dom';
import { motion, animate } from 'framer-motion';
import { useEffect, useRef } from 'react';
import logo from '../assets/logo_circle.png';
import poster from '../assets/poster_dynamic.png';
import './Landing.css';

// Section Components for Clarity
const Hero = () => (
    <div className="landing-section hero-section">
        {/* Dynamic Background */}
        <div className="hero-bg-container">
            <img src={poster} className="hero-bg-img" alt="Background" />
            <div className="hero-overlay"></div>
        </div>

        <div className="hero-content">
            <motion.h3
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
                className="hero-subtitle"
            >
                ZURRHA PRESENTS
            </motion.h3>

            <motion.div
                className="title-wrapper"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.3 }}
            >
                <h1 className="hero-title">LIGA ZURRHA</h1>
                <motion.div
                    className="floating-ball"
                    animate={{ y: [0, -20, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >⚽</motion.div>
            </motion.div>

            <motion.p
                className="hero-tagline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
            >
                16 Teams | 16 Managers | 144 Players | ONE Champion
            </motion.p>

            <motion.div
                className="hero-btns"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
            >
                <Link to="/register" className="cta-btn primary-btn">REGISTER NOW</Link>
                <button className="cta-btn secondary-btn" onClick={() => document.getElementById('about').scrollIntoView({ behavior: 'smooth' })}>VIEW RULES</button>
            </motion.div>
        </div>
    </div>
);


const About = () => (
    <div id="about" className="landing-section about-section">
        <div className="container">
            <motion.div
                className="about-text"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
                style={{ textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}
            >
                <h2>THE ULTIMATE BATTLE</h2>
                <div style={{ height: '4px', width: '100px', background: 'var(--neon-gold)', margin: '0 auto 30px' }}></div>
                <p>
                    A high-energy football tournament packed with <span className="highlight-text">SKILL</span>, <span className="highlight-text">STRATEGY</span>, and <span className="highlight-text">PURE PASSION</span>.
                </p>
                <p style={{ marginTop: '20px' }}>
                    Gather your squad, plan your bids, and <span style={{ color: 'white', fontWeight: 'bold' }}>DOMINATE THE LEAGUE</span>.
                </p>
            </motion.div>
        </div>
    </div>
);

const Instructions = () => (
    <div className="landing-section instructions-section">
        <h2>HOW TO JOIN</h2>
        <div className="cards-grid">
            {['Choose Role', 'Upload Photo', 'Correct Details', 'One Response Only'].map((step, i) => (
                <motion.div
                    key={i}
                    className="info-card"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                >
                    <div className="card-step-number">0{i + 1}</div>
                    <div className="card-content">
                        <h3>STEP {i + 1}</h3>
                        <p>{step}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    </div>
);

const Stats = () => {
    // Counter Component
    const Counter = ({ from, to }) => {
        const nodeRef = useRef();
        useEffect(() => {
            const node = nodeRef.current;
            const controls = animate(from, to, {
                duration: 2,
                onUpdate(value) {
                    node.textContent = Math.round(value);
                }
            });
            return () => controls.stop();
        }, [from, to]);
        return <span ref={nodeRef} />;
    };

    return (
        <div className="landing-section stats-section">
            <div className="stats-grid">
                {[
                    { num: 16, label: 'TEAMS' },
                    { num: 16, label: 'MANAGERS' },
                    { num: 144, label: 'PLAYERS' },
                    { num: 1, label: 'CHAMPION' }
                ].map((s, i) => (
                    <motion.div
                        key={i}
                        className="stat-box"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1, duration: 0.5 }}
                    >
                        <span className="stat-num">
                            <Counter from={0} to={s.num} />
                        </span>
                        <span className="stat-lbl">{s.label}</span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

// Final Assembly
export default function Landing() {
    return (
        <div className="landing-page">
            <Hero />
            <About />
            <Instructions />
            <Stats />



            {/* Final CTA */}
            <div className="landing-section final-cta">
                <div className="cta-bg-overlay"></div>
                <div className="cta-content">
                    <h2>READY TO ENTER THE BATTLEFIELD?</h2>
                    <Link to="/register" className="cta-btn primary-btn pulse-btn">REGISTER NOW</Link>
                </div>
            </div>

            <footer className="landing-footer">
                <p>&copy; 2026 Zurrha Presents | LIGA ZURRHA</p>
            </footer>
        </div>
    );
}