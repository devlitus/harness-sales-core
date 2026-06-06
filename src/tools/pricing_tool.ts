import * as fs from 'fs';
import * as path from 'path';

const rulesPath = path.join(__dirname, '../../config/sales_rules.json');
const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));

interface AtlassianQuoteInput {
  leadId: string;
  product: string;
  userCount: number;
  requestedPremiumFeatures: string[];
}

export function executePricingTool(input: AtlassianQuoteInput): string {
  const pricePerUser = rules.products[input.product];
  
  if (!pricePerUser) {
    return `ERROR: El producto '${input.product}' no existe en el catálogo oficial de Atlassian.`;
  }

  // Verificar si el cliente pide características Premium/Enterprise estando en un plan Standard
  if (input.product.endsWith('_standard') && input.requestedPremiumFeatures.length > 0) {
    for (const feature of input.requestedPremiumFeatures) {
      if (rules.forbidden_cross_tier_features.includes(feature)) {
        return `ERROR: Operación bloqueada por el Harness. El plan 'Standard' no permite la característica premium: [${feature}]. El cliente debe migrar todo el tier al plan Premium.`;
      }
    }
  }

  const totalMensual = pricePerUser * input.userCount;
  return `ÉXITO: Cotización calculada. Producto: ${input.product} para ${input.userCount} usuarios. Total Mensual de Lista: $${totalMensual}.`;
}
