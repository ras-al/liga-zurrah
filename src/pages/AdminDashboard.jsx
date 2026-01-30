import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import AdminLayout from '../components/AdminLayout';
import Loading from '../components/Loading'; // Can be removed if unused, but keeping for safety
import SkeletonRow from '../components/SkeletonRow';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState('Player');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [posFilter, setPosFilter] = useState(null);

    const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

    const fetchUsers = async () => {
        const snap = await getDocs(collection(db, 'registrations'));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Stack Order: Newest First
        data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setUsers(data);
        setLoading(false);
    };

    const updateStatus = async (id, status) => {
        // Optimistic UI update
        setUsers(users.map(u => u.id === id ? { ...u, status } : u));
        await updateDoc(doc(db, 'registrations', id), { status });
        if (selectedUser?.id === id) setSelectedUser(prev => ({ ...prev, status }));
    };

    const deleteUser = async (id) => {
        if (!confirm("Delete permanently?")) return;
        setUsers(users.filter(u => u.id !== id));
        await deleteDoc(doc(db, 'registrations', id));
        if (selectedUser?.id === id) setSelectedUser(null);
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

    // Stats Calculation
    const totalPlayers = users.filter(u => u.role === 'Player').length;
    const totalManagers = users.filter(u => u.role === 'Manager').length;

    const positionCounts = {};
    if (filter === 'Player') {
        users.filter(u => u.role === 'Player').forEach(u => {
            if (u.position) {
                // Split by comma in case of multi-select, trim whitespace
                u.position.split(',').forEach(p => {
                    const cleanPos = p.trim();
                    if (cleanPos) positionCounts[cleanPos] = (positionCounts[cleanPos] || 0) + 1;
                });
            }
        });
    }

    // Helper to find duplicate phones
    const getDuplicatePhones = () => {
        const phoneCounts = {};
        users.forEach(u => {
            if (u.phone) {
                phoneCounts[u.phone] = (phoneCounts[u.phone] || 0) + 1;
            }
        });
        return Object.keys(phoneCounts).filter(phone => phoneCounts[phone] > 1);
    };

    const filtered = users.filter(u => {
        if (showDuplicatesOnly) {
            const duplicates = getDuplicatePhones();
            return u.phone && duplicates.includes(u.phone);
        }

        const matchesRole = u.role === filter;
        const matchesSearch = searchTerm === '' ||
            u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.phone?.includes(searchTerm);

        // Position Filter (loose match to allow multi-select "Striker, Winger" to show up for "Striker")
        const matchesPos = !posFilter || (u.position && u.position.includes(posFilter));

        return matchesRole && matchesSearch && matchesPos;
    });

    // Add User State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newUser, setNewUser] = useState({
        name: '', phone: '', class: '', role: 'Player', age: '', position: '', photo: ''
    });
    const [photoPreview, setPhotoPreview] = useState(null);
    const [creating, setCreating] = useState(false);

    // EDIT USER STATE
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState({});

    // Handlers for Editing
    const startEditing = () => {
        setEditFormData({ ...selectedUser });
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setEditFormData({});
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditPhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5000000) return alert("Photo too big! Max 5MB allowed.");
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

                    setEditFormData(prev => ({ ...prev, photo: compressedBase64 }));
                };
            };
        }
    };

    const saveEditedUser = async () => {
        try {
            await updateDoc(doc(db, 'registrations', selectedUser.id), editFormData);
            // Local update
            setUsers(users.map(u => u.id === selectedUser.id ? { ...u, ...editFormData } : u));
            setSelectedUser(prev => ({ ...prev, ...editFormData }));
            setIsEditing(false);
            alert("Updated successfully!");
        } catch (err) {
            console.error("Error updating user:", err);
            alert("Failed to update user.");
        }
    };

    const handleAddUserChange = (e) => {
        setNewUser({ ...newUser, [e.target.name]: e.target.value });
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Limit: 5MB check first
            if (file.size > 5000000) return alert("Photo too big! Max 5MB allowed.");

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // Compress to JPEG at 0.7 quality
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                    setPhotoPreview(compressedBase64);
                    setNewUser({ ...newUser, photo: compressedBase64 });
                };
            };
        }
    };

    const createUser = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const formData = {
                name: newUser.name,
                phone: newUser.phone,
                class: newUser.class,
                role: newUser.role,
                photo: newUser.photo || 'https://via.placeholder.com/150', // Default if none
                timestamp: serverTimestamp(),
                status: 'approved', // Auto-approve admin added users
                soldPrice: 0,
                teamId: null,
                basePrice: newUser.role === 'Player' ? 500 : 0
            };

            if (newUser.role === 'Player') {
                formData.age = newUser.age;
                formData.position = newUser.position;
            }

            await addDoc(collection(db, 'registrations'), formData);

            // Refresh and Close
            await fetchUsers();
            setShowAddModal(false);

            // Reset Form (Naive reset)
            setNewUser({ name: '', phone: '', class: '', role: 'Player', age: '', position: '', photo: '' });
            setPhotoPreview(null);

            alert("User Added Successfully!"); // Simple alert or use toast if available
        } catch (error) {
            console.error(error);
            alert("Error adding user");
        }
        setCreating(false);
    };

    return (
        <AdminLayout>
            {/* 1. HEADER & SEARCH */}
            <div className="admin-header">
                <h1>REGISTRATIONS</h1>
                <div className="admin-actions">
                    <div className="admin-search-box">
                        <span style={{ fontSize: '1.2rem', color: '#666' }}></span>
                        <input
                            type="text"
                            placeholder="Search Name or Phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="admin-search-input"
                            disabled={showDuplicatesOnly}
                        />
                    </div>
                    <button
                        onClick={() => {
                            if (showDuplicatesOnly) {
                                setShowDuplicatesOnly(false);
                            } else {
                                setShowDuplicatesOnly(true);
                                setFilter(null); // Clear role filter to search across all roles
                                setPosFilter(null);
                            }
                        }}
                        className={`admin-btn ${showDuplicatesOnly ? 'active-red' : ''}`}
                    >
                        {showDuplicatesOnly ? "⚠ SHOWING DUPLICATES" : "FIND DUPLICATES"}
                    </button>
                    <button onClick={() => setShowAddModal(true)} className="admin-btn" style={{ background: '#333', color: 'white', border: '1px solid #555' }}>
                        + ADD USER
                    </button>
                    <button onClick={exportExcel} className="admin-btn export">
                        <span>+</span> EXPORT DATA
                    </button>
                </div>
            </div>

            {/* 2. STATS CARDS */}
            <div className="stats-grid">
                <div className="stat-card gold-accent">
                    <div className="stat-label">TOTAL PLAYERS</div>
                    <div className="stat-number">{totalPlayers}</div>
                </div>
                <div className="stat-card red-accent">
                    <div className="stat-label">TOTAL MANAGERS</div>
                    <div className="stat-number">{totalManagers}</div>
                </div>
            </div>

            {/* 3. FILTERS */}
            <div className="role-tabs">
                <div className={`role-tab ${filter === 'Player' ? 'active' : ''}`} onClick={() => { setFilter('Player'); setPosFilter(null); }}>PLAYERS</div>
                <div className={`role-tab ${filter === 'Manager' ? 'active' : ''}`} onClick={() => { setFilter('Manager'); setPosFilter(null); }}>MANAGERS</div>
            </div>

            {/* POSITION FILTER (Only for Players) */}
            {filter === 'Player' && (
                <div className="filter-scroll-container">
                    <button
                        onClick={() => setPosFilter(null)}
                        className={`filter-pill ${!posFilter ? 'active' : ''}`}
                    >
                        ALL ({totalPlayers})
                    </button>
                    {Object.entries(positionCounts).map(([pos, count]) => (
                        <button
                            key={pos}
                            onClick={() => setPosFilter(pos === posFilter ? null : pos)}
                            className={`filter-pill ${posFilter === pos ? 'active' : ''}`}
                        >
                            {pos.toUpperCase()} ({count})
                        </button>
                    ))}
                </div>
            )}

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
                    {loading ? (
                        <>
                            <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
                        </>
                    ) : (
                        filtered.map(u => (
                            <tr key={u.id} onClick={() => setSelectedUser(u)} style={{ cursor: 'pointer' }}>
                                <td data-label="AVATAR"><img src={u.photo} style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #333' }} /></td>
                                <td data-label="NAME">
                                    <div style={{ fontWeight: 'bold' }}>{u.name}</div>
                                </td>
                                <td data-label="PHONE" style={{ color: '#666', fontFamily: 'monospace', fontSize: '1rem' }}>{u.phone}</td>
                                <td data-label="CLASS">{u.class}</td>
                                <td data-label="DETAILS">{u.role === 'Player' ? u.position : u.experience || 'N/A'}</td>
                                <td data-label="STATUS">
                                    <span className={`status-pill status-${u.status}`}>
                                        {u.status}
                                    </span>
                                </td>
                                <td data-label="ACTIONS" onClick={(e) => e.stopPropagation()}>
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                        <button onClick={() => deleteUser(u.id)} style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>DEL</button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* ADD USER MODAL */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="profile-modal"
                            initial={{ scale: 0.8, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 50 }}
                        >
                            <button className="close-modal-btn" onClick={() => setShowAddModal(false)}>✕</button>
                            <h2 style={{ color: 'white', marginBottom: '20px', fontFamily: 'Anton' }}>ADD NEW USER</h2>

                            <form onSubmit={createUser} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <select
                                        name="role"
                                        value={newUser.role}
                                        onChange={handleAddUserChange}
                                        style={{ flex: 1, padding: '10px', background: '#222', color: 'white', border: '1px solid #333' }}
                                    >
                                        <option value="Player">Player</option>
                                        <option value="Manager">Manager</option>
                                    </select>
                                </div>

                                <input name="name" placeholder="Full Name" value={newUser.name} onChange={handleAddUserChange} required style={{ padding: '10px', background: '#222', color: 'white', border: '1px solid #333' }} />
                                <input name="phone" placeholder="Phone Number" value={newUser.phone} onChange={handleAddUserChange} required style={{ padding: '10px', background: '#222', color: 'white', border: '1px solid #333' }} />
                                <input name="class" placeholder="Class (e.g. R4A)" value={newUser.class} onChange={handleAddUserChange} required style={{ padding: '10px', background: '#222', color: 'white', border: '1px solid #333' }} />

                                {newUser.role === 'Player' && (
                                    <>
                                        <input name="age" type="number" placeholder="Age" value={newUser.age} onChange={handleAddUserChange} style={{ padding: '10px', background: '#222', color: 'white', border: '1px solid #333' }} />
                                        <input name="position" placeholder="Position (e.g. Striker)" value={newUser.position} onChange={handleAddUserChange} style={{ padding: '10px', background: '#222', color: 'white', border: '1px solid #333' }} />
                                    </>
                                )}

                                <div style={{ border: '1px dashed #444', padding: '20px', textAlign: 'center' }}>
                                    <input type="file" onChange={handlePhotoUpload} accept="image/*" />
                                    {photoPreview && <img src={photoPreview} style={{ width: '100px', height: '100px', objectFit: 'cover', marginTop: '10px', borderRadius: '50%' }} />}
                                </div>

                                <button type="submit" disabled={creating} className="modal-btn approve">
                                    {creating ? "CREATING..." : "CREATE USER"}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* PROFILE MODAL */}
            <AnimatePresence>
                {selectedUser && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => { setSelectedUser(null); setIsEditing(false); }}
                    >
                        <motion.div
                            className="profile-modal"
                            initial={{ scale: 0.8, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 50 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button className="close-modal-btn" onClick={() => { setSelectedUser(null); setIsEditing(false); }}>✕</button>

                            {!isEditing ? (
                                // VIEW MODE
                                <>
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
                                            <span className={`status-pill status-${selectedUser.status}`}>
                                                {selectedUser.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="modal-actions">
                                        {selectedUser.status === 'pending' && (
                                            <>
                                                <button className="modal-btn approve" onClick={() => updateStatus(selectedUser.id, 'approved')}>✓ APPROVE</button>
                                                <button className="modal-btn reject" onClick={() => updateStatus(selectedUser.id, 'rejected')}>MY REJECT</button>
                                            </>
                                        )}
                                        <button className="modal-btn" style={{ background: '#444', color: 'white' }} onClick={startEditing}>EDIT DETAILS</button>
                                        <button className="modal-btn delete" onClick={() => deleteUser(selectedUser.id)}>DELETE USER</button>
                                    </div>
                                </>
                            ) : (
                                // EDIT MODE
                                <>
                                    <h2 style={{ color: 'white', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>EDIT DETAILS</h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '5px' }}>

                                        {/* Photo Edit */}
                                        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                                            <img
                                                src={editFormData.photo}
                                                alt="Preview"
                                                style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #FEBF00' }}
                                            />
                                            <div style={{ marginTop: '5px' }}>
                                                <label htmlFor="edit-photo" style={{ cursor: 'pointer', color: '#FEBF00', fontSize: '0.9rem', textDecoration: 'underline' }}>Change Photo</label>
                                                <input id="edit-photo" type="file" accept="image/*" onChange={handleEditPhotoUpload} style={{ display: 'none' }} />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '5px' }}>FULL NAME</label>
                                            <input
                                                style={{ padding: '10px', background: '#222', color: 'white', border: '1px solid #333', width: '100%', boxSizing: 'border-box', borderRadius: '4px' }}
                                                name="name"
                                                value={editFormData.name || ''}
                                                onChange={handleEditChange}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '5px' }}>ROLE</label>
                                                <select
                                                    style={{ padding: '10px', background: '#222', color: 'white', border: '1px solid #333', width: '100%', boxSizing: 'border-box', borderRadius: '4px' }}
                                                    name="role"
                                                    value={editFormData.role || 'Player'}
                                                    onChange={handleEditChange}
                                                >
                                                    <option value="Player">Player</option>
                                                    <option value="Manager">Manager</option>
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ flex: 1 }}>
                                                <label style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '5px' }}>CLASS</label>
                                                <input
                                                    style={{ padding: '10px', background: '#222', color: 'white', border: '1px solid #333', width: '100%', boxSizing: 'border-box', borderRadius: '4px' }}
                                                    name="class"
                                                    value={editFormData.class || ''}
                                                    onChange={handleEditChange}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '5px' }}>PHONE</label>
                                            <input
                                                style={{ padding: '10px', background: '#222', color: 'white', border: '1px solid #333', width: '100%', boxSizing: 'border-box', borderRadius: '4px' }}
                                                name="phone"
                                                value={editFormData.phone || ''}
                                                onChange={handleEditChange}
                                            />
                                        </div>

                                        {editFormData.role === 'Player' && (
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <div className="form-group" style={{ flex: 1 }}>
                                                    <label style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '5px' }}>AGE</label>
                                                    <input
                                                        style={{ padding: '10px', background: '#222', color: 'white', border: '1px solid #333', width: '100%', boxSizing: 'border-box', borderRadius: '4px' }}
                                                        type="number"
                                                        name="age"
                                                        value={editFormData.age || ''}
                                                        onChange={handleEditChange}
                                                    />
                                                </div>
                                                <div className="form-group" style={{ flex: 2 }}>
                                                    <label style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '5px' }}>POSITION</label>
                                                    <input
                                                        style={{ padding: '10px', background: '#222', color: 'white', border: '1px solid #333', width: '100%', boxSizing: 'border-box', borderRadius: '4px' }}
                                                        name="position"
                                                        value={editFormData.position || ''}
                                                        onChange={handleEditChange}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="modal-actions" style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '15px' }}>
                                        <button className="modal-btn approve" onClick={saveEditedUser}>SAVE CHANGES</button>
                                        <button className="modal-btn" style={{ background: 'transparent', border: '1px solid #555', color: 'white' }} onClick={cancelEditing}>CANCEL</button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AdminLayout>
    );
}