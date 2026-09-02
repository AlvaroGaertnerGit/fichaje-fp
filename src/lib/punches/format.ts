// El centro está en Madrid: se formatea siempre en esa zona horaria,
// explícita, en vez de depender de la zona del servidor (Vercel) o del
// navegador — así el resultado es idéntico en el render de servidor y en
// la hidratación del cliente (sin desajuste de hidratación) y siempre
// muestra la hora real del centro, la vea quien la vea desde donde sea.
const TIME_ZONE = "Europe/Madrid";

const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

// en-CA da YYYY-MM-DD de forma estable, útil solo para construir el serial.
const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "09:03:17" — timestamp ISO/UTC de la base de datos a hora local del centro. */
export function formatPunchTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** "02 sep 2026" */
export function formatPunchDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

/**
 * "<PREFIJO>-20260902-902A84CE" — referencia documental genérica. No es un
 * número de serie inventado: es la fecha real (Europe/Madrid) + los
 * primeros 8 caracteres de un id real (UUID), en mayúsculas. No implica una
 * numeración secuencial que no existe. Usada por cualquier "documento" del
 * producto que necesite esa misma sensación de identificador físico/de
 * archivo (ticket de fichaje, expediente de usuario, entrada de auditoría).
 */
export function formatDocumentSerial(prefix: string, iso: string, id: string): string {
  const date = isoDateFormatter.format(new Date(iso)).replaceAll("-", "");
  return `${prefix}-${date}-${id.slice(0, 8).toUpperCase()}`;
}

/** "FCH-20260902-902A84CE" — identificador visual del ticket de fichaje. */
export function formatPunchSerial(iso: string, id: string): string {
  return formatDocumentSerial("FCH", iso, id);
}
