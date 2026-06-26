ALTER TABLE lesson_credit_ledger ADD COLUMN source_id TEXT;
ALTER TABLE lesson_credit_ledger ADD COLUMN actor_user_id TEXT REFERENCES user_accounts(id) ON DELETE SET NULL;

ALTER TABLE insurance_policies ADD COLUMN review_status TEXT CHECK (review_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE insurance_policies ADD COLUMN source TEXT;
ALTER TABLE insurance_policies ADD COLUMN source_id TEXT;
ALTER TABLE insurance_policies ADD COLUMN actor_user_id TEXT REFERENCES user_accounts(id) ON DELETE SET NULL;
