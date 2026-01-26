import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import AdminLayout from '../../components/AdminLayout';
import Loading from '../../components/Loading';

export default function TeamRegistration() {
    const [teams, setTeams] = useState([]);
    const [teamName, setTeamName] = useState('');
    const [loading, HfLoading] = useState(true);

    const fetchTeams = async () => {
        const snap = await getDocs(collection(db, 'teams'));
        setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        HfLoading(false);
    };

    useEffect(() => { fetchTeams(); }, []);

    const createTeam = async (e) => {
        e.preventDefault();
        if (!teamName) return;
        await addDoc(collection(db, 'teams'), { name: teamName, wallet: 15000 });
        setTeamName('');
        fetchTeams();
    };

    const removeTeam = async (id) => {
        if (confirm("Delete team?")) {
            await deleteDoc(doc(db, 'teams', id));
            fetchTeams();
        }
    }

    if (loading) return <Loading />;

    return (
        <AdminLayout>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>TEAM MANAGEMENT</h1>
                <div style={{ color: 'var(--neon-gold)', fontSize: '1.2rem' }}>TOTAL TEAMS: {teams.length}</div>
            </div>

            <div className="glass-panel" style={{ maxWidth: '600px', margin: '30px 0' }}>
                <h3>ADD NEW TEAM</h3>
                <form onSubmit={createTeam} style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <input
                        type="text"
                        placeholder="Enter Team Name"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        style={{ flex: 1, background: '#000', border: '1px solid #444', color: 'white', padding: '15px' }}
                    />
                    <button className="submit-btn" style={{ width: 'auto', marginTop: 0 }}>ADD</button>
                </form>
            </div>

            <table className="data-table">
                <thead>
                    <tr>
                        <th>TEAM NAME</th>
                        <th>WALLET</th>
                        <th>ACTION</th>
                    </tr>
                </thead>
                <tbody>
                    {teams.map(team => (
                        <tr key={team.id}>
                            <td style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{team.name}</td>
                            <td style={{ color: 'var(--neon-gold)' }}>₹ {team.wallet}</td>
                            <td>
                                <button
                                    onClick={() => removeTeam(team.id)}
                                    style={{ background: '#333', color: 'red', border: 'none', padding: '8px 15px', cursor: 'pointer', borderRadius: '5px' }}
                                >
                                    DELETE
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </AdminLayout>
    );
}