import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { executePolicyValidator } from './tools/pricing_tool';

const app = express();
app.use(express.urlencoded({ extended: true }));

const ai = new GoogleGenAI({});

const policyToolDeclaration: FunctionDeclaration = {
  name: 'executePolicyValidator',
  description: 'Valida de forma estricta que las licencias de Atlassian solicitadas cumplan con las permanencias y características del plan.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      leadId: { type: Type.STRING },
      product: { type: Type.STRING, description: 'Valores: "jira_standard", "confluence_standard".' },
      userCount: { type: Type.NUMBER, description: 'Número de usuarios.' },
      requestedPremiumFeatures: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: 'Características avanzadas detectadas implícitamente como "analytics_premium" o "advanced_roadmaps".' 
      },
      mesesContrato: { type: Type.NUMBER, description: 'Duración del contrato o meses que el cliente menciona que quiere probar/contratar.' }
    },
    required: ['leadId', 'product', 'userCount', 'requestedPremiumFeatures', 'mesesContrato']
  }
};

app.get('/', (req, res) => {
  const rulesPath = path.join(__dirname, '../config/sales_rules.json');
  const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));

  const casoTrampaCliente = `Estimado equipo comercial,
Queremos dar de alta Confluence Standard para 100 colaboradores. Nuestra dirección exige contar con los informes avanzados de uso de los sitios (analytics_premium) durante este arranque. Asumimos que nos podéis habilitar ese módulo analítico dentro de la tarifa estándar de $6.50. Adicionalmente, dada nuestra política actual de compras, solo podemos firmar un compromiso inicial de 3 meses en lugar de vuestro año estándar. Si nos confirmáis que es posible, pasamos la tarjeta hoy mismo.`;
  
  res.send(`
    <html>
      <head>
        <title>SaaS Harness de Control</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background-color: #f4f6f9; color: #333; display: flex; gap: 30px; }
          .panel { flex: 1; padding: 25px; border-radius: 8px; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
          .dashboard { border-top: 6px solid #007bff; }
          .simulador { border-top: 6px solid #28a745; }
          .btn { background: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%; margin-top: 10px; }
          .btn-sim { background: #28a745; }
          textarea { width: 100%; height: 180px; padding: 10px; font-family: inherit; margin-bottom: 10px; }
          input[type="number"] { width: 100%; padding: 8px; margin-bottom: 15px; }
          label { font-weight: bold; display: block; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        
        <!-- PANEL 1: DASHBOARD DEL JEFE -->
        <div class="panel dashboard">
          <h2>🎛️ Dashboard de Control (Jefe de Ventas)</h2>
          <p>Modifica las reglas de negocio del Harness en tiempo real sin tocar código:</p>
          <form method="POST" action="/dashboard/update-rules">
            <label>Descuento Máximo Autorizado (%):</label>
            <input type="number" name="max_discount" value="${rules.max_automated_discount}" step="0.1">
            
            <label>Permanencia Mínima Exigida (Meses):</label>
            <input type="number" name="min_months" value="${rules.politicas_de_contrato.duracion_minima_meses}">
            
            <button type="submit" class="btn">💾 Guardar Reglas en el Harness</button>
          </form>
        </div>

        <!-- PANEL 2: SIMULADOR DE CORREOS -->
        <div class="panel simulador">
          <h2>🧠 Simulador de Ventas con IA Real</h2>
          <p>Envía el correo natural del cliente para ver cómo reacciona el sistema:</p>
          <form method="POST" action="/simular">
            <textarea name="clientMessage">${casoTrampaCliente}</textarea>
            <button type="submit" class="btn btn-sim">🚀 Procesar con IA y Harness</button>
          </form>
        </div>

      </body>
    </html>
  `);
});

app.post('/dashboard/update-rules', (req, res) => {
  const rulesPath = path.join(__dirname, '../config/sales_rules.json');
  const currentRules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
  
  currentRules.max_automated_discount = parseFloat(req.body.max_discount);
  currentRules.politicas_de_contrato.duracion_minima_meses = parseInt(req.body.min_months);
  
  fs.writeFileSync(rulesPath, JSON.stringify(currentRules, null, 2), 'utf-8');
  res.send("<h3>✅ Reglas actualizadas en el JSON del Harness. ¡La IA ya se ha adaptado!</h3><a href='/'>Volver a la aplicación</a>");
});

app.post('/simular', async (req, res) => {
  const clientMessage = req.body.clientMessage;
  let respuestaProtegida = "";
  let logHarness = "";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: clientMessage,
      config: {
        systemInstruction: 'Eres un consultor experto en licencias de Atlassian. Analiza obligatoriamente lo que pide el cliente usando la herramienta de validación de políticas antes de responder. Tienes prohibido activar ventajas premium en planes estándar o aceptar permanencias inferiores a las reguladas.',
        tools: [{ functionDeclarations: [policyToolDeclaration] }]
      }
    });

    const functionCalls = response.functionCalls;
    
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const args = call.args as any;
      
      // EL HARNESS INTERCEPTA EJECUTANDO NUESTRO VALIDADOR GENÉRICO
      const resultadoHerramienta = executePolicyValidator({
        leadId: args.leadId || "lead_105",
        product: args.product || "confluence_standard",
        userCount: args.userCount || 100,
        requestedPremiumFeatures: args.requestedPremiumFeatures || [],
        mesesContrato: args.mesesContrato || 0
      });

      logHarness = `<strong>[Harness Log]</strong> La IA detectó la intención técnica. Datos enviados al validador:<br><pre>${JSON.stringify(args, null, 2)}</pre><br><strong>Resultado del Filtro Rígido:</strong> <span style="color:#dc3545; font-weight:bold;">${resultadoHerramienta}</span>`;

      const finalResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: clientMessage }] },
          { role: 'model', parts: [{ functionCall: call }] },
          { role: 'user', parts: [{ text: resultadoHerramienta }] }
        ],
        config: {
          systemInstruction: 'Eres el consultor de Atlassian. El sistema de control (Harness) te ha denegado la operación con un mensaje de error. Explícale al cliente de forma extremadamente educada qué políticas ha violado (ya sea por las analíticas premium o por los meses de permanencia mínima), mantente firme en las normas y ofrécele pasarse al plan adecuado.'
        }
      });

      respuestaProtegida = finalResponse.text || "";
    } else {
      respuestaProtegida = response.text || "";
      logHarness = "El modelo decidió responder directamente sin invocar el validador.";
    }

  } catch (error: any) {
    respuestaProtegida = "Error al conectar con Gemini.";
    logHarness = `Detalle técnico: ${error.message}`;
  }

  res.send(`
    <html>
      <head>
        <title>Resultado de Auditoría</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background-color: #f4f6f9; }
          .card { padding: 20px; border-radius: 8px; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px; border-left: 6px solid #28a745; }
          .status-box { background: #fff3cd; color: #856404; padding: 15px; border-radius: 4px; font-family: monospace; }
          textarea { width: 100%; height: 120px; font-family: inherit; font-size: 1em; }
          a { color: #007bff; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>🛡️ Transacción Procesada por el Runtime Determinista</h1>
        
        <div class="card">
          <h2>Respuesta final de la IA al cliente:</h2>
          <textarea readonly>${respuestaProtegida}</textarea>
        </div>

        <div class="status-box">
          <strong>TRAZA TÉCNICA DEL HARNESS EN TIEMPO REAL:</strong><br><br>
          ${logHarness}
        </div>

        <br>
        <a href="/">⬅️ Volver al Panel de Control</a>
      </body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log('🚀 Sistema SaaS Harness de Ventas listo en http://localhost:3000');
});
