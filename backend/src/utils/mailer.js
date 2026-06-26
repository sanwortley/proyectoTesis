import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Dirección from — si tenés dominio propio: 'noreply@tudominio.com'
// Sin dominio verificado usá: 'onboarding@resend.dev' (solo para testing a tu propio mail)
const FROM = process.env.MAIL_FROM || 'Pro Cup Padel <onboarding@resend.dev>';

function formatFecha(fechaStr) {
  if (!fechaStr) return '—';
  return new Date(fechaStr).toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

const baseStyle = `
  font-family: 'Segoe UI', Arial, sans-serif;
  background: #0a0a0a;
  color: #eee;
  max-width: 520px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #333;
`;

function header() {
  return `
    <div style="background:#111; padding:24px 32px; text-align:center; border-bottom:2px solid #ffd700;">
      <span style="font-size:1.6rem; font-weight:800; color:#ffd700; letter-spacing:2px; text-transform:uppercase;">
        PRO CUP PADEL
      </span>
    </div>
  `;
}

function footer() {
  return `
    <div style="background:#111; padding:16px 32px; text-align:center; border-top:1px solid #222; font-size:0.75rem; color:#555;">
      Este correo fue enviado automáticamente. Por favor no respondas este mensaje.
    </div>
  `;
}

// ─────────────────────────────────────────
// Email 1: confirmación de inscripción
// ─────────────────────────────────────────
export async function enviarConfirmacionInscripcion({
  email, nombre, nombreEquipo, nombreTorneo, fechaTorneo,
}) {
  if (!process.env.RESEND_API_KEY) return;

  const html = `
    <div style="${baseStyle}">
      ${header()}
      <div style="padding:32px;">
        <p style="font-size:1rem; color:#ccc; margin-bottom:8px;">
          Hola, <strong style="color:#fff;">${nombre}</strong>
        </p>
        <h2 style="color:#ffd700; font-size:1.3rem; margin:0 0 20px; text-transform:uppercase;">
          ¡Inscripción confirmada!
        </h2>
        <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
          <tr>
            <td style="padding:10px 0; color:#888; border-bottom:1px solid #222;">Equipo</td>
            <td style="padding:10px 0; color:#fff; text-align:right; border-bottom:1px solid #222;">
              <strong>${nombreEquipo}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0; color:#888; border-bottom:1px solid #222;">Torneo</td>
            <td style="padding:10px 0; color:#fff; text-align:right; border-bottom:1px solid #222;">
              ${nombreTorneo}
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0; color:#888;">Fecha de inicio</td>
            <td style="padding:10px 0; color:#ffd700; text-align:right; font-weight:700;">
              ${formatFecha(fechaTorneo)}
            </td>
          </tr>
        </table>
        <p style="margin-top:28px; color:#888; font-size:0.85rem; line-height:1.6;">
          Recibirás un recordatorio 24 horas antes del inicio. ¡Buena suerte!
        </p>
      </div>
      ${footer()}
    </div>
  `;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `✅ Inscripción confirmada — ${nombreTorneo}`,
    html,
  });
}

// ─────────────────────────────────────────
// Email 2: recordatorio 24h antes
// ─────────────────────────────────────────
export async function enviarRecordatorioTorneo({
  email, nombre, nombreTorneo, fechaTorneo, nombreEquipo,
}) {
  if (!process.env.RESEND_API_KEY) return;

  const html = `
    <div style="${baseStyle}">
      ${header()}
      <div style="padding:32px;">
        <p style="font-size:1rem; color:#ccc; margin-bottom:8px;">
          Hola, <strong style="color:#fff;">${nombre}</strong>
        </p>
        <h2 style="color:#ffd700; font-size:1.3rem; margin:0 0 8px; text-transform:uppercase;">
          ¡Tu torneo es mañana!
        </h2>
        <p style="color:#888; font-size:0.9rem; margin-bottom:20px;">
          Este es tu recordatorio de 24 horas.
        </p>
        <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
          <tr>
            <td style="padding:10px 0; color:#888; border-bottom:1px solid #222;">Torneo</td>
            <td style="padding:10px 0; color:#fff; text-align:right; border-bottom:1px solid #222;">
              <strong>${nombreTorneo}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0; color:#888; border-bottom:1px solid #222;">Equipo</td>
            <td style="padding:10px 0; color:#fff; text-align:right; border-bottom:1px solid #222;">
              ${nombreEquipo}
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0; color:#888;">Fecha</td>
            <td style="padding:10px 0; color:#ffd700; text-align:right; font-weight:700;">
              ${formatFecha(fechaTorneo)}
            </td>
          </tr>
        </table>
        <p style="margin-top:28px; color:#888; font-size:0.85rem; line-height:1.6;">
          ¡Preparate y disfrutá del partido! — Pro Cup Padel
        </p>
      </div>
      ${footer()}
    </div>
  `;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `⏰ Recordatorio — ${nombreTorneo} es mañana`,
    html,
  });
}
