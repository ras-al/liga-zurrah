import { motion } from 'framer-motion';

export default function Loading() {
    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'var(--bg-dark)',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 9999
        }}>
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                    rotate: [0, 180, 360]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{
                    width: '80px',
                    height: '80px',
                    border: '5px solid var(--neon-red)',
                    borderTopColor: 'transparent',
                    borderRadius: '50%'
                }}
            />
            <h2 style={{ marginLeft: '20px', letterSpacing: '5px' }}>LOADING...</h2>
        </div>
    );
}