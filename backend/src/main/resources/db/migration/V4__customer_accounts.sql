CREATE TABLE customer_accounts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(180) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  email_verified_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE customers ADD COLUMN customer_account_id BIGINT NULL;
ALTER TABLE customers
  ADD CONSTRAINT fk_customers_account FOREIGN KEY (customer_account_id) REFERENCES customer_accounts(id),
  ADD INDEX idx_customer_account (customer_account_id);
