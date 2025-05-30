// utils/generarGrupos.js

export function generarGruposAleatorios(equipos, tamanioGrupo = 3) {
  const mezclados = [...equipos].sort(() => Math.random() - 0.5);
  const grupos = [];

  const totalEquipos = mezclados.length;

  // Caso especial: solo 2 equipos → final directa
  if (totalEquipos === 2) {
    return [mezclados]; // 1 grupo con 2 equipos
  }

  let i = 0;
  while (i < totalEquipos) {
    // Si quedan 4 o 5 equipos al final, hacer 2 grupos: uno de 3 y otro de 2
    if (totalEquipos - i === 5) {
      grupos.push(mezclados.slice(i, i + 3));
      grupos.push(mezclados.slice(i + 3, i + 5));
      break;
    }

    // Si quedan exactamente 4, hacer 2 grupos de 2
    if (totalEquipos - i === 4) {
      grupos.push(mezclados.slice(i, i + 2));
      grupos.push(mezclados.slice(i + 2, i + 4));
      break;
    }

    // Grupo estándar de 3
    grupos.push(mezclados.slice(i, i + tamanioGrupo));
    i += tamanioGrupo;
  }

  return grupos;
}
