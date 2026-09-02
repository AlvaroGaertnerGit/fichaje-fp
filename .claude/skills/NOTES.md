# Skills del proyecto

Skills específicas de Lead Generator. Cada una se implementa cuando la fase del roadmap que la necesita llega (ver `docs/architecture.md`), no antes.

Previstas:

- **`lead-scoring-rubric`** — encapsula la rúbrica de scoring vigente (ver `docs/domain.md`), para que cualquier agente que toque lógica de puntuación use reglas consistentes. Se crea en la Fase 4 (análisis web + scoring).
- **`supabase-schema-change`** — envoltorio del flujo de migración específico del proyecto sobre la skill `supabase-postgres-best-practices` ya disponible en el entorno. Se crea en la Fase 1 (schema de datos).
- **`n8n-workflow-conventions`** — convenciones de nombrado/estructura de los workflows exportados en `n8n/workflows/` antes de tocarlos. Se crea en la Fase 3 (descubrimiento).
