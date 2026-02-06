import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function ManagerDashboard() {
    const [team, setTeam] = useState(null);
    const [players, setPlayers] = useState([]);
    const [unlockedGroups, setUnlockedGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Market'); // 'Market' or 'Squad'
    const [selectedPlayer, setSelectedPlayer] = useState(null); // For Modal
    const navigate = useNavigate();

    // 1. Auth Check & Team Stream
    useEffect(() => {
        const teamId = localStorage.getItem('managerTeamId');
        if (!teamId) {
            navigate('/team-login');
            return;
        }

        const unsubTeam = onSnapshot(doc(db, 'teams', teamId), (doc) => {
            if (doc.exists()) {
                setTeam({ id: doc.id, ...doc.data() });
            } else {
                toast.error("Team not found!");
                navigate('/team-login');
            }
            setLoading(false);
        });

        // 2. Unlocked Groups Stream
        const unsubSettings = onSnapshot(doc(db, 'auction', 'settings'), (doc) => {
            if (doc.exists()) {
                setUnlockedGroups(doc.data().unlocked_groups || []);
            }
        });

        return () => {
            unsubTeam();
            unsubSettings();
        };
    }, []);

    // 3. Players Stream (Market & Squad)
    useEffect(() => {
        const unsubPlayers = onSnapshot(collection(db, 'registrations'), (snapshot) => {
            const allPlayers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setPlayers(allPlayers);
        });

        return () => unsubPlayers();
    }, []);

    const logout = () => {
        if (confirm("Logout?")) {
            localStorage.removeItem('managerTeamId');
            navigate('/team-login');
        }
    };

    if (loading || !team) return <div style={{ background: 'black', height: '100vh', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading War Room...</div>;

    // --- DERIVED DATA ---
    const mySquad = players.filter(p => p.teamId === team.id && p.status === 'sold');

    const marketPlayers = players.filter(p => {
        if (p.status !== 'approved' && p.status !== 'unsold') return false;
        if (p.role !== 'Player') return false;

        let category = 'Other';
        if (p.isMarquee) category = 'Marquee';
        else if (p.isSuper) category = 'Super';

        if (p.position && p.position.includes('Goalkeeper') && !p.isMarquee) category = 'Goalkeeper';

        return unlockedGroups.includes(category);
    });

    return (
        <div style={{ background: '#000', minHeight: '100vh', paddingBottom: '80px', fontFamily: 'Inter, sans-serif' }}>

            {/* --- STICKY HEADER --- */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 100,
                background: 'rgba(10,10,10,0.95)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid #333',
                padding: '10px 15px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={team.logo} alt="logo" style={{ width: 40, height: 40, borderRadius: '8px', border: '1px solid #444' }} />
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>{team.name}</div>
                        <div style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 'bold' }}>₹ {team.wallet}</div>
                    </div>
                </div>
                <button onClick={logout} style={{ background: '#222', border: 'none', color: '#666', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem' }}>
                    LOGOUT
                </button>
            </div>

            {/* --- TABS --- */}
            <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
                <button
                    onClick={() => setActiveTab('Market')}
                    style={{ flex: 1, padding: '15px', background: activeTab === 'Market' ? '#111' : 'transparent', color: activeTab === 'Market' ? 'var(--neon-gold, #facc15)' : '#666', border: 'none', borderBottom: activeTab === 'Market' ? '2px solid var(--neon-gold, #facc15)' : 'none', fontWeight: 'bold' }}
                >
                    MARKET ({marketPlayers.length})
                </button>
                <button
                    onClick={() => setActiveTab('Squad')}
                    style={{ flex: 1, padding: '15px', background: activeTab === 'Squad' ? '#111' : 'transparent', color: activeTab === 'Squad' ? 'var(--neon-gold, #facc15)' : '#666', border: 'none', borderBottom: activeTab === 'Squad' ? '2px solid var(--neon-gold, #facc15)' : 'none', fontWeight: 'bold' }}
                >
                    MY SQUAD ({mySquad.length})
                </button>
            </div>

            {/* --- CONTENT --- */}
            <div style={{ padding: '15px' }}>
                <AnimatePresence mode="wait">
                    {activeTab === 'Market' ? (
                        <motion.div
                            key="market"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        >
                            {unlockedGroups.length === 0 ? (
                                <div style={{ textAlign: 'center', marginTop: '50px', color: '#444' }}>
                                    <h2>MARKET CLOSED</h2>
                                    <p>Waiting for Auctioneer to open the market...</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                                    {marketPlayers.map(p => (
                                        <div
                                            key={p.id}
                                            onClick={() => setSelectedPlayer(p)}
                                            style={{ background: '#111', borderRadius: '8px', overflow: 'hidden', border: '1px solid #333', cursor: 'pointer' }}
                                        >
                                            <div style={{ position: 'relative' }}>
                                                <img src={p.photo} alt={p.name} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }} />
                                                {p.status === 'unsold' && <div style={{ position: 'absolute', top: 5, right: 5, background: 'red', color: 'white', fontSize: '0.6rem', padding: '2px 5px', borderRadius: '3px' }}>UNSOLD</div>}
                                            </div>
                                            <div style={{ padding: '10px' }}>
                                                <div style={{ fontWeight: 'bold', color: 'white', fontSize: '0.9rem', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#888' }}>{p.position}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '5px' }}>
                                                    {p.isMarquee ? 'MARQUEE' : p.isSuper ? 'SUPER' : 'BASE'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {marketPlayers.length === 0 && <p style={{ color: '#666', gridColumn: '1/-1', textAlign: 'center' }}>No available players in unlocked categories.</p>}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="squad"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {mySquad.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => setSelectedPlayer(p)}
                                        style={{ display: 'flex', alignItems: 'center', background: '#111', padding: '10px', borderRadius: '8px', border: '1px solid #333', cursor: 'pointer' }}
                                    >
                                        <img src={p.photo} style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover' }} />
                                        <div style={{ marginLeft: '15px', flex: 1 }}>
                                            <div style={{ color: 'white', fontWeight: 'bold' }}>{p.name}</div>
                                            <div style={{ color: '#888', fontSize: '0.8rem' }}>{p.position}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: '#aaa', fontSize: '0.7rem' }}>BOUGHT FOR</div>
                                            <div style={{ color: 'var(--neon-gold, #facc15)', fontWeight: 'bold' }}>₹{p.soldPrice || 0}</div>
                                        </div>
                                    </div>
                                ))}
                                {mySquad.length === 0 && <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>Your squad is empty.</p>}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* --- PLAYER DETAIL MODAL --- */}
            <AnimatePresence>
                {selectedPlayer && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setSelectedPlayer(null)}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
                            zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center',
                            padding: '20px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
                            style={{
                                background: '#111', width: '100%', maxWidth: '350px',
                                borderRadius: '16px', border: '1px solid #444', overflow: 'hidden',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
                            }}
                        >
                            <div style={{ position: 'relative' }}>
                                <img src={selectedPlayer.photo} alt={selectedPlayer.name} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }} />
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                                    padding: '20px', paddingTop: '40px'
                                }}>
                                    <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem', lineHeight: '1.2' }}>{selectedPlayer.name.toUpperCase()}</h2>
                                    <p style={{ color: 'var(--neon-gold, #facc15)', margin: '5px 0 0 0', fontWeight: 'bold' }}>{selectedPlayer.position}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedPlayer(null)}
                                    style={{
                                        position: 'absolute', top: 15, right: 15,
                                        background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white',
                                        width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                                    }}
                                >
                                    &times;
                                </button>
                            </div>

                            <div style={{ padding: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div style={{ background: '#222', padding: '10px', borderRadius: '8px' }}>
                                        <div style={{ color: '#888', fontSize: '0.7rem', marginBottom: '3px' }}>CATEGORY</div>
                                        <div style={{ color: 'white', fontWeight: '600' }}>
                                            {selectedPlayer.isMarquee ? 'MARQUEE' : selectedPlayer.isSuper ? 'SUPER' : 'BASE'}
                                        </div>
                                    </div>

                                    {selectedPlayer.soldPrice ? (
                                        <div style={{ background: 'rgba(250, 204, 21, 0.1)', border: '1px solid rgba(250, 204, 21, 0.3)', padding: '10px', borderRadius: '8px' }}>
                                            <div style={{ color: 'var(--neon-gold, #facc15)', fontSize: '0.7rem', marginBottom: '3px' }}>SOLD PRICE</div>
                                            <div style={{ color: 'white', fontWeight: 'bold' }}>₹ {selectedPlayer.soldPrice}</div>
                                        </div>
                                    ) : (
                                        <div style={{ background: '#222', padding: '10px', borderRadius: '8px' }}>
                                            <div style={{ color: '#888', fontSize: '0.7rem', marginBottom: '3px' }}>STATUS</div>
                                            <div style={{ color: selectedPlayer.status === 'unsold' ? 'red' : '#aaa', fontWeight: '600' }}>
                                                {selectedPlayer.status === 'unsold' ? 'UNSOLD' : 'AVAILABLE'}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#888', fontSize: '0.9rem' }}>Class</span>
                                        <span style={{ color: 'white' }}>{selectedPlayer.class || 'N/A'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#888', fontSize: '0.9rem' }}>Team</span>
                                        <span style={{ color: 'white' }}>{team.name === selectedPlayer.teamName ? 'Your Squad' : (selectedPlayer.teamName || '---')}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
