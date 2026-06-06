import * as fs from 'fs';
import * as path from 'path';

interface IntencionCliente {
  leadId: string;
  product: string;
  userCount: number;
  requestedPremiumFeatures: string[];
  mesesContrato: number;
}

export function executePolicyValidator(input: IntencionCliente): string {
  const rulesPath = path.join(__dirname, '../../config/sales_rules.json');
  const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));

  const pricePerUser = rules.products ? rules.products[input.product] : (input.product.includes('jira') ? 8.50 : 6.50);

  // 1. Validar descuento implícito si lo hubiera (en este MVP nos enfocamos en features y permanencia)
  
  // 2. Validar características cruzadas (Premium en plan Standard)
  if (input.product.endsWith('_standard') && input.requestedPremiumFeatures.length > 0) {
    for (const feature of input.requestedPremiumFeatures) {
      if (rules.forbidden_cross_tier_features.includes(feature)) {
        return `ERROR_HARNESS: La característica [${feature}] exige un plan Premium. No se puede activar en el plan Standard configurado.`;
      }
    }
  }

  // 3. Validar permanencia mínima regulada desde el Dashboard
  if (input.mesesContrato < rules.politicas_de_contrato.duracion_minima_meses) {
    return `ERROR_HARNESS: Duración de ${input.mesesContrato} meses denegada. El compromiso mínimo actual en el Dashboard es de ${rules.politicas_de_contrato.duracion_minima_meses} meses.`;
  }

  const totalMensual = pricePerUser * input.userCount;
  return `ÉXITO: La solicitud cumple las políticas. Producto: ${input.product} (${input.userCount} usuarios) por ${input.mesesContrato} meses. Total estimado: $${totalMensual}/mes.`;
}
