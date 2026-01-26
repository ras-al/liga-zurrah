import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

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
        <div style={{ height: '100vh', display: 'flex', background: 'radial-gradient(circle, #2a2a2a 0%, #000 100%)' }}>

            {/* Left Sidebar: Team Wallets */}
            <div style={{ width: '300px', background: 'rgba(0,0,0,0.5)', borderRight: '1px solid #333', padding: '20px' }}>
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
            <div style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <motion.img
                    key={data.photo}
                    initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    src={data.photo}
                    style={{ maxHeight: '60vh', borderRadius: '20px', border: '5px solid var(--primary)', boxShadow: '0 0 50px rgba(255,0,51,0.3)' }}
                />
                <h1 style={{ fontSize: '4rem', marginTop: '20px', textAlign: 'center' }}>{data.name}</h1>
                <h2 style={{ color: '#888' }}>{data.position} | {data.age} yrs | {data.style}</h2>
            </div>

            {/* Right: Bidding Stats */}
            <div style={{ width: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px', position: 'relative', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '30px', borderRadius: '15px', marginBottom: '20px' }}>
                    <h3>BASE PRICE</h3>
                    <div style={{ fontSize: '3rem', color: '#fff' }}>₹{data.basePrice}</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '30px', borderRadius: '15px', marginBottom: '20px', border: '2px solid var(--neon-gold)' }}>
                    <h3>CURRENT BID</h3>
                    <motion.div
                        key={data.currentBid}
                        initial={{ scale: 1.5 }} animate={{ scale: 1 }}
                        style={{ fontSize: '5rem', color: 'var(--neon-gold)', fontWeight: 'bold' }}
                    >
                        ₹{data.currentBid}
                    </motion.div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '30px', borderRadius: '15px' }}>
                    <h3>HIGHEST BIDDER</h3>
                    <div style={{ fontSize: '2.5rem', color: 'var(--primary)' }}>{data.bidderTeam}</div>
                </div>

                {/* SOLD STAMP */}
                <AnimatePresence>
                    {(data.status === 'sold' || data.status === 'unsold') && (
                        <motion.div
                            initial={{ scale: 5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1, rotate: -15 }}
                            style={{
                                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                border: data.status === 'sold' ? '10px solid red' : '10px solid gray',
                                color: data.status === 'sold' ? 'red' : 'gray',
                                fontSize: '8rem', fontWeight: 'bold', padding: '20px',
                                background: 'rgba(0,0,0,0.9)', textTransform: 'uppercase', fontFamily: 'Anton', zIndex: 100
                            }}
                        >
                            {data.status}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}