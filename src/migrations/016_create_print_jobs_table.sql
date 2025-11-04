-- Create print_jobs table for tracking thermal printer jobs
CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  payment_id BIGINT,
  ticket_data JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, printing, completed, failed
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  error_message TEXT,
  printed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient queries
CREATE INDEX idx_print_jobs_store_id ON print_jobs(store_id);
CREATE INDEX idx_print_jobs_status ON print_jobs(status);
CREATE INDEX idx_print_jobs_sale_id ON print_jobs(sale_id);
CREATE INDEX idx_print_jobs_payment_id ON print_jobs(payment_id);
CREATE INDEX idx_print_jobs_created_at ON print_jobs(created_at DESC);

-- Create print_job_logs table for audit trail
CREATE TABLE IF NOT EXISTS print_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  print_job_id UUID NOT NULL REFERENCES print_jobs(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- created, retry, completed, failed
  message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_print_job_logs_print_job_id ON print_job_logs(print_job_id);
