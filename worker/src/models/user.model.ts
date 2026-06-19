import type { D1Client } from '../utils/db';
import type { User } from '../types';

export interface CreateUserInput {
  full_name: string;
  email: string;
  password: string;
  phone_number?: string | null;
}

export async function findByEmail(db: D1Client, email: string): Promise<User | null> {
  return db.first<User>('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
}

export async function findById(db: D1Client, id: number): Promise<Partial<User> | null> {
  return db.first<Partial<User>>(
    'SELECT user_id, full_name, email, phone_number, profile_picture, created_at, updated_at FROM users WHERE user_id = ?',
    [id]
  );
}

export async function findByIdWithPassword(db: D1Client, id: number): Promise<User | null> {
  return db.first<User>('SELECT * FROM users WHERE user_id = ?', [id]);
}

export async function create(db: D1Client, input: CreateUserInput): Promise<number> {
  const result = await db.run(
    'INSERT INTO users (full_name, email, password, phone_number) VALUES (?, ?, ?, ?)',
    [input.full_name, input.email.toLowerCase(), input.password, input.phone_number ?? null]
  );
  return result.meta.last_row_id ?? 0;
}

export async function getRoles(db: D1Client, userId: number): Promise<string[]> {
  const rows = await db.all<{ role_name: string }>(
    `SELECT r.role_name FROM user_roles ur
     JOIN roles r ON ur.role_id = r.role_id
     WHERE ur.user_id = ?`,
    [userId]
  );
  return rows.map(r => r.role_name);
}

export async function addRole(db: D1Client, userId: number, roleName: string): Promise<void> {
  await db.run(
    `INSERT INTO user_roles (user_id, role_id)
     SELECT ?, role_id FROM roles WHERE role_name = ?
     ON CONFLICT(user_id, role_id) DO UPDATE SET assigned_at = datetime('now')`,
    [userId, roleName]
  );
}

export type UserWithRoles = {
  user_id: number;
  full_name: string;
  email: string;
  phone_number?: string | null;
  created_at: string;
  roles: string;
};

export async function findAll(db: D1Client): Promise<UserWithRoles[]> {
  const rows = await db.all<{
    user_id: number;
    full_name: string;
    email: string;
    phone_number: string | null;
    created_at: string;
    role_name: string | null;
  }>(
    `SELECT u.user_id, u.full_name, u.email, u.phone_number, u.created_at, r.role_name
     FROM users u
     LEFT JOIN user_roles ur ON u.user_id = ur.user_id
     LEFT JOIN roles r ON ur.role_id = r.role_id
     ORDER BY u.created_at DESC`
  );
  const grouped = new Map<number, UserWithRoles>();
  for (const row of rows) {
    const existing = grouped.get(row.user_id);
    if (!existing) {
      grouped.set(row.user_id, {
        user_id: row.user_id,
        full_name: row.full_name,
        email: row.email,
        phone_number: row.phone_number ?? undefined,
        created_at: row.created_at,
        roles: row.role_name ?? '',
      });
    } else if (row.role_name) {
      existing.roles = existing.roles ? `${existing.roles},${row.role_name}` : row.role_name;
    }
  }
  return Array.from(grouped.values());
}

export async function findAllPending(db: D1Client): Promise<UserWithRoles[]> {
  const privileged = ['journalist', 'editor', 'administrator', 'super_admin'];
  const users = await findAll(db);
  return users.filter(u => {
    const userRoles = u.roles.split(',').filter(Boolean);
    return !userRoles.some(r => privileged.includes(r));
  });
}

export async function remove(db: D1Client, userId: number): Promise<void> {
  await db.run('DELETE FROM users WHERE user_id = ?', [userId]);
}
