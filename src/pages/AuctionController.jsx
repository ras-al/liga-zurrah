import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

export default function AuctionController() {
    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [currentAuction, setCurrentAuction] = useState(null);

    // 1. Listen to Real-time Auction Data
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'auction', 'live'), (doc) => {
            setCurrentAuction(doc.data());
        });
        return () => unsub();
    }, []);

    // 2. Load Players and Teams
    const loadData = async () => {
        const pSnap = await getDocs(collection(db, 'registrations'));
        setPlayers(pSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            .filter(p => p.role === 'Player' && p.status === 'approved'));
        // Only approved players appear

        const tSnap = await getDocs(collection(db, 'teams'));
        setTeams(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    useEffect(() => { loadData(); }, []);

    // 3. ACTIONS
    const selectPlayer = async (player) => {
        await setDoc(doc(db, 'auction', 'live'), {
            ...player,
            currentBid: player.basePrice || 500,
            bidderTeam: 'None',
            status: 'live'
        });
    };

    const increaseBid = async (amount) => {
        if (!currentAuction) return;
        await updateDoc(doc(db, 'auction', 'live'), {
            currentBid: Number(currentAuction.currentBid) + amount
        });
    };

    const assignBidder = async (teamName) => {
        if (!currentAuction) return;
        await updateDoc(doc(db, 'auction', 'live'), {
            bidderTeam: teamName
        });
    };

    const markSold = async () => {
        if (!currentAuction || currentAuction.bidderTeam === 'None') return alert("No bidder assigned!");

        // 1. Find Winning Team
        const winningTeam = teams.find(t => t.name === currentAuction.bidderTeam);
        if (winningTeam.wallet < currentAuction.currentBid) return alert("Team has insufficient funds!");

        // 2. Update Auction Status to SHOW SOLD
        await updateDoc(doc(db, 'auction', 'live'), { status: 'sold' });

        // 3. Deduct Wallet & Save to DB
        await updateDoc(doc(db, 'teams', winningTeam.id), {
            wallet: winningTeam.wallet - currentAuction.currentBid
        });

        // 4. Update Player Status
        await updateDoc(doc(db, 'registrations', currentAuction.id), {
            status: 'sold',
            teamId: winningTeam.id,
            soldPrice: currentAuction.currentBid
        });

        loadData(); // Refresh lists
    };

    const markUnsold = async () => {
        if (!currentAuction) return;
        await updateDoc(doc(db, 'auction', 'live'), { status: 'unsold' });
        // Optionally update player status to 'unsold' in registrations if needed
    };

    return (
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', height: '100vh', overflow: 'hidden' }}>

            {/* LEFT: Player Pool */}
            <div style={{ background: '#222', padding: '10px', overflowY: 'auto' }}>
                <h3>Player Pool ({players.filter(p => p.status !== 'sold').length})</h3>
                {players.filter(p => p.status !== 'sold').map(p => (
                    <div key={p.id} onClick={() => selectPlayer(p)}
                        style={{
                            padding: '10px', borderBottom: '1px solid #444',
                            background: currentAuction?.id === p.id ? 'var(--neon-red)' : 'transparent',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px'
                        }}>
                        <img src={p.photo} style={{ width: 30, height: 30, borderRadius: '50%' }} />
                        <div>
                            <strong>{p.name}</strong> <br />
                            <small>{p.position}</small>
                        </div>
                    </div>
                ))}
            </div>

            {/* RIGHT: Controls */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <div className="glass-panel" style={{ textAlign: 'center', marginBottom: '20px' }}>
                    {currentAuction ? (
                        <>
                            <h2>{currentAuction.name}</h2>
                            <h1 style={{ fontSize: '3rem', color: 'var(--neon-gold)' }}>₹{currentAuction.currentBid}</h1>
                            <h3>Bidder: {currentAuction.bidderTeam}</h3>
                        </>
                    ) : <h2>Select a Player to Start</h2>}
                </div>

                {/* Bid Controls */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                    <button className="btn" onClick={() => increaseBid(100)}>+100</button>
                    <button className="btn" onClick={() => increaseBid(500)}>+500</button>
                </div>

                {/* Team Assignment */}
                <h3>Assign Highest Bidder</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {teams.map(t => (
                        <button key={t.id}
                            onClick={() => assignBidder(t.name)}
                            style={{
                                padding: '10px',
                                border: currentAuction?.bidderTeam === t.name ? '2px solid lime' : '1px solid #555',
                                background: '#333', color: '#fff', cursor: 'pointer'
                            }}>
                            {t.name} (₹{t.wallet})
                        </button>
                    ))}
                </div>

                {/* Final Actions */}
                <div style={{ display: 'flex', gap: '20px' }}>
                    <button className="btn" style={{ background: 'red', flex: 1 }} onClick={markSold}>SOLD</button>
                    <button className="btn" style={{ background: '#555', flex: 1 }} onClick={markUnsold}>UNSOLD</button>
                </div>
            </div>
        </div>
    );
}