import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, updateDoc, onSnapshot, writeBatch } from 'firebase/firestore';

// ... (in AuctionController)

const selectPlayer = async (player) => {
    if (currentAuction?.status === 'live') {
        if (!confirm("Auction in progress! Switch player?")) return;
    }

    await setDoc(doc(db, 'auction', 'live'), {
        ...player,
        currentBid: player.basePrice || 500,
        bidderTeam: 'None',
        status: 'live',
        bidHistory: [] // Initialize history
    });
};

const increaseBid = async (amount) => {
    if (!currentAuction || currentAuction.status !== 'live') return;

    const previousBid = Number(currentAuction.currentBid);
    const newBid = previousBid + amount;

    // Push current bid to history before updating
    const newHistory = [...(currentAuction.bidHistory || []), previousBid];

    await updateDoc(doc(db, 'auction', 'live'), {
        currentBid: newBid,
        bidHistory: newHistory
    });
};

const undoBid = async () => {
    if (!currentAuction || !currentAuction.bidHistory || currentAuction.bidHistory.length === 0) return;

    const history = [...currentAuction.bidHistory];
    const previousBid = history.pop(); // Get last bid

    await updateDoc(doc(db, 'auction', 'live'), {
        currentBid: previousBid,
        bidHistory: history
    });
};

const setCustomBid = async () => {
    if (!currentAuction || !customPrice) return;
    const val = Number(customPrice);
    if (isNaN(val) || val <= 0) return alert("Invalid amount");

    const previousBid = Number(currentAuction.currentBid);
    const newHistory = [...(currentAuction.bidHistory || []), previousBid];

    await updateDoc(doc(db, 'auction', 'live'), {
        currentBid: val,
        bidHistory: newHistory
    });
    setCustomPrice('');
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

    const currentBidVal = Number(currentAuction.currentBid);
    const teamWalletVal = Number(winningTeam.wallet);

    if (teamWalletVal < currentBidVal) {
        return alert(`Insufficient Funds! Team only has ₹${teamWalletVal}`);
    }

    // --- ATOMIC BATCH WRITE START ---
    const batch = writeBatch(db);

    // A. Update Auction Status
    const auctionRef = doc(db, 'auction', 'live');
    batch.update(auctionRef, { status: 'sold' });

    // B. Deduct Wallet
    const newWallet = teamWalletVal - currentBidVal;
    const teamRef = doc(db, 'teams', winningTeam.id);
    batch.update(teamRef, { wallet: newWallet });

    // C. Update Player Status
    const playerRef = doc(db, 'registrations', currentAuction.id);
    batch.update(playerRef, {
        status: 'sold',
        teamId: winningTeam.id,
        soldPrice: currentBidVal
    });

    try {
        await batch.commit();
        // --- ATOMIC BATCH WRITE END ---

        // 5. Update Local State Immediately (Optimistic UI)
        setPlayers(prev => prev.filter(p => p.id !== currentAuction.id));
        setTeams(prev => prev.map(t => t.id === winningTeam.id ? { ...t, wallet: newWallet } : t).sort((a, b) => b.wallet - a.wallet));

        // 6. Reset Screen after delay
        setTimeout(async () => {
            await setDoc(doc(db, 'auction', 'live'), { status: 'waiting', currentPlayer: null });
        }, 3000);

    } catch (error) {
        console.error("Batch failed!", error);
        alert("Transaction failed! Data not saved.");
    }
};
import './AuctionController.css';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuctionController() {
    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [currentAuction, setCurrentAuction] = useState(null);

    // New Features State
    const [searchTerm, setSearchTerm] = useState('');
    const [customPrice, setCustomPrice] = useState('');

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
            // Include 'unsold' so they can be re-auctioned
            .filter(p => p.role === 'Player' && (p.status === 'approved' || p.status === 'unsold'))
            .sort((a, b) => a.name.localeCompare(b.name)));

        const tSnap = await getDocs(collection(db, 'teams'));
        // Sort Teams by Wallet (Highest First)
        setTeams(tSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => b.wallet - a.wallet));
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

        // Save previous bid for Undo
        const previousBid = Number(currentAuction.currentBid);
        const newBid = previousBid + amount;

        await updateDoc(doc(db, 'auction', 'live'), {
            currentBid: newBid,
            lastBid: previousBid // Store previous state
        });
    };

    const undoBid = async () => {
        if (!currentAuction || !currentAuction.lastBid) return;
        await updateDoc(doc(db, 'auction', 'live'), {
            currentBid: currentAuction.lastBid,
            lastBid: null // Clear history after undo (single step undo)
        });
    };

    const setCustomBid = async () => {
        if (!currentAuction || !customPrice) return;
        const val = Number(customPrice);
        if (isNaN(val) || val <= 0) return alert("Invalid amount");

        const previousBid = Number(currentAuction.currentBid);

        await updateDoc(doc(db, 'auction', 'live'), {
            currentBid: val,
            lastBid: previousBid
        });
        setCustomPrice('');
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

        const currentBidVal = Number(currentAuction.currentBid);
        const teamWalletVal = Number(winningTeam.wallet);

        if (teamWalletVal < currentBidVal) {
            return alert(`Insufficient Funds! Team only has ₹${teamWalletVal}`);
        }

        // 2. Update Auction Status to SHOW SOLD
        await updateDoc(doc(db, 'auction', 'live'), { status: 'sold' });

        // 3. Deduct Wallet & Save to DB
        const newWallet = teamWalletVal - currentBidVal;
        await updateDoc(doc(db, 'teams', winningTeam.id), {
            wallet: newWallet
        });

        // 4. Update Player Status
        await updateDoc(doc(db, 'registrations', currentAuction.id), {
            status: 'sold',
            teamId: winningTeam.id,
            soldPrice: currentBidVal
        });

        // 5. Update Local State Immediately
        setPlayers(prev => prev.filter(p => p.id !== currentAuction.id));
        setTeams(prev => prev.map(t => t.id === winningTeam.id ? { ...t, wallet: newWallet } : t).sort((a, b) => b.wallet - a.wallet));

        // 6. Reset Screen after delay
        setTimeout(async () => {
            await setDoc(doc(db, 'auction', 'live'), { status: 'waiting', currentPlayer: null });
        }, 3000);
    };

    const markUnsold = async () => {
        if (!currentAuction) return;

        // 1. Show Unsold Status
        await updateDoc(doc(db, 'auction', 'live'), { status: 'unsold' });

        // 2. Update Player Status DB
        await updateDoc(doc(db, 'registrations', currentAuction.id), { status: 'unsold' });

        // 3. Update Local State
        setPlayers(prev => prev.map(p => p.id === currentAuction.id ? { ...p, status: 'unsold' } : p));

        // 4. Clear Screen after delay
        setTimeout(async () => {
            await setDoc(doc(db, 'auction', 'live'), { status: 'waiting', currentPlayer: null });
        }, 2000); // 2s delay
    };

    return (
        <div className="auction-container">
            {/* LEFT: Player Pool */}
            <div className="player-pool-panel">
                <div className="panel-header">
                    PLAYER POOL ({players.filter(p => p.status !== 'sold').length})
                </div>
                {/* Search Input */}
                <input
                    type="text"
                    placeholder="Search player..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '90%', margin: '10px auto', display: 'block',
                        padding: '8px', background: '#333', border: '1px solid #555',
                        color: 'white', borderRadius: '4px'
                    }}
                />

                <div className="player-list">
                    {players
                        .filter(p => p.status !== 'sold')
                        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(p => (
                            <div key={p.id}
                                className={`pool-item ${currentAuction?.id === p.id ? 'active' : ''}`}
                                onClick={() => selectPlayer(p)}
                                style={{ opacity: p.status === 'unsold' ? 0.6 : 1, border: p.status === 'unsold' ? '1px dashed #f87171' : '' }}
                            >
                                <img src={p.photo} className="pool-avatar" alt="p" />
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>
                                        {p.position} {p.status === 'unsold' && <span style={{ color: '#f87171', fontWeight: 'bold' }}>(UNSOLD)</span>}
                                    </div>
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

                                {/* Custom Bid Input */}
                                <div style={{ display: 'flex', gap: '5px', gridColumn: 'span 3' }}>
                                    <input
                                        type="number"
                                        placeholder="Custom Amount"
                                        value={customPrice}
                                        onChange={(e) => setCustomPrice(e.target.value)}
                                        style={{ flex: 1, padding: '5px', background: '#222', border: '1px solid #444', color: 'white' }}
                                    />
                                    <button className="control-btn" style={{ fontSize: '0.8rem', width: 'auto' }} onClick={setCustomBid}>SET</button>
                                </div>

                                <button className="control-btn" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={undoBid}>↩ UNDO</button>
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

                {/* SQUAD REVEAL CONTROLS */}
                {/* SQUAD REVEAL CONTROLS */}
                <div style={{ marginTop: '20px', borderTop: '2px solid #333', paddingTop: '15px' }}>
                    <h3 style={{ fontSize: '1rem', color: '#888', marginBottom: '10px', letterSpacing: '2px' }}>SQUAD REVEAL</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {teams.map(team => (
                            <button
                                key={team.id}
                                className="control-btn"
                                style={{
                                    background: '#222',
                                    fontSize: '0.85rem',
                                    padding: '8px 12px',
                                    border: '1px solid #444',
                                    flex: '1 0 45%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '5px'
                                }}
                                onClick={async () => {
                                    if (!confirm(`Show reveal for ${team.name}?`)) return;
                                    await setDoc(doc(db, 'auction', 'live'), {
                                        status: 'reveal',
                                        viewTeamId: team.id,
                                        viewTeamName: team.name,
                                        viewTeamLogo: team.logo, // Pass Logo
                                        viewTeamWallet: team.wallet
                                    });
                                }}
                            >
                                {team.logo && <img src={team.logo} style={{ width: 20, height: 20, borderRadius: '50%' }} />}
                                SHOW {team.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}