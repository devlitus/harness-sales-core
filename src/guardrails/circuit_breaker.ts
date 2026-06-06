import * as fs from 'fs';
import * as path from 'path';

const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '../../config/sales_rules.json'), 'utf-8'));

export class CircuitBreaker {
  private turnCount: number = 0;

  // Cada vez que la IA interactúa, el bucle llama a esta función
  public recordTurn(): void {
    this.turnCount++;
  }

  // Verifica si el agente debe ser apagado inmediatamente
  public isTripped(): boolean {
    return this.turnCount >= rules.max_turns_budget;
  }
}
