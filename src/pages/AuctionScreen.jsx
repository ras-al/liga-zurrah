import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import './AuctionScreen.css';

export default function AuctionScreen() {
    const [data, setData] = useState(null);
    const [teams, setTeams] = useState([]);
    const [squad, setSquad] = useState([]);

    const [squadLoading, setSquadLoading] = useState(false);

    useEffect(() => {
        // Listen to Auction State
        const unsubAuction = onSnapshot(doc(db, 'auction', 'live'), async (docSnap) => {
            const auctionData = docSnap.data();
            setData(auctionData);

            // ⚡ IF MODE IS 'REVEAL', FETCH THAT TEAM'S PLAYERS
            if (auctionData?.status === 'reveal' && auctionData?.viewTeamId) {
                setSquadLoading(true);
                setSquad([]); // Clear previous squad

                try {
                    console.log("Fetching squad for Team ID:", auctionData.viewTeamId);

                    // ⚡ OPTIMIZED QUERY (Requires Composite Index: teamId ASC + status ASC)
                    // If this fails with "needs an index", click the link in the console to create it.
                    const q = query(
                        collection(db, 'registrations'),
                        where('teamId', '==', auctionData.viewTeamId),
                        where('status', '==', 'sold')
                    );
                    const pSnap = await getDocs(q);

                    const teamSquad = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    console.log("Players matching Team ID:", teamSquad.length);

                    setSquad(teamSquad);
                } catch (error) {
                    console.error("Error fetching squad (Check if Index exists!):", error);
                }
                setSquadLoading(false);
            }
        });

        // Listen to Team Wallets
        const unsubTeams = onSnapshot(collection(db, 'teams'), (snap) => {
            // Sort by money left (descending) as requested
            setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.wallet - a.wallet));
        });

        return () => { unsubAuction(); unsubTeams(); };
    }, []);

    if (!data) return <div className="flex-center" style={{ height: '100vh' }}><h1>WAITING FOR AUCTION...</h1></div>;

    // RENDER: SQUAD REVEAL MODE (The New Feature)
    if (data.status === 'reveal') {
        return (
            <div className="reveal-container">
                {/* Team Title Animation */}
                <motion.h1
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 100 }}
                    className="reveal-title"
                    style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'center' }}
                >
                    {data.viewTeamLogo && <img src={(data.viewTeamLogo || '').replace('via.placeholder.com', 'placehold.co')} style={{ width: 80, height: 80, borderRadius: '10px', objectFit: 'cover' }} />}
                    {data.viewTeamName}
                </motion.h1>

                <div className="reveal-stats">
                    SQUAD SIZE: {squad.length} | REMAINING PURSE: ₹{data.viewTeamWallet}
                </div>

                {/* Players Grid or Loading */}
                {squadLoading ? (
                    <div style={{ fontSize: '2rem', color: '#666', marginTop: '50px', textAlign: 'center' }}>
                        LOADING SQUAD...
                    </div>
                ) : (
                    <div className="squad-grid">
                        {squad.map((player) => (
                            <motion.div
                                key={player.id || player.name}
                                className="mini-card"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <img src={player.photo || 'https://placehold.co/200'} alt={player.name} onError={(e) => e.target.style.display = 'none'} />
                                <div className="mini-info">
                                    <h4>{player.name}</h4>
                                    <div style={{ fontSize: '0.9rem', color: '#bbb', marginBottom: '4px', fontFamily: 'Rajdhani' }}>{player.position}</div>
                                    <p>₹{player.soldPrice}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="auction-layout">
            <div className="broadcast-overlay"></div>
            <div className="live-badge">
                <span className="live-dot"></span> LIVE AUCTION
            </div>


            {/* Left Sidebar: Bidding Stats */}
            <div className="auction-stats-panel">
                <div className="auction-stat-card base-price">
                    <h3>BASE PRICE</h3>
                    <div className="stat-value">₹{data.basePrice || 0}</div>
                </div>

                <div className="auction-stat-card current-bid">
                    <h3>CURRENT BID</h3>
                    <motion.div
                        key={data.currentBid}
                        initial={{ scale: 1.3, color: '#fff' }}
                        animate={{ scale: 1, color: '#fbbf24' }}
                        className="bid-value"
                    >
                        ₹{data.currentBid || 0}
                    </motion.div>
                </div>

                <div className="auction-stat-card highest-bidder">
                    <h3>HIGHEST BIDDER</h3>
                    <div className="bidder-name" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        {/* Find logo from teams array */}
                        {teams.find(t => t.name === data.bidderTeam)?.logo &&
                            <img src={(teams.find(t => t.name === data.bidderTeam).logo || '').replace('via.placeholder.com', 'placehold.co')} style={{ width: 60, height: 60, borderRadius: '50%', border: '2px solid gold' }} />
                        }
                        {data.bidderTeam || 'NO BIDS'}
                    </div>
                </div>
            </div>

            {/* Middle: Star Player Stage */}
            <div className="auction-main">
                {data.photo && (
                    <motion.img
                        key={data.photo}
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 50 }}
                        src={data.photo}
                        className="auction-player-img"
                    />
                )}
                <h1 className="auction-player-name">{data.name}</h1>
                <h2 className="auction-player-details">{data.position} • {data.age} YRS • {data.style}</h2>

                {/* SOLD/UNSOLD STAMP */}
                <AnimatePresence>
                    {(data.status === 'sold' || data.status === 'unsold') && (
                        <motion.div
                            initial={{ scale: 3, opacity: 0, rotate: -45 }}
                            animate={{ scale: 1, opacity: 1, rotate: -15 }}
                            className={`auction-stamp ${data.status}`}
                        >
                            {data.status}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Right: Team Leaderboard */}
            <div className="auction-sidebar">
                <h3>TEAM WALLETS</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {teams.map(t => (
                        <div
                            key={t.id}
                            className={`team-list-item ${t.name === data.bidderTeam ? 'active-bidder' : ''}`}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <img src={(t.logo || '').replace('via.placeholder.com', 'placehold.co') || 'https://placehold.co/40'} style={{ width: 40, height: 40, borderRadius: '8px', objectFit: 'cover' }} />
                                <span className="team-name">{t.name}</span>
                            </div>
                            <span className="team-wallet">₹{t.wallet}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Broadcast Footer Ticker */}
            <div className="next-player-preview">
                <div className="ticker-wrap">
                    <div className="ticker-content">
                        LIGA ZURRHA 2026 LIVE AUCTION • HIGHEST BIDDER: {data.bidderTeam} (₹{data.currentBid}) • WAITING LIST: {teams.length} TEAMS ACTIVE •
                        LIGA ZURRHA 2026 LIVE AUCTION • HIGHEST BIDDER: {data.bidderTeam} (₹{data.currentBid}) • WAITING LIST: {teams.length} TEAMS ACTIVE •
                    </div>
                </div>
            </div>
        </div>
    );
}