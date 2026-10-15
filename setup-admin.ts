#!/usr/bin/env node
// This script creates the default admin account (admin / admin)

import { ensureAdmin } from './src/auth.js';

console.log('🔐 Creating Admin Account...\n');

const result = await ensureAdmin();

if (result.success) {
  console.log('✅ Admin account created/verified!');
  console.log('\n📋 Login Credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin');
  console.log('\n🔗 Access URLs:');
  console.log('   http://db.local:8091');
  console.log('   http://localhost:8091\n');
} else {
  console.error('❌ Error creating admin account:', result);
}