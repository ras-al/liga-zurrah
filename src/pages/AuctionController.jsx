import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import './AuctionController.css';
import { motion, AnimatePresence } from 'framer-motion';

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
            .filter(p => p.role === 'Player' && p.status === 'approved')
            .sort((a, b) => a.name.localeCompare(b.name)));

        const tSnap = await getDocs(collection(db, 'teams'));
        setTeams(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    useEffect(() => { loadData(); }, []);

    // 3. ACTIONS
    const selectPlayer = async (player) => {
        if (currentAuction?.status === 'live') {
            if (!confirm("Auction in progress! Switch player?")) return;
        }

        await setDoc(doc(db, 'auction', 'live'), {
            ...player,
            currentBid: player.basePrice || 500,
            bidderTeam: 'None',
            status: 'live'
        });
    };

    const increaseBid = async (amount) => {
        if (!currentAuction || currentAuction.status !== 'live') return;
        await updateDoc(doc(db, 'auction', 'live'), {
            currentBid: Number(currentAuction.currentBid) + amount
        });
    };

    const assignBidder = async (teamName) => {
        if (!currentAuction || currentAuction.status !== 'live') return;
        await updateDoc(doc(db, 'auction', 'live'), {
            bidderTeam: teamName
        });
    };

    const markSold = async () => {
        if (!currentAuction || currentAuction.bidderTeam === 'None') return alert("No bidder assigned!");

        // 1. Find Winning Team
        const winningTeam = teams.find(t => t.name === currentAuction.bidderTeam);
        if (!winningTeam) return alert("Winning team not found!");

        if (winningTeam.wallet < currentAuction.currentBid) {
            return alert(`Insufficient Funds! Team only has ₹${winningTeam.wallet}`);
        }

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

        setTimeout(() => {
            loadData(); // Refresh lists after short delay
        }, 1000);
    };

    const markUnsold = async () => {
        if (!currentAuction) return;
        await updateDoc(doc(db, 'auction', 'live'), { status: 'unsold' });
    };

    return (
        <div className="auction-container">
            {/* LEFT: Player Pool */}
            <div className="player-pool-panel">
                <div className="panel-header">PLAYER POOL ({players.filter(p => p.status !== 'sold').length})</div>
                <div className="player-list">
                    {players.filter(p => p.status !== 'sold').map(p => (
                        <div key={p.id}
                            className={`pool-item ${currentAuction?.id === p.id ? 'active' : ''}`}
                            onClick={() => selectPlayer(p)}
                        >
                            <img src={p.photo} className="pool-avatar" alt="p" />
                            <div>
                                <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                                <div style={{ fontSize: '0.8rem', color: '#888' }}>{p.position}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CENTER: Arena */}
            <div className="arena-panel">
                {currentAuction ? (
                    <>
                        <motion.img
                            key={currentAuction.photo}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            src={currentAuction.photo}
                            className="main-avatar"
                        />
                        <h1 className="player-name">{currentAuction.name}</h1>
                        <div className="player-role">{currentAuction.position} • {currentAuction.class}</div>

                        <div className="bid-display">
                            <span className="current-price">₹{currentAuction.currentBid}</span>
                            <span className="bidder-name">
                                {currentAuction.bidderTeam === 'None' ? 'NO BIDDER' : currentAuction.bidderTeam}
                            </span>
                        </div>

                        {currentAuction.status === 'live' && (
                            <div className="controls-grid">
                                <button className="control-btn" onClick={() => increaseBid(100)}>+100</button>
                                <button className="control-btn" onClick={() => increaseBid(200)}>+200</button>
                                <button className="control-btn" onClick={() => increaseBid(500)}>+500</button>
                                <button className="control-btn" style={{ borderColor: '#555', color: '#888' }} onClick={markUnsold}>UNSOLD</button>
                                <button className="control-btn sold" onClick={markSold}>✓ SOLD TO {currentAuction.bidderTeam}</button>
                            </div>
                        )}

                        {currentAuction.status === 'sold' && (
                            <div className="sold-stamp">SOLD</div>
                        )}
                        {currentAuction.status === 'unsold' && (
                            <div className="sold-stamp" style={{ color: '#fff', borderColor: '#fff' }}>UNSOLD</div>
                        )}
                    </>
                ) : (
                    <div className="empty-state">
                        <h1>WAITING FOR PICK</h1>
                        <p>SELECT A PLAYER FROM THE POOL TO BEGIN</p>
                    </div>
                )}
            </div>

            {/* RIGHT: Teams */}
            <div className="teams-panel">
                <div className="panel-header" style={{ borderBottomColor: 'var(--neon-gold)' }}>TEAMS & WALLETS</div>
                <div className="player-list">
                    {teams.map(t => (
                        <div key={t.id}
                            className={`team-card ${currentAuction?.bidderTeam === t.name ? 'winning' : ''}`}
                            onClick={() => assignBidder(t.name)}
                        >
                            <div className="team-name">{t.name}</div>
                            <div className="team-wallet">₹{t.wallet}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}