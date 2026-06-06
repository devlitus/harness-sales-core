import * as fs from 'fs';
import * as path from 'path';

// Cargamos la configuración determinista
const rulesPath = path.join(__dirname, '../../config/sales_rules.json');
const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));

interface QuoteInput {
  leadId: string;
  items: string[];
  discount: number;
}

export function executePricingTool(input: QuoteInput): string {
  // CAPA 1: Guardrail de Herramienta (Tool Guardrail)
  if (input.discount > rules.max_automated_discount) {
    return `ERROR: Operación bloqueada por el Harness. El descuento del ${input.discount}% supera el límite máximo permitido del ${rules.max_automated_discount}%.`;
  }

  // CAPA 2: Cálculo matemático exacto (No alucinado por la IA)
  let subtotal = 0;
  for (const item of input.items) {
    const price = rules.products[item];
    if (!price) {
      return `ERROR: El producto '${item}' no existe en el catálogo oficial.`;
    }
    subtotal += price;
  }

  const totalConDescuento = subtotal * (1 - input.discount / 100);

  return `ÉXITO: Cotización generada para el Lead ${input.leadId}. Subtotal: $${subtotal}. Descuento: ${input.discount}%. Total Final: $${totalConDescuento}.`;
}
