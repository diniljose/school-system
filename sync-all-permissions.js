/**
 * Comprehensive script to sync all role permissions across all school databases
 * Run: node sync-all-permissions.js
 */
const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';

// Complete permission definitions for each role
const ROLE_PERMISSIONS = {
  principal: [
    'user:view', 'user:create', 'user:update',
    'role:view', 'role:create', 'role:update', 'role:delete',
    'dashboard:view',
    'student:view', 'student:create', 'student:update', 'student:approve',
    'teacher:view', 'teacher:create', 'teacher:update', 'teacher:approve',
    'parent:view', 'parent:create', 'parent:update',
    'class:view', 'class:create', 'class:update',
    'subject:view', 'subject:create', 'subject:update',
    'section:view', 'section:create', 'section:update', 'section:delete',
    'exam:view', 'exam:create', 'exam:update',
    'result:view', 'result:create', 'result:update', 'result:publish',
    'fee:view', 'fee:create', 'fee:update',
    'attendance:view', 'attendance:create', 'attendance:update',
    'timetable:view', 'timetable:create', 'timetable:update',
    'transport:view', 'transport:create', 'transport:update',
    'academic-year:view', 'academic-year:create', 'academic-year:update',
    'report:view', 'report:export',
    'settings:view', 'settings:update',
    'notification:create', 'notification:view',
    'transfer:view', 'transfer:create', 'transfer:update', 'transfer:approve',
    'promotion:view', 'promotion:create', 'promotion:update', 'promotion:execute',
    'enrollment:create', 'enrollment:view', 'enrollment:update', 'enrollment:bulk',
    'event:create', 'event:view', 'event:update', 'event:delete',
    'class-assignment:create', 'class-assignment:view', 'class-assignment:update', 'class-assignment:delete',
    'school:view', 'school:update',
  ],
  vice_principal: [
    'user:view', 'user:create', 'user:update',
    'role:view', 'role:create', 'role:update',
    'dashboard:view',
    'student:view', 'student:create', 'student:update', 'student:approve',
    'teacher:view', 'teacher:create', 'teacher:update', 'teacher:approve',
    'parent:view', 'parent:create', 'parent:update',
    'class:view', 'class:create', 'class:update',
    'subject:view', 'subject:create', 'subject:update',
    'section:view', 'section:create', 'section:update', 'section:delete',
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
    'class-assignment:create', 'class-assignment:view', 'class-assignment:update', 'class-assignment:delete',
    'school:view',
  ],
  class_teacher: [
    'dashboard:view',
    'student:view', 'student:create', 'student:update', 'student:approve',
    'parent:view', 'parent:create', 'parent:update',
    'class:view',
    'subject:view',
    'section:view',
    'teacher:view',
    'exam:view',
    'result:view', 'result:create', 'result:update',
    'attendance:view', 'attendance:create', 'attendance:update',
    'timetable:view',
    'report:view',
    'notification:create', 'notification:view',
    'enrollment:view', 'enrollment:create',
    'event:view',
    'class-assignment:view', 'class-assignment:create', 'class-assignment:update',
  ],
  teacher: [
    'dashboard:view',
    'student:view',
    'parent:view',
    'class:view',
    'subject:view',
    'section:view',
    'teacher:view',
    'exam:view',
    'result:view', 'result:create', 'result:update',
    'attendance:view', 'attendance:create', 'attendance:update',
    'timetable:view',
    'notification:view',
    'event:view',
    'class-assignment:view',
  ],
  subject_teacher: [
    'dashboard:view',
    'student:view',
    'class:view',
    'subject:view',
    'section:view',
    'teacher:view',
    'exam:view',
    'result:view', 'result:create', 'result:update',
    'attendance:view', 'attendance:create', 'attendance:update',
    'timetable:view',
    'notification:view',
    'event:view',
    'class-assignment:view',
  ],
  accountant: [
    'dashboard:view',
    'student:view',
    'parent:view',
    'fee:create', 'fee:view', 'fee:update', 'fee:delete',
    'report:view', 'report:export',
  ],
  librarian: [
    'dashboard:view',
    'student:view',
    'teacher:view',
    'class:view',
  ],
  receptionist: [
    'dashboard:view',
    'student:view', 'student:create',
    'parent:view', 'parent:create',
    'notification:view',
    'event:view',
  ],
};

async function syncAllPermissions() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    // Get all school databases
    const adminDb = client.db('admin');
    const dbs = await adminDb.admin().listDatabases();
    const schoolDbs = dbs.databases.filter(db => db.name.startsWith('school_'));
    
    console.log(`Found ${schoolDbs.length} school databases`);
    
    for (const schoolDb of schoolDbs) {
      const db = client.db(schoolDb.name);
      console.log(`\nProcessing: ${schoolDb.name}`);
      
      // Update each role with correct permissions
      for (const [roleCode, permissions] of Object.entries(ROLE_PERMISSIONS)) {
        const result = await db.collection('roles').updateOne(
          { code: roleCode },
          { 
            $set: { 
              permissions,
              updatedAt: new Date()
            },
            $setOnInsert: {
              name: roleCode.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
              description: `${roleCode} role with standard permissions`,
              isSystemRole: true,
              isActive: true,
              createdAt: new Date()
            }
          },
          { upsert: true }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`  Updated ${roleCode} role (${permissions.length} permissions)`);
        } else if (result.upsertedCount > 0) {
          console.log(`  Created ${roleCode} role (${permissions.length} permissions)`);
        }
      }
      
      // Also update users who have these roles to have the correct permissions in their tokens
      // This is important for JWT
      const roles = await db.collection('roles').find({}).toArray();
      const rolePermMap = {};
      roles.forEach(r => rolePermMap[r.code] = r.permissions);
      
      // Update users with permissions from their role
      for (const [roleCode, permissions] of Object.entries(rolePermMap)) {
        await db.collection('users').updateMany(
          { role: roleCode },
          { $set: { permissions } }
        );
      }
      console.log(`  Updated user permissions based on roles`);
    }
    
    console.log('\n✅ All school databases updated successfully');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

syncAllPermissions();
