// Genera un patrón de barras determinista a partir de una cadena (nombre o
// id del alumno), para que cada pase tenga un código visualmente distinto
// pero estable entre servidor y cliente (sin Math.random).

export function barcodeBars(seed: string, count = 28): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    bars.push(1 + (hash % 4));
  }
  return bars;
}

export function serialFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return String(200 + (hash % 800)).padStart(4, "0");
}
