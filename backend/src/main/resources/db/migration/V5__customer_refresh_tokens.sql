CREATE TABLE customer_refresh_tokens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_account_id BIGINT NOT NULL,
  family_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  replaced_by BIGINT NULL,
  created_ip VARCHAR(64),
  user_agent VARCHAR(512),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_refresh_account FOREIGN KEY(customer_account_id) REFERENCES customer_accounts(id),
  CONSTRAINT fk_customer_refresh_replaced FOREIGN KEY(replaced_by) REFERENCES customer_refresh_tokens(id),
  INDEX idx_customer_refresh_family(family_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
