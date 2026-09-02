// Guarda de auto-modificación, pura y sin dependencias — se comprueba aquí
// (Server Action, capa 1) Y otra vez dentro de las funciones SQL
// (admin_change_role / admin_set_active, capa 2): "no confiar solo en
// JavaScript" (Fase 6.1 §14). La fuente de verdad real es la comprobación
// en SQL; esta solo evita una llamada de red innecesaria y da un mensaje
// de error inmediato.
export function isSelfTarget(actorId: string, targetId: string): boolean {
  return actorId === targetId;
}
