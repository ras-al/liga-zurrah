export default function SkeletonRow() {
    return (
        <tr className="animate-pulse">
            <td><div style={{ width: 40, height: 40, background: '#333', borderRadius: '50%' }}></div></td>
            <td><div style={{ width: 150, height: 20, background: '#333', borderRadius: 4 }}></div></td>
            <td><div style={{ width: 100, height: 20, background: '#333', borderRadius: 4 }}></div></td>
            <td><div style={{ width: 60, height: 20, background: '#333', borderRadius: 4 }}></div></td>
            <td><div style={{ width: 120, height: 20, background: '#333', borderRadius: 4 }}></div></td>
            <td><div style={{ width: 80, height: 20, background: '#333', borderRadius: 4 }}></div></td>
            <td><div style={{ width: 60, height: 20, background: '#333', borderRadius: 4 }}></div></td>
        </tr>
    );
}
