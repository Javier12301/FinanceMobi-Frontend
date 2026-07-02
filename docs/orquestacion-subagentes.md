# Orquestación de subagentes (uso exclusivo del orquestador)

Este documento es solo para el modelo orquestador (Sonnet/Opus). **No se le indica a un subagente que lo lea** — el subagente recibe únicamente el extracto de contexto que necesita, incluido directamente en su prompt.

## Roles

- **Orquestador** = el modelo en uso por el usuario (Sonnet u Opus). Planifica, divide en tareas chicas e integra.
- **Implementación** = subagentes **Haiku** con la skill **ponytail** activa, una tarea acotada por subagente (ej: "crear feature `budgets` con su hook y card", "agregar pantalla de categorías").
- **Prohibido subagentes anidados**: un subagente NO debe lanzar otros subagentes (consumo de contexto explosivo). El fan-out lo hace solo el orquestador.

## Cómo armar el prompt de un subagente

No le digas "lee CLAUDE.md" — dale el extracto ya resuelto (convención de arquitectura relevante, 1-2 rutas de ejemplo si el cambio repite un patrón), porque arranca en frío y leer el archivo completo le carga contexto de orquestación/roadmap que no necesita para su tarea puntual.

- Dar a cada subagente contexto autocontenido (archivos relevantes, convención a seguir).
- Cambios que repiten patrón entre features → describir el patrón una vez y pasar 1-2 rutas de ejemplo, no enumerar todo.
- Activar ponytail explícitamente al inicio del prompt: `Skill({ skill: "ponytail" })`.

## Cuándo consultar roadmap/skills antes de delegar

Antes de decidir *qué* construir (no cómo), el orquestador debe leer `docs/mejoras-ux-y-roadmap.md` y considerar las skills: `cognitive-doc-design`, `chrome-devtools-mcp:a11y-debugging`, `chrome-devtools-mcp:debug-optimize-lcp`, `context7-mcp`, `code-review`/`simplify`. Esta capa de decisión de producto no se delega al subagente implementador.
