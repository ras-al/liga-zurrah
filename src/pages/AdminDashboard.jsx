import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';

export default function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [teamName, setTeamName] = useState('');
    const [filter, setFilter] = useState('Player'); // 'Player' or 'Manager'

    const fetchAll = async () => {
        const uSnap = await getDocs(collection(db, 'registrations'));
        setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const tSnap = await getDocs(collection(db, 'teams'));
        setTeams(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    const createTeam = async () => {
        if (!teamName) return;
        await addDoc(collection(db, 'teams'), { name: teamName, wallet: 15000 });
        alert(`Team ${teamName} Created with ₹15,000 Wallet!`);
        setTeamName('');
        fetchAll();
    };

    const updateStatus = async (id, status) => {
        await updateDoc(doc(db, 'registrations', id), { status });
        fetchAll();
    };

    const deleteUser = async (id) => {
        if (window.confirm("Delete permanently?")) {
            await deleteDoc(doc(db, 'registrations', id));
            fetchAll();
        }
    };

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(users);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Registrations");
        XLSX.writeFile(wb, "Liga_Zurrah_Data.xlsx");
    };

    useEffect(() => { fetchAll(); }, []);

    const filteredUsers = users.filter(u => u.role === filter);

    return (
        <div className="container" style={{ paddingBottom: '50px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <h1>Admin Dashboard</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={exportToExcel} className="btn" style={{ fontSize: '1rem', padding: '10px 20px' }}>EXPORT EXCEL</button>
                    <Link to="/admin/auction" className="btn btn-gold" style={{ fontSize: '1rem', padding: '10px 20px' }}>GO TO AUCTION</Link>
                </div>
            </div>

            {/* Team Creator */}
            <div className="glass-panel" style={{ margin: '20px 0', padding: '20px', maxWidth: '100%' }}>
                <h3>Create Team</h3>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <input className="input-field" placeholder="Team Name" value={teamName} onChange={e => setTeamName(e.target.value)} style={{ flex: 1, padding: '10px' }} />
                    <button onClick={createTeam} className="btn" style={{ margin: 0 }}>ADD TEAM</button>
                </div>
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {teams.map(t => (
                        <span key={t.id} style={{ background: '#333', padding: '5px 10px', borderRadius: '5px' }}>
                            {t.name} (₹{t.wallet})
                        </span>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="role-toggle" style={{ margin: '20px 0', maxWidth: '400px' }}>
                <div className={`role-btn ${filter === 'Player' ? 'active' : ''}`} onClick={() => setFilter('Player')}>PLAYERS</div>
                <div className={`role-btn ${filter === 'Manager' ? 'active' : ''}`} onClick={() => setFilter('Manager')}>MANAGERS</div>
            </div>

            {/* User List */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                    <thead>
                        <tr style={{ background: '#222', textAlign: 'left' }}>
                            <th style={{ padding: '10px' }}>Photo</th>
                            <th>Name</th>
                            <th>Phone</th>
                            {filter === 'Player' ? <th>Pos / Style</th> : <th>Exp / Team</th>}
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid #333' }}>
                                <td style={{ padding: '10px' }}>
                                    <img src={u.photo} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                </td>
                                <td>{u.name} <br /><small style={{ color: '#888' }}>{u.age ? `${u.age} yrs` : ''}</small></td>
                                <td>{u.phone}</td>
                                <td>
                                    {u.role === 'Player' ? `${u.position} (${u.style || '-'})` : `${u.experience || '-'} (${u.teamPref || '-'})`}
                                </td>
                                <td>
                                    <span style={{
                                        color: u.status === 'approved' ? 'lime' : u.status === 'rejected' ? 'red' : 'orange',
                                        textTransform: 'uppercase', fontWeight: 'bold'
                                    }}>
                                        {u.status}
                                    </span>
                                </td>
                                <td>
                                    {u.status === 'pending' && (
                                        <>
                                            <button onClick={() => updateStatus(u.id, 'approved')} style={{ color: 'lime', background: 'none', border: '1px solid lime', marginRight: '5px', padding: '5px', cursor: 'pointer' }}>✓</button>
                                            <button onClick={() => updateStatus(u.id, 'rejected')} style={{ color: 'red', background: 'none', border: '1px solid red', padding: '5px', cursor: 'pointer' }}>✗</button>
                                        </>
                                    )}
                                    <button onClick={() => deleteUser(u.id)} style={{ marginLeft: '10px', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>🗑</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}