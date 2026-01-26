import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Register() {
    const navigate = useNavigate();
    const [role, setRole] = useState('Player');
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        age: '',
        position: 'Forward',
        style: '',
        teamPref: '',
        experience: '',
        photo: ''
    });

    const handleImage = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 800000) return alert("Photo too big! Max 800KB.");
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, photo: reader.result });
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.photo) return alert("Please upload a photo.");

        setLoading(true);
        try {
            await addDoc(collection(db, 'registrations'), {
                ...formData,
                role,
                status: 'pending',
                basePrice: role === 'Player' ? 500 : 0,
                // Additional fields for auction tracking
                soldPrice: 0,
                teamId: null,
                timestamp: serverTimestamp()
            });
            alert(`Welcome to the League, ${formData.name}!`);
            navigate('/');
        } catch (error) {
            console.error("Error:", error);
            alert("Registration failed. Check console for details.");
        }
        setLoading(false);
    };

    return (
        <div className="container" style={{ paddingTop: '50px' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '3rem', color: '#fff', textShadow: '0 0 20px var(--neon-red)' }}>
                    OFFICIAL REGISTRATION
                </h2>
                <p style={{ color: '#888' }}>ENTER YOUR DETAILS TO JOIN THE DRAFT</p>
            </div>

            <div className="glass-panel">
                <div className="role-toggle">
                    <div className={`role-btn ${role === 'Player' ? 'active' : ''}`} onClick={() => setRole('Player')}>PLAYER</div>
                    <div className={`role-btn ${role === 'Manager' ? 'active' : ''}`} onClick={() => setRole('Manager')}>MANAGER</div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>FULL NAME</label>
                        <input type="text" required onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div className="input-group">
                            <label>PHONE</label>
                            <input type="tel" required onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                        {role === 'Player' && (
                            <div className="input-group">
                                <label>AGE</label>
                                <input type="number" required onChange={e => setFormData({ ...formData, age: e.target.value })} />
                            </div>
                        )}
                        {role === 'Manager' && (
                            <div className="input-group">
                                <label>EXPERIENCE</label>
                                <input type="text" placeholder="e.g. 2 years" onChange={e => setFormData({ ...formData, experience: e.target.value })} />
                            </div>
                        )}
                    </div>

                    {role === 'Player' ? (
                        <>
                            <div className="input-group">
                                <label>POSITION</label>
                                <select onChange={e => setFormData({ ...formData, position: e.target.value })}>
                                    <option value="Forward">Forward (FW)</option>
                                    <option value="Midfielder">Midfielder (MID)</option>
                                    <option value="Defender">Defender (DEF)</option>
                                    <option value="Goalkeeper">Goalkeeper (GK)</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>PLAYING STYLE (OPTIONAL)</label>
                                <input type="text" placeholder="e.g. Aggressive, Tiki-Taka" onChange={e => setFormData({ ...formData, style: e.target.value })} />
                            </div>
                        </>
                    ) : (
                        <div className="input-group">
                            <label>TEAM PREFERENCE (OPTIONAL)</label>
                            <input type="text" placeholder="e.g. Red Dragons" onChange={e => setFormData({ ...formData, teamPref: e.target.value })} />
                        </div>
                    )}

                    <div className="input-group">
                        <label>PHOTO UPLOAD</label>
                        <input type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} id="file-upload" />
                        <label htmlFor="file-upload" className="img-preview-box" style={{ cursor: 'pointer', border: preview ? '2px solid var(--neon-red)' : '2px dashed #444' }}>
                            {preview ? <img src={preview} alt="Preview" /> : (
                                <div style={{ textAlign: 'center' }}>
                                    <span className="upload-icon">+</span>
                                    <p style={{ color: '#666', fontSize: '0.8rem' }}>TAP TO UPLOAD</p>
                                </div>
                            )}
                        </label>
                    </div>

                    <button disabled={loading} className="submit-btn">{loading ? "PROCESSING..." : "CONFIRM REGISTRATION"}</button>
                </form>
            </div>
        </div>
    );
}