import React from 'react';

// Ajustar base URL según tu entorno (o usar variable de entorno)
const BASE_URL = 'http://localhost:3000/';

const TeamAvatar = ({ foto1, foto2, iniciales1, iniciales2, size = 30 }) => {
    const getUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${BASE_URL}${path}`;
    };

    const img1 = getUrl(foto1);
    const img2 = getUrl(foto2);

    const renderPlaceholder = (initials) => (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: `${size * 0.4}px`,
            fontWeight: 'bold',
            backgroundColor: '#555'
        }}>
            {initials || '?'}
        </div>
    );

    return (
        <div style={{ position: 'relative', width: size + 16, height: size, marginRight: '8px' }}>
            {/* Foto Jugador 1 */}
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '2px solid #222',
                    backgroundColor: '#444',
                    zIndex: 2
                }}
            >
                {img1 ? (
                    <img src={img1} alt="J1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : renderPlaceholder(iniciales1)}
            </div>

            {/* Foto Jugador 2 (solapada) */}
            <div
                style={{
                    position: 'absolute',
                    left: 14,
                    top: 0,
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '2px solid #222',
                    backgroundColor: '#444',
                    zIndex: 1
                }}
            >
                {img2 ? (
                    <img src={img2} alt="J2" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : renderPlaceholder(iniciales2)}
            </div>
        </div>
    );
};

export default TeamAvatar;
