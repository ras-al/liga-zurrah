import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, doc, setDoc, onSnapshot, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function KnockoutBracket({ isAdmin }) {
    const [bracket, setBracket] = useState({});
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch Teams for selection
        getDocs(collection(db, 'teams')).then(snap => {
            setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Listen to Bracket Data
        const unsub = onSnapshot(doc(db, 'tournament', 'bracket'), (doc) => {
            if (doc.exists()) {
                setBracket(doc.data());
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const updateNode = async (matchId, field, value) => {
        if (!isAdmin) return;

        const newBracket = { ...bracket };
        if (!newBracket[matchId]) newBracket[matchId] = {};

        // If selecting a team object (from dropdown)
        if (field === 'teamA' || field === 'teamB') {
            const team = teams.find(t => t.id === value);
            newBracket[matchId][field] = team ? { id: team.id, name: team.name, logo: team.logo } : null;
        } else {
            newBracket[matchId][field] = value;
        }

        // Auto-Progression Logic
        if (field === 'status' && value === 'finished') {
            const match = newBracket[matchId];
            const winner = match.scoreA > match.scoreB ? match.teamA : match.teamB;

            // Map Next Round
            const nextMap = {
                'QF1': { next: 'SF1', slot: 'teamA' },
                'QF2': { next: 'SF1', slot: 'teamB' },
                'QF3': { next: 'SF2', slot: 'teamA' },
                'QF4': { next: 'SF2', slot: 'teamB' },
                'SF1': { next: 'FINAL', slot: 'teamA' },
                'SF2': { next: 'FINAL', slot: 'teamB' }
            };

            const progression = nextMap[matchId];
            if (progression && winner) {
                if (!newBracket[progression.next]) newBracket[progression.next] = {};
                newBracket[progression.next][progression.slot] = winner;
                toast.success(`${winner.name} advanced to ${progression.next}!`);
            }
        }

        setBracket(newBracket);
        await setDoc(doc(db, 'tournament', 'bracket'), newBracket);
    };

    const renderMatch = (matchId, title) => {
        const match = bracket[matchId] || { scoreA: 0, scoreB: 0, status: 'scheduled' };

        return (
            <div className="bracket-match" style={{
                background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px',
                padding: '10px', width: '220px', marginBottom: '10px', position: 'relative'
            }}>
                <div style={{ fontSize: '0.75rem', color: '#666', textAlign: 'center', marginBottom: '5px' }}>{title}</div>

                {/* Team A */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    {isAdmin ? (
                        <select
                            value={match.teamA?.id || ''}
                            onChange={(e) => updateNode(matchId, 'teamA', e.target.value)}
                            style={{ width: '120px', background: '#222', color: 'white', border: 'none', fontSize: '0.8rem' }}
                        >
                            <option value="">Select Team</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    ) : (
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{match.teamA?.name || 'TBD'}</span>
                    )}
                    <input
                        type="number"
                        value={match.scoreA || 0}
                        onChange={(e) => updateNode(matchId, 'scoreA', parseInt(e.target.value))}
                        disabled={!isAdmin}
                        style={{ width: '30px', textAlign: 'center', background: '#000', color: 'white', border: '1px solid #333' }}
                    />
                </div>

                {/* Team B */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {isAdmin ? (
                        <select
                            value={match.teamB?.id || ''}
                            onChange={(e) => updateNode(matchId, 'teamB', e.target.value)}
                            style={{ width: '120px', background: '#222', color: 'white', border: 'none', fontSize: '0.8rem' }}
                        >
                            <option value="">Select Team</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    ) : (
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{match.teamB?.name || 'TBD'}</span>
                    )}
                    <input
                        type="number"
                        value={match.scoreB || 0}
                        onChange={(e) => updateNode(matchId, 'scoreB', parseInt(e.target.value))}
                        disabled={!isAdmin}
                        style={{ width: '30px', textAlign: 'center', background: '#000', color: 'white', border: '1px solid #333' }}
                    />
                </div>

                {/* Actions */}
                {isAdmin && (
                    <div style={{ marginTop: '8px', textAlign: 'center' }}>
                        <button
                            onClick={() => updateNode(matchId, 'status', match.status === 'finished' ? 'scheduled' : 'finished')}
                            style={{
                                fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer',
                                background: match.status === 'finished' ? 'var(--neon-gold)' : '#333',
                                color: match.status === 'finished' ? 'black' : 'white', border: 'none'
                            }}
                        >
                            {match.status === 'finished' ? 'FINISHED' : 'MARK DONE'}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div>Loading Bracket...</div>;

    return (
        <div className="bracket-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '40px', padding: '20px', overflowX: 'auto' }}>
            {/* Round 1: QF */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {renderMatch('QF1', 'QUARTER FINAL 1')}
                {renderMatch('QF2', 'QUARTER FINAL 2')}
                {renderMatch('QF3', 'QUARTER FINAL 3')}
                {renderMatch('QF4', 'QUARTER FINAL 4')}
            </div>

            {/* Connectors (Visual only) */}
            <div style={{ width: '20px' }}></div>

            {/* Round 2: SF */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '150px' }}>
                {renderMatch('SF1', 'SEMI FINAL 1')}
                {renderMatch('SF2', 'SEMI FINAL 2')}
            </div>

            {/* Connectors */}
            <div style={{ width: '20px' }}></div>

            {/* Round 3: FINAL */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ transform: 'scale(1.2)' }}>
                    {renderMatch('FINAL', '🏆 GRAND FINAL 🏆')}
                </div>
            </div>
        </div>
    );
}
