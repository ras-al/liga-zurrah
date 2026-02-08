import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import './AuctionScreen.css';

export default function AuctionScreen() {
    const [data, setData] = useState(null);
    const [teams, setTeams] = useState([]);
    const [squad, setSquad] = useState([]);
    const [squadLoading, setSquadLoading] = useState(false);
    const [allPlayers, setAllPlayers] = useState([]);

    // ⚡ ANIMATION PHASE: 'entry' (Center Title) -> 'grid' (Grid + Fireworks)
    const [revealPhase, setRevealPhase] = useState('entry');
    // Store Intro Players locally to prevent flicker
    const [introPlayers, setIntroPlayers] = useState([]);

    // PARADE STATE
    const [paradeIndex, setParadeIndex] = useState(-1); // -1: Init, 0..N: Team Index, N+1: Final Grid
    const [paradePhase, setParadePhase] = useState('logo'); // 'logo' (Manager+Logo) -> 'grid' (All Teams)

    // --- HELPER: FIREWORKS & POPPERS ---
    const triggerFireworks = () => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 999 };
        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    };

    const triggerPoppers = () => {
        const count = 200;
        const defaults = {
            origin: { y: 0.7 },
            zIndex: 9999
        };

        function fire(particleRatio, opts) {
            confetti(Object.assign({}, defaults, opts, {
                particleCount: Math.floor(count * particleRatio)
            }));
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
    };


    // --- HELPER: FETCH PLAYERS ---
    useEffect(() => {
        const fetchPlayers = async () => {
            const snap = await getDocs(collection(db, 'registrations'));
            setAllPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        fetchPlayers();

        // LISTEN TO AUCTION STATE
        const unsubAuction = onSnapshot(doc(db, 'auction', 'live'), async (docSnap) => {
            const auctionData = docSnap.data();

            // 🎬 LOGIC 1: GROUP INTRO (Marquee, Super, etc.)
            if (auctionData?.status === 'intro') {
                // Reset Phase if it's a new trigger
                if (data?.status !== 'intro' || data?.introTimestamp !== auctionData.introTimestamp) {
                    setRevealPhase('entry');

                    // Filter Players Immediately
                    const groupName = auctionData.group || 'PLAYERS';
                    const subGroup = auctionData.subGroup;
                    let filtered = allPlayers.length > 0 ? allPlayers : (await getDocs(collection(db, 'registrations'))).docs.map(d => ({ id: d.id, ...d.data() }));

                    filtered = filtered.filter(p => p.status !== 'sold' && p.role === 'Player');

                    if (groupName === 'Marquee') filtered = filtered.filter(p => p.isMarquee);
                    else if (groupName === 'Goalkeeper') filtered = filtered.filter(p => p.role === 'Player' && p.position && p.position.includes('Goalkeeper') && !p.isMarquee);
                    else if (groupName === 'Super') filtered = filtered.filter(p => p.isSuper && !p.isMarquee && (!p.position || !p.position.includes('Goalkeeper')));
                    else if (groupName === 'Other') filtered = filtered.filter(p => !p.isMarquee && !p.isSuper && (!p.position || !p.position.includes('Goalkeeper')));

                    if (subGroup) filtered = filtered.filter(p => p.position && p.position.includes(subGroup));
                    filtered.sort((a, b) => a.name.localeCompare(b.name));

                    setIntroPlayers(filtered);

                    // Sequence: Wait 2.5s -> Move Up -> Fireworks
                    setTimeout(() => {
                        setRevealPhase('grid');
                        triggerFireworks();
                    }, 2500);
                }
            }

            // 🎬 LOGIC 2: SQUAD REVEAL (Teams)
            if (auctionData?.status === 'reveal') {
                if (data?.status !== 'reveal' || data?.viewTeamId !== auctionData.viewTeamId) {
                    setRevealPhase('entry');
                    if (auctionData.viewTeamId) {
                        setSquadLoading(true);
                        setSquad([]);
                        try {
                            const q = query(collection(db, 'registrations'), where('teamId', '==', auctionData.viewTeamId), where('status', '==', 'sold'));
                            const pSnap = await getDocs(q);
                            setSquad(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                        } catch (error) { console.error(error); }
                        setSquadLoading(false);

                        setTimeout(() => {
                            setRevealPhase('grid'); // Fly Up
                            triggerPoppers(); // 💥 SQUAD REVEAL POPPER
                        }, 3000); // 3 seconds pulsing logo
                    }
                }
            }

            // 🎬 LOGIC 3: TEAM PARADE
            if (auctionData?.status === 'parade') {
                if (data?.status !== 'parade' || data?.startTime !== auctionData.startTime) {
                    // Start Parade Sequence
                    setParadeIndex(-1);
                    setParadePhase('logo');

                    // Allow teams to load if not already
                    setTimeout(() => {
                        setParadeIndex(0); // Start 1st Team
                    }, 500);
                }
            }

            setData(auctionData);
        });

        const unsubTeams = onSnapshot(collection(db, 'teams'), (snap) => {
            setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.wallet - a.wallet));
        });

        return () => { unsubAuction(); unsubTeams(); };
    }, [allPlayers.length]); // Re-run logic if player list loads late

    // TEAM PARADE SEQUENCER
    useEffect(() => {
        if (data?.status === 'parade' && teams.length > 0) {
            if (paradeIndex >= 0 && paradeIndex < teams.length) {
                // 🎉 Trigger Fireworks for every team reveal
                triggerFireworks();

                // 💥 POPPER EFFECT (Delay to match logo)
                setTimeout(() => triggerPoppers(), 1000);

                // Determine duration for each team (Reduced to 3s)
                const timer = setTimeout(() => {
                    setParadeIndex(prev => prev + 1);
                }, 5000);
                return () => clearTimeout(timer);
            } else if (paradeIndex === teams.length) {
                // Parade finish -> Show All Grid
                triggerFireworks();
                triggerPoppers();
            }
        }
    }, [paradeIndex, data?.status, teams.length]);

    if (!data) return (
        <div className="auction-screen-idle">
            <div className="auction-idle-vertical">
                {/* 1. TOP: LOGO & TITLE */}
                <div className="idle-center-content">
                    <img src="/logo_circle.png" className="idle-main-logo" alt="Liga Logo" />
                    <div className="glitch-text" data-text="LIGA ZURRHA">LIGA ZURRHA</div>
                    <div className="official-text">OFFICIAL SPONSORS</div>
                </div>

                {/* 2. BOTTOM: SPONSORS ROW */}
                <div className="idle-sponsors-row">
                    <img src="/sponser1.png" className="sponsor-medium" alt="Sponsor 1" />
                    <div className="sponsor-divider"></div>
                    <img src="/sponser2.png" className="sponsor-medium" alt="Sponsor 2" />
                    <div className="sponsor-divider"></div>
                    <img src="/sponser3.png" className="sponsor-medium" alt="Sponsor 3" />
                </div>
            </div>
            <h2 className="pulse-text" style={{ color: 'var(--neon-gold)', marginTop: 40, fontFamily: 'Bebas Neue', letterSpacing: 8, fontSize: '1.5rem', zIndex: 2 }}>WAITING TO START...</h2>
        </div>
    );

    // --- ANIMATION VARIANTS (Shared) ---
    const titleVariants = {
        entry: { top: '50%', left: '50%', x: '-50%', y: '-50%', scale: 3, opacity: 1, position: 'absolute' },
        grid: { top: '5%', left: '50%', x: '-50%', y: '0%', scale: 1, opacity: 1, position: 'absolute' }
    };

    const logoPulseVariants = {
        entry: { scale: [1, 1.2, 1], opacity: 1, transition: { repeat: Infinity, duration: 1.5 } },
        grid: { scale: 0.5, y: -200, opacity: 1, transition: { duration: 0.8 } }
    };

    // 1. 🌟 GROUP INTRO RENDER
    if (data.status === 'intro') {
        return (
            <div className="reveal-container">
                <div className="reveal-bg-glow"></div>

                {/* TITLE ANIMATION */}
                <motion.div
                    initial="entry"
                    animate={revealPhase}
                    variants={titleVariants}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="reveal-header-box"
                >
                    <h1 className="reveal-team-name" style={{ fontSize: '4rem' }}>
                        {data.group} <span style={{ display: 'block', fontSize: '0.4em', color: 'white', letterSpacing: '5px' }}>{data.subGroup || 'PLAYERS'}</span>
                    </h1>
                </motion.div>

                {/* GRID REVEAL */}
                {revealPhase === 'grid' && (
                    <div className="squad-grid-container">
                        <div className="squad-grid-3d">
                            {introPlayers.map((p, i) => (
                                <motion.div
                                    key={p.id}
                                    className="intro-card-glass"
                                    initial={{ opacity: 0, scale: 0.5, y: 50 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }} // Fast Ripple
                                >
                                    <img src={p.photo} alt={p.name} />
                                    <div className="intro-info">
                                        <div className="name">{p.name}</div>
                                        <div className="pos">{p.position}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 2. 🏆 SQUAD REVEAL RENDER
    if (data.status === 'reveal') {
        return (
            <div className="reveal-container">
                <div className="reveal-bg-glow"></div>

                {/* LOGO & TITLE */}
                <motion.div
                    initial={{ top: '50%', left: '50%', x: '-50%', y: '-50%', scale: 1, opacity: 1 }}
                    animate={revealPhase === 'grid' ? { top: '5%', y: '0%', scale: 0.6 } : { scale: [1, 1.1, 1] }}
                    transition={revealPhase === 'grid' ? { duration: 0.8, ease: "easeInOut" } : { repeat: Infinity, duration: 2 }}
                    className={`reveal-header-box ${revealPhase === 'grid' ? 'phase-grid' : ''}`}
                    style={{ position: 'absolute' }}
                >
                    {data.viewTeamLogo && <img src={data.viewTeamLogo} className={`reveal-logo ${revealPhase === 'entry' ? 'pulse-massive' : ''}`} style={{ width: 250, height: 250, border: '6px solid gold', marginBottom: 20 }} />}
                    <h1 className="reveal-team-name">{data.viewTeamName}</h1>
                </motion.div>

                {revealPhase === 'grid' && (
                    <div className="squad-grid-container">
                        <div className="squad-grid-3d">
                            {squad.map((player, i) => (
                                <motion.div
                                    key={player.id}
                                    className="squad-card-3d"
                                    initial={{ opacity: 0, rotateX: 90 }}
                                    animate={{ opacity: 1, rotateX: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <div className="card-inner">
                                        <img src={player.photo} />
                                        <div className="card-footer">
                                            <div className="p-name">{player.name}</div>
                                            <div className="p-price">₹{player.soldPrice}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 3. 🎺 TEAM PARADE RENDER
    if (data.status === 'parade') {
        const currentTeam = teams[paradeIndex];
        const isFinished = paradeIndex >= teams.length;

        // Find Team Managers (Filter instead of find)
        const managers = allPlayers.filter(p => p.role === 'Manager' && p.teamId === currentTeam?.id);

        return (
            <div className="reveal-container" style={{ justifyContent: 'center', paddingTop: '50px' }}>
                <div className="reveal-bg-glow"></div>

                {!isFinished && currentTeam && (
                    <motion.div
                        key={currentTeam.id}
                        initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 1.2, filter: 'blur(10px)' }}
                        transition={{ duration: 0.8 }}
                        className="parade-center-stage"
                        style={{ marginTop: '50px' }} // Added to clear top
                    >
                        {/* 1. LOGO REVEAL */}
                        <motion.img
                            src={currentTeam.logo}
                            className="parade-logo"
                            initial={{ scale: 1.5, y: 150 }} // Start Lower
                            animate={{ scale: 1, y: 0 }}   // Move to Normal
                            transition={{ delay: 1.0, duration: 1.5, ease: "easeOut" }} // Slower
                        />

                        <motion.div
                            initial={{ y: 50 }}
                            animate={{ y: 0 }}
                            transition={{ delay: 1.5, duration: 1, ease: "easeInOut" }}
                        >
                            <h1 className="parade-team-name">{currentTeam.name}</h1>
                        </motion.div>

                        {/* 2. MANAGERS REVEAL BELOW */}
                        {managers.length > 0 && (
                            <div className="parade-managers-row" style={{ marginTop: '20px' }}>
                                {managers.map((mgr, i) => (
                                    <motion.div
                                        key={mgr.id}
                                        className="manager-card-rect"
                                        initial={{ opacity: 0, y: 50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 2.5 + (i * 0.2) }}
                                    >
                                        <img src={mgr.photo} className="mgr-rect-photo" />
                                        <div className="mgr-rect-info">
                                            <div className="mgr-rect-name">{mgr.name}</div>
                                            <div className="mgr-rect-role">MANAGER</div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {isFinished && (
                    <div className="parade-grid-screen">
                        <h1 className="reveal-title" style={{ marginBottom: 50 }}>THE TEAMS ARE READY</h1>
                        <div className="teams-grid-final">
                            {teams.map((t, i) => (
                                <motion.div
                                    key={t.id}
                                    initial={{ opacity: 0, y: 50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.2 }}
                                    className="final-team-card"
                                >
                                    <img src={t.logo} />
                                    <div className="name">{t.name}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 3. LIVE AUCTION (Existing Code)
    return (
        <div className="auction-layout">
            <div className="broadcast-overlay"></div>
            {/* LIVE BADGE */}
            <div className="live-badge"><span className="live-dot"></span> LIVE AUCTION</div>

            {/* LEFT */}
            <div className="auction-stats-panel">
                <div className="auction-stat-card base-price"><h3>BASE PRICE</h3><div className="stat-value">₹{data.basePrice || 0}</div></div>
                <div className="auction-stat-card current-bid"><h3>CURRENT BID</h3><motion.div key={data.currentBid} initial={{ scale: 1.3, color: '#fff' }} animate={{ scale: 1, color: '#fbbf24' }} className="bid-value">₹{data.currentBid || 0}</motion.div></div>
                <div className="auction-stat-card highest-bidder"><h3>HIGHEST BIDDER</h3><div className="bidder-name">{data.bidderTeam || 'NO BIDS'}</div></div>
            </div>

            {/* CENTER */}
            {/* Middle: Star Player Stage */}
            <div className="auction-main" style={{ perspective: '1000px' }}>

                {/* 🌟 1. ROTATING BACKGROUND RAYS */}
                <div className="player-spotlight-bg"></div>

                {/* 💥 2. SHOCKWAVE EFFECT (Triggers on new player) */}
                <motion.div
                    key={data.id + '-shock'}
                    className="impact-shockwave"
                    initial={{ width: '10px', height: '10px', opacity: 1, boxShadow: '0 0 0 0px rgba(251, 191, 36, 0.8)' }}
                    animate={{
                        width: '800px',
                        height: '800px',
                        opacity: 0,
                        boxShadow: '0 0 50px 100px rgba(251, 191, 36, 0)'
                    }}
                    transition={{ duration: 2.5, ease: "easeOut" }}
                />

                {/* --- SPONSOR LOGOS (Hidden during Live Auction) --- */}
                {data.photo ? null : (
                    /* --- IDLE/WAITING STATE: LARGE CENTER LOGOS --- */
                    <div className="auction-idle-vertical">
                        {/* 1. TOP: LOGO & TITLE */}
                        <div className="idle-center-content">
                            <img src="/logo_circle.png" className="idle-main-logo" alt="Liga Logo" />
                            <div className="glitch-text" data-text="LIGA ZURRHA">LIGA ZURRHA</div>
                            <div className="official-text">OFFICIAL SPONSORS</div>
                        </div>

                        {/* 2. BOTTOM: SPONSORS ROW */}
                        <div className="idle-sponsors-row">
                            <img src="/sponser1.png" className="sponsor-medium" alt="Sponsor 1" />
                            <div className="sponsor-divider"></div>
                            <img src="/sponser2.png" className="sponsor-medium" alt="Sponsor 2" />
                            <div className="sponsor-divider"></div>
                            <img src="/sponser3.png" className="sponsor-medium" alt="Sponsor 3" />
                        </div>
                    </div>
                )}
                {/* 📸 3. PLAYER PHOTO (Zoom & Blur In) */}
                {data.photo && (
                    <motion.img
                        key={data.photo}
                        initial={{ scale: 1.2, opacity: 0, filter: 'blur(30px)', y: 20 }}
                        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)', y: 0 }}
                        transition={{ duration: 2.0, ease: "easeOut" }}
                        src={data.photo}
                        className="auction-player-img"
                    />
                )}

                {/* 📝 4. NAME (Heavy Slam from Bottom) */}
                <div style={{ overflow: 'hidden' }}>
                    <motion.h1
                        key={data.name}
                        initial={{ y: 150, skewY: 10 }}
                        animate={{ y: 0, skewY: 0 }}
                        transition={{ delay: 0.8, type: "spring", stiffness: 80 }}
                        className="auction-player-name"
                    >
                        {data.name}
                    </motion.h1>
                </div>

                {/* 📊 5. DETAILS (Slide in from Sides) */}
                <motion.h2
                    key={data.id + '-details'}
                    initial={{ opacity: 0, letterSpacing: '20px' }}
                    animate={{ opacity: 1, letterSpacing: '6px' }}
                    transition={{ delay: 1.2, duration: 1.0 }}
                    className="auction-player-details"
                >
                    <span style={{ color: 'white' }}>{data.position}</span>
                    <span style={{ color: 'var(--neon-red)', margin: '0 15px' }}>•</span>
                    {data.age} YRS
                </motion.h2>

                {/* SOLD/UNSOLD STAMP */}
                <AnimatePresence>
                    {(data.status === 'sold' || data.status === 'unsold') && (
                        <motion.div
                            key={data.status}
                            initial={{ scale: 3, opacity: 0, rotate: -45 }}
                            animate={{ scale: 1, opacity: 1, rotate: -15 }}
                            className={`auction-stamp ${data.status}`}
                        >
                            {data.status}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 🚀 TRANSFER ANIMATION (Flying Photo) */}
                {data.status === 'sold' && (
                    <motion.img
                        src={data.photo}
                        className="transfer-flying-photo"
                        initial={{ top: '40%', left: '50%', x: '-50%', y: '-50%', scale: 1, opacity: 1 }}
                        animate={{ top: '20%', left: '90%', scale: 0, opacity: 0 }}
                        transition={{ delay: 0.5, duration: 1.5, ease: "easeInOut" }}
                    />
                )}
            </div>

            {/* RIGHT */}
            <div className="auction-sidebar">
                <h3>TEAMS</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {teams.map(t => (
                        <div key={t.id} className={`team-list-item ${t.name === data.bidderTeam ? 'active-bidder' : ''}`}>
                            <div style={{ display: 'flex', gap: '10px' }}><span>{t.name}</span></div>
                            <span className="team-wallet">₹{t.wallet}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Broadcast Footer Ticker */}
            <div className="next-player-preview">
                <div className="ticker-wrap">
                    <div className="ticker-content">
                        LIGA ZURRHA 2026 LIVE AUCTION • HIGHEST BIDDER: {data.bidderTeam} (₹{data.currentBid}) • WAITING LIST: {teams.length} TEAMS ACTIVE •
                        LIGA ZURRHA 2026 LIVE AUCTION • HIGHEST BIDDER: {data.bidderTeam} (₹{data.currentBid}) • WAITING LIST: {teams.length} TEAMS ACTIVE •
                    </div>
                </div>
            </div>
        </div>
    );
}