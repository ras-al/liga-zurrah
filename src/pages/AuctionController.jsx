import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, updateDoc, onSnapshot, writeBatch } from 'firebase/firestore';

const selectPlayer = async (player) => {
    if (currentAuction?.status === 'live') {
        if (!confirm("Auction in progress! Switch player?")) return;
    }

    await setDoc(doc(db, 'auction', 'live'), {
        ...player,
        currentBid: player.basePrice || 500,
        bidderTeam: 'None',
        status: 'live',
        bidHistory: []
    });
};

const increaseBid = async (amount) => {
    if (!currentAuction || currentAuction.status !== 'live') return;

    const previousBid = Number(currentAuction.currentBid);
    const newBid = previousBid + amount;
    const newHistory = [...(currentAuction.bidHistory || []), previousBid];

    await updateDoc(doc(db, 'auction', 'live'), {
        currentBid: newBid,
        bidHistory: newHistory
    });
};

const undoBid = async () => {
    if (!currentAuction || !currentAuction.bidHistory || currentAuction.bidHistory.length === 0) return;

    const history = [...currentAuction.bidHistory];
    const previousBid = history.pop();

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


    // State for Tabs
    const [activeTab, setActiveTab] = useState('Marquee'); // Marquee, GK, Super, Other
    const [activeSubTab, setActiveSubTab] = useState('All'); // All, Forward, Defender

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

        // DYNAMIC BASE PRICE RULE (Enforce here as fail-safe)
        let startPrice = 30;
        if (player.isMarquee) startPrice = 100;
        else if (player.isSuper) startPrice = 50;

        await setDoc(doc(db, 'auction', 'live'), {
            ...player,
            currentBid: startPrice,
            basePrice: startPrice,
            bidderTeam: 'None',
            status: 'live'
        });
    };

    const launchIntro = async () => {
        await setDoc(doc(db, 'auction', 'live'), {
            status: 'intro',
            group: activeTab, // Tell the screen which group to show
            subGroup: activeSubTab !== 'All' ? activeSubTab : null, // Pass sub-filter if active
            introTimestamp: Date.now()
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

    // Helper to get increments based on current player
    const getIncrements = () => {
        if (!currentAuction) return [10, 50];
        if (currentAuction.isMarquee) return [20, 50];
        return [10, 50]; // Super and Others share same increments
    };
    const [inc1, inc2] = getIncrements(); // Usage in render below

    // FILTER LOGIC
    const getFilteredPlayers = () => {
        // FIX: Globally exclude Managers
        let filtered = players.filter(p => p.status !== 'sold' && p.role === 'Player');

        // Hierarchy Filtering
        if (activeTab === 'Marquee') {
            filtered = filtered.filter(p => p.isMarquee);
        } else if (activeTab === 'Goalkeeper') {
            // FIX: Goalkeepers are Players with position 'Goalkeeper'
            filtered = filtered.filter(p => p.role === 'Player' && p.position && p.position.includes('Goalkeeper') && !p.isMarquee);
        } else if (activeTab === 'Super') {
            // FIX: Exclude Goalkeepers correctly here too
            filtered = filtered.filter(p => p.isSuper && !p.isMarquee && (!p.position || !p.position.includes('Goalkeeper')));
        } else if (activeTab === 'Other') {
            // FIX: Exclude Goalkeepers correctly here too
            filtered = filtered.filter(p => !p.isMarquee && !p.isSuper && (!p.position || !p.position.includes('Goalkeeper')));
        }

        // Sub-Tab Filtering (Position)
        if (activeSubTab !== 'All') {
            filtered = filtered.filter(p => p.position && p.position.includes(activeSubTab));
        }

        // Search
        if (searchTerm) {
            filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        return filtered;
    };

    const displayedPlayers = getFilteredPlayers();

    return (
        <div className="auction-container">
            {/* LEFT: Player Pool */}
            <div className="player-pool-panel">
                <div className="panel-header">
                    PLAYER POOL
                </div>

                {/* TABS GRID */}
                <div className="tabs-grid">
                    {['Marquee', 'Goalkeeper', 'Super', 'Other'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); setActiveSubTab('All'); }}
                            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* SUB TABS */}
                {activeTab !== 'Goalkeeper' && (
                    <div className="sub-tabs-row">
                        {['All', 'Forward', 'Defender'].map(stab => (
                            <button
                                key={stab}
                                onClick={() => setActiveSubTab(stab)}
                                className={`sub-tab-btn ${activeSubTab === stab ? 'active' : ''}`}
                            >
                                {stab}
                            </button>
                        ))}
                    </div>
                )}

                {/* LAUNCH INTRO BUTTON */}
                <button
                    onClick={launchIntro}
                    className="launch-intro-btn"
                >
                    LAUNCH {activeTab.toUpperCase()} INTRO
                </button>

                {/* Search Input */}
                <div className="pool-search-box">
                    <input
                        type="text"
                        placeholder="Search player..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pool-search-input"
                    />
                </div>

                <div className="player-list no-scrollbar">
                    {displayedPlayers.map(p => (
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
                            <div style={{ marginBottom: '10px', color: '#aaa', fontSize: '0.9rem' }}>
                                CURRENT BID: <span style={{ color: '#fff', fontSize: '1.4rem' }}>₹{currentAuction.currentBid}</span>
                            </div>
                            <span className="bidder-name">
                                {currentAuction.bidderTeam === 'None' ? 'NO BIDDER' : currentAuction.bidderTeam}
                            </span>
                        </div>



                        {/* Custom Bid Input */}
                        {currentAuction.status === 'live' && (
                            <div className="controls-container">
                                {/* ROW 1: BID INCREMENTS */}
                                <div className="bid-buttons-row">
                                    <button className="control-btn btn-bid" onClick={() => increaseBid(inc1)}>
                                        +{inc1}
                                    </button>
                                    <button className="control-btn btn-bid" onClick={() => increaseBid(inc2)}>
                                        +{inc2}
                                    </button>
                                </div>

                                {/* ROW 2: ACTIONS */}
                                <div className="action-buttons-row">
                                    <button className="control-btn btn-undo" onClick={undoBid}>
                                        <span style={{ fontSize: '1.5rem', marginRight: '5px' }}>↩</span> UNDO
                                    </button>
                                    <button className="control-btn btn-unsold" onClick={markUnsold}>
                                        UNSOLD
                                    </button>
                                    <button className="control-btn btn-sold" onClick={markSold}>
                                        ✓ SOLD TO {currentAuction.bidderTeam === 'None' ? '...' : currentAuction.bidderTeam}
                                    </button>
                                </div>
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
                <div className="player-list no-scrollbar">
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
        </div >
    );
}