/**
 * Formats a player's name, inserting the nickname (apodo) if available.
 * Format: Nombre "Apodo" Apellido
 * If no apodo: Nombre Apellido
 */
export function formatName(nombre, apellido, apodo) {
    if (!nombre) return '';
    const n = nombre.trim();
    const a = apellido ? apellido.trim() : '';
    const nick = apodo ? `"${apodo.trim()}"` : '';

    // Filter out empty strings and join with space
    return [n, nick, a].filter(Boolean).join(' ');
}
