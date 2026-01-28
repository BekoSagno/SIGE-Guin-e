import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Testing connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Connection successful!');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
