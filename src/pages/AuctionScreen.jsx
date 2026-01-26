import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import './AuctionScreen.css';

export default function AuctionScreen() {
    const [data, setData] = useState(null);
    const [teams, setTeams] = useState([]);

    useEffect(() => {
        // Listen to Auction State
        const unsubAuction = onSnapshot(doc(db, 'auction', 'live'), (doc) => {
            setData(doc.data());
        });

        // Listen to Team Wallets
        const unsubTeams = onSnapshot(collection(db, 'teams'), (snap) => {
            setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubAuction(); unsubTeams(); };
    }, []);

    if (!data) return <div className="flex-center" style={{ height: '100vh' }}><h1>WAITING FOR AUCTION...</h1></div>;

    return (
        <div className="auction-layout">

            {/* Left Sidebar: Bidding Stats */}
            <div className="auction-stats-panel">
                <div className="auction-stat-card base-price">
                    <h3>BASE PRICE</h3>
                    <div className="stat-value">₹{data.basePrice}</div>
                </div>

                <div className="auction-stat-card current-bid">
                    <h3>CURRENT BID</h3>
                    <motion.div
                        key={data.currentBid}
                        initial={{ scale: 1.3, color: '#fff' }}
                        animate={{ scale: 1, color: '#fbbf24' }}
                        className="bid-value"
                    >
                        ₹{data.currentBid}
                    </motion.div>
                </div>

                <div className="auction-stat-card highest-bidder">
                    <h3>HIGHEST BIDDER</h3>
                    <div className="bidder-name">{data.bidderTeam || 'NO BIDS'}</div>
                </div>
            </div>

            {/* Middle: Star Player Stage */}
            <div className="auction-main">
                <motion.img
                    key={data.photo}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 50 }}
                    src={data.photo}
                    className="auction-player-img"
                />
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
                <h3 style={{ borderBottom: '2px solid var(--neon-red)', paddingBottom: '15px' }}>TEAM WALLETS</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                    {teams.map(t => (
                        <div key={t.id} style={{
                            display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem',
                            padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px',
                            border: t.name === data.bidderTeam ? '1px solid var(--neon-gold)' : '1px solid transparent'
                        }}>
                            <span style={{ color: t.name === data.bidderTeam ? 'var(--neon-gold)' : '#ccc' }}>{t.name}</span>
                            <span style={{ color: 'var(--neon-gold)', fontFamily: 'Bebas Neue' }}>₹{t.wallet}</span>
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