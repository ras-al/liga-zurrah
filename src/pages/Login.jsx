import { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        const auth = getAuth();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/admin');
        } catch (err) {
            setError("Invalid Login Credentials. Access Denied.");
        }
    };

    return (
        <div className="login-container">
            <div className="login-glass-panel">
                <Link to="/" style={{ color: '#666', textDecoration: 'none', fontSize: '0.8rem', display: 'block', marginBottom: '20px', letterSpacing: '2px' }}>← RETURN HOME</Link>

                <h2 className="login-title">ADMIN LOGIN</h2>
                <div style={{ width: '40px', height: '3px', background: 'var(--neon-red)', margin: '-20px auto 40px' }}></div>

                {error && <div className="error-msg">{error}</div>}

                <form onSubmit={handleLogin}>
                    <div className="login-input-group">
                        <label>SECURE EMAIL</label>
                        <input type="email" required onChange={e => setEmail(e.target.value)} placeholder="admin@ligazurrha.com" />
                    </div>
                    <div className="login-input-group">
                        <label>ACCESS KEY</label>
                        <input type="password" required onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                    </div>
                    <button className="login-btn">AUTHENTICATE</button>
                </form>
            </div>
        </div>
    );
}
