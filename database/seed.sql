-- ═══════════════════════════════════════════════════════════════════
--  GSV Office — Seed Data
--  Default roles, permissions, system settings, and admin user
-- ═══════════════════════════════════════════════════════════════════

-- ─── Default Roles ──────────────────────────────────────────────────
INSERT INTO roles (id, name, description, color, is_system, level) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Super Admin', 'Full system access', '#ef4444', true, 100),
    ('00000000-0000-0000-0000-000000000002', 'Admin', 'Administrative access', '#f97316', true, 80),
    ('00000000-0000-0000-0000-000000000003', 'Manager', 'Department manager access', '#eab308', true, 60),
    ('00000000-0000-0000-0000-000000000004', 'Employee', 'Standard employee access', '#22c55e', true, 40),
    ('00000000-0000-0000-0000-000000000005', 'Guest', 'Limited read-only access', '#94a3b8', true, 10);

-- ─── All Permissions ────────────────────────────────────────────────
INSERT INTO permissions (module, action, description) VALUES
    -- User Management
    ('users', 'read', 'View users list and profiles'),
    ('users', 'create', 'Create new users'),
    ('users', 'update', 'Edit user details'),
    ('users', 'delete', 'Delete users'),
    ('users', 'disable', 'Disable/block user accounts'),
    ('users', 'reset_password', 'Reset user passwords'),
    ('users', 'manage_permissions', 'Manage user-level permission overrides'),
    -- Role Management
    ('roles', 'read', 'View roles'),
    ('roles', 'create', 'Create custom roles'),
    ('roles', 'update', 'Edit roles'),
    ('roles', 'delete', 'Delete custom roles'),
    ('roles', 'assign_permissions', 'Assign permissions to roles'),
    -- Chat
    ('chat', 'read', 'Read messages'),
    ('chat', 'send', 'Send messages'),
    ('chat', 'delete', 'Delete own messages'),
    ('chat', 'delete_any', 'Delete any message (moderation)'),
    ('chat', 'forward', 'Forward messages'),
    ('chat', 'download_attachments', 'Download chat attachments'),
    ('chat', 'create_groups', 'Create group chats'),
    ('chat', 'manage_groups', 'Manage group chats (add/remove members)'),
    ('chat', 'broadcast', 'Send broadcast messages'),
    ('chat', 'pin_messages', 'Pin messages in conversations'),
    -- Files
    ('files', 'read', 'View files and folders'),
    ('files', 'upload', 'Upload files'),
    ('files', 'download', 'Download files'),
    ('files', 'delete', 'Delete own files'),
    ('files', 'delete_any', 'Delete any file'),
    ('files', 'create_folder', 'Create folders'),
    ('files', 'share', 'Share files and folders'),
    ('files', 'manage_shares', 'Manage all file shares'),
    -- Tickets
    ('tickets', 'read', 'View tickets'),
    ('tickets', 'create', 'Raise tickets'),
    ('tickets', 'update', 'Update ticket details'),
    ('tickets', 'assign', 'Assign tickets'),
    ('tickets', 'escalate', 'Escalate tickets'),
    ('tickets', 'close', 'Close/resolve tickets'),
    ('tickets', 'reopen', 'Reopen closed tickets'),
    ('tickets', 'delete', 'Delete tickets'),
    ('tickets', 'internal_notes', 'Add internal notes'),
    ('tickets', 'view_analytics', 'View ticket analytics'),
    -- Email
    ('email', 'read', 'Read emails'),
    ('email', 'send', 'Send emails'),
    ('email', 'delete', 'Delete emails'),
    ('email', 'manage_accounts', 'Manage email accounts'),
    -- Billing
    ('billing', 'read', 'View invoices and billing'),
    ('billing', 'create', 'Create invoices and quotations'),
    ('billing', 'update', 'Edit invoices'),
    ('billing', 'delete', 'Delete invoices'),
    ('billing', 'manage_payments', 'Record payments'),
    ('billing', 'export_pdf', 'Export invoices to PDF'),
    ('billing', 'manage_customers', 'Manage customer records'),
    -- Inventory
    ('inventory', 'read', 'View inventory'),
    ('inventory', 'create', 'Add products'),
    ('inventory', 'update', 'Update product details'),
    ('inventory', 'delete', 'Delete products'),
    ('inventory', 'adjust_stock', 'Adjust stock quantities'),
    ('inventory', 'view_analytics', 'View inventory analytics'),
    -- Purchase
    ('purchase', 'read', 'View purchase orders'),
    ('purchase', 'create', 'Create purchase orders'),
    ('purchase', 'update', 'Edit purchase orders'),
    ('purchase', 'approve', 'Approve purchase orders'),
    ('purchase', 'receive', 'Process GRNs'),
    ('purchase', 'manage_suppliers', 'Manage suppliers'),
    -- Dashboard & Analytics
    ('dashboard', 'view', 'View dashboard'),
    ('dashboard', 'view_financials', 'View financial metrics'),
    ('dashboard', 'view_system', 'View system health metrics'),
    -- Notifications
    ('notifications', 'read', 'View notifications'),
    ('notifications', 'manage', 'Manage notification settings'),
    -- Plugins
    ('plugins', 'read', 'View installed plugins'),
    ('plugins', 'install', 'Install plugins'),
    ('plugins', 'enable_disable', 'Enable/disable plugins'),
    ('plugins', 'remove', 'Remove plugins'),
    ('plugins', 'configure', 'Configure plugin settings'),
    -- Server Administration
    ('server', 'view', 'View server settings'),
    ('server', 'configure', 'Change server configuration'),
    ('server', 'view_logs', 'View system logs'),
    ('server', 'backup', 'Create/manage backups'),
    ('server', 'restore', 'Restore backups'),
    -- Departments
    ('departments', 'read', 'View departments'),
    ('departments', 'create', 'Create departments'),
    ('departments', 'update', 'Update departments'),
    ('departments', 'delete', 'Delete departments');

-- ─── Super Admin: All permissions ──────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT '00000000-0000-0000-0000-000000000001', id, true FROM permissions;

-- ─── Admin: Most permissions (no server admin) ──────────────────────
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT '00000000-0000-0000-0000-000000000002', id, true
FROM permissions
WHERE (module, action) NOT IN (
    ('server', 'restore'),
    ('plugins', 'remove')
);

-- ─── Manager permissions ────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT '00000000-0000-0000-0000-000000000003', id, true
FROM permissions
WHERE module IN ('chat', 'files', 'tickets', 'email', 'billing', 'inventory', 'purchase', 'dashboard', 'notifications', 'departments')
   OR (module = 'users' AND action IN ('read'))
   OR (module = 'roles' AND action = 'read')
   AND (module, action) NOT IN (
       ('chat', 'delete_any'),
       ('files', 'delete_any'),
       ('tickets', 'delete'),
       ('billing', 'delete'),
       ('inventory', 'delete')
   );

-- ─── Employee permissions ────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT '00000000-0000-0000-0000-000000000004', id, true
FROM permissions
WHERE (module = 'chat' AND action IN ('read', 'send', 'delete', 'forward', 'download_attachments', 'create_groups'))
   OR (module = 'files' AND action IN ('read', 'upload', 'download', 'delete', 'create_folder', 'share'))
   OR (module = 'tickets' AND action IN ('read', 'create', 'update'))
   OR (module = 'email' AND action IN ('read', 'send', 'delete'))
   OR (module = 'dashboard' AND action = 'view')
   OR (module = 'notifications' AND action = 'read')
   OR (module = 'inventory' AND action = 'read')
   OR (module = 'billing' AND action = 'read')
   OR (module = 'departments' AND action = 'read');

-- ─── Guest permissions ────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT '00000000-0000-0000-0000-000000000005', id, true
FROM permissions
WHERE (module = 'chat' AND action = 'read')
   OR (module = 'files' AND action = 'read')
   OR (module = 'tickets' AND action = 'read')
   OR (module = 'dashboard' AND action = 'view')
   OR (module = 'notifications' AND action = 'read');

-- ─── Default Departments ─────────────────────────────────────────────
INSERT INTO departments (id, name, description, color) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Administration', 'Administrative Department', '#6366f1'),
    ('10000000-0000-0000-0000-000000000002', 'IT', 'Information Technology', '#0ea5e9'),
    ('10000000-0000-0000-0000-000000000003', 'HR', 'Human Resources', '#ec4899'),
    ('10000000-0000-0000-0000-000000000004', 'Sales', 'Sales Department', '#f97316'),
    ('10000000-0000-0000-0000-000000000005', 'Finance', 'Finance & Accounts', '#22c55e'),
    ('10000000-0000-0000-0000-000000000006', 'Operations', 'Operations', '#eab308');

-- ─── Default Admin User ──────────────────────────────────────────────
-- Password: Admin@GSV2024 (bcrypt hash)
INSERT INTO users (
    id, employee_id, login_id, email, password_hash, full_name, first_name, last_name,
    department_id, designation, role_id, status, email_verified, timezone
) VALUES (
    '20000000-0000-0000-0000-000000000001',
    'EMP-0001',
    'admin',
    'admin@gsv.local',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeEfVRkJpkgXOzNSO', -- Admin@GSV2024
    'System Administrator',
    'System',
    'Administrator',
    '10000000-0000-0000-0000-000000000001',
    'System Administrator',
    '00000000-0000-0000-0000-000000000001',
    'active',
    true,
    'Asia/Kolkata'
);

-- ─── Default Warehouse ────────────────────────────────────────────────
INSERT INTO warehouses (id, code, name, is_default) VALUES
    ('30000000-0000-0000-0000-000000000001', 'WH-001', 'Main Warehouse', true);

-- ─── Default Number Sequences ─────────────────────────────────────────
INSERT INTO number_sequences (type, prefix, current_number, pad_length, reset_yearly, format) VALUES
    ('invoice', 'INV', 0, 4, true, 'PREFIX-YEAR-NUMBER'),
    ('quotation', 'QT', 0, 4, true, 'PREFIX-YEAR-NUMBER'),
    ('estimate', 'EST', 0, 4, true, 'PREFIX-YEAR-NUMBER'),
    ('sales_order', 'SO', 0, 4, true, 'PREFIX-YEAR-NUMBER'),
    ('credit_note', 'CN', 0, 4, true, 'PREFIX-YEAR-NUMBER'),
    ('debit_note', 'DN', 0, 4, true, 'PREFIX-YEAR-NUMBER'),
    ('purchase_order', 'PO', 0, 4, true, 'PREFIX-YEAR-NUMBER'),
    ('grn', 'GRN', 0, 4, true, 'PREFIX-YEAR-NUMBER'),
    ('ticket', 'TKT', 0, 5, false, 'PREFIX-NUMBER'),
    ('employee', 'EMP', 1, 4, false, 'PREFIX-NUMBER');

-- ─── Default System Settings ─────────────────────────────────────────
INSERT INTO system_settings (key, value, category, description, is_public) VALUES
    ('company_name', 'GSV Office', 'branding', 'Company/Platform name', true),
    ('company_logo', '/assets/logo.png', 'branding', 'Company logo URL', true),
    ('primary_color', '#6366f1', 'branding', 'Primary theme color', true),
    ('secondary_color', '#8b5cf6', 'branding', 'Secondary theme color', true),
    ('default_timezone', 'Asia/Kolkata', 'general', 'Default timezone', true),
    ('default_currency', 'INR', 'billing', 'Default currency code', true),
    ('currency_symbol', '₹', 'billing', 'Currency symbol', true),
    ('tax_label', 'GST', 'billing', 'Tax label', true),
    ('default_tax_rate', '18', 'billing', 'Default GST rate %', false),
    ('gstin', '', 'billing', 'Company GSTIN', false),
    ('pan', '', 'billing', 'Company PAN', false),
    ('invoice_notes', 'Thank you for your business!', 'billing', 'Default invoice notes', false),
    ('invoice_terms', 'Payment due within 30 days.', 'billing', 'Default invoice terms', false),
    ('sla_default_hours', '24', 'tickets', 'Default SLA hours for tickets', false),
    ('max_upload_size_mb', '500', 'files', 'Maximum file upload size in MB', false),
    ('chat_message_retention_days', '365', 'chat', 'Days to retain chat messages', false),
    ('maintenance_mode', 'false', 'system', 'Enable maintenance mode', false),
    ('allow_registration', 'false', 'auth', 'Allow self-registration', false),
    ('session_timeout_minutes', '60', 'auth', 'Session timeout in minutes', false);

-- ─── Default Product Category ─────────────────────────────────────────
INSERT INTO product_categories (id, name, description) VALUES
    ('40000000-0000-0000-0000-000000000001', 'General', 'General products');

-- ─── Default Ticket Category ─────────────────────────────────────────
INSERT INTO ticket_categories (id, name, description, sla_hours, is_active) VALUES
    ('50000000-0000-0000-0000-000000000001', 'General IT Support', 'General IT issues', 24, true),
    ('50000000-0000-0000-0000-000000000002', 'Hardware Issue', 'Hardware related problems', 48, true),
    ('50000000-0000-0000-0000-000000000003', 'Software Issue', 'Software related problems', 24, true),
    ('50000000-0000-0000-0000-000000000004', 'Network Issue', 'Network connectivity issues', 4, true),
    ('50000000-0000-0000-0000-000000000005', 'Account Access', 'Login or account issues', 2, true);
