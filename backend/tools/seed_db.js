
const API_URL = 'http://127.0.0.1:3000/api';

async function run() {
    try {
        console.log('--- 1. Creando "Liga Amistad 2026" (Realística) ---');
        const tRes = await fetch(`${API_URL}/torneos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre_torneo: `Liga Amistad 2026`,
                fecha_inicio: '2026-09-01', // Martes
                fecha_cierre_inscripcion: '2026-08-30',
                max_equipos: 4,
                formato_categoria: 'categoria_fija',
                categoria_id: 2, // 4ta
                modalidad: 'liga',
                dias_juego: 'Martes,Jueves',
                // fecha_fin calculation automatic
            })
        });
        const tData = await tRes.json();
        if (!tRes.ok) throw new Error(JSON.stringify(tData));
        const torneoId = tData.torneoId;
        console.log('Torneo creado ID:', torneoId);

        console.log('--- 2. Inscribiendo Equipos con Nombres Reales ---');

        const players = [
            { n: 'Juan', a: 'Perez', e: 'juan.perez' },
            { n: 'Carlos', a: 'Lopez', e: 'carlos.lopez' },
            { n: 'Maria', a: 'Gomez', e: 'maria.gomez' },
            { n: 'Ana', a: 'Diaz', e: 'ana.diaz' },
            { n: 'Pedro', a: 'Ramirez', e: 'pedro.ramirez' },
            { n: 'Luis', a: 'Fernandez', e: 'luis.fernandez' },
            { n: 'Sofia', a: 'Martinez', e: 'sofia.martinez' },
            { n: 'Lucia', a: 'Torres', e: 'lucia.torres' }
        ];

        // Register players
        const pIds = [];
        const uniqueSuffix = Date.now();
        for (const p of players) {
            const r = await fetch(`${API_URL}/registro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre_jugador: p.n, apellido_jugador: p.a,
                    email: `${p.e}.${uniqueSuffix}@test.com`,
                    password: '123', confirmar_password: '123', categoria_id: 2
                })
            });
            const d = await r.json();
            if (d.jugador && d.jugador.id_jugador) {
                pIds.push(d.jugador.id_jugador);
            } else {
                console.error('Error creando jugador', p.n, d);
            }
        }

        // Pair them up (4 teams)
        for (let i = 0; i < 8; i += 2) {
            await fetch(`${API_URL}/inscripcion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_torneo: torneoId, jugador1_id: pIds[i], jugador2_id: pIds[i + 1] })
            });
        }

        console.log('--- 3. Generando Fixture (Liga) ---');
        const gRes = await fetch(`${API_URL}/torneos/${torneoId}/generar-grupos`, { method: 'POST' });
        const gData = await gRes.json();
        console.log('Generar Grupos:', gRes.status, JSON.stringify(gData));

        if (gRes.ok) {
            console.log('SUCCESS: Liga generated with real names.');
        } else {
            console.log('FAILURE: Could not generate groups.');
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

run();
