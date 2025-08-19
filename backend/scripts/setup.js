#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// .envファイルが存在しない場合、.env.exampleからコピー
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✅ .env file created from .env.example');
  console.log('🔧 Please update the .env file with your database configuration');
} else if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists');
} else {
  console.log('⚠️  .env.example not found. Please create .env manually');
}

console.log('\n📋 Next steps:');
console.log('1. Set up PostgreSQL database');
console.log('2. Update DATABASE_URL in .env file');
console.log('3. Run: npm run db:generate');
console.log('4. Run: npm run db:migrate');
console.log('5. Run: npm run dev');