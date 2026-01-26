import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import AdminLayout from '../components/AdminLayout';
import Loading from '../components/Loading';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState('Player');
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);

    const fetchUsers = async () => {
        const snap = await getDocs(collection(db, 'registrations'));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Stack Order: Newest First
        data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setUsers(data);
        setLoading(false);
    };

    const updateStatus = async (id, status) => {
        // Optimistic UI update to prevent lag feel
        setUsers(users.map(u => u.id === id ? { ...u, status } : u));
        await updateDoc(doc(db, 'registrations', id), { status });
        if (selectedUser?.id === id) setSelectedUser(prev => ({ ...prev, status })); // Update modal if open
    };

    const deleteUser = async (id) => {
        if (!confirm("Delete permanently?")) return;
        setUsers(users.filter(u => u.id !== id));
        await deleteDoc(doc(db, 'registrations', id));
        if (selectedUser?.id === id) setSelectedUser(null); // Close modal if deleted
    };

    const exportExcel = () => {
        // Sanitize data: Remove photo (too large) and format dates
        const dataToExport = users.map(({ photo, timestamp, ...rest }) => ({
            ...rest,
            RegistrationDate: timestamp?.toDate ? timestamp.toDate().toLocaleString() : ''
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
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
                        <th>PHONE</th>
                        <th>CLASS</th>
                        <th>DETAILS</th>
                        <th>STATUS</th>
                        <th>ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map(u => (
                        <tr key={u.id} onClick={() => setSelectedUser(u)} style={{ cursor: 'pointer' }}>
                            <td data-label="AVATAR"><img src={u.photo} style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #333' }} /></td>
                            <td data-label="NAME">
                                <div style={{ fontWeight: 'bold' }}>{u.name}</div>
                            </td>
                            <td data-label="PHONE" style={{ color: '#666', fontFamily: 'monospace', fontSize: '1rem' }}>{u.phone}</td>
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
                            <td data-label="ACTIONS" onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                    <button onClick={() => deleteUser(u.id)} style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>DEL</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* PROFILE MODAL */}
            <AnimatePresence>
                {selectedUser && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedUser(null)}
                    >
                        <motion.div
                            className="profile-modal"
                            initial={{ scale: 0.8, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 50 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button className="close-modal-btn" onClick={() => setSelectedUser(null)}>✕</button>

                            <div className="modal-header">
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <img src={selectedUser.photo} alt={selectedUser.name} className="modal-avatar" />
                                    <a href={selectedUser.photo} download={`${selectedUser.name}-photo.jpg`} className="download-badge" title="Download Photo">
                                        ⬇
                                    </a>
                                </div>
                                <div>
                                    <h2 className="modal-name">{selectedUser.name}</h2>
                                    <p className="modal-role">{selectedUser.role} • {selectedUser.class}</p>
                                </div>
                            </div>

                            <div className="modal-body">
                                <div className="detail-row">
                                    <span>PHONE</span>
                                    <strong>{selectedUser.phone}</strong>
                                </div>
                                <div className="detail-row">
                                    <span>AGE</span>
                                    <strong>{selectedUser.age || 'N/A'}</strong>
                                </div>
                                <div className="detail-row">
                                    <span>POSITIONS</span>
                                    <strong>{selectedUser.position || 'N/A'}</strong>
                                </div>
                                <div className="detail-row">
                                    <span>STATUS</span>
                                    <strong style={{
                                        color: selectedUser.status === 'approved' ? '#4ade80' : selectedUser.status === 'rejected' ? '#f87171' : '#facc15'
                                    }}>{selectedUser.status.toUpperCase()}</strong>
                                </div>
                            </div>

                            <div className="modal-actions">
                                {selectedUser.status === 'pending' && (
                                    <>
                                        <button className="modal-btn approve" onClick={() => updateStatus(selectedUser.id, 'approved')}>✓ APPROVE</button>
                                        <button className="modal-btn reject" onClick={() => updateStatus(selectedUser.id, 'rejected')}>MY REJECT</button>
                                    </>
                                )}
                                <button className="modal-btn delete" onClick={() => deleteUser(selectedUser.id)}>DELETE USER</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AdminLayout>
    );
}