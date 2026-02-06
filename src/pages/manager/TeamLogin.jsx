import { useState, useEffect } from 'react';
import { db } from '../../firebase'; // Adjust path if needed
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function TeamLogin() {
    const [teams, setTeams] = useState([]);
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [passcode, setPasscode] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTeams = async () => {
            const snap = await getDocs(collection(db, 'teams'));
            setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        };
        fetchTeams();
    }, []);

    const handleLogin = (e) => {
        e.preventDefault();

        const team = teams.find(t => t.id === selectedTeamId);
        if (!team) return toast.error("Please select a team");

        if (team.passcode === passcode) {
            toast.success(`Welcome, ${team.name}!`);
            localStorage.setItem('managerTeamId', team.id);
            navigate('/war-room');
        } else {
            toast.error("Invalid Passcode!");
        }
    };

    if (loading) return <div style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>Loading Teams...</div>;

    return (
        <div style={{
            minHeight: '100vh',
            background: 'black',
            color: 'white',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                background: '#111',
                padding: '30px',
                borderRadius: '12px',
                border: '1px solid #333',
                boxShadow: '0 0 20px rgba(0,0,0,0.5)'
            }}>
                <h2 style={{ textAlign: 'center', marginBottom: '30px', color: 'var(--neon-gold, #facc15)' }}>TEAM LOGIN</h2>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>SELECT YOUR TEAM</label>
                        <select
                            value={selectedTeamId}
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#222',
                                border: '1px solid #444',
                                color: 'white',
                                borderRadius: '6px'
                            }}
                        >
                            <option value="">-- Choose Team --</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>ENTER PASSCODE</label>
                        <input
                            type="password"
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value)}
                            placeholder="****"
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#222',
                                border: '1px solid #444',
                                color: 'white',
                                borderRadius: '6px'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        style={{
                            background: 'white',
                            color: 'black',
                            border: 'none',
                            padding: '15px',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            marginTop: '10px'
                        }}
                    >
                        ENTER WAR ROOM
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        style={{
                            background: 'transparent',
                            color: '#666',
                            border: 'none',
                            padding: '10px',
                            cursor: 'pointer'
                        }}
                    >
                        Back to Home
                    </button>
                </form>
            </div>
        </div>
    );
}
