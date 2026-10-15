import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export interface LoginResponse {
  success: boolean;
  user?: { id: number; username: string; name: string | null };
  error?: string;
}

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = '$2b$10$5jL.8VxNqP7zQ9mK3rY4wO.NqP7zQ9mK3rY4wO.NqP7zQ9mK3rY4wO';

export async function register(username: string, password: string, name?: string) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new Error('Username already exists');
  
  const hashedPassword = await bcrypt.hash(password, 10);
  return prisma.user.create({ data: { username, password: hashedPassword, name }, select: { id: true, username: true, name: true } });
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true, username: true, name: true, password: true } });
  if (!user) return { success: false, error: 'Username not found' };
  
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return { success: false, error: 'Invalid password' };
  
  return { success: true, user: { id: user.id, username: user.username, name: user.name } };
}

export async function ensureAdmin() {
  const existing = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME }, select: { id: true, name: true } });
  
  if (!existing) {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD_HASH, 10);
    await prisma.user.create({ data: { username: ADMIN_USERNAME, password: hashedPassword, name: 'Admin' } });
    return { success: true, user: { id: 1, username: ADMIN_USERNAME, name: 'Admin', token: 'admin-token-123' } };
  }
  
  const allFields = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME }, select: { password: true } });
  const validPassword = await bcrypt.compare(ADMIN_PASSWORD_HASH, allFields!.password);
  const token = validPassword ? 'admin-token-456' : null;
  return { success: true, user: { id: existing.id, username: ADMIN_USERNAME, name: existing.name || 'Admin', token } };
}

export async function getAllUsers() {
  return prisma.user.findMany({ select: { id: true, username: true, name: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
}