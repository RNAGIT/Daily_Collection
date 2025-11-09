import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { User, type IUser } from '@/models/User';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

interface SeedAdmin {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'superadmin';
}

function loadSeedAdmins(): SeedAdmin[] {
  const payload = process.env.SEED_ADMINS;

  if (!payload) {
    console.warn(
      'No SEED_ADMINS environment variable found. Provide a JSON array of admin records. ' +
        'Example: [{"name":"Admin","email":"admin@example.com","password":"ChangeMe123!","role":"superadmin"}]',
    );
    return [];
  }

  try {
    const parsed = JSON.parse(payload) as SeedAdmin[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.warn('SEED_ADMINS parsed successfully but contained no records.');
      return [];
    }
    return parsed;
  } catch (error) {
    console.error('Unable to parse SEED_ADMINS JSON:', error);
    return [];
  }
}

async function seedAdmins() {
  const admins = loadSeedAdmins();

  if (admins.length === 0) {
    console.info('No admin records supplied. Exiting without changes.');
    return;
  }

  await connectDB();

  for (const admin of admins) {
    const { email, name, password, role = 'admin' } = admin;
    if (!email || !password || !name) {
      console.warn(`Skipping incomplete record: ${JSON.stringify(admin)}`);
      continue;
    }

    const existing = await User.findOne({ email });
    if (existing) {
      console.info(`✔ Admin already exists: ${email}`);
      continue;
    }

    const passwordHash = await hashPassword(password);
    const created = await User.create({
      name,
      email,
      password: passwordHash,
      role,
      status: 'active',
    });

    console.info(`✨ Created ${role} account for ${created.email}`);
  }
}

seedAdmins()
  .catch((error) => {
    console.error('Failed to seed admins:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => undefined);
  });


