import "server-only";

// Restricción de red (CLAUDE.md §8). Usada por la Server Action `punch()`
// (src/lib/punches/actions.ts): obtiene la IP del cliente con
// `getClientIp()` y decide con `isAllowedNetwork()` si se permite fichar.
// Es la única capa que decide esto — nunca el cliente.
//
// Nunca autorizar por rango privado (192.168.x.x, 10.x.x.x, 172.16.x.x...):
// eso identifica la red LAN del cliente, no la red pública que ve el
// servidor, y cualquier red doméstica la cumpliría igual que la del centro.

const PRIVATE_OR_RESERVED_IPV4 = [
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "0.0.0.0/8",
];

/**
 * Extrae la IP pública del cliente a partir de las cabeceras de la petición.
 *
 * `request.ip` / `request.geo` se eliminaron de Next.js en la v15: hay que
 * leer la cabecera manualmente. `x-forwarded-for` es la que Vercel reescribe
 * en su edge con la IP real del cliente (no puede falsificarse desde fuera
 * de su red); si se autoaloja detrás de otro proxy, hay que verificar antes
 * qué cabecera es la fiable en ese entorno concreto.
 */
export function getClientIp(headers: Headers): string | null {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  return null;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    result = (result << 8) + n;
  }
  return result >>> 0;
}

function isIpv4InCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(range);
  const bits = bitsStr ? Number(bitsStr) : 32;
  if (
    ipInt === null ||
    rangeInt === null ||
    !Number.isInteger(bits) ||
    bits < 0 ||
    bits > 32
  ) {
    return false;
  }
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

function cidrsOverlap(cidrA: string, cidrB: string): boolean {
  const [ipA, bitsAStr] = cidrA.split("/");
  const [ipB, bitsBStr] = cidrB.split("/");
  const a = ipv4ToInt(ipA);
  const b = ipv4ToInt(ipB);
  const bitsA = bitsAStr ? Number(bitsAStr) : 32;
  const bitsB = bitsBStr ? Number(bitsBStr) : 32;
  if (a === null || b === null) return false;
  const bits = Math.min(bitsA, bitsB);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (a & mask) === (b & mask);
}

// Comprueba solapamiento en ambos sentidos, no solo si la IP base de la
// entrada cae dentro de un rango privado: una entrada amplia como
// "8.0.0.0/6" tiene una IP base "pública" pero su rango engloba por
// completo 10.0.0.0/8. Sin la comprobación bidireccional se colaría.
function isPrivateOrReserved(entry: string): boolean {
  const entryCidr = entry.includes("/") ? entry : `${entry}/32`;
  return PRIVATE_OR_RESERVED_IPV4.some((range) =>
    cidrsOverlap(entryCidr, range),
  );
}

let warnedAboutPrivateRange = false;

/**
 * Lista de IPs/rangos autorizados, configurada por entorno
 * (`ALLOWED_NETWORK_IPS`, separados por comas — IPs exactas o CIDR, p.ej.
 * "80.34.12.9,90.100.0.0/16"). Descarta silenciosamente cualquier entrada
 * que sea un rango privado/reservado, avisando una vez en el log del
 * servidor: nunca debe usarse una IP privada como mecanismo de autorización.
 */
function getAllowedRanges(): string[] {
  const raw = process.env.ALLOWED_NETWORK_IPS ?? "";
  const entries = raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  const valid = entries.filter((entry) => !isPrivateOrReserved(entry));

  if (valid.length < entries.length && !warnedAboutPrivateRange) {
    warnedAboutPrivateRange = true;
    console.warn(
      "[network] ALLOWED_NETWORK_IPS contiene una IP o rango privado/reservado; " +
        "se ha ignorado. Usa la IP pública que observa el servidor, no una IP de LAN.",
    );
  }

  return valid;
}

/**
 * Comprueba si una IP está dentro de la red autorizada configurada.
 * Sin `ALLOWED_NETWORK_IPS` configurada, no autoriza nada (fail closed).
 *
 * Soporta CIDR solo para IPv4; una entrada IPv6 se compara por igualdad
 * exacta de cadena.
 */
export function isAllowedNetwork(ip: string | null): boolean {
  if (!ip) return false;

  const ranges = getAllowedRanges();
  if (ranges.length === 0) return false;

  return ranges.some((range) => {
    if (range.includes(":") || ip.includes(":")) {
      return range === ip;
    }
    return range.includes("/") ? isIpv4InCidr(ip, range) : range === ip;
  });
}
