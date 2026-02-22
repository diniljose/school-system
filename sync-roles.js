/**
 * Migration Script: Add missing roles to all school databases
 * Run this once to ensure all schools have consistent role definitions
 * 
 * Usage: node sync-roles.js
 */
const mongoose = require('mongoose');

// Vice Principal role definition
const VICE_PRINCIPAL_ROLE = {
  name: 'Vice Principal',
  code: 'vice_principal',
  description: 'Vice principal with similar access to principal',
  isSystemRole: true,
  isActive: true,
  permissions: [
    'user:view', 'user:create', 'user:update',
    'role:view', 'role:create', 'role:update',
    'dashboard:view',
    'student:view', 'student:create', 'student:update', 'student:approve',
    'teacher:view', 'teacher:create', 'teacher:update', 'teacher:approve',
    'parent:view', 'parent:create', 'parent:update',
    'class:view', 'class:create', 'class:update',
    'subject:view', 'subject:create', 'subject:update',
    'exam:view', 'exam:create', 'exam:update',
    'result:view', 'result:create', 'result:update', 'result:publish',
    'fee:view', 'fee:create', 'fee:update',
    'attendance:view', 'attendance:create', 'attendance:update',
    'timetable:view', 'timetable:create', 'timetable:update',
    'transport:view', 'transport:create', 'transport:update',
    'academic-year:view', 'academic-year:create', 'academic-year:update',
    'report:view', 'report:export',
    'settings:view',
    'notification:create', 'notification:view',
    'transfer:view', 'transfer:create', 'transfer:update', 'transfer:approve',
    'promotion:view', 'promotion:create', 'promotion:update', 'promotion:execute',
    'enrollment:create', 'enrollment:view', 'enrollment:update', 'enrollment:bulk',
    'event:create', 'event:view', 'event:update', 'event:delete',
  ],
};

// Receptionist role (missing from defaults)
const RECEPTIONIST_ROLE = {
  name: 'Receptionist',
  code: 'receptionist',
  description: 'Front desk staff with limited access',
  isSystemRole: true,
  isActive: true,
  permissions: [
    'dashboard:view',
    'student:view',
    'teacher:view',
    'parent:view',
    'class:view',
    'notification:view',
    'event:view',
  ],
};

async function syncRoles() {
  console.log('=== Role Synchronization Script ===\n');
  
  // Connect to admin to list databases
  const admin = await mongoose.createConnection('mongodb://localhost:27017/admin').asPromise();
  const adminDb = admin.db;
  const dbs = await adminDb.admin().listDatabases();
  
  // Filter for school databases
  const schoolDbs = dbs.databases
    .filter(d => d.name.startsWith('school_') && d.name !== 'school_management')
    .map(d => d.name);
  
  console.log(`Found ${schoolDbs.length} school databases\n`);
  await admin.close();
  
  // Process each school database
  for (const dbName of schoolDbs) {
    console.log(`\nProcessing: ${dbName}`);
    console.log('-'.repeat(50));
    
    try {
      const conn = await mongoose.createConnection(`mongodb://localhost:27017/${dbName}`).asPromise();
      const Role = conn.model('Role', new mongoose.Schema({
        name: String,
        code: { type: String, unique: true },
        description: String,
        permissions: [String],
        isSystemRole: Boolean,
        isActive: Boolean,
      }, { strict: false }), 'roles');
      
      // Check and add vice_principal
      let vpRole = await Role.findOne({ code: 'vice_principal' }).exec();
      if (!vpRole) {
        await Role.create(VICE_PRINCIPAL_ROLE);
        console.log('  ✅ Added: vice_principal');
      } else {
        console.log('  ✓ Exists: vice_principal');
      }
      
      // Check and add receptionist
      let recRole = await Role.findOne({ code: 'receptionist' }).exec();
      if (!recRole) {
        await Role.create(RECEPTIONIST_ROLE);
        console.log('  ✅ Added: receptionist');
      } else {
        console.log('  ✓ Exists: receptionist');
      }
      
      // Verify all roles have required permissions
      const rolesToUpdate = ['principal', 'class_teacher', 'teacher'];
      for (const roleCode of rolesToUpdate) {
        const role = await Role.findOne({ code: roleCode }).exec();
        if (role) {
          let updated = false;
          const requiredPerms = ['dashboard:view', 'subject:view', 'event:view'];
          
          for (const perm of requiredPerms) {
            if (!role.permissions.includes(perm)) {
              role.permissions.push(perm);
              updated = true;
            }
          }
          
          if (updated) {
            await role.save();
            console.log(`  ✅ Updated permissions: ${roleCode}`);
          }
        }
      }
      
      await conn.close();
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n=== Sync Complete ===');
}

syncRoles()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
