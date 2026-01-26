import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import AdminLayout from '../components/AdminLayout';
import Loading from '../components/Loading';

export default function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState('Player');
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        const snap = await getDocs(collection(db, 'registrations'));
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
    };

    const updateStatus = async (id, status) => {
        // Optimistic UI update to prevent lag feel
        setUsers(users.map(u => u.id === id ? { ...u, status } : u));
        await updateDoc(doc(db, 'registrations', id), { status });
    };

    const deleteUser = async (id) => {
        if (!confirm("Delete permanently?")) return;
        setUsers(users.filter(u => u.id !== id));
        await deleteDoc(doc(db, 'registrations', id));
    };

    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(users);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, "LigaZurrha_Export.xlsx");
    };

    useEffect(() => { fetchUsers(); }, []);

    if (loading) return <Loading />;

    const filtered = users.filter(u => u.role === filter);

    return (
        <AdminLayout>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>REGISTRATIONS</h1>
                <button onClick={exportExcel} className="btn" style={{ fontSize: '0.9rem', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span> EXPORT DATA
                </button>
            </div>

            <div className="role-toggle" style={{ margin: '30px 0', maxWidth: '300px' }}>
                <div className={`role-btn ${filter === 'Player' ? 'active' : ''}`} onClick={() => setFilter('Player')}>PLAYERS</div>
                <div className={`role-btn ${filter === 'Manager' ? 'active' : ''}`} onClick={() => setFilter('Manager')}>MANAGERS</div>
            </div>

            <table className="data-table">
                <thead>
                    <tr>
                        <th>AVATAR</th>
                        <th>NAME</th>
                        <th>CLASS</th>
                        <th>DETAILS</th>
                        <th>STATUS</th>
                        <th>ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map(u => (
                        <tr key={u.id}>
                            <td data-label="AVATAR"><img src={u.photo} style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #333' }} /></td>
                            <td data-label="NAME">
                                <div style={{ fontWeight: 'bold' }}>{u.name}</div>
                                <div style={{ fontSize: '0.8rem', color: '#666' }}>{u.phone}</div>
                            </td>
                            <td data-label="CLASS">{u.class}</td>
                            <td data-label="DETAILS">{u.role === 'Player' ? u.position : u.experience || 'N/A'}</td>
                            <td data-label="STATUS">
                                <span style={{
                                    color: u.status === 'approved' ? '#4ade80' : u.status === 'rejected' ? '#f87171' : '#facc15',
                                    fontWeight: 'bold', fontSize: '0.9rem'
                                }}>
                                    {u.status.toUpperCase()}
                                </span>
                            </td>
                            <td data-label="ACTIONS">
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                    {u.status === 'pending' && (
                                        <>
                                            <button onClick={() => updateStatus(u.id, 'approved')} style={{ background: '#064e3b', color: '#4ade80', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>JX ACCEPT</button>
                                            <button onClick={() => updateStatus(u.id, 'rejected')} style={{ background: '#450a0a', color: '#f87171', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>REJECT</button>
                                        </>
                                    )}
                                    <button onClick={() => deleteUser(u.id)} style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>DEL</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </AdminLayout>
    );
}