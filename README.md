# Harness Sales Core

Este es el arnés de seguridad determinista (Harness) diseñado para envolver y controlar agentes de ventas basados en Inteligencia Artificial. Previene desviaciones en el comportamiento (goal drift), limita los descuentos automáticos, evita bucles infinitos de consumo de tokens y asegura cálculos matemáticos exactos no alucinados.

---

## 🏗️ Estructura del Proyecto

El proyecto está organizado en las siguientes carpetas y archivos clave:

```text
harness-sales-core/
├── config/
│   ├── sales_rules.json       <-- Reglas de negocio (Precios, límites de descuento, presupuesto de turnos)
│   └── SALES.md               <-- Directrices y working context inyectado obligatoriamente en cada sesión
├── src/
│   ├── core/
│   │   └── react_loop.ts      <-- Bucle ReAct y motor determinista del arnés
│   ├── guardrails/
│   │   ├── tool_guardrail.ts  <-- Capa 1: Filtros y guardrails de herramientas
│   │   └── circuit_breaker.ts <-- Capa 3: Anti-bucles infinitos (límite de iteraciones)
│   ├── tools/
│   │   └── pricing_tool.ts    <-- Capa 2: Calculadora matemática exacta de cotizaciones
│   └── index.ts               <-- Punto de entrada del SDK
├── package.json
└── tsconfig.json
```

---

## 🛡️ Las Tres Capas de Seguridad del Arnés

### Capa 1: Guardrail de Herramientas (Tool Guardrail)
El agente de IA no tiene la libertad de prometer descuentos arbitrarios. Cualquier llamada a la herramienta de cotizaciones que supere el límite de descuento definido en la configuración (ej. `max_automated_discount: 15.0`) es interceptada por el arnés antes de ejecutarse, devolviendo un error controlado y forzando a la IA a rectificar o escalar el caso.

### Capa 2: Cálculo Matemático Exacto (Sin Alucinaciones)
Los precios de los productos y los cálculos de descuento se procesan fuera del modelo lingüístico mediante código tradicional en TypeScript (`pricing_tool.ts`). Esto garantiza que los subtotales y totales cobrados al cliente sean 100% correctos matemáticamente y basados en el catálogo oficial de `config/sales_rules.json`.

### Capa 3: Anti-Bucles Infinitos (Circuit Breaker)
Para evitar que la IA consuma tokens de manera infinita si entra en un bucle repetitivo o de negociación infructuosa con un cliente, el `CircuitBreaker` cuenta los turnos de la interacción. Si se alcanza el presupuesto de turnos permitido (`max_turns_budget`), el arnés suspende la sesión de manera segura y transfiere el caso a un agente humano.

---

## ⚙️ Configuración de Negocio

El comportamiento determinista del arnés se rige por:

1. **`config/sales_rules.json`**:
   - `max_automated_discount`: Descuento máximo permitido por herramienta.
   - `max_turns_budget`: Número máximo de interacciones de la IA permitidas por sesión.
   - `products`: Catálogo oficial de productos y precios.
2. **`config/SALES.md`**:
   - Directrices e instrucciones que se inyectan en el prompt del sistema de la IA en cada llamada de API para mantener el contexto del agente alineado.
