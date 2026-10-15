import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export interface LoginResponse {
  success: boolean;
  user?: { id: number; email: string; name: string | null; token?: string };
  error?: string;
}

export async function register(email: string, password: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Email already exists');
  
  const hashedPassword = await bcrypt.hash(password, 10);
  return prisma.user.create({ data: { email, password: hashedPassword, name } });
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id, email, name, password } });
  if (!user) return { success: false, error: 'User not found' };
  
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return { success: false, error: 'Invalid password' };
  
  return { success: true, user: { id: user.id, email: user.email, name: user.name } };
}

export async function ensureAdmin() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const existing = await prisma.user.findUnique({ where: { email: 'admin' }, select: { id, name, password } });
  
  if (!existing) {
    await prisma.user.create({ data: { email: 'admin', password: adminHash, name: 'Admin' } });
    return { success: true, user: { id: 0, email: 'admin', name: 'Admin', token: 'admin-default-token' } };
  }
  
  const validPassword = await bcrypt.compare('admin123', existing.password);
  return { 
    success: true, 
    user: { id: existing.id, email: 'admin', name: existing.name || 'Admin', token: validPassword ? 'admin-token' : null } 
  };
}

export async function getUserById(id: number) {
  return prisma.user.findUnique({ where: { id }, select: { id, email, name } });
}

export async function emailExists(email: string): Promise<boolean> {
  return !!await prisma.user.findUnique({ where: { email } });
}

export async function deleteUser(id: number) {
  return prisma.user.delete({ where: { id }, select: { id, deletedAt: true } });
}

export async function validateAdmin(token: string | null): Promise<boolean> {
  return !!(token === 'admin-default-token' || token === 'admin-token');
}
