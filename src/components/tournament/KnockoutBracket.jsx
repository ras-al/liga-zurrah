import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, doc, setDoc, onSnapshot, getDocs, where, query } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function KnockoutBracket({ isAdmin }) {
    const [bracket, setBracket] = useState({});
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState({}); // { teamId: [player1, player2] }
    const [loading, setLoading] = useState(true);

    // Modal State
    const [selectedMatchId, setSelectedMatchId] = useState(null);
    const [newGoal, setNewGoal] = useState({ player: '', time: '', team: 'A' });
    const [showCelebration, setShowCelebration] = useState(false);

    useEffect(() => {
        const initData = async () => {
            // Fetch Teams
            const tSnap = await getDocs(collection(db, 'teams'));
            const teamData = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setTeams(teamData);

            // Fetch Players (Optimized)
            const pSnap = await getDocs(query(collection(db, 'registrations'), where('role', '==', 'Player')));
            const pMap = {};
            pSnap.docs.forEach(doc => {
                const d = doc.data();
                if (d.teamId) {
                    if (!pMap[d.teamId]) pMap[d.teamId] = [];
                    pMap[d.teamId].push({ id: doc.id, name: d.name });
                }
            });
            setPlayers(pMap);
        };

        initData();

        const unsub = onSnapshot(doc(db, 'tournament', 'bracket'), (doc) => {
            if (doc.exists()) setBracket(doc.data());
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const updateNode = async (matchId, field, value) => {
        if (!isAdmin) return;
        const newBracket = { ...bracket };
        if (!newBracket[matchId]) newBracket[matchId] = {};

        if (field === 'teamA' || field === 'teamB') {
            const team = teams.find(t => t.id === value);
            newBracket[matchId][field] = team ? { id: team.id, name: team.name, logo: team.logo } : null;
        } else {
            newBracket[matchId][field] = value;
        }

        // Progression Logic
        if (field === 'status' && value === 'finished') {
            const match = newBracket[matchId];
            const winner = match.scoreA > match.scoreB ? match.teamA : match.teamB;
            const nextMap = { 'SF1': { next: 'FINAL', slot: 'teamA' }, 'SF2': { next: 'FINAL', slot: 'teamB' } };
            const prog = nextMap[matchId];
            if (prog && winner) {
                if (!newBracket[prog.next]) newBracket[prog.next] = {};
                newBracket[prog.next][prog.slot] = winner;
                toast.success(`${winner.name} Advanced!`);
            }
        }

        setBracket(newBracket);
        await setDoc(doc(db, 'tournament', 'bracket'), newBracket);
    };

    const addGoal = async () => {
        if (!newGoal.player || !selectedMatchId) return toast.error("Select Player");

        const match = bracket[selectedMatchId];
        const event = { ...newGoal, timestamp: Date.now() };

        const updatedEvents = [...(match.events || []), event];
        const updatedMatch = {
            ...match,
            events: updatedEvents,
            scoreA: event.team === 'A' ? (match.scoreA || 0) + 1 : (match.scoreA || 0),
            scoreB: event.team === 'B' ? (match.scoreB || 0) + 1 : (match.scoreB || 0)
        };

        const newBracket = { ...bracket, [selectedMatchId]: updatedMatch };
        setBracket(newBracket);
        await setDoc(doc(db, 'tournament', 'bracket'), newBracket);

        setNewGoal({ ...newGoal, player: '', time: '' });
        toast.success("Goal Added!");
    };

    const deleteGoal = async (event) => {
        if (!confirm("Delete this goal?")) return;
        const match = bracket[selectedMatchId];
        const updatedEvents = match.events.filter(e => e.timestamp !== event.timestamp);
        const updatedMatch = {
            ...match,
            events: updatedEvents,
            scoreA: event.team === 'A' ? match.scoreA - 1 : match.scoreA,
            scoreB: event.team === 'B' ? match.scoreB - 1 : match.scoreB
        };
        const newBracket = { ...bracket, [selectedMatchId]: updatedMatch };
        setBracket(newBracket);
        await setDoc(doc(db, 'tournament', 'bracket'), newBracket);
    };

    const getMatchPlayers = (matchId, teamSlot) => {
        const teamId = bracket[matchId]?.[teamSlot]?.id;
        return teamId ? (players[teamId] || []) : [];
    };

    const triggerConfetti = () => {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 2000 };

        const random = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    };

    useEffect(() => {
        if (bracket['FINAL']?.status === 'finished') {
            triggerConfetti();
        }
    }, [bracket['FINAL']?.status]);

    const renderMatch = (matchId, title) => {
        const match = bracket[matchId] || { scoreA: 0, scoreB: 0, status: 'scheduled', events: [] };

        return (
            <div className="bracket-card" style={{
                width: '300px', background: '#0a0a0a', border: '1px solid #222',
                borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                position: 'relative'
            }}>
                {/* Header */}
                <div style={{
                    padding: '8px', background: '#111', borderBottom: '1px solid #222',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: 'bold' }}>{title}</span>
                    <span style={{
                        fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px',
                        background: match.status === 'live' ? 'var(--neon-red)' : match.status === 'finished' ? 'var(--neon-gold)' : '#222',
                        color: match.status === 'finished' ? 'black' : match.status === 'live' ? 'white' : '#666', fontWeight: 'bold'
                    }}>{match.status?.toUpperCase() || 'SCHEDULED'}</span>
                </div>

                {/* Teams & Score */}
                <div style={{ padding: '15px 10px' }}>
                    {/* Team A */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {isAdmin && !match.teamA?.logo ? (
                                <select onChange={(e) => updateNode(matchId, 'teamA', e.target.value)} style={{ width: '130px', background: '#222', color: 'white', border: '1px solid #333', padding: '4px', borderRadius: '4px' }}>
                                    <option value="">Select Team</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            ) : (
                                <>
                                    <img src={match.teamA?.logo || 'https://via.placeholder.com/30'} style={{ width: 30, height: 30, borderRadius: '50%' }} />
                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.teamA?.name || 'TBD'}</span>
                                    {isAdmin && (
                                        <button
                                            onClick={() => updateNode(matchId, 'teamA', null)}
                                            title="Change Team"
                                            style={{ marginLeft: '5px', background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.7rem' }}>
                                            🔄
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                        <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'white' }}>{match.scoreA || 0}</span>
                    </div>

                    {/* Team B */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {isAdmin && !match.teamB?.logo ? (
                                <select onChange={(e) => updateNode(matchId, 'teamB', e.target.value)} style={{ width: '130px', background: '#222', color: 'white', border: '1px solid #333', padding: '4px', borderRadius: '4px' }}>
                                    <option value="">Select Team</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            ) : (
                                <>
                                    <img src={match.teamB?.logo || 'https://via.placeholder.com/30'} style={{ width: 30, height: 30, borderRadius: '50%' }} />
                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.teamB?.name || 'TBD'}</span>
                                    {isAdmin && (
                                        <button
                                            onClick={() => updateNode(matchId, 'teamB', null)}
                                            title="Change Team"
                                            style={{ marginLeft: '5px', background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.7rem' }}>
                                            🔄
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                        <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'white' }}>{match.scoreB || 0}</span>
                    </div>
                </div>

                {/* Goals List */}
                {match.events?.length > 0 && (
                    <div style={{ padding: '8px 10px', background: '#080808', borderTop: '1px solid #222' }}>
                        {match.events.map((ev, i) => (
                            <div key={i} style={{ fontSize: '0.7rem', color: '#888', marginBottom: '2px', display: 'flex', justifyContent: ev.team === 'A' ? 'flex-start' : 'flex-end' }}>
                                <span>⚽ {ev.player} ({ev.time}')</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Admin Actions */}
                {isAdmin && (
                    <div style={{ padding: '5px', textAlign: 'center', borderTop: '1px solid #222' }}>
                        <button onClick={() => setSelectedMatchId(matchId)} style={{
                            fontSize: '0.7rem', background: '#222', color: 'var(--neon-gold)',
                            border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', width: '100%'
                        }}>
                            MANAGE MATCH
                        </button>
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div>Loading...</div>;

    const currentMatch = bracket[selectedMatchId] || { scoreA: 0, scoreB: 0, status: 'scheduled', events: [] };
    const finalMatch = bracket['FINAL'];
    const winner = finalMatch?.status === 'finished' ? (finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamA : finalMatch.teamB) : null;

    return (
        <div style={{ overflowX: 'auto', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '50px', justifyContent: 'center', minWidth: 'max-content', padding: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    {renderMatch('SF1', 'SEMI FINAL 1')}
                    {renderMatch('SF2', 'SEMI FINAL 2')}
                </div>
                <div style={{ width: '40px', height: '2px', background: '#222' }}></div>
                <div style={{ transform: 'scale(1.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    {renderMatch('FINAL', 'GRAND FINAL')}

                    {/* Persistent Celebration Card */}
                    <AnimatePresence>
                        {winner && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                style={{
                                    background: 'linear-gradient(135deg, #1a1a1a, #000)',
                                    padding: '20px', borderRadius: '15px',
                                    border: '2px solid var(--neon-gold)',
                                    textAlign: 'center', width: '300px',
                                    boxShadow: '0 0 30px rgba(255, 215, 0, 0.2)'
                                }}
                            >
                                <h2 style={{ color: 'var(--neon-gold)', fontFamily: 'Anton', fontSize: '1.5rem', marginBottom: '10px', letterSpacing: '2px' }}>CHAMPIONS</h2>

                                <motion.img
                                    src={winner.logo}
                                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                                    transition={{ repeat: Infinity, duration: 3 }}
                                    style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--neon-gold)', marginBottom: '10px', boxShadow: '0 0 15px var(--neon-gold)' }}
                                />

                                <h3 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '5px' }}>{winner.name}</h3>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Manage Modal */}
            <AnimatePresence>
                {selectedMatchId && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            style={{ background: '#111', padding: '20px', borderRadius: '12px', border: '1px solid #333', width: '90%', maxWidth: '400px' }}>
                            <h3 style={{ color: 'white', borderBottom: '1px solid #333', paddingBottom: '10px' }}>MANAGE MATCH</h3>

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                <button onClick={() => updateNode(selectedMatchId, 'status', 'scheduled')} style={{ flex: 1, padding: '10px', background: currentMatch.status === 'scheduled' ? 'white' : '#222', color: currentMatch.status === 'scheduled' ? 'black' : 'white', border: '1px solid #333' }}>SCHEDULED</button>
                                <button onClick={() => updateNode(selectedMatchId, 'status', 'live')} style={{ flex: 1, padding: '10px', background: currentMatch.status === 'live' ? 'var(--neon-red)' : '#222', color: 'white', border: '1px solid #333', fontWeight: 'bold' }}>● LIVE</button>
                                <button onClick={() => updateNode(selectedMatchId, 'status', 'finished')} style={{ flex: 1, padding: '10px', background: currentMatch.status === 'finished' ? 'var(--neon-gold)' : '#222', color: 'black', border: 'none', fontWeight: 'bold' }}>FINISHED</button>
                            </div>

                            <h4 style={{ color: '#888', fontSize: '0.8rem', marginBottom: '10px' }}>ADD GOAL</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <select value={newGoal.team} onChange={e => setNewGoal({ ...newGoal, team: e.target.value })} style={{ padding: '10px', background: '#222', color: 'white', border: '1px solid #333' }}>
                                        <option value="A">Team A</option>
                                        <option value="B">Team B</option>
                                    </select>
                                    <input placeholder="Min'" value={newGoal.time} onChange={e => setNewGoal({ ...newGoal, time: e.target.value })} style={{ width: '60px', padding: '10px', background: '#000', color: 'white', border: '1px solid #333' }} />
                                </div>
                                <select value={newGoal.player} onChange={e => setNewGoal({ ...newGoal, player: e.target.value })} style={{ padding: '10px', background: '#222', color: 'white', border: '1px solid #333' }}>
                                    <option value="">Select Player</option>
                                    {getMatchPlayers(selectedMatchId, newGoal.team === 'A' ? 'teamA' : 'teamB').map(p => (
                                        <option key={p.id} value={p.name}>{p.name}</option>
                                    ))}
                                </select>
                                <button onClick={addGoal} style={{ padding: '10px', background: '#4ade80', color: 'black', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>+ ADD GOAL</button>
                            </div>

                            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {currentMatch?.events?.map((ev, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #222', color: '#888', fontSize: '0.8rem' }}>
                                        <span>⚽ {ev.player} ({ev.time}') - Team {ev.team}</span>
                                        <button onClick={() => deleteGoal(ev)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => setSelectedMatchId(null)} style={{ marginTop: '20px', width: '100%', padding: '10px', background: '#333', color: 'white', border: 'none' }}>CLOSE</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
