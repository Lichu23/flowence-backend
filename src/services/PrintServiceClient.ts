/**
 * Print Service Client
 * Communicates with local print service for thermal printer operations
 */

export interface PrintRequest {
  jobId: string;
  ticketData: string; // ESC/POS formatted ticket
  printerType?: 'usb' | 'network' | 'bluetooth';
  printerName?: string;
  timeout?: number;
}

export interface PrintResponse {
  success: boolean;
  jobId: string;
  message: string;
  printedAt?: string;
  error?: string;
}

export interface PrintServiceHealth {
  status: 'healthy' | 'unhealthy';
  uptime: number;
  printers: PrinterInfo[];
  lastCheck: string;
}

export interface PrinterInfo {
  name: string;
  type: 'usb' | 'network' | 'bluetooth';
  status: 'available' | 'offline' | 'error';
  lastUsed?: string;
}

export class PrintServiceClient {
  private serviceUrl: string;
  private apiKey: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor() {
    const env = process.env as Record<string, string | undefined>;
    this.serviceUrl = env['PRINT_SERVICE_URL'] || 'http://localhost:3001';
    this.apiKey = env['PRINT_SERVICE_API_KEY'] || '';
    this.timeout = parseInt(env['PRINT_SERVICE_TIMEOUT'] || '30000', 10);
    this.maxRetries = parseInt(env['PRINT_SERVICE_MAX_RETRIES'] || '3', 10);
    this.retryDelay = parseInt(env['PRINT_SERVICE_RETRY_DELAY'] || '1000', 10);
  }

  /**
   * Send print job to local print service
   */
  async sendPrintJob(request: PrintRequest): Promise<PrintResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.executePrint(request);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.maxRetries) {
          const delayMs = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          await this.delay(delayMs);
        }
      }
    }

    throw lastError || new Error('Print job failed after maximum retries');
  }

  /**
   * Execute print request with timeout
   */
  private async executePrint(request: PrintRequest): Promise<PrintResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), request.timeout || this.timeout);

    try {
      const response = await fetch(`${this.serviceUrl}/api/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Request-ID': request.jobId
        },
        body: JSON.stringify({
          jobId: request.jobId,
          ticketData: request.ticketData,
          printerType: request.printerType || 'usb',
          printerName: request.printerName
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error(
          `Print service error: ${response.status} ${response.statusText} - ${(errorData['message'] as string) || ''}`
        );
      }

      return (await response.json()) as PrintResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check print service health
   */
  async checkHealth(): Promise<PrintServiceHealth> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.serviceUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return (await response.json()) as PrintServiceHealth;
    } catch {
      return {
        status: 'unhealthy',
        uptime: 0,
        printers: [],
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Get available printers
   */
  async getPrinters(): Promise<PrinterInfo[]> {
    try {
      const response = await fetch(`${this.serviceUrl}/api/printers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get printers: ${response.status}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      return (data['printers'] as PrinterInfo[]) || [];
    } catch {
      return [];
    }
  }

  /**
   * Get printer status
   */
  async getPrinterStatus(printerName: string): Promise<PrinterInfo | null> {
    try {
      const response = await fetch(`${this.serviceUrl}/api/printers/${encodeURIComponent(printerName)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as Record<string, unknown>;
      return (data['printer'] as PrinterInfo) || null;
    } catch {
      return null;
    }
  }

  /**
   * Cancel print job
   */
  async cancelPrintJob(jobId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.serviceUrl}/api/print/${encodeURIComponent(jobId)}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get print job status
   */
  async getPrintJobStatus(jobId: string): Promise<{
    status: 'pending' | 'printing' | 'completed' | 'failed';
    message?: string;
  } | null> {
    try {
      const response = await fetch(`${this.serviceUrl}/api/print/${encodeURIComponent(jobId)}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as any;
    } catch {
      return null;
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test connection to print service
   */
  async testConnection(): Promise<boolean> {
    try {
      const health = await this.checkHealth();
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }
}
