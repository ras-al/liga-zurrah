import { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, orderBy, serverTimestamp, arrayUnion, arrayRemove, where } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function MatchManager() {
    const [matches, setMatches] = useState([]);
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState({}); // { teamId: [player1, player2] }
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Manual Match State
    const [showAddModal, setShowAddModal] = useState(false);
    const [manualMatch, setManualMatch] = useState({ teamA: '', teamB: '' });

    // Event Logging State
    const [selectedMatch, setSelectedMatch] = useState(null); // For Event Modal
    const [newEvent, setNewEvent] = useState({ type: 'GOAL', player: '', team: 'A', time: '' });
    const [playerOfTheMatch, setPlayerOfTheMatch] = useState('');

    const fetchData = async () => {
        setLoading(true);

        // Fetch Teams
        const tSnap = await getDocs(collection(db, 'teams'));
        const teamData = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTeams(teamData);

        // Fetch Matches
        const mSnap = await getDocs(query(collection(db, 'matches'), orderBy('matchId', 'asc')));
        setMatches(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch Players (Optimized: Fetch all players with a team)
        const pSnap = await getDocs(query(collection(db, 'registrations'), where('role', '==', 'Player')));
        const playersMap = {};
        pSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.teamId) {
                if (!playersMap[data.teamId]) playersMap[data.teamId] = [];
                playersMap[data.teamId].push({ id: doc.id, name: data.name });
            }
        });
        setPlayers(playersMap);

        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    // ... generateFixtures, addManualMatch ... (Keep existing)
    const generateFixtures = async () => {
        if (!confirm("This will generate new matches for all groups. Continue?")) return;
        setGenerating(true);

        try {
            const groups = ['A', 'B', 'C', 'D'];
            const newMatches = [];
            let matchCount = matches.length + 1;

            for (const group of groups) {
                const groupTeams = teams.filter(t => t.groupId === group);
                for (let i = 0; i < groupTeams.length; i++) {
                    for (let j = i + 1; j < groupTeams.length; j++) {
                        const teamA = groupTeams[i];
                        const teamB = groupTeams[j];

                        newMatches.push({
                            teamAId: teamA.id,
                            teamAName: teamA.name,
                            teamALogo: teamA.logo,
                            teamBId: teamB.id,
                            teamBName: teamB.name,
                            teamBLogo: teamB.logo,
                            scoreA: 0,
                            scoreB: 0,
                            status: 'scheduled',
                            groupId: group,
                            matchId: matchCount++,
                            timestamp: serverTimestamp(),
                            events: []
                        });
                    }
                }
            }

            await Promise.all(newMatches.map(m => addDoc(collection(db, 'matches'), m)));
            toast.success(`Generated ${newMatches.length} matches!`);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate matches");
        }
        setGenerating(false);
    };

    const addManualMatch = async () => {
        if (!manualMatch.teamA || !manualMatch.teamB) return toast.error("Select both teams");
        const teamA = teams.find(t => t.id === manualMatch.teamA);
        const teamB = teams.find(t => t.id === manualMatch.teamB);
        // ... (Keep existing logic)
        try {
            await addDoc(collection(db, 'matches'), {
                teamAId: teamA.id,
                teamAName: teamA.name,
                teamALogo: teamA.logo,
                teamBId: teamB.id,
                teamBName: teamB.name,
                teamBLogo: teamB.logo,
                scoreA: 0,
                scoreB: 0,
                status: 'scheduled',
                groupId: 'Friendly',
                matchId: matches.length + 1,
                timestamp: serverTimestamp(),
                events: []
            });
            toast.success("Match Added!");
            setShowAddModal(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to add match");
        }
    };

    const updateScore = async (matchId, field, value) => {
        const numValue = parseInt(value) || 0;
        setMatches(matches.map(m => m.id === matchId ? { ...m, [field]: numValue } : m));
        try {
            await updateDoc(doc(db, 'matches', matchId), { [field]: numValue });
        } catch (err) { console.error(err); }
    };

    const toggleStatus = async (match, currentStatus) => {
        const nextStatus = currentStatus === 'scheduled' ? 'live' : currentStatus === 'live' ? 'finished' : 'scheduled';
        setMatches(matches.map(m => m.id === match.id ? { ...m, status: nextStatus } : m));
        await updateDoc(doc(db, 'matches', match.id), { status: nextStatus });
    };

    const deleteMatch = async (id) => {
        if (!confirm("Delete match?")) return;
        setMatches(matches.filter(m => m.id !== id));
        await deleteDoc(doc(db, 'matches', id));
    };

    // --- EVENT LOGGING ---
    const openEventModal = (match) => {
        setSelectedMatch(match);
        setPlayerOfTheMatch(match.playerOfTheMatch || '');
    };

    const updatePOTM = async () => {
        if (!selectedMatch) return;
        try {
            const updatedMatch = { ...selectedMatch, playerOfTheMatch };
            setMatches(matches.map(m => m.id === selectedMatch.id ? updatedMatch : m));
            setSelectedMatch(updatedMatch);

            await updateDoc(doc(db, 'matches', selectedMatch.id), { playerOfTheMatch });
            toast.success("Player of the Match Saved!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save POTM");
        }
    };

    const addEvent = async () => {
        if (newEvent.type !== 'OWN_GOAL' && !newEvent.player) return toast.error("Select Player");

        const finalPlayerName = (newEvent.type === 'OWN_GOAL' && !newEvent.player) ? 'Own Goal' : newEvent.player;

        const eventData = { ...newEvent, player: finalPlayerName, timestamp: Date.now() };

        // Optimistic Update
        const updatedEvents = [...(selectedMatch.events || []), eventData];
        let newScoreA = selectedMatch.scoreA;
        let newScoreB = selectedMatch.scoreB;

        if (eventData.type === 'GOAL') {
            if (eventData.team === 'A') newScoreA++; else newScoreB++;
        } else if (eventData.type === 'OWN_GOAL') {
            if (eventData.team === 'A') newScoreB++; else newScoreA++;
        }

        const updatedMatch = { ...selectedMatch, events: updatedEvents, scoreA: newScoreA, scoreB: newScoreB };

        setMatches(matches.map(m => m.id === selectedMatch.id ? updatedMatch : m));
        setSelectedMatch(updatedMatch);

        try {
            await updateDoc(doc(db, 'matches', selectedMatch.id), {
                events: arrayUnion(eventData),
                scoreA: newScoreA,
                scoreB: newScoreB
            });
            toast.success("Event Added!");
            setNewEvent({ ...newEvent, player: '', time: '' });
        } catch (error) {
            console.error(error);
            toast.error("Failed to add event");
        }
    };

    const deleteEvent = async (event) => {
        if (!confirm("Delete this event?")) return;

        const updatedEvents = selectedMatch.events.filter(e => e.timestamp !== event.timestamp);

        let newScoreA = selectedMatch.scoreA;
        let newScoreB = selectedMatch.scoreB;
        if (event.type === 'GOAL') {
            if (event.team === 'A') newScoreA--; else newScoreB--;
        } else if (event.type === 'OWN_GOAL') {
            if (event.team === 'A') newScoreB--; else newScoreA--;
        }

        const updatedMatch = { ...selectedMatch, events: updatedEvents, scoreA: newScoreA, scoreB: newScoreB };
        setMatches(matches.map(m => m.id === selectedMatch.id ? updatedMatch : m));
        setSelectedMatch(updatedMatch);

        await updateDoc(doc(db, 'matches', selectedMatch.id), {
            events: arrayRemove(event),
            scoreA: newScoreA,
            scoreB: newScoreB
        });
    };

    // Helper to get players for dropdown
    const getTeamPlayers = (teamLetter) => {
        if (!selectedMatch) return [];
        const teamId = teamLetter === 'A' ? selectedMatch.teamAId : selectedMatch.teamBId;
        return players[teamId] || [];
    };

    // Helper for POTM dropdown (All players in match)
    const getAllMatchPlayers = () => {
        if (!selectedMatch) return [];
        const teamA = players[selectedMatch.teamAId] || [];
        const teamB = players[selectedMatch.teamBId] || [];
        return [
            ...teamA.map(p => ({ ...p, team: selectedMatch.teamAName })),
            ...teamB.map(p => ({ ...p, team: selectedMatch.teamBName }))
        ];
    };

    if (loading) return <div>Loading Matches...</div>;

    return (
        <div className="match-manager">
            {/* Header Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: 'var(--neon-gold)', fontFamily: 'Anton' }}>MATCH FIXTURES</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setShowAddModal(true)} className="admin-btn" style={{ background: '#333' }}>+ ADD CUSTOM</button>
                    {/*<button onClick={generateFixtures} disabled={generating} className="admin-btn">
                        {generating ? '...' : 'GENERATE'}
                    </button>*/}
                </div>
            </div>

            {/* Matches Grid */}
            <div className="matches-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
                {matches.map(match => (
                    <div key={match.id} style={{
                        background: match.status === 'live' ? 'linear-gradient(145deg, #1a1a1a, #2a0a0a)' : '#111',
                        border: match.status === 'live' ? '1px solid var(--neon-red)' : '1px solid #333',
                        borderRadius: '8px', padding: '15px', position: 'relative'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.8rem', color: '#666' }}>
                            <span>#{match.matchId} • {match.groupId}</span>
                            <span style={{ color: match.status === 'live' ? 'var(--neon-red)' : '#888', fontWeight: 'bold' }}>{match.status.toUpperCase()}</span>
                        </div>

                        {/* Teams & Score */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '5px' }}>
                            <div style={{ textAlign: 'center', width: '80px' }}>
                                <img src={match.teamALogo} style={{ width: 40, height: 40, borderRadius: '50%' }} />
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white', marginTop: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.teamAName}</div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input type="number" value={match.scoreA} onChange={(e) => updateScore(match.id, 'scoreA', e.target.value)}
                                    style={{ width: '40px', height: '40px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', background: '#000', border: '1px solid #444', color: 'white' }} />
                                <span style={{ color: '#666' }}>-</span>
                                <input type="number" value={match.scoreB} onChange={(e) => updateScore(match.id, 'scoreB', e.target.value)}
                                    style={{ width: '40px', height: '40px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', background: '#000', border: '1px solid #444', color: 'white' }} />
                            </div>

                            <div style={{ textAlign: 'center', width: '80px' }}>
                                <img src={match.teamBLogo} style={{ width: 40, height: 40, borderRadius: '50%' }} />
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white', marginTop: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.teamBName}</div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ marginTop: '15px', display: 'flex', gap: '5px' }}>
                            <button onClick={() => toggleStatus(match, match.status)} style={{ flex: 1, padding: '8px', background: '#222', color: 'white', border: '1px solid #333', cursor: 'pointer', borderRadius: '4px' }}>
                                {match.status === 'scheduled' ? '▶ START' : match.status === 'live' ? '⏹ FINISH' : '↺ RESET'}
                            </button>
                            <button onClick={() => openEventModal(match)} style={{ flex: 1, padding: '8px', background: '#222', color: 'var(--neon-gold)', border: '1px solid #333', cursor: 'pointer', borderRadius: '4px' }}>
                                📝 EVENTS
                            </button>
                            <button onClick={() => deleteMatch(match.id)} style={{ padding: '8px', background: '#300', color: 'red', border: '1px solid #500', cursor: 'pointer', borderRadius: '4px' }}>🗑</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* EVENT LOGGING MODAL */}
            <AnimatePresence>
                {selectedMatch && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="modal-overlay"
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}
                    >
                        <div style={{ background: '#111', padding: '20px', borderRadius: '8px', width: '500px', border: '1px solid #333', maxHeight: '80vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3 style={{ color: 'white', margin: 0 }}>MATCH EVENTS</h3>
                                <button onClick={() => setSelectedMatch(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                            </div>

                            {/* Teams Info */}
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '15px' }}>
                                <div style={{ textAlign: 'center', opacity: newEvent.team === 'A' ? 1 : 0.5 }}>
                                    <img src={selectedMatch.teamALogo} style={{ width: 40 }} />
                                    <div style={{ color: 'white', fontSize: '0.8rem' }}>{selectedMatch.teamAName}</div>
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--neon-gold)' }}>
                                    {selectedMatch.scoreA} - {selectedMatch.scoreB}
                                </div>
                                <div style={{ textAlign: 'center', opacity: newEvent.team === 'B' ? 1 : 0.5 }}>
                                    <img src={selectedMatch.teamBLogo} style={{ width: 40 }} />
                                    <div style={{ color: 'white', fontSize: '0.8rem' }}>{selectedMatch.teamBName}</div>
                                </div>
                            </div>

                            {/* PLAYER OF THE MATCH SECTION */}
                            <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #333' }}>
                                <label style={{ display: 'block', color: 'var(--neon-gold)', marginBottom: '5px', fontSize: '0.8rem', fontWeight: 'bold' }}>⭐ PLAYER OF THE MATCH</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <select
                                        value={playerOfTheMatch}
                                        onChange={(e) => setPlayerOfTheMatch(e.target.value)}
                                        style={{ flex: 1, background: '#222', color: 'white', border: '1px solid #333', padding: '10px', borderRadius: '4px' }}
                                    >
                                        <option value="">Select Star Player</option>
                                        {getAllMatchPlayers().map(p => (
                                            <option key={p.id} value={p.name}>{p.name} ({p.team})</option>
                                        ))}
                                    </select>
                                    <button onClick={updatePOTM} style={{ padding: '0 15px', background: 'var(--neon-gold)', color: 'black', border: 'none', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>SAVE</button>
                                </div>
                            </div>


                            {/* Add New Event Form */}
                            <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                    {['GOAL', 'YELLOW_CARD', 'RED_CARD', 'OWN_GOAL'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setNewEvent({ ...newEvent, type })}
                                            style={{
                                                flex: 1, padding: '10px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem',
                                                background: newEvent.type === type ? (type === 'GOAL' || type === 'OWN_GOAL' ? '#4ade80' : type === 'YELLOW_CARD' ? '#fbbf24' : '#ef4444') : '#333',
                                                color: newEvent.type === type ? 'black' : '#888'
                                            }}
                                        >
                                            {type === 'GOAL' ? '⚽' : type === 'YELLOW_CARD' ? '🟨' : type === 'RED_CARD' ? '🟥' : '🥅 OG'}
                                        </button>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                    <select
                                        value={newEvent.team}
                                        onChange={(e) => setNewEvent({ ...newEvent, team: e.target.value })}
                                        style={{ background: '#222', color: 'white', border: '1px solid #333', padding: '10px', borderRadius: '4px' }}
                                    >
                                        <option value="A">{selectedMatch.teamAName}</option>
                                        <option value="B">{selectedMatch.teamBName}</option>
                                    </select>

                                    {/* Player Select or Own Goal Indicator */}
                                    {newEvent.type === 'OWN_GOAL' ? (
                                        <div style={{ flex: 1, background: '#222', color: '#888', border: '1px solid #333', padding: '10px', borderRadius: '4px', fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>
                                            Own Goal
                                        </div>
                                    ) : (
                                        <select
                                            value={newEvent.player}
                                            onChange={(e) => setNewEvent({ ...newEvent, player: e.target.value })}
                                            style={{ flex: 1, background: '#222', color: 'white', border: '1px solid #333', padding: '10px', borderRadius: '4px' }}
                                        >
                                            <option value="">Select Player</option>
                                            {getTeamPlayers(newEvent.team).map(p => (
                                                <option key={p.id} value={p.name}>{p.name}</option>
                                            ))}
                                        </select>
                                    )}

                                    <input
                                        placeholder="Min'"
                                        type="number"
                                        value={newEvent.time}
                                        onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                                        style={{ width: '60px', background: '#222', color: 'white', border: '1px solid #333', padding: '10px', borderRadius: '4px' }}
                                    />
                                </div>
                                <button onClick={addEvent} style={{ width: '100%', padding: '12px', background: 'var(--neon-gold)', color: 'black', border: 'none', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>ADD EVENT</button>
                            </div>

                            {/* Event History */}
                            <div>
                                <h4 style={{ color: '#888', marginBottom: '10px' }}>EVENT LOG</h4>
                                {(!selectedMatch.events || selectedMatch.events.length === 0) ? <div style={{ color: '#444', fontStyle: 'italic' }}>No events logged yet.</div> : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {selectedMatch.events.sort((a, b) => b.timestamp - a.timestamp).map((ev, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#222', padding: '10px', borderRadius: '4px', borderLeft: ev.team === 'A' ? '3px solid #4ade80' : '3px solid #3b82f6' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontSize: '1.2rem' }}>{ev.type === 'GOAL' ? '⚽' : ev.type === 'YELLOW_CARD' ? '🟨' : ev.type === 'RED_CARD' ? '🟥' : '🥅'}</span>
                                                    <div>
                                                        <div style={{ color: 'white', fontWeight: 'bold' }}>{ev.player}</div>
                                                        <div style={{ color: '#666', fontSize: '0.8rem' }}>{ev.time ? `${ev.time}'` : ''} • {ev.team === 'A' ? selectedMatch.teamAName : selectedMatch.teamBName}</div>
                                                    </div>
                                                </div>
                                                <button onClick={() => deleteEvent(ev)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'cursor' }}>✕</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ADD MATCH MODAL */}
            {showAddModal && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#111', padding: '20px', borderRadius: '8px', width: '400px', border: '1px solid #333' }}>
                        <h3 style={{ color: 'white', marginBottom: '20px' }}>ADD MATCH</h3>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', color: '#888', marginBottom: '5px' }}>Team A</label>
                            <select
                                style={{ width: '100%', padding: '10px', background: '#222', color: 'white', border: '1px solid #333' }}
                                value={manualMatch.teamA}
                                onChange={e => setManualMatch({ ...manualMatch, teamA: e.target.value })}
                            >
                                <option value="">Select Team</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', color: '#888', marginBottom: '5px' }}>Team B</label>
                            <select
                                style={{ width: '100%', padding: '10px', background: '#222', color: 'white', border: '1px solid #333' }}
                                value={manualMatch.teamB}
                                onChange={e => setManualMatch({ ...manualMatch, teamB: e.target.value })}
                            >
                                <option value="">Select Team</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={addManualMatch} className="admin-btn" style={{ flex: 1 }}>CREATE</button>
                            <button onClick={() => setShowAddModal(false)} className="admin-btn" style={{ flex: 1, background: '#333' }}>CANCEL</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
