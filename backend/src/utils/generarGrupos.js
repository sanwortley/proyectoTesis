// utils/generarGrupos.js

export function generarGruposAleatorios(equipos) {
  const total = equipos.length;
  const mezclados = [...equipos].sort(() => Math.random() - 0.5);
  let grupos = [];

  // ========================
  // 1) CASOS ESTÁNDAR
  // ========================
  if (total === 2) {
    // Final directa
    return [mezclados];
  }

  if (total === 4) {
    // 1 grupo → pasan 4 → semis
    return [mezclados];
  }

  if (total === 8) {
    // 2 grupos de 4 → pasan 2 de cada grupo → SEMIS
    return cortarEnGrupos(mezclados, 2, 4);
  }

  if (total === 16) {
    // 4 grupos de 4 → pasan 2 → CUARTOS
    return cortarEnGrupos(mezclados, 4, 4);
  }

  // ========================
  // 2) CASOS INTERMEDIOS: 6–7–10–12–14 equipos
  // Siempre maximizar equilibrio
  // ========================

  if (total === 6 || total === 7) {
    // 2 grupos lo más parejo posible (3-3 o 4-3)
    return cortarParejo(mezclados, 2);
  }

  if (total === 10 || total === 11 || total === 12) {
    // 3 grupos (4-4-2 o 4-4-3)
    return cortarParejo(mezclados, 3);
  }


  if (total === 14 || total === 15) {
    // 4 grupos (4-4-3-3 o 4-4-4-2)
    return cortarParejo(mezclados, 4);
  }

  if (total === 32) {
    // 8 grupos de 4 → pasan 2 de cada grupo → OCTAVOS
    return cortarEnGrupos(mezclados, 8, 4);
  }

  // ========================
  // 3) Fallback raro → distribuir lo más parejo posible
  // ========================
  return cortarParejo(mezclados, Math.ceil(total / 4));

}


// ==========================================
// Helpers
// ==========================================

// Corta en N grupos con tamaño fijo
function cortarEnGrupos(lista, cantidad, tamanio) {
  const grupos = [];
  let i = 0;
  for (let g = 0; g < cantidad; g++) {
    grupos.push(lista.slice(i, i + tamanio));
    i += tamanio;
  }
  return grupos;
}

// Corta lo más parejo posible en N grupos
function cortarParejo(lista, cantidadGrupos) {
  const grupos = Array.from({ length: cantidadGrupos }, () => []);
  let idx = 0;

  for (const item of lista) {
    grupos[idx].push(item);
    idx = (idx + 1) % cantidadGrupos;
  }

  return grupos;
}
