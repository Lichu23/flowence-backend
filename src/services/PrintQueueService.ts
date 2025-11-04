/**
 * Print Queue Service
 * Manages print job queue, retry logic, and integration with print service
 */

import { PrintJobModel, PrintJob } from '../models/PrintJobModel';
import { PrintServiceClient } from './PrintServiceClient';
import { TicketPrinterService, TicketData } from './TicketPrinterService';

export class PrintQueueService {
  private printJobModel = new PrintJobModel();
  private printServiceClient = new PrintServiceClient();
  private ticketPrinterService = new TicketPrinterService();
  private processingJobs = new Set<string>();

  /**
   * Queue a print job
   */
  async queuePrintJob(data: {
    storeId: string;
    ticketData: TicketData;
    saleId?: string;
    paymentId?: number;
  }): Promise<PrintJob> {
    // Generate ESC/POS ticket
    const escPosTicket = this.ticketPrinterService.generateTicket(data.ticketData);

    // Create print job in database
    const printJobData: any = {
      store_id: data.storeId,
      ticket_data: {
        ticketId: data.ticketData.ticketId,
        receiptNumber: data.ticketData.receiptNumber,
        storeName: data.ticketData.storeName,
        total: data.ticketData.total,
        currency: data.ticketData.currency,
        paymentMethod: data.ticketData.paymentInfo
      },
      max_retries: 3
    };

    // Add optional fields if they exist
    if (data.saleId) printJobData.sale_id = data.saleId;
    if (data.paymentId) printJobData.payment_id = data.paymentId;

    const printJob = await this.printJobModel.create(printJobData);

    // Log job creation
    await this.printJobModel.logEvent(printJob.id, 'created', 'Print job queued');

    // Attempt immediate printing
    await this.processPrintJob(printJob.id, escPosTicket);

    return printJob;
  }

  /**
   * Process a print job
   */
  async processPrintJob(jobId: string, escPosTicket: string): Promise<void> {
    // Prevent duplicate processing
    if (this.processingJobs.has(jobId)) {
      return;
    }

    this.processingJobs.add(jobId);

    try {
      const printJob = await this.printJobModel.findById(jobId);
      if (!printJob) {
        throw new Error(`Print job ${jobId} not found`);
      }

      // Skip if already completed or max retries exceeded
      if (printJob.status === 'completed' || printJob.retry_count >= printJob.max_retries) {
        return;
      }

      // Update status to printing
      await this.printJobModel.update(jobId, { status: 'printing' });

      // Send to print service
      const response = await this.printServiceClient.sendPrintJob({
        jobId,
        ticketData: escPosTicket,
        printerType: 'usb'
      });

      if (response.success) {
        // Mark as completed
        await this.printJobModel.update(jobId, {
          status: 'completed',
          printed_at: new Date().toISOString()
        });
        await this.printJobModel.logEvent(jobId, 'completed', 'Ticket printed successfully');
      } else {
        throw new Error(response.error || 'Print service returned error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const printJob = await this.printJobModel.findById(jobId);

      if (printJob && printJob.retry_count < printJob.max_retries) {
        // Retry
        await this.printJobModel.incrementRetryCount(jobId);
        await this.printJobModel.logEvent(
          jobId,
          'retry',
          `Retry attempt ${printJob.retry_count + 1}/${printJob.max_retries}: ${errorMsg}`
        );

        // Schedule retry with exponential backoff
        const delayMs = 1000 * Math.pow(2, printJob.retry_count);
        setTimeout(() => {
          this.processPrintJob(jobId, escPosTicket).catch(() => {
            // Error already logged in processPrintJob
          });
        }, delayMs);
      } else {
        // Mark as failed
        const updateData: Record<string, unknown> = {
          status: 'failed',
          error_message: errorMsg
        };
        await this.printJobModel.update(jobId, updateData as any);
        await this.printJobModel.logEvent(jobId, 'failed', `Failed after ${printJob?.retry_count || 0} retries: ${errorMsg}`);
      }
    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  /**
   * Retry failed print jobs
   */
  async retryFailedJobs(storeId: string): Promise<{ retried: number; failed: number }> {
    const failedJobs = await this.printJobModel.findFailedJobs(storeId, 100);
    let retried = 0;
    let failed = 0;

    for (const job of failedJobs) {
      try {
        // Reset retry count and status
        const updateData: any = {
          status: 'pending',
          retry_count: 0
        };
        
        // Only include error_message if we want to clear it (set to empty string)
        updateData.error_message = '';
        
        await this.printJobModel.update(job.id, updateData);

        // Regenerate ticket and process
        const ticketData = job.ticket_data as any;
        const escPosTicket = this.ticketPrinterService.generateTicket({
          storeId: job.store_id,
          storeName: ticketData.storeName,
          receiptNumber: ticketData.receiptNumber,
          ticketId: ticketData.ticketId,
          dateTime: new Date().toISOString(),
          items: [],
          subtotal: ticketData.total,
          tax: 0,
          total: ticketData.total,
          currency: ticketData.currency,
          paymentInfo: { method: 'cash' }
        });

        await this.processPrintJob(job.id, escPosTicket);
        retried++;
      } catch (error) {
        console.error(`Failed to retry print job ${job.id}:`, error);
        failed++;
      }
    }

    return { retried, failed };
  }

  /**
   * Get print job status
   */
  async getPrintJobStatus(jobId: string): Promise<PrintJob | null> {
    return this.printJobModel.findById(jobId);
  }

  /**
   * Get print statistics for a store
   */
  async getPrintStats(storeId: string): Promise<{
    total: number;
    pending: number;
    printing: number;
    completed: number;
    failed: number;
  }> {
    return this.printJobModel.getJobStats(storeId);
  }

  /**
   * Process pending jobs (called periodically)
   */
  async processPendingJobs(storeId: string): Promise<void> {
    const pendingJobs = await this.printJobModel.findPendingJobs(storeId, 10);

    for (const job of pendingJobs) {
      try {
        const ticketData = job.ticket_data as any;
        const escPosTicket = this.ticketPrinterService.generateTicket({
          storeId: job.store_id,
          storeName: ticketData.storeName,
          receiptNumber: ticketData.receiptNumber,
          ticketId: ticketData.ticketId,
          dateTime: new Date().toISOString(),
          items: [],
          subtotal: ticketData.total,
          tax: 0,
          total: ticketData.total,
          currency: ticketData.currency,
          paymentInfo: { method: 'cash' }
        });

        await this.processPrintJob(job.id, escPosTicket);
      } catch (error) {
        console.error(`Error processing pending print job ${job.id}:`, error);
      }
    }
  }

  /**
   * Check print service health
   */
  async checkPrintServiceHealth(): Promise<boolean> {
    return this.printServiceClient.testConnection();
  }

  /**
   * Get available printers
   */
  async getAvailablePrinters(): Promise<any[]> {
    return this.printServiceClient.getPrinters();
  }
}
