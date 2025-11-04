import { BaseModel } from './BaseModel';

export interface PrintJob {
  id: string;
  store_id: string;
  sale_id?: string;
  payment_id?: number;
  ticket_data: Record<string, unknown>;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  retry_count: number;
  max_retries: number;
  error_message?: string;
  printed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePrintJobData {
  store_id: string;
  sale_id?: string;
  payment_id?: number;
  ticket_data: Record<string, unknown>;
  max_retries?: number;
}

export interface UpdatePrintJobData {
  status?: 'pending' | 'printing' | 'completed' | 'failed';
  retry_count?: number;
  error_message?: string;
  printed_at?: string;
}

export class PrintJobModel extends BaseModel {
  async create(data: CreatePrintJobData): Promise<PrintJob> {
    const { data: result, error } = await this.supabase
      .from('print_jobs')
      .insert({
        store_id: data.store_id,
        sale_id: data.sale_id || null,
        payment_id: data.payment_id || null,
        ticket_data: data.ticket_data,
        max_retries: data.max_retries || 3
      })
      .select('*')
      .single();

    if (error) this.handleError(error, 'createPrintJob');
    return result as PrintJob;
  }

  async findById(id: string): Promise<PrintJob | null> {
    const { data, error } = await this.supabase
      .from('print_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error && (error as any).code !== 'PGRST116') this.handleError(error, 'findPrintJobById');
    return (data as PrintJob) || null;
  }

  async findByPaymentId(paymentId: number, storeId: string): Promise<PrintJob | null> {
    const { data, error } = await this.supabase
      .from('print_jobs')
      .select('*')
      .eq('payment_id', paymentId)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && (error as any).code !== 'PGRST116') this.handleError(error, 'findPrintJobByPaymentId');
    return (data as PrintJob) || null;
  }

  async findBySaleId(saleId: string): Promise<PrintJob | null> {
    const { data, error } = await this.supabase
      .from('print_jobs')
      .select('*')
      .eq('sale_id', saleId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && (error as any).code !== 'PGRST116') this.handleError(error, 'findPrintJobBySaleId');
    return (data as PrintJob) || null;
  }

  async findPendingJobs(storeId: string, limit = 10): Promise<PrintJob[]> {
    const { data, error } = await this.supabase
      .from('print_jobs')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'pending')
      .lt('retry_count', 'max_retries')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) this.handleError(error, 'findPendingPrintJobs');
    return (data || []) as PrintJob[];
  }

  async findFailedJobs(storeId: string, limit = 10): Promise<PrintJob[]> {
    const { data, error } = await this.supabase
      .from('print_jobs')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) this.handleError(error, 'findFailedPrintJobs');
    return (data || []) as PrintJob[];
  }

  async update(id: string, data: UpdatePrintJobData): Promise<PrintJob> {
    const updateData: Record<string, unknown> = {};

    if (data.status !== undefined) updateData['status'] = data.status;
    if (data.retry_count !== undefined) updateData['retry_count'] = data.retry_count;
    if (data.error_message !== undefined) updateData['error_message'] = data.error_message;
    if (data.printed_at !== undefined) updateData['printed_at'] = data.printed_at;

    const { data: result, error } = await this.supabase
      .from('print_jobs')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) this.handleError(error, 'updatePrintJob');
    return result as PrintJob;
  }

  async incrementRetryCount(id: string): Promise<PrintJob> {
    const { data: current } = await this.supabase
      .from('print_jobs')
      .select('retry_count')
      .eq('id', id)
      .single();

    const newRetryCount = ((current as any)?.retry_count || 0) + 1;

    const { data: result, error } = await this.supabase
      .from('print_jobs')
      .update({ retry_count: newRetryCount })
      .eq('id', id)
      .select('*')
      .single();

    if (error) this.handleError(error, 'incrementRetryCount');
    return result as PrintJob;
  }

  async logEvent(
    printJobId: string,
    eventType: 'created' | 'retry' | 'completed' | 'failed',
    message?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('print_job_logs')
      .insert({
        print_job_id: printJobId,
        event_type: eventType,
        message: message || null
      });

    if (error) this.handleError(error, 'logPrintJobEvent');
  }

  async getJobStats(storeId: string): Promise<{
    total: number;
    pending: number;
    printing: number;
    completed: number;
    failed: number;
  }> {
    const { data, error } = await this.supabase
      .from('print_jobs')
      .select('status')
      .eq('store_id', storeId);

    if (error) this.handleError(error, 'getJobStats');

    const jobs = (data || []) as { status: string }[];
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      printing: jobs.filter(j => j.status === 'printing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length
    };
  }
}
