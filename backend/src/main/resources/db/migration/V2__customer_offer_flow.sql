ALTER TABLE merchants ADD COLUMN upi_id VARCHAR(128) NULL;
ALTER TABLE plans
  ADD COLUMN item_name VARCHAR(180) NOT NULL DEFAULT 'Purchase',
  ADD COLUMN down_payment_paise BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN installment_count INT NOT NULL DEFAULT 0,
  ADD COLUMN first_due_date DATE NULL,
  ADD COLUMN agreement_snapshot LONGTEXT NULL,
  ADD COLUMN accepted_at TIMESTAMP NULL;
CREATE TABLE customer_consents (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  plan_id BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  consent_text VARCHAR(1000) NOT NULL,
  ip VARCHAR(64),
  user_agent VARCHAR(512),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_consent_plan FOREIGN KEY(plan_id) REFERENCES plans(id),
  CONSTRAINT fk_consent_customer FOREIGN KEY(customer_id) REFERENCES customers(id),
  INDEX idx_consent_plan_created(plan_id,created_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
