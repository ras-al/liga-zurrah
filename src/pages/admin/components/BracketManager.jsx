import KnockoutBracket from '../../../components/tournament/KnockoutBracket';

export default function BracketManager() {
    return (
        <div style={{ color: 'white', padding: '20px' }}>
            <h2 style={{ textAlign: 'center', color: 'var(--neon-gold)', fontFamily: 'Anton', marginBottom: '30px' }}>TOURNAMENT BRACKET</h2>
            <KnockoutBracket isAdmin={true} />
        </div>
    );
}
