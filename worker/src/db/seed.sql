-- Cloudflare D1 seed: roles, 2 admin users, real categories/districts only.
-- Admin plaintext passwords: super admin = Admin123!, admin = AdminPass123!
-- Hashes generated with Web Crypto PBKDF2 (pbkdf2:$iterations:$salt:$hash, base64url).

PRAGMA foreign_keys = ON;

-- 1. Roles
INSERT INTO roles (role_id, role_name, description) VALUES
(1, 'reader', 'Can read, comment, and manage preferences'),
(2, 'journalist', 'Can create and submit articles'),
(3, 'editor', 'Can review and approve articles'),
(4, 'administrator', 'Manages categories, districts, and user approvals'),
(5, 'super_admin', 'Manages editors, admin accounts, and system access');

-- 2. Super admin user (full_name = 'System Administrator', password = Admin123!)
INSERT INTO users (user_id, full_name, email, password, phone_number, created_at, updated_at) VALUES
(1, 'System Administrator', 'admin@rateduganda.ug', 'pbkdf2:100000:kvIPnsqiYkdfQK4KmBZCyQ==:H7PQM7MWQ2s8BH+oAKFP3uxj5nCE2eVRns6OBcsTXTU=', '+256700000000', '2026-06-18T00:00:00Z', '2026-06-18T00:00:00Z');

INSERT INTO user_roles (user_id, role_id) VALUES (1, 5);

INSERT INTO super_admin (user_id, access_level, system_permissions) VALUES
(1, 'full', '{"users": true, "roles": true, "system": true}');

-- 3. Plain admin user (full_name = 'Demo Administrator', password = AdminPass123!)
INSERT INTO users (user_id, full_name, email, password, phone_number, created_at, updated_at) VALUES
(2, 'Demo Administrator', 'demo.admin@rateduganda.ug', 'pbkdf2:100000:5QtPewpthfub/hVCzzPdJg==:Zlk+4nRaiygNLCX2KnS9FmtukfB6F6XJiUTW4vRz04A=', '+256733333333', '2026-06-18T00:00:00Z', '2026-06-18T00:00:00Z');

INSERT INTO user_roles (user_id, role_id) VALUES (2, 4);

INSERT INTO admin (user_id, admin_level, permissions) VALUES
(2, 'standard', '{"categories": true, "districts": true, "users": true}');

-- 4. Real categories
INSERT INTO categories (category_id, category_name, description, admin_id) VALUES
(1, 'Politics', 'Political news, governance, and policy updates', 1),
(2, 'Business', 'Commerce, markets, investment, and economy', 1),
(3, 'Sports', 'Local and international sports coverage', 1),
(4, 'Technology', 'Innovation, startups, and digital affairs', 1),
(5, 'Health', 'Public health, medical news, and wellness', 1);

-- 5. Real Ugandan districts
INSERT INTO districts (district_id, district_name, region, admin_id) VALUES
(1, 'Kampala', 'Central', 1),
(2, 'Mukono', 'Central', 1),
(3, 'Wakiso', 'Central', 1),
(4, 'Jinja', 'Eastern', 1),
(5, 'Mbarara', 'Western', 1);

-- 6. Scraper sources (only The Independent is reliably active)
INSERT INTO scraped_sources (source_id, source_name, feed_url, site_url, is_active, notes) VALUES
(1, 'Daily Monitor', 'https://www.monitor.co.ug/feed', 'https://www.monitor.co.ug', 0, 'Cloudflare bot protection blocks direct feed access'),
(2, 'New Vision', 'https://www.newvision.co.ug/feed', 'https://www.newvision.co.ug', 0, 'No public RSS feed found at build time'),
(3, 'The Independent', 'https://www.independent.co.ug/feed/', 'https://www.independent.co.ug', 1, 'Working WordPress RSS 2.0 feed'),
(4, 'Nile Post', 'https://nilepost.co.ug/feed', 'https://nilepost.co.ug', 0, 'Feed paths return HTML, not XML'),
(5, 'PML Daily', 'https://pmldaily.com/feed', 'https://pmldaily.com', 0, 'Cloudflare bot protection blocks direct feed access'),
(6, 'Chimp Reports', 'https://chimpreports.com/feed/', 'https://chimpreports.com', 0, 'RSS icon links here but endpoint returns homepage HTML');
