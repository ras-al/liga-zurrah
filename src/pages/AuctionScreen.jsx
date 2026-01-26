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

            {/* Left Sidebar: Team Wallets */}
            <div className="auction-sidebar">
                <h3 style={{ borderBottom: '1px solid var(--neon-red)', paddingBottom: '10px' }}>AVAILABLE TEAMS</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                    {teams.map(t => (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                            <span style={{ color: '#ccc' }}>{t.name}</span>
                            <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold' }}>₹{t.wallet}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Middle: Player Image */}
            <div className="auction-main">
                <motion.img
                    key={data.photo}
                    initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    src={data.photo}
                    className="auction-player-img"
                />
                <h1 className="auction-player-name">{data.name}</h1>
                <h2 className="auction-player-details">{data.position} | {data.age} yrs | {data.style}</h2>
            </div>

            {/* Right: Bidding Stats */}
            <div className="auction-stats-panel">
                <div className="auction-stat-card base-price">
                    <h3>BASE PRICE</h3>
                    <div className="stat-value">₹{data.basePrice}</div>
                </div>

                <div className="auction-stat-card current-bid">
                    <h3>CURRENT BID</h3>
                    <motion.div
                        key={data.currentBid}
                        initial={{ scale: 1.5 }} animate={{ scale: 1 }}
                        className="bid-value"
                    >
                        ₹{data.currentBid}
                    </motion.div>
                </div>

                <div className="auction-stat-card highest-bidder">
                    <h3>HIGHEST BIDDER</h3>
                    <div className="bidder-name">{data.bidderTeam}</div>
                </div>

                {/* SOLD STAMP */}
                <AnimatePresence>
                    {(data.status === 'sold' || data.status === 'unsold') && (
                        <motion.div
                            initial={{ scale: 5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1, rotate: -15 }}
                            className={`auction-stamp ${data.status}`}
                        >
                            {data.status}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}