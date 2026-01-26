import { useEffect, useState } from 'react';
import { db } from '../../firebase'; // Correct Import Path
import { collection, getDocs } from 'firebase/firestore';
import AdminLayout from '../../components/AdminLayout'; // Correct Import Path
import SkeletonRow from '../../components/SkeletonRow'; // Correct Import Path

export default function TeamSquads() {
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const tSnap = await getDocs(collection(db, 'teams'));
            const pSnap = await getDocs(collection(db, 'registrations'));

            setTeams(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setPlayers(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        };
        fetchData();
    }, []);

    return (
        <AdminLayout>
            <h1>TEAM SQUADS</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {loading ? <p>Loading Squads...</p> : teams.map(team => {
                    const teamPlayers = players.filter(p => p.teamId === team.id && p.status === 'sold');

                    return (
                        <div key={team.id} style={{ background: '#111', padding: '20px', borderRadius: '10px', border: '1px solid #333' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h2 style={{ fontSize: '1.5rem', color: '#fff', margin: 0 }}>{team.name}</h2>
                                <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold' }}>₹{team.wallet}</span>
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '10px' }}>
                                SQUAD SIZE: {teamPlayers.length}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {teamPlayers.length === 0 ? (
                                    <div style={{ fontStyle: 'italic', color: '#444' }}>No players yet</div>
                                ) : (
                                    teamPlayers.map(p => (
                                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#222', padding: '8px', borderRadius: '4px' }}>
                                            <img src={p.photo} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{p.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#aaa' }}>₹{p.soldPrice} • {p.role}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </AdminLayout>
    );
}
