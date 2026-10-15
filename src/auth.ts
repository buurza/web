import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export interface LoginResponse {
  success: boolean;
  user?: { id: number; username: string; name: string | null };
  error?: string;
}

export async function register(username: string, password: string, name?: string) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new Error('Username already exists');
  
  const hashedPassword = await bcrypt.hash(password, 10);
  return prisma.user.create({ data: { username, password: hashedPassword, name }, select: { id: true, username: true, name: true } });
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true, username: true, name: true, password: true } });
  if (!user) return { success: false, error: 'Username not found' };
  
  // Check if password is plain text (for admin) or hashed (for regular users)
  if (typeof user.password === 'string' && user.password !== '$2b$') {
    // Plain text comparison (admin account)
    if (user.password === password) {
      return { success: true, user: { id: user.id, username: user.username, name: user.name } };
    }
  } else {
    // Bcrypt comparison (regular users)
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return { success: false, error: 'Invalid password' };
    return { success: true, user: { id: user.id, username: user.username, name: user.name } };
  }
  
  return { success: false, error: 'Invalid password' };
}

export async function ensureAdmin() {
  const ADMIN_USERNAME = 'admin';
  const existing = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME }, select: { id: true, name: true } });
  
  if (!existing) {
    console.log('Creating admin user...');
    await prisma.user.create({ data: { username: ADMIN_USERNAME, password: 'admin', name: 'Admin' } });
    return { success: true, user: { id: 1, username: ADMIN_USERNAME, name: 'Admin', token: 'admin-token-123' } };
  }
  
  console.log('Admin verified');
  
  return { success: true, user: { id: existing.id, username: ADMIN_USERNAME, name: existing.name || 'Admin', token: 'admin-token-456' } };
}

export async function getAllUsers() {
  return prisma.user.findMany({ select: { id: true, username: true, name: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
}