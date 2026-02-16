import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import GroupStageManager from './components/GroupStageManager';
import MatchManager from './components/MatchManager';
import BracketManager from './components/BracketManager';

export default function TournamentManager() {
    const [activeTab, setActiveTab] = useState('GROUPS');

    return (
        <AdminLayout>
            <div className="admin-header">
                <h1>TOURNAMENT MANAGER</h1>

                <div style={{ display: 'flex', gap: '10px' }}>
                    {['GROUPS', 'MATCHES', 'BRACKETS'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '10px 20px',
                                background: activeTab === tab ? 'var(--neon-gold)' : '#222',
                                color: activeTab === tab ? '#000' : '#888',
                                border: '1px solid #333',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontFamily: 'Rajdhani, sans-serif',
                                letterSpacing: '1px'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="glass-panel" style={{ marginTop: '20px', minHeight: '600px', background: '#050505' }}>
                {activeTab === 'GROUPS' && <GroupStageManager />}
                {activeTab === 'MATCHES' && <MatchManager />}
                {activeTab === 'BRACKETS' && <BracketManager />}
            </div>
        </AdminLayout>
    );
}
