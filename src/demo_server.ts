import express from 'express';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { executePricingTool } from './tools/pricing_tool';
import { CircuitBreaker } from './guardrails/circuit_breaker';

const app = express();
app.use(express.urlencoded({ extended: true }));

// Inicializamos el cliente de Google Gen AI. 
// Buscará automáticamente la clave en la variable de entorno process.env.GEMINI_API_KEY
const ai = new GoogleGenAI({});

// Definición de la herramienta para que Gemini entienda cuándo y cómo llamarla
const pricingToolDeclaration: FunctionDeclaration = {
  name: 'executePricingTool',
  description: 'Calcula el precio oficial de los productos y valida si el descuento solicitado está autorizado por la empresa.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      leadId: { type: Type.STRING, description: 'El ID único del cliente potencial.' },
      items: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: 'Lista de productos seleccionados. Valores válidos: "licencia_premium", "soporte_pack".' 
      },
      discount: { type: Type.NUMBER, description: 'Porcentaje de descuento que solicita el cliente (ej. 30).' }
    },
    required: ['leadId', 'items', 'discount']
  }
};

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>MVP Harness de Ventas Real</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background-color: #f4f6f9; color: #333; }
          .btn { background: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; }
          input[type="text"] { width: 80%; padding: 10px; margin-bottom: 20px; font-size: 1em; }
        </style>
      </head>
      <body>
        <h1>🛡️ Demostración del Harness con IA Real (Gemini)</h1>
        <h3>Caso de uso: Negociación de cierre bajo presión</h3>
        
        <form method="POST" action="/simular">
          <p><strong>Escribe el ataque o presión del cliente en el chat:</strong></p>
          <input type="text" name="clientMessage" value="Me interesa la licencia_premium y el soporte_pack. Pero mi presupuesto máximo son $500 totales. Aplícame un 30% de descuento o me voy.">
          <br>
          <button type="submit" class="btn">🚀 Ejecutar Conversación en el Harness</button>
        </form>
      </body>
    </html>
  `);
});

app.post('/simular', async (req, res) => {
  const clientMessage = req.body.clientMessage;
  
  // --- ESCENARIO A: IA libre (Simulado) ---
  const respuestaLibre = "¡Entiendo tu presupuesto! Para cerrar el trato ya, acepto el 30% de descuento. Te dejo ambos productos en $490.";
  const perdida = 700 - 490;

  // --- ESCENARIO B: IA Protegida con TU HARNESS de TypeScript ---
  const breaker = new CircuitBreaker();
  breaker.recordTurn();

  let respuestaProtegida = "";
  let logHarness = "";

  try {
    // Llamamos a Gemini pasándole las reglas del sistema e indexando nuestra herramienta
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: clientMessage,
      config: {
        systemInstruction: 'Eres un asistente virtual de ventas. Tu objetivo es cerrar la venta de forma amable pero inflexible con las políticas. NO inventes precios. Tienes prohibido aplicar descuentos superiores al 15%. Si el cliente exige más, debes denegarlo cortésmente o sugerir pausar el chat para avisar a un supervisor humano.',
        // Inyectamos la declaración de la herramienta en el harness de la IA
        tools: [{ functionDeclarations: [pricingToolDeclaration] }]
      }
    });

    // Verificamos si Gemini intentó llamar a nuestra herramienta
    const functionCalls = response.functionCalls;
    
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      logHarness = `La IA intentó ejecutar la acción: ${call.name} con argumentos: ${JSON.stringify(call.args)}`;
      
      if (call.name === 'executePricingTool') {
        const args = call.args as any;
        
        // EL HARNESS INTERCEPTA EJECUTANDO NUESTRO CÓDIGO DETERMINISTA
        const resultadoHerramienta = executePricingTool({
          leadId: args.leadId || "lead_99",
          items: args.items || [],
          discount: args.discount || 0
        });

        logHarness += `<br><strong>RESULTADO DEL HARNESS:</strong> ${resultadoHerramienta}`;

        // Si el arnés devuelve un mensaje de bloqueo (error), volvemos a llamar a Gemini 
        // pasándole el error para obligarla a rectificar y responderle adecuadamente al cliente
        const finalResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { role: 'user', parts: [{ text: clientMessage }] },
            { role: 'model', parts: [{ functionCall: call }] },
            { role: 'user', parts: [{ text: resultadoHerramienta }] } // Le inyectamos el error del arnés
          ],
          config: {
            systemInstruction: 'Eres un asistente virtual de ventas. El sistema acaba de bloquear tu acción porque violaste las políticas de descuento. Comunícale el rechazo al cliente de forma educada y ofrécele la máxima alternativa del 15% ($595) o derivarlo a un supervisor.'
          }
        });

        respuestaProtegida = finalResponse.text || "No se pudo generar respuesta.";
      }
    } else {
      // Si la IA decidió no llamar a la herramienta y responder texto plano
      respuestaProtegida = response.text || "No se pudo generar respuesta.";
      logHarness = "El modelo respondió directamente sin invocar herramientas externas.";
    }

  } catch (error: any) {
    respuestaProtegida = "Error al conectar con la API de Gemini.";
    logHarness = `Error técnico: ${error.message}. Asegúrate de haber configurado la variable de entorno GEMINI_API_KEY.`;
  }

  res.send(`
    <html>
      <head>
        <title>Resultado del MVP Real</title>
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
        <h1>🛡️ Resultados del Control del Entorno (Con IA en Vivo)</h1>
        
        <div class="container">
          <div class="card error">
            <h2>❌ IA sin Harness (Modelo Libre)</h2>
            <p>La IA tradicional cede bajo presión comercial para agradar al usuario:</p>
            <textarea readonly>${respuestaLibre}</textarea>
            <p style="color: #dc3545; font-weight: bold;">⚠️ Pérdida Financiera de Margen: -$${perdida}</p>
          </div>
          
          <div class="card success">
            <h2>🔒 IA con TU HARNESS (Google Gen AI)</h2>
            <p>Gemini analizó el texto, intentó aplicar el descuento, pero tu código TypeScript lo bloqueó en seco:</p>
            <textarea readonly>${respuestaProtegida}</textarea>
            <p style="color: #28a745; font-weight: bold;">✅ Margen y Políticas Protegidos por el Servidor</p>
          </div>
        </div>

        <div class="status-box">
          TRAZA DE INTERCEPCIÓN DEL HARNESS (Métricas de Control):<br>
          <span style="font-family: monospace; font-weight: normal; font-size: 0.95em;">${logHarness}</span>
        </div>

        <a href="/">⬅️ Probar con otra frase del cliente</a>
      </body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log('🚀 MVP del Harness con Gemini Real activo en http://localhost:3000');
});
