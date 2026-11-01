ALTER TABLE payments
  ADD COLUMN payment_method VARCHAR(32) NOT NULL DEFAULT 'UPI',
  ADD COLUMN installment_id BIGINT NULL,
  ADD COLUMN confirmed_at TIMESTAMP NULL,
  ADD COLUMN confirmed_by BIGINT NULL,
  ADD CONSTRAINT fk_pay_installment FOREIGN KEY(installment_id) REFERENCES installments(id);

ALTER TABLE merchants
  ADD COLUMN remind_days_before INT NOT NULL DEFAULT 3,
  ADD COLUMN accepted_payment_methods VARCHAR(120) NOT NULL DEFAULT 'UPI,BANK_TRANSFER,CASH',
  ADD COLUMN default_language VARCHAR(8) NOT NULL DEFAULT 'en';
