import { useState, useEffect } from 'react';

export default function Countdown() {
    const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        // Set Tournament Date (Example: 7 days from now)
        const target = new Date();
        target.setDate(target.getDate() + 7);

        const interval = setInterval(() => {
            const now = new Date();
            const diff = target - now;

            if (diff > 0) {
                setTime({
                    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((diff / 1000 / 60) % 60),
                    seconds: Math.floor((diff / 1000) % 60),
                });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const Box = ({ val, label }) => (
        <div style={{ textAlign: 'center', margin: '0 10px' }}>
            <div style={{
                fontSize: '3rem', fontFamily: 'Anton',
                background: 'rgba(255,255,255,0.1)', padding: '10px 20px',
                borderRadius: '5px', border: '1px solid #333'
            }}>
                {val < 10 ? `0${val}` : val}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>{label}</div>
        </div>
    );

    return (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '40px 0' }}>
            <Box val={time.days} label="DAYS" />
            <Box val={time.hours} label="HRS" />
            <Box val={time.minutes} label="MINS" />
            <Box val={time.seconds} label="SECS" />
        </div>
    );
}