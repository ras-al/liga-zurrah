import { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

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
            setError("Invalid Login Credentials");
        }
    };

    return (
        <div className="container flex-center" style={{ minHeight: '100vh', flexDirection: 'column' }}>
            <div className="glass-panel" style={{ width: '400px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>ADMIN LOGIN</h2>
                {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
                <form onSubmit={handleLogin}>
                    <div className="input-group">
                        <label>EMAIL</label>
                        <input type="email" required onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>PASSWORD</label>
                        <input type="password" required onChange={e => setPassword(e.target.value)} />
                    </div>
                    <button className="submit-btn" style={{ marginTop: '20px' }}>LOGIN</button>
                </form>
            </div>
        </div>
    );
}
