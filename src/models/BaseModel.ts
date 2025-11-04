import { supabaseService } from '../services/SupabaseService';

export abstract class BaseModel {
  protected supabase = supabaseService.getAdminClient();

  protected handleError(error: any, operation: string): never {
    console.error(`${operation} failed:`, error);
    throw new Error(`${operation} failed: ${error.message || 'Unknown error'}`);
  }

  protected async executeQuery<T>(
    queryPromise: Promise<{ data: T | null; error: any }>,
    operation: string
  ): Promise<T> {
    const { data, error } = await queryPromise;
    
    if (error) {
      this.handleError(error, operation);
    }
    
    if (!data) {
      throw new Error(`${operation}: No data returned`);
    }
    
    return data;
  }

  protected async executeQueryArray<T>(
    queryPromise: Promise<{ data: T[] | null; error: any }>,
    operation: string
  ): Promise<T[]> {
    const { data, error } = await queryPromise;
    
    if (error) {
      this.handleError(error, operation);
    }
    
    return data || [];
  }
}
