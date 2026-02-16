import { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function GroupStageManager() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTeams = async () => {
        const snap = await getDocs(collection(db, 'teams'));
        setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
    };

    useEffect(() => { fetchTeams(); }, []);

    const assignGroup = async (teamId, groupId) => {
        // Optimistic UI Update
        setTeams(teams.map(t => t.id === teamId ? { ...t, groupId } : t));

        try {
            await updateDoc(doc(db, 'teams', teamId), { groupId });
            toast.success(`Moved to Group ${groupId}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to move team");
            fetchTeams(); // Revert on error
        }
    };

    if (loading) return <div style={{ color: 'white' }}>Loading Teams...</div>;

    const unassignedTeams = teams.filter(t => !t.groupId);
    const groups = ['A', 'B', 'C', 'D'];

    return (
        <div className="group-stage-manager">
            <h2 style={{ color: 'var(--neon-gold)', fontFamily: 'Anton', marginBottom: '20px' }}>GROUP ASSIGNMENTS</h2>

            <div style={{ display: 'flex', gap: '20px', height: '600px' }}>
                {/* UNASSIGNED POOL */}
                <div style={{ flex: 1, background: '#111', padding: '15px', border: '1px solid #333', borderRadius: '8px', overflowY: 'auto' }}>
                    <h3 style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: '10px' }}>UNASSIGNED ({unassignedTeams.length})</h3>
                    <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {unassignedTeams.map(team => (
                            <div key={team.id} style={{ background: '#222', padding: '10px', borderRadius: '4px', border: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'white' }}>{team.name}</span>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    {groups.map(g => (
                                        <button
                                            key={g}
                                            onClick={() => assignGroup(team.id, g)}
                                            style={{ cursor: 'pointer', background: '#333', color: 'white', border: 'none', width: '25px', height: '25px', borderRadius: '4px', fontSize: '0.8rem' }}
                                            title={`Move to Group ${g}`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* GROUPS GRID */}
                <div style={{ flex: 3, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    {groups.map(g => (
                        <div key={g} style={{ background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
                                <h3 style={{ color: 'var(--neon-gold)' }}>GROUP {g}</h3>
                                <span style={{ color: '#666', fontSize: '0.8rem' }}>{teams.filter(t => t.groupId === g).length} TEAMS</span>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {teams.filter(t => t.groupId === g).map(team => (
                                    <div key={team.id} style={{ background: '#1a1a1a', padding: '8px', borderRadius: '4px', border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <img src={team.logo || 'https://placehold.co/30'} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                                            <span style={{ color: 'white', fontSize: '0.9rem' }}>{team.name}</span>
                                        </div>
                                        <button
                                            onClick={() => assignGroup(team.id, null)}
                                            style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                            title="Remove from Group"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
