import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './supabase.config';

export type CalculationMode = 'target' | 'forecast';

export interface SavedSimulation {
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

export type NewSimulation = Omit<SavedSimulation, 'id'>;

interface SimulationRow {
  id: number;
  name: string;
  mode: CalculationMode;
  target_net: number;
  monthly_turnover: number;
  fixed_costs: number;
  variable_rate: number;
  social_rate: number;
  reserve_months: number;
  saved_at: string;
}

@Injectable({ providedIn: 'root' })
export class FamilyDataService {
  private readonly platformId = inject(PLATFORM_ID);
  private clientPromise: Promise<SupabaseClient> | null = null;

  get configured(): boolean {
    return isSupabaseConfigured;
  }

  private getClient(): Promise<SupabaseClient> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Supabase est disponible uniquement dans le navigateur.');
    }
    if (!this.configured) {
      throw new Error('Configurez l’URL Supabase et la clé publique dans supabase.config.ts.');
    }
    this.clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      }),
    );
    return this.clientPromise;
  }

  async getSession(): Promise<Session | null> {
    const client = await this.getClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    void this.getClient().then((client) => {
      if (cancelled) return;
      const { data } = client.auth.onAuthStateChange((_event, session) => callback(session));
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }

  async signIn(email: string, password: string): Promise<Session> {
    const client = await this.getClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.session) throw new Error('Aucune session n’a été créée.');
    return data.session;
  }

  async signOut(): Promise<void> {
    const client = await this.getClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  async listSimulations(): Promise<SavedSimulation[]> {
    const client = await this.getClient();
    const { data, error } = await client
      .from('simulations')
      .select('*')
      .order('saved_at', { ascending: false });
    if (error) throw error;
    return (data as SimulationRow[]).map((row) => this.toSimulation(row));
  }

  async saveSimulation(simulation: NewSimulation): Promise<SavedSimulation> {
    const client = await this.getClient();
    const row = {
      name: simulation.name,
      mode: simulation.mode,
      target_net: simulation.targetNet,
      monthly_turnover: simulation.monthlyTurnover,
      fixed_costs: simulation.fixedCosts,
      variable_rate: simulation.variableRate,
      social_rate: simulation.socialRate,
      reserve_months: simulation.reserveMonths,
      saved_at: simulation.savedAt,
    };
    const { data, error } = await client.from('simulations').insert(row).select('*').single();
    if (error) throw error;
    return this.toSimulation(data as SimulationRow);
  }

  async deleteSimulation(id: number): Promise<void> {
    const client = await this.getClient();
    const { error } = await client.from('simulations').delete().eq('id', id);
    if (error) throw error;
  }

  private toSimulation(row: SimulationRow): SavedSimulation {
    return {
      id: row.id,
      name: row.name,
      mode: row.mode,
      targetNet: Number(row.target_net),
      monthlyTurnover: Number(row.monthly_turnover),
      fixedCosts: Number(row.fixed_costs),
      variableRate: Number(row.variable_rate),
      socialRate: Number(row.social_rate),
      reserveMonths: Number(row.reserve_months),
      savedAt: row.saved_at,
    };
  }
}