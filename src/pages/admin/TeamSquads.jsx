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

    const downloadCSV = (team, squad) => {
        const csvContent = [
            ["Name", "Position", "Price", "Mobile"],
            ...squad.map(p => [p.name, p.position || '-', p.soldPrice, p.mobile || '-'])
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${team.name}_Squad.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AdminLayout>
            <h1>TEAM SQUADS</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {loading ? <p>Loading Squads...</p> : teams.map(team => {
                    const teamPlayers = players.filter(p => p.teamId === team.id && p.status === 'sold');

                    return (
                        <div key={team.id} style={{ background: '#111', padding: '20px', borderRadius: '10px', border: '1px solid #333' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', color: '#fff', margin: 0 }}>{team.name}</h2>
                                    <div style={{ fontSize: '0.9rem', color: '#888' }}>
                                        SIZE: {teamPlayers.length} | <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold' }}>₹{team.wallet}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => downloadCSV(team, teamPlayers)}
                                    style={{
                                        background: '#333',
                                        color: '#fff',
                                        border: '1px solid #555',
                                        padding: '5px 10px',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    ⬇ CSV
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {teamPlayers.length === 0 ? (
                                    <div style={{ fontStyle: 'italic', color: '#444' }}>No players yet</div>
                                ) : (
                                    teamPlayers.map(p => (
                                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#222', padding: '8px', borderRadius: '4px' }}>
                                            <img src={p.photo || 'https://via.placeholder.com/50'} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{p.name}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '2px' }}>
                                                    <span style={{ color: '#ddd' }}>{p.position || 'Player'}</span> • <span style={{ color: '#fbbf24' }}>₹{p.soldPrice}</span>
                                                </div>
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
