// `Date.now()` es impura para el linter de React Compiler si se llama
// directamente dentro de un componente/página. Aislada aquí, fuera de
// cualquier componente, se puede llamar una sola vez por render sin
// disparar `react-hooks/purity`.
export function nowMs(): number {
  return Date.now();
}
