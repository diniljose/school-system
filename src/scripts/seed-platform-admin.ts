/**
 * Platform Admin Seeder
 * Creates the initial Platform Admin user(s) who manage the SaaS platform
 * Run with: npx ts-node src/scripts/seed-platform-admin.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from '../database/schemas/user.schema';
import { UserRole } from '../common/enums/roles.enum';

async function bootstrap() {
  console.log('🚀 Starting Platform Admin Seeder...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const userModel = app.get<Model<User>>(getModelToken(User.name));

    // Default Platform Admin credentials
    const platformAdmins = [
      {
        firstName: 'Platform',
        lastName: 'Admin',
        email: 'admin@schoolplatform.com',
        password: 'Admin@123',
        phone: '+91-9999999999',
      },
    ];

    for (const admin of platformAdmins) {
      // Check if already exists
      const existing = await userModel.findOne({ 
        email: admin.email,
        role: UserRole.PLATFORM_ADMIN 
      });

      if (existing) {
        console.log(`✓ Platform Admin already exists: ${admin.email}`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(admin.password, 10);

      // Create Platform Admin
      await userModel.create({
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        password: hashedPassword,
        phone: admin.phone,
        role: UserRole.PLATFORM_ADMIN,
        isActive: true,
        // Platform admins don't belong to any school
        school: null,
      });

      console.log(`✓ Created Platform Admin: ${admin.email}`);
      console.log(`  Password: ${admin.password}`);
    }

    console.log('\n✅ Platform Admin seeding complete!');
    console.log('\n📋 Login Credentials:');
    console.log('   Email: admin@schoolplatform.com');
    console.log('   Password: Admin@123');
    console.log('\n🌐 Platform Admin URL: http://localhost:4200/auth/login');

  } catch (error) {
    console.error('❌ Error seeding Platform Admin:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
