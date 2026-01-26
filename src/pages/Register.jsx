import { useState, useRef, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './Register.css'; // Import separate CSS

export default function Register() {
    const navigate = useNavigate();
    // ... (rest of state)
    const [role, setRole] = useState('Player');
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [photoBase64, setPhotoBase64] = useState('');
    const [stats, setStats] = useState({ players: 0, managers: 0 });

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const playerQ = query(collection(db, 'registrations'), where('role', '==', 'Player'));
                const managerQ = query(collection(db, 'registrations'), where('role', '==', 'Manager'));

                const [pSnap, mSnap] = await Promise.all([getDocs(playerQ), getDocs(managerQ)]);
                setStats({
                    players: pSnap.size,
                    managers: mSnap.size
                });
            } catch (err) {
                console.error("Error fetching stats:", err);
            }
        };
        fetchCounts();
    }, []);

    // Refs for inputs
    const nameRef = useRef();
    const phoneRef = useRef();
    const classRef = useRef(); // New Class Ref
    const ageRef = useRef();
    const positionRef = useRef();

    const handleImage = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Strict size limit to prevent lag (500KB)
            if (file.size > 500000) return alert("Photo too big! Max 500KB to prevent lag.");

            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoBase64(reader.result);
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const checkLimits = async (selectedRole) => {
        const q = query(collection(db, 'registrations'), where('role', '==', selectedRole));
        const snap = await getDocs(q);
        const limit = selectedRole === 'Player' ? 144 : 16;
        return snap.size < limit;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const name = nameRef.current.value.trim();
        const phone = phoneRef.current.value.trim();
        const userClass = classRef.current.value.trim();

        // 1. Strict Validation
        if (!name) return alert("Please enter your Full Name.");

        // Mobile Validation: 10 digits only
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) return alert("Invalid Phone Number! Must be exactly 10 digits.");

        if (!userClass) return alert("Please enter your Class (e.g. R4A).");

        if (role === 'Player') {
            const age = parseInt(ageRef.current.value);
            if (!age || age < 15 || age > 55) return alert("Invalid Age! Must be between 15 and 55.");
        }

        if (!photoBase64) return alert("Please upload a Profile Photo.");

        setLoading(true);

        try {
            // 2. Check Limits
            const canRegister = await checkLimits(role);
            if (!canRegister) {
                alert(`Registration Full! Limit reached for ${role}s.`);
                setLoading(false);
                return;
            }

            // 3. Prepare Data
            const formData = {
                name: name,
                phone: phone,
                class: userClass,
                role: role,
                photo: photoBase64,
                timestamp: serverTimestamp(),
                status: 'pending',
                soldPrice: 0,
                teamId: null,
            };

            if (role === 'Player') {
                formData.age = ageRef.current.value;
                formData.position = positionRef.current.value || 'Forward';
                formData.basePrice = 500;
            } else {
                formData.basePrice = 0;
            }

            await addDoc(collection(db, 'registrations'), formData);
            alert(`Welcome to the League, ${formData.name}!`);
            navigate('/');
        } catch (error) {
            console.error("Error:", error);
            alert("Registration failed. Please try again.");
        }
        setLoading(false);
    };

    return (
        <div className="container register-container" style={{ paddingTop: '50px', position: 'relative' }}>
            {/* Back Button */}
            <button
                onClick={() => navigate('/')}
                className="back-btn"
            >
                ← BACK
            </button>

            {/* Organized & Wonderful Header */}
            <div className="reg-header">
                <h2 className="reg-title">PLAYER REGISTRATION</h2>
                <div className="reg-divider"></div>
                <p className="reg-subtitle">SEASON 2026 • OFFICIAL DRAFT</p>
                <div className="reg-stats">
                    <span>SPOTS REMAINING:</span>
                    <strong style={{ color: '#fff', marginLeft: '5px' }}>{Math.max(0, 144 - stats.players)} PLAYERS</strong>
                    <span style={{ margin: '0 10px' }}>|</span>
                    <strong style={{ color: '#fff' }}>{Math.max(0, 16 - stats.managers)} MANAGERS</strong>
                </div>
            </div>

            <div className="glass-panel">
                <div className="role-toggle">
                    <div className={`role-btn ${role === 'Player' ? 'active' : ''}`} onClick={() => setRole('Player')}>PLAYER</div>
                    <div className={`role-btn ${role === 'Manager' ? 'active' : ''}`} onClick={() => setRole('Manager')}>MANAGER</div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>FULL NAME</label>
                        <input type="text" required ref={nameRef} placeholder="e.g. Lionel Messi" />
                    </div>

                    <div className="register-grid">
                        <div className="input-group">
                            <label>MOBILE NUMBER</label>
                            <input type="tel" required ref={phoneRef} placeholder="10-digit number" maxLength="10" />
                        </div>
                        <div className="input-group">
                            <label>CLASS</label>
                            <input type="text" required ref={classRef} placeholder="e.g. R4A" />
                        </div>
                    </div>

                    {role === 'Player' && (
                        <div className="register-grid">
                            <div className="input-group">
                                <label>AGE (15-55)</label>
                                <input type="number" required ref={ageRef} min="15" max="55" />
                            </div>
                            <div className="input-group">
                                <label>POSITION</label>
                                <select ref={positionRef}>
                                    <option value="Forward">Forward (FW)</option>
                                    <option value="Midfielder">Midfielder (MID)</option>
                                    <option value="Defender">Defender (DEF)</option>
                                    <option value="Goalkeeper">Goalkeeper (GK)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="input-group">
                        <label>PHOTO UPLOAD (MAX 500KB)</label>
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

                    <button disabled={loading} className="submit-btn">{loading ? "CHECKING AVAILABILITY..." : "CONFIRM REGISTRATION"}</button>
                </form>
            </div>
        </div>
    );
}