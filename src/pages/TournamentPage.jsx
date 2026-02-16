import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import PointsTable from '../components/tournament/PointsTable';
import KnockoutBracket from '../components/tournament/KnockoutBracket';
import { motion, AnimatePresence } from 'framer-motion';

export default function TournamentPage() {
    const [activeTab, setActiveTab] = useState('TABLE');
    const [recentMatches, setRecentMatches] = useState([]);

    // Match Details Modal
    const [selectedMatch, setSelectedMatch] = useState(null);

    useEffect(() => {
        const q = query(collection(db, 'matches'), orderBy('matchId', 'asc'), limit(50));
        const unsub = onSnapshot(q, (snap) => {
            setRecentMatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    const getEventIcon = (type) => {
        switch (type) {
            case 'GOAL': return '⚽';
            case 'YELLOW_CARD': return '🟨';
            case 'RED_CARD': return '🟥';
            case 'OWN_GOAL': return '🥅 (OG)';
            default: return '•';
        }
    };

    return (
        <div style={{ background: '#050505', minHeight: '100vh', paddingBottom: '80px', fontFamily: 'Inter, sans-serif' }}>
            {/* HERO / HEADER */}
            <div style={{
                background: 'linear-gradient(to bottom, #111, #050505)',
                padding: '30px 20px',
                textAlign: 'center',
                borderBottom: '1px solid #222'
            }}>
                <h1 style={{ fontFamily: 'Anton', fontSize: '2.5rem', color: 'white', margin: 0 }}>TOURNAMENT CENTER</h1>
                <p style={{ color: 'var(--neon-gold)', marginTop: '5px', fontSize: '0.9rem', letterSpacing: '2px' }}>LIGA ZURRAH SEASON 1</p>
            </div>

            {/* LIVE TICKER */}
            {recentMatches.some(m => m.status === 'live') && (
                <div style={{ background: 'var(--neon-red)', color: 'white', padding: '8px', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    <div style={{ display: 'inline-block', animation: 'scroll 20s linear infinite' }}>
                        LIVE: {recentMatches.filter(m => m.status === 'live').map(m => `${m.teamAName} ${m.scoreA} - ${m.scoreB} ${m.teamBName}  •  `).join('')}
                    </div>
                </div>
            )}

            {/* TABS - STICKY ON MOBILE */}
            <div style={{
                display: 'flex', justifyContent: 'center', gap: '10px',
                padding: '15px 0', position: 'sticky', top: 0,
                background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(10px)', zIndex: 100, borderBottom: '1px solid #222'
            }}>
                {['TABLE', 'FIXTURES', 'KNOCKOUTS'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            background: 'transparent',
                            color: activeTab === tab ? 'var(--neon-gold)' : '#666',
                            border: 'none',
                            borderBottom: activeTab === tab ? '2px solid var(--neon-gold)' : '2px solid transparent',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            padding: '8px 15px',
                            cursor: 'pointer',
                            fontFamily: 'Rajdhani, sans-serif'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px 15px' }}>
                {activeTab === 'TABLE' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                            {['A', 'B', 'C', 'D'].map(group => (
                                <div key={group} className="glass-panel" style={{ padding: '15px', background: '#111', border: '1px solid #333', borderRadius: '8px' }}>
                                    <h3 style={{ color: 'white', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '10px', fontSize: '1.2rem', fontFamily: 'Anton' }}>GROUP {group}</h3>
                                    <div style={{ overflowX: 'auto' }}>
                                        <PointsTable filterGroup={group} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'FIXTURES' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="matches-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {recentMatches.map(match => (
                                <div
                                    key={match.id}
                                    onClick={() => setSelectedMatch(match)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        background: '#1a1a1a', padding: '12px', borderRadius: '8px', border: '1px solid #333',
                                        cursor: 'pointer', transition: 'background 0.2s', position: 'relative'
                                    }}
                                    className="match-card-hover"
                                >
                                    {/* Tap instruction for mobile users who might not know it's clickable */}
                                    <div style={{ position: 'absolute', top: '5px', right: '5px', fontSize: '0.6rem', color: '#444' }}>DETAILS ↗</div>

                                    {/* Team A */}
                                    <div style={{ flex: 1, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem', display: 'none', sm: 'block' }} className="desktop-name">{match.teamAName}</span>
                                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }} className="mobile-name">{match.teamAName.substring(0, 3).toUpperCase()}</span>
                                        <img src={match.teamALogo} style={{ width: 35, height: 35, borderRadius: '50%' }} />
                                    </div>

                                    {/* Score */}
                                    <div style={{ width: '70px', textAlign: 'center' }}>
                                        {match.status === 'scheduled' ? (
                                            <span style={{ color: '#666', fontSize: '0.7rem', fontFamily: 'monospace' }}>VS</span>
                                        ) : (
                                            <div style={{ background: '#000', padding: '4px 8px', borderRadius: '4px', border: '1px solid #333', color: 'var(--neon-gold)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                                {match.scoreA} - {match.scoreB}
                                            </div>
                                        )}
                                        {match.status === 'live' && <div style={{ fontSize: '0.6rem', color: 'var(--neon-red)', marginTop: '2px', fontWeight: 'bold', animation: 'pulse 1s infinite' }}>● LIVE</div>}
                                    </div>

                                    {/* Team B */}
                                    <div style={{ flex: 1, textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
                                        <img src={match.teamBLogo} style={{ width: 35, height: 35, borderRadius: '50%' }} />
                                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }} className="desktop-name">{match.teamBName}</span>
                                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }} className="mobile-name">{match.teamBName.substring(0, 3).toUpperCase()}</span>
                                    </div>
                                </div>
                            ))}
                            {recentMatches.length === 0 && <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>No Matches Found</div>}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'KNOCKOUTS' && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                        <KnockoutBracket isAdmin={false} />
                    </motion.div>
                )}
            </div>

            {/* MATCH DETAILS SHEET / MODAL */}
            <AnimatePresence>
                {selectedMatch && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
                        onClick={() => setSelectedMatch(null)}
                    >
                        <motion.div
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            style={{
                                background: '#111', width: '100%', maxWidth: '600px',
                                borderTopLeftRadius: '16px', borderTopRightRadius: '16px', borderTop: '1px solid #333',
                                maxHeight: '85vh', overflowY: 'auto'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Drag Handle */}
                            <div style={{ width: '40px', height: '4px', background: '#333', borderRadius: '4px', margin: '10px auto' }}></div>

                            {/* Header */}
                            <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #222' }}>
                                <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>GROUP {selectedMatch.groupId} • {selectedMatch.status.toUpperCase()}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
                                    <div style={{ textAlign: 'center', width: '30%' }}>
                                        <img src={selectedMatch.teamALogo} style={{ width: 60, height: 60, borderRadius: '50%', marginBottom: '5px' }} />
                                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem', lineHeight: '1.2' }}>{selectedMatch.teamAName}</div>
                                    </div>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--neon-gold)', fontFamily: 'Anton' }}>
                                        {selectedMatch.scoreA} - {selectedMatch.scoreB}
                                    </div>
                                    <div style={{ textAlign: 'center', width: '30%' }}>
                                        <img src={selectedMatch.teamBLogo} style={{ width: 60, height: 60, borderRadius: '50%', marginBottom: '5px' }} />
                                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem', lineHeight: '1.2' }}>{selectedMatch.teamBName}</div>
                                    </div>
                                </div>
                                {selectedMatch.playerOfTheMatch && (
                                    <div style={{ textAlign: 'center', marginTop: '10px', padding: '5px', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid var(--neon-gold)', borderRadius: '8px', display: 'inline-block' }}>
                                        <span style={{ color: 'var(--neon-gold)', fontSize: '0.8rem', fontWeight: 'bold' }}>⭐ PLAYER OF THE MATCH</span>
                                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1rem' }}>{selectedMatch.playerOfTheMatch}</div>
                                    </div>
                                )}
                            </div>

                            {/* Events List */}
                            <div style={{ padding: '20px' }}>
                                <h4 style={{ color: '#888', margin: '0 0 15px 0', fontSize: '0.8rem', letterSpacing: '1px' }}>MATCH EVENTS</h4>
                                {(!selectedMatch.events || selectedMatch.events.length === 0) ? (
                                    <div style={{ textAlign: 'center', color: '#444', padding: '20px' }}>No events recorded for this match.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {selectedMatch.events.sort((a, b) => b.timestamp - a.timestamp).map((ev, i) => (
                                            <div key={i} style={{
                                                display: 'flex', alignItems: 'center',
                                                justifyContent: ev.team === 'A' ? 'flex-start' : 'flex-end',
                                                gap: '10px'
                                            }}>
                                                {/* TIME - Center aligned conceptually */}

                                                {ev.team === 'A' && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontSize: '0.8rem', color: '#666', minWidth: '30px' }}>{ev.time}'</span>
                                                        <span style={{ fontSize: '1.2rem' }}>{getEventIcon(ev.type)}</span>
                                                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>{ev.player}</span>
                                                    </div>
                                                )}

                                                {ev.team === 'B' && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexDirection: 'row-reverse', textAlign: 'right' }}>
                                                        <span style={{ fontSize: '0.8rem', color: '#666', minWidth: '30px' }}>{ev.time}'</span>
                                                        <span style={{ fontSize: '1.2rem' }}>{getEventIcon(ev.type)}</span>
                                                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>{ev.player}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ height: '50px' }}></div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                @media (max-width: 600px) {
                    .desktop-name { display: none !important; }
                    .mobile-name { display: block !important; }
                    .matches-list { gap: 8px; }
                }
                @media (min-width: 601px) {
                    .desktop-name { display: block !important; }
                    .mobile-name { display: none !important; }
                }
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
                @keyframes scroll {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
}
