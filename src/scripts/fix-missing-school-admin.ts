/**
 * Fix Missing School Admin
 * Creates an admin user for a school that was approved before the fix
 * Run with: npx ts-node src/scripts/fix-missing-school-admin.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import * as bcrypt from 'bcrypt';
import { TenantDatabaseService } from '../database/tenant-database.service';
import { UserRole } from '../common/enums/roles.enum';

async function bootstrap() {
  console.log('🔧 Fixing missing school admin users...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const tenantDbService = app.get(TenantDatabaseService);

    // School to fix
    const schoolCode = 'SIA-001';
    const adminEmail = 'admin@school.com';
    const adminPassword = 'Admin@123'; // Default password for newly created admin

    // Check if user already exists
    const existingUser = await tenantDbService.findTenantUserByEmail(schoolCode, adminEmail);
    
    if (existingUser) {
      console.log(`✓ Admin user already exists in school ${schoolCode}: ${adminEmail}`);
      console.log('  Resetting password to: Admin@123');
      
      // Update password
      const UserModel = await tenantDbService.getTenantModel<any>(schoolCode, 'User');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await UserModel.updateOne(
        { email: adminEmail },
        { $set: { password: hashedPassword, isActive: true } }
      );
      console.log('  Password reset successfully!');
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      await tenantDbService.createTenantUser(schoolCode, {
        firstName: 'School',
        lastName: 'Admin',
        email: adminEmail,
        passwordHash: hashedPassword,
        role: UserRole.PRINCIPAL,
        phone: '+91-9999999999',
      });
      
      console.log(`✓ Created admin user for school ${schoolCode}: ${adminEmail}`);
    }

    console.log('\n✅ Fix complete!');
    console.log('\n📋 Login Credentials:');
    console.log(`   School: ${schoolCode}`);
    console.log(`   Email: ${adminEmail}`);
    console.log('   Password: Admin@123');
    console.log('\n🌐 Login URL: http://localhost:4200/auth/login');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
