/**
 * Retratos de mentira, para que el mapa de clusters se pueda probar con caras.
 *
 * Son dibujos SVG (cabeza y hombros sobre un fondo de color) con el mismo
 * encuadre que las fotos de 42: retrato, con aire por arriba y por los lados.
 * Cada login tiene siempre el mismo.
 */
export function portrait(login: string): string {
  let seed = 0

  for (const char of login) {
    seed = (seed * 31 + char.charCodeAt(0)) % 3600
  }

  const hue = seed % 360
  const skin = ['#f2c9a8', '#e0a880', '#c68a5f', '#8d5a3b', '#f6d8c0'][seed % 5] ?? '#e0a880'
  const hair = ['#2b2118', '#5a3a22', '#a8703a', '#1b1b1f', '#c9a36a'][(seed >> 2) % 5] ?? '#2b2118'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
    <rect width="120" height="160" fill="hsl(${hue} 45% 78%)"/>
    <ellipse cx="60" cy="170" rx="52" ry="58" fill="hsl(${(hue + 150) % 360} 35% 45%)"/>
    <rect x="50" y="92" width="20" height="26" rx="8" fill="${skin}"/>
    <ellipse cx="60" cy="70" rx="26" ry="31" fill="${skin}"/>
    <path d="M32 66c-2-30 18-42 30-42s32 10 28 42c-6-14-14-22-30-22s-22 8-28 22z" fill="${hair}"/>
    <circle cx="50" cy="72" r="3" fill="#2b2118"/><circle cx="70" cy="72" r="3" fill="#2b2118"/>
    <path d="M51 86q9 7 18 0" fill="none" stroke="#8a4a3a" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
