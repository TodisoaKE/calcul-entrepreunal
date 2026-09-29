import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

type CalculationMode = 'target' | 'forecast';
type NumericField = 'targetNet' | 'monthlyTurnover' | 'fixedCosts' | 'variableRate' | 'socialRate' | 'reserveMonths';

interface CalculationMetrics {
  turnover: number;
  netIncome: number;
  variableCosts: number;
  socialContributions: number;
  fixedCosts: number;
  breakEven: number;
  annualTurnover: number;
  annualNetIncome: number;
  reserve: number;
  variableShare: number;
  socialShare: number;
  fixedShare: number;
  netShare: number;
  retainedRate: number;
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly mode = signal<CalculationMode>('target');
  readonly targetNet = signal(2800);
  readonly monthlyTurnover = signal(7000);
  readonly fixedCosts = signal(850);
  readonly variableRate = signal(12);
  readonly socialRate = signal(22);
  readonly reserveMonths = signal(3);

  readonly metrics = computed<CalculationMetrics>(() => {
    const variableRate = this.clamp(this.variableRate() / 100, 0, 0.8);
    const socialRate = this.clamp(this.socialRate() / 100, 0, 0.8);
    const retainedRate = Math.max(0.05, 1 - variableRate - socialRate);
    const target = this.nonNegative(this.targetNet());
    const fixedCosts = this.nonNegative(this.fixedCosts());
    const turnover = this.mode() === 'target'
      ? (target + fixedCosts) / retainedRate
      : this.nonNegative(this.monthlyTurnover());
    const variableCosts = turnover * variableRate;
    const socialContributions = turnover * socialRate;
    const netIncome = turnover - variableCosts - socialContributions - fixedCosts;
    const fixedShare = turnover > 0 ? fixedCosts / turnover * 100 : 0;

    return {
      turnover,
      netIncome,
      variableCosts,
      socialContributions,
      fixedCosts,
      breakEven: fixedCosts / retainedRate,
      annualTurnover: turnover * 12,
      annualNetIncome: netIncome * 12,
      reserve: (target + fixedCosts) * this.reserveMonths(),
      variableShare: variableRate * 100,
      socialShare: socialRate * 100,
      fixedShare,
      netShare: Math.max(0, netIncome / Math.max(turnover, 1) * 100),
      retainedRate,
    };
  });

  setMode(mode: CalculationMode): void {
    this.mode.set(mode);
  }

  updateInput(field: NumericField, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;

    switch (field) {
      case 'targetNet': this.targetNet.set(safeValue); break;
      case 'monthlyTurnover': this.monthlyTurnover.set(safeValue); break;
      case 'fixedCosts': this.fixedCosts.set(safeValue); break;
      case 'variableRate': this.variableRate.set(Math.min(80, safeValue)); break;
      case 'socialRate': this.socialRate.set(Math.min(80, safeValue)); break;
      case 'reserveMonths': this.reserveMonths.set(Math.min(12, Math.max(1, safeValue))); break;
    }
  }

  reset(): void {
    this.targetNet.set(2800);
    this.monthlyTurnover.set(7000);
    this.fixedCosts.set(850);
    this.variableRate.set(12);
    this.socialRate.set(22);
    this.reserveMonths.set(3);
    this.mode.set('target');
  }

  exportCsv(): void {
    const result = this.metrics();
    const rows = [
      ['Indicateur', 'Valeur'],
      ['Mode', this.mode() === 'target' ? 'Objectif de revenu net' : 'Chiffre d’affaires prévu'],
      ['Chiffre d’affaires mensuel estimé', result.turnover.toFixed(2)],
      ['Revenu net mensuel estimé', result.netIncome.toFixed(2)],
      ['Seuil de rentabilité mensuel', result.breakEven.toFixed(2)],
      ['Frais fixes mensuels', result.fixedCosts.toFixed(2)],
      ['Frais variables mensuels', result.variableCosts.toFixed(2)],
      ['Cotisations estimées', result.socialContributions.toFixed(2)],
      ['Réserve conseillée', result.reserve.toFixed(2)],
      ['Taux de frais variables', `${this.variableRate()} %`],
      ['Taux de cotisations', `${this.socialRate()} %`],
      ['Durée de réserve', `${this.reserveMonths()} mois`],
    ];
    const csv = '\uFEFF' + rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(';'))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cap-pilotage-simulation.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  formatEuro(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
    }).format(value);
  }

  private nonNegative(value: number): number {
    return Math.max(0, value);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
