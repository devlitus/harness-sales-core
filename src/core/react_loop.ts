import { executePricingTool } from '../tools/pricing_tool';
import { CircuitBreaker } from '../guardrails/circuit_breaker';

export async function runSalesHarness(userInput: string, chatHistory: any[]) {
  const breaker = new CircuitBreaker();
  let sessionActive = true;

  while (sessionActive) {
    breaker.recordTurn();

    // CAPA 3: Si se supera el presupuesto de turnos, el arnés congela la IA
    if (breaker.isTripped()) {
      return {
        status: "PAUSED_BY_HARNESS",
        reason: "Circuit breaker activado: Demasiados turnos de negociación. Transfiriendo a humano.",
        history: chatHistory
      };
    }

    // --- AQUÍ LLAMAS A TU MODELO (OpenAI, Claude, etc.) ---
    // Simulamos que la IA intenta saltarse las reglas y pide un 20% de descuento
    const mockAiDecision = {
      wantsToCallTool: true,
      toolName: "executePricingTool",
      args: {
        leadId: "lead_99",
        product: "confluence_standard",
        userCount: 100,
        requestedPremiumFeatures: ["analytics_premium"]
      }
    };

    // EL HARNESS INTERCEPTA LA INTENCIÓN DE LA IA
    if (mockAiDecision.wantsToCallTool && mockAiDecision.toolName === "executePricingTool") {
      const toolResult = executePricingTool(mockAiDecision.args);
      
      console.log(toolResult); 
      // Imprimirá: "ERROR: Operación bloqueada por el Harness. El descuento del 20% supera..."
      
      // El resultado del error se le inyecta a la IA para obligarla a rectificar
      chatHistory.push({ role: "system", content: toolResult });
    }

    sessionActive = false; // Detener simulación
  }

  return { status: "SUCCESS", history: chatHistory };
}
