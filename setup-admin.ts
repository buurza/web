#!/usr/bin/env node
// This script creates the default admin account (admin / admin123)

import { ensureAdmin, prisma } from './src/auth.ts';

console.log('🔐 Creating Admin Account...\n');

const result = await ensureAdmin();

if (result.success) {
  console.log('✅ Admin account created!');
  console.log('\n📋 Login Credentials:');
  console.log('   Email: admin');
  console.log('   Password: admin123');
  console.log('\n⚠️  IMPORTANT: Change your password after first login!\n');
} else {
  console.error('❌ Error creating admin account:', result);
}

await prisma.$disconnect();
