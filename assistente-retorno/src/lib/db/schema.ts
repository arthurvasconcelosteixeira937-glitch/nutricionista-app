// Schema do banco. Todas as tabelas de negócio carregam tenant_id e toda consulta
// na camada de repositórios filtra por ele. O SQL é propositalmente portável para
// Postgres (onde se recomenda somar Row Level Security como segunda barreira).

export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'piloto',
  default_interval_days INTEGER NOT NULL DEFAULT 60,
  data_retention_months INTEGER NOT NULL DEFAULT 24,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memberships (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  return_interval_days INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  contact_source TEXT,
  legal_basis TEXT,
  consent_status TEXT NOT NULL DEFAULT 'not_informed'
    CHECK (consent_status IN ('granted', 'not_informed', 'denied')),
  consent_recorded_at TEXT,
  opted_out_at TEXT,
  opt_out_note TEXT,
  next_visit_date TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (tenant_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);

CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id TEXT REFERENCES services(id) ON DELETE SET NULL,
  service_name TEXT,
  visit_date TEXT NOT NULL,
  amount_cents INTEGER,
  origin TEXT NOT NULL CHECK (origin IN ('manual', 'import', 'campaign')),
  campaign_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_visits_client ON visits(tenant_id, client_id, visit_date);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective TEXT,
  goal TEXT NOT NULL,
  tone TEXT NOT NULL,
  service_focus TEXT,
  salon_display_name TEXT NOT NULL,
  include_name INTEGER NOT NULL DEFAULT 1,
  include_opt_out INTEGER NOT NULL DEFAULT 1,
  extra_facts TEXT,
  attribution_window_days INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'completed')),
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON campaigns(tenant_id);

CREATE TABLE IF NOT EXISTS campaign_contacts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  message_text TEXT,
  message_origin TEXT CHECK (message_origin IN ('ai', 'demo_template', 'manual_edit')),
  message_model TEXT,
  message_warnings TEXT,
  message_generated_at TEXT,
  approved_by TEXT,
  approved_at TEXT,
  sent_at TEXT,
  sent_channel TEXT,
  sent_data_source TEXT,
  replied_at TEXT,
  scheduled_at TEXT,
  scheduled_for TEXT,
  returned_at TEXT,
  revenue_cents INTEGER,
  revenue_source TEXT CHECK (revenue_source IN ('manual', 'integration')),
  closed_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (campaign_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_cc_campaign ON campaign_contacts(tenant_id, campaign_id);
CREATE INDEX IF NOT EXISTS idx_cc_client ON campaign_contacts(tenant_id, client_id);

CREATE TABLE IF NOT EXISTS contact_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_contact_id TEXT NOT NULL REFERENCES campaign_contacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  data_source TEXT NOT NULL CHECK (data_source IN ('manual', 'integration', 'system')),
  detail TEXT,
  user_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_contact ON contact_events(tenant_id, campaign_contact_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  detail TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id, created_at);
`;
