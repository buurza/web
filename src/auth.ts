import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Singleton instance for database connection
export const db = new PrismaClient();

// Register a new user (hashes password before storing)
export async function register(email: string, password: string, name?: string) {
  // Hash password with salt rounds=10 for strong security
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Check if user already exists (optional: throw error or handle gracefully)
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('User with this email already exists');
  }
  
  return db.user.create({
    data: { email, password: hashedPassword, name }
  });
}

// Login user and verify credentials
export async function login(email: string, password: string) {
  // Find user by email
  const user = await db.user.findUnique({ where: { email } });
  
  if (!user) return null; // User not found
  
  // Verify password hash
  const validPassword = await bcrypt.compare(password, user.password);
  
  if (!validPassword) return null; // Wrong password
  
  return {
    id: user.id,
    email: user.email,
    name: user.name
  };
}

// Get user by ID
export async function getUserById(id: number) {
  return db.user.findUnique({ where: { id } });
}

// Check if email exists
export async function emailExists(email: string) {
  return db.user.count({ where: { email } }) > 0;
}

// Delete user (for account deletion)
export async function deleteUser(id: number) {
  return db.user.delete({ where: { id } });
}