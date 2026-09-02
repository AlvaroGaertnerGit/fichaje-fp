import { afterEach, describe, expect, it } from "vitest";

import { getClientIp, isAllowedNetwork } from "./allowed-ip";

// Nunca leemos ni escribimos ALLOWED_NETWORK_IPS real (.env.local): estos
// tests controlan la variable de entorno directamente, en un valor de
// prueba aislado, y la restauran siempre al terminar.
const ORIGINAL_ENV = process.env.ALLOWED_NETWORK_IPS;

function setAllowedIps(value: string | undefined) {
  if (value === undefined) delete process.env.ALLOWED_NETWORK_IPS;
  else process.env.ALLOWED_NETWORK_IPS = value;
}

afterEach(() => {
  setAllowedIps(ORIGINAL_ENV);
});

describe("isAllowedNetwork", () => {
  it("IP exacta en la lista -> true", () => {
    setAllowedIps("203.0.113.10,198.51.100.20");
    expect(isAllowedNetwork("203.0.113.10")).toBe(true);
  });

  it("IP que no está en la lista -> false", () => {
    setAllowedIps("203.0.113.10");
    expect(isAllowedNetwork("203.0.113.123")).toBe(false);
  });

  it("IP dentro de un rango CIDR permitido -> true", () => {
    setAllowedIps("80.34.12.0/24");
    expect(isAllowedNetwork("80.34.12.9")).toBe(true);
  });

  it("IP fuera del rango CIDR -> false", () => {
    setAllowedIps("80.34.12.0/24");
    expect(isAllowedNetwork("80.34.13.9")).toBe(false);
  });

  it("sin ALLOWED_NETWORK_IPS configurada -> false (fail closed)", () => {
    setAllowedIps(undefined);
    expect(isAllowedNetwork("203.0.113.10")).toBe(false);
  });

  it("sin IP (null) -> false", () => {
    setAllowedIps("203.0.113.10");
    expect(isAllowedNetwork(null)).toBe(false);
  });

  it("ignora un rango privado/reservado en la configuración (nunca autoriza por LAN)", () => {
    setAllowedIps("192.168.1.0/24");
    expect(isAllowedNetwork("192.168.1.50")).toBe(false);
  });
});

describe("getClientIp", () => {
  it("usa la primera IP de x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    });
    expect(getClientIp(headers)).toBe("203.0.113.10");
  });

  it("usa x-real-ip si no hay x-forwarded-for", () => {
    const headers = new Headers({ "x-real-ip": "203.0.113.10" });
    expect(getClientIp(headers)).toBe("203.0.113.10");
  });

  it("sin ninguna cabecera -> null", () => {
    expect(getClientIp(new Headers())).toBeNull();
  });
});
