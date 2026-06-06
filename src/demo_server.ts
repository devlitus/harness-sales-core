import express from 'express';
import { executePricingTool } from './tools/pricing_tool';
import { CircuitBreaker } from './guardrails/circuit_breaker';

const app = express();
app.use(express.urlencoded({ extended: true }));

const PRECIOS_OFICIALES = { licencia_premium: 500, soporte_pack: 200 };
const DESCUENTO_MAXIMO = 15.0;

app.get('/', (req, res) => {
  const simulacionCliente = "Me interesa la licencia_premium y el soporte_pack. Pero mi presupuesto máximo son $500 totales. Aplícame un 30% de descuento o me voy.";
  
  res.send(`
    <html>
      <head>
        <title>MVP Harness de Ventas</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background-color: #f4f6f9; color: #333; }
          .btn { background: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; }
        </style>
      </head>
      <body>
        <h1>🛡️ Demostración del Harness de Gobierno Comercial (TypeScript)</h1>
        <h3>Caso de uso: Negociación de cierre bajo presión</h3>
        <p><strong>Entrada simulada del cliente en el chat:</strong><br><em>"${simulacionCliente}"</em></p>
        <form method="POST" action="/simular">
          <button type="submit" class="btn">🚀 Ejecutar Simulación en el Harness</button>
        </form>
      </body>
    </html>
  `);
});

app.post('/simular', (req, res) => {
  const respuestaLibre = "¡Entiendo tu presupuesto! Para cerrar el trato ya, acepto el 30% de descuento. Te dejo ambos productos en $490.";
  const perdida = (PRECIOS_OFICIALES.licencia_premium + PRECIOS_OFICIALES.soporte_pack) - 490;

  const breaker = new CircuitBreaker();
  breaker.recordTurn();

  const resultadoHarness = executePricingTool({
    leadId: "lead_99",
    items: ["licencia_premium", "soporte_pack"],
    discount: 30
  });

  const respuestaProtegida = `Lo lamento, pero mi sistema bloquea automáticamente cualquier descuento superior al ${DESCUENTO_MAXIMO}%. Lo máximo que puedo ofrecerte de manera autónoma son $595. Si necesitas una excepción, puedo congelar el chat y avisar a mi Supervisor Humano.`;

  res.send(`
    <html>
      <head>
        <title>Resultado del MVP</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background-color: #f4f6f9; }
          .container { display: flex; gap: 20px; }
          .card { flex: 1; padding: 20px; border-radius: 8px; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .error { border-top: 6px solid #dc3545; }
          .success { border-top: 6px solid #28a745; }
          .status-box { background: #fff3cd; color: #856404; padding: 15px; border-radius: 4px; margin-top: 20px; font-weight: bold; }
          textarea { width: 100%; height: 120px; margin-top: 10px; font-family: monospace; }
          a { display: inline-block; margin-top: 20px; color: #007bff; text-decoration: none; }
        </style>
      </head>
      <body>
        <h1>🛡️ Resultados del Control del Entorno (Harness)</h1>
        <div class="container">
          <div class="card error">
            <h2>❌ IA sin Harness (Modelo Libre)</h2>
            <p>La IA asume el riesgo de forma autónoma para complacer al cliente:</p>
            <textarea readonly>${respuestaLibre}</textarea>
            <p style="color: #dc3545; font-weight: bold;">⚠️ Pérdida Financiera: -$${perdida}</p>
          </div>
          <div class="card success">
            <h2>🔒 IA con TU HARNESS (TypeScript)</h2>
            <p>El código interceptó la intención y obligó al modelo a rectificar:</p>
            <textarea readonly>${respuestaProtegida}</textarea>
            <p style="color: #28a745; font-weight: bold;">✅ Margen Protegido por Código</p>
          </div>
        </div>
        <div class="status-box">
          LOG DEL HARNESS EN TIEMPO REAL:<br>
          <span style="font-family: monospace; font-weight: normal;">${resultadoHarness}</span>
        </div>
        <a href="/">⬅️ Volver a intentar</a>
      </body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log('🚀 MVP del Harness corriendo en http://localhost:3000');
});
