import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';

export default function PointsTable({ filterGroup }) {
    const [table, setTable] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            // Real-time listener for matches to update table instantly
            const matchesUnsub = onSnapshot(collection(db, 'matches'), (mSnap) => {
                const matches = mSnap.docs.map(d => d.data());

                // Fetch Teams (Static for now, or could listener)
                getDocs(collection(db, 'teams')).then(tSnap => {
                    const teams = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    calculateTable(teams, matches);
                });
            });

            return () => matchesUnsub();
        };

        fetchData();
    }, []);

    const calculateTable = (teams, matches) => {
        const stats = {};

        // Initialize Stats
        teams.forEach(team => {
            stats[team.id] = {
                id: team.id,
                name: team.name,
                logo: team.logo,
                group: team.groupId,
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                gf: 0,
                ga: 0,
                gd: 0,
                pts: 0,
                form: [] // ['W', 'L', 'D']
            };
        });

        // Process Matches
        matches.forEach(match => {
            if (match.status !== 'finished') return;

            const tA = stats[match.teamAId];
            const tB = stats[match.teamBId];

            if (!tA || !tB) return; // Team might be deleted

            tA.played++;
            tB.played++;

            tA.gf += match.scoreA;
            tA.ga += match.scoreB;
            tB.gf += match.scoreB;
            tB.ga += match.scoreA;

            if (match.scoreA > match.scoreB) {
                tA.won++;
                tA.pts += 3;
                tB.lost++;
                tA.form.push('W');
                tB.form.push('L');
                console.log(`Match ${match.id}: A wins. A pts: ${tA.pts}`);
            } else if (match.scoreB > match.scoreA) {
                tB.won++;
                tB.pts += 3;
                tA.lost++;
                tB.form.push('W');
                tA.form.push('L');
                console.log(`Match ${match.id}: B wins. B pts: ${tB.pts}`);
            } else {
                tA.drawn++;
                tB.drawn++;
                tA.pts += 1;
                tB.pts += 1;
                tA.form.push('D');
                tB.form.push('D');
            }
        });

        // Calculate GD & Finalize
        let tableData = Object.values(stats).map(t => ({
            ...t,
            gd: t.gf - t.ga,
            form: t.form.slice(-5).reverse() // Last 5
        }));

        // Filter by Group if prop provided
        if (filterGroup) {
            tableData = tableData.filter(t => t.group === filterGroup);
        }

        // Sort: Points -> GD -> GF
        tableData.sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if (b.gd !== a.gd) return b.gd - a.gd;
            return b.gf - a.gf;
        });

        console.log("Calculated Table:", tableData);
        setTable(tableData);
        setLoading(false);
    };

    if (loading) return <div>Loading Table...</div>;

    return (
        <div className="points-table-container">
            <style>{`
                .points-table th, .points-table td {
                    padding: 15px;
                }
                @media (max-width: 600px) {
                    .points-table th, .points-table td {
                        padding: 8px 4px !important;
                        font-size: 0.8rem;
                    }
                    .team-name {
                        font-size: 0.9rem !important;
                    }
                    .team-rank {
                        width: 15px !important;
                        font-size: 0.7rem !important;
                    }
                    .team-logo {
                        width: 25px !important;
                        height: 25px !important;
                    }
                }
            `}</style>
            <table className="points-table" style={{ width: '100%', borderCollapse: 'collapse', color: 'white', fontSize: '0.9rem' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #333', color: '#888', fontSize: '0.8rem', textAlign: 'center' }}>
                        <th style={{ textAlign: 'left' }}>TEAM</th>
                        <th title="Played">P</th>
                        <th title="Won">W</th>
                        <th title="Drawn">D</th>
                        <th title="Lost">L</th>
                        <th title="Goal Difference">GD</th>
                        <th style={{ color: 'var(--neon-gold)' }} title="Points">PTS</th>
                        <th title="Form" className="desktop-only">FORM</th>
                    </tr>
                </thead>
                <tbody>
                    {table.map((team, index) => (
                        <tr key={team.id} style={{ borderBottom: '1px solid #222', background: index < 2 ? 'rgba(74, 222, 128, 0.05)' : 'transparent' }}>
                            <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className="team-rank" style={{ color: '#666', fontSize: '0.8rem', width: '20px' }}>{index + 1}</span>
                                <img className="team-logo" src={team.logo} style={{ width: 30, height: 30, borderRadius: '50%' }} />
                                <span className="team-name" style={{ fontWeight: 'bold', fontSize: '1rem' }}>{team.name}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>{team.played}</td>
                            <td style={{ textAlign: 'center' }}>{team.won}</td>
                            <td style={{ textAlign: 'center' }}>{team.drawn}</td>
                            <td style={{ textAlign: 'center' }}>{team.lost}</td>
                            <td style={{ textAlign: 'center', color: team.gd > 0 ? '#4ade80' : team.gd < 0 ? '#ef4444' : '#888', fontWeight: 'bold' }}>
                                {team.gd > 0 ? '+' : ''}{team.gd}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--neon-gold)' }}>{team.pts}</td>
                            <td className="desktop-only" style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                                    {team.form.map((res, i) => (
                                        <div key={i} style={{
                                            width: '8px', height: '8px', borderRadius: '50%',
                                            background: res === 'W' ? '#4ade80' : res === 'D' ? '#fbbf24' : '#ef4444'
                                        }} title={res === 'W' ? 'Won' : res === 'D' ? 'Draw' : 'Lost'}></div>
                                    ))}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
