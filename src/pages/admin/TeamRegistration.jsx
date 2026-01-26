import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import AdminLayout from '../../components/AdminLayout';
import Loading from '../../components/Loading'; // Kept as per original
import toast from 'react-hot-toast';

export default function TeamRegistration() {
    const [teams, setTeams] = useState([]);
    const [managers, setManagers] = useState([]);
    const [teamName, setTeamName] = useState('');
    const [selectedManagers, setSelectedManagers] = useState([]); // Array of IDs
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        // Fetch Teams
        const tSnap = await getDocs(collection(db, 'teams'));
        const teamData = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTeams(teamData);

        // Collect assigned IDs
        const assignedIds = new Set();
        teamData.forEach(t => {
            if (t.managers) t.managers.forEach(m => assignedIds.add(m.id));
        });

        // Fetch Managers
        const pSnap = await getDocs(collection(db, 'registrations'));
        const mgrs = pSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(u => u.role === 'Manager' && u.status === 'approved' && !assignedIds.has(u.id));

        setManagers(mgrs);

        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const toggleManager = (id) => {
        if (selectedManagers.includes(id)) {
            setSelectedManagers(prev => prev.filter(m => m !== id));
        } else {
            setSelectedManagers(prev => [...prev, id]);
        }
    };

    const createTeam = async (e) => {
        e.preventDefault();

        if (!teamName.trim()) {
            return toast.error("Please enter a team name!");
        }

        if (selectedManagers.length < 2) {
            return toast.error("A team must have at least 2 Managers!");
        }

        // Get full manager objects for storage (or just names)
        const assignedManagers = managers.filter(m => selectedManagers.includes(m.id)).map(m => ({
            id: m.id,
            name: m.name,
            phone: m.phone,
            photo: m.photo
        }));

        try {
            await addDoc(collection(db, 'teams'), {
                name: teamName,
                wallet: 15000,
                managers: assignedManagers
            });

            // Optional: Mark managers as 'assigned' in their own doc if needed, 
            // but for now just linking them to the team is enough.

            toast.success("Team Created Successfully!");
            setTeamName('');
            setSelectedManagers([]);
            fetchData();
        } catch (err) {
            toast.error("Failed to create team.");
        }
    };

    const removeTeam = async (id) => {
        if (confirm("Delete team? This cannot be undone.")) {
            await deleteDoc(doc(db, 'teams', id));
            fetchData();
            toast.success("Team Deleted");
        }
    }

    if (loading) return <Loading />; // Using generic loading for now

    return (
        <AdminLayout>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>TEAM MANAGEMENT</h1>
                <div style={{ color: 'var(--neon-gold)', fontSize: '1.2rem' }}>TOTAL TEAMS: {teams.length}</div>
            </div>

            <div className="glass-panel" style={{ maxWidth: '800px', margin: '30px 0', padding: '20px', background: '#111', border: '1px solid #333' }}>
                <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>ADD NEW TEAM</h3>

                <form onSubmit={createTeam}>
                    {/* Team Name Input */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', color: '#888' }}>TEAM NAME</label>
                        <input
                            type="text"
                            placeholder="Enter Team Name"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            style={{ width: '100%', background: '#000', border: '1px solid #444', color: 'white', padding: '15px', borderRadius: '4px' }}
                        />
                    </div>

                    {/* Manager Selection */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', color: '#888' }}>
                            SELECT MANAGERS <span style={{ color: selectedManagers.length < 2 ? 'var(--neon-red)' : 'var(--neon-gold)' }}>
                                ({selectedManagers.length} Selected - Min 2)
                            </span>
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', maxHeight: '300px', overflowY: 'auto', padding: '10px', background: '#050505', border: '1px solid #333', borderRadius: '4px' }}>
                            {managers.length === 0 ? <p style={{ color: '#666', padding: '10px' }}>No Approved Managers Found</p> : managers.map(mgr => (
                                <div
                                    key={mgr.id}
                                    onClick={() => toggleManager(mgr.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '10px', borderRadius: '4px', cursor: 'pointer',
                                        background: selectedManagers.includes(mgr.id) ? 'rgba(251, 191, 36, 0.1)' : 'transparent',
                                        border: selectedManagers.includes(mgr.id) ? '1px solid var(--neon-gold)' : '1px solid #333'
                                    }}
                                >
                                    <img src={mgr.photo} style={{ width: 30, height: 30, borderRadius: '50%' }} />
                                    <span style={{ fontSize: '0.9rem' }}>{mgr.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className="submit-btn" style={{ width: '100%', marginTop: '10px' }}>CREATE TEAM</button>
                </form>
            </div>

            <table className="data-table">
                <thead>
                    <tr>
                        <th>TEAM NAME</th>
                        <th>MANAGERS</th>
                        <th>WALLET</th>
                        <th>ACTION</th>
                    </tr>
                </thead>
                <tbody>
                    {teams.map(team => (
                        <tr key={team.id}>
                            <td style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{team.name}</td>
                            <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    {team.managers && team.managers.length > 0 ? team.managers.map(m => (
                                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <img src={m.photo} style={{ width: 20, height: 20, borderRadius: '50%' }} />
                                            <span style={{ fontSize: '0.9rem', color: '#ccc' }}>{m.name}</span>
                                        </div>
                                    )) : <span style={{ color: '#444' }}>No Managers</span>}
                                </div>
                            </td>
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