export function oklchToHex(oklchString: string): string {
  // Pass through inputs that are already hex so callers can opt out of the
  // oklch conversion (which uses a non-standard linear approximation that
  // desaturates high-chroma values).
  if (/^#[0-9a-f]{6}$/i.test(oklchString)) return oklchString.toLowerCase()

  const match = oklchString.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/)
  if (!match) return '#808080'

  const L = parseFloat(match[1])
  const C = parseFloat(match[2])
  const H = parseFloat(match[3])

  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)

  let x = 0.9969845 * L + 0.3963377 * a + 0.2158038 * b
  let y = 1.0000001 * L - 0.1055613 * a - 0.0638541 * b
  let z = 1.0088850 * L - 0.0894842 * a - 1.2914855 * b

  x = x * 0.96422
  y = y * 1.00000
  z = z * 0.82521

  let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314
  let g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560
  let bl = x * 0.0556434 + y * -0.2040259 + z * 1.0572252

  r = gammaCorrection(r)
  g = gammaCorrection(g)
  bl = gammaCorrection(bl)

  r = Math.max(0, Math.min(255, Math.round(r * 255)))
  g = Math.max(0, Math.min(255, Math.round(g * 255)))
  bl = Math.max(0, Math.min(255, Math.round(bl * 255)))

  return '#' + [r, g, bl].map(x => x.toString(16).padStart(2, '0')).join('')
}

function gammaCorrection(value: number): number {
  const abs = Math.abs(value)
  const sign = value < 0 ? -1 : 1
  
  if (abs <= 0.0031308) {
    return sign * (abs * 12.92)
  }
  return sign * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055)
}
