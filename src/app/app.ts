import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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

interface SavedSimulation {
  id: number;
  name: string;
  mode: CalculationMode;
  targetNet: number;
  monthlyTurnover: number;
  fixedCosts: number;
  variableRate: number;
  socialRate: number;
  reserveMonths: number;
  savedAt: string;
}

type NewSimulation = Omit<SavedSimulation, 'id'>;

const SIMULATIONS_URL = 'http://localhost:3000/simulations';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  readonly mode = signal<CalculationMode>('target');
  readonly targetNet = signal(1_200_000);
  readonly monthlyTurnover = signal(3_000_000);
  readonly fixedCosts = signal(450_000);
  readonly variableRate = signal(12);
  readonly socialRate = signal(15);
  readonly reserveMonths = signal(3);
  readonly savedSimulations = signal<SavedSimulation[]>([]);
  readonly saving = signal(false);
  readonly saveMessage = signal('');

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
    const reserveIncome = this.mode() === 'target' ? target : Math.max(0, netIncome);
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
      reserve: (reserveIncome + fixedCosts) * this.reserveMonths(),
      variableShare: variableRate * 100,
      socialShare: socialRate * 100,
      fixedShare,
      netShare: Math.max(0, netIncome / Math.max(turnover, 1) * 100),
      retainedRate,
    };
  });

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadSimulations();
    }
  }

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
    this.targetNet.set(1_200_000);
    this.monthlyTurnover.set(3_000_000);
    this.fixedCosts.set(450_000);
    this.variableRate.set(12);
    this.socialRate.set(15);
    this.reserveMonths.set(3);
    this.mode.set('target');
  }

  saveSimulation(): void {
    const simulation: NewSimulation = {
      name: `${this.mode() === 'target' ? 'Objectif' : 'Prévision'} · ${this.formatAriary(this.mode() === 'target' ? this.targetNet() : this.monthlyTurnover())}`,
      mode: this.mode(),
      targetNet: this.targetNet(),
      monthlyTurnover: this.monthlyTurnover(),
      fixedCosts: this.fixedCosts(),
      variableRate: this.variableRate(),
      socialRate: this.socialRate(),
      reserveMonths: this.reserveMonths(),
      savedAt: new Date().toISOString(),
    };

    this.saving.set(true);
    this.saveMessage.set('');
    this.http.post<SavedSimulation>(SIMULATIONS_URL, simulation).subscribe({
      next: (saved) => {
        this.savedSimulations.update((items) => [saved, ...items]);
        this.saving.set(false);
        this.saveMessage.set('Simulation sauvegardée.');
      },
      error: () => {
        this.saving.set(false);
        this.saveMessage.set('Sauvegarde impossible. Vérifiez que JSON Server est lancé sur le port 3000.');
      },
    });
  }

  loadSimulation(simulation: SavedSimulation): void {
    this.mode.set(simulation.mode);
    this.targetNet.set(simulation.targetNet);
    this.monthlyTurnover.set(simulation.monthlyTurnover);
    this.fixedCosts.set(simulation.fixedCosts);
    this.variableRate.set(simulation.variableRate);
    this.socialRate.set(simulation.socialRate);
    this.reserveMonths.set(simulation.reserveMonths);
    this.saveMessage.set('Simulation chargée.');
  }

  deleteSimulation(simulation: SavedSimulation): void {
    this.http.delete(`${SIMULATIONS_URL}/${simulation.id}`).subscribe({
      next: () => {
        this.savedSimulations.update((items) => items.filter((item) => item.id !== simulation.id));
        this.saveMessage.set('Simulation supprimée.');
      },
      error: () => this.saveMessage.set('Suppression impossible. Vérifiez que JSON Server est lancé.'),
    });
  }

  formatSavedDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  }

  private loadSimulations(): void {
    this.http.get<SavedSimulation[]>(SIMULATIONS_URL).subscribe({
      next: (simulations) => this.savedSimulations.set(simulations.sort((a, b) => b.savedAt.localeCompare(a.savedAt))),
      error: () => this.saveMessage.set('Lancez JSON Server pour activer les sauvegardes.'),
    });
  }

  exportCsv(): void {
    const result = this.metrics();
    const rows = [
      ['Indicateur', 'Valeur'],
      ['Mode', this.mode() === 'target' ? 'Objectif de revenu net' : 'Chiffre d’affaires prévu'],
      ['Devise', 'MGA - Ariary'],
      ['Chiffre d’affaires mensuel estimé', result.turnover.toFixed(0)],
      ['Revenu net mensuel estimé', result.netIncome.toFixed(0)],
      ['Seuil de rentabilité mensuel', result.breakEven.toFixed(0)],
      ['Frais fixes mensuels', result.fixedCosts.toFixed(0)],
      ['Frais variables mensuels', result.variableCosts.toFixed(0)],
      ['Cotisations estimées', result.socialContributions.toFixed(0)],
      ['Réserve conseillée', result.reserve.toFixed(0)],
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

  formatAriary(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'MGA', maximumFractionDigits: 0,
    }).format(value);
  }

  private nonNegative(value: number): number {
    return Math.max(0, value);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
