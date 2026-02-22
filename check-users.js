const mongoose = require('mongoose');

async function listUsers() {
  // First list all school databases
  const admin = await mongoose.createConnection('mongodb://localhost:27017/admin').asPromise();
  const adminDb = admin.db;
  const dbs = await adminDb.admin().listDatabases();
  console.log('School databases:');
  const schoolDbs = dbs.databases.filter(d => d.name.startsWith('school_')).map(d => d.name);
  schoolDbs.forEach(d => console.log(' -', d));
  await admin.close();
  
  // Now search for school12 users in each DB
  console.log('\nSearching for school12 users in tenant DBs...');
  for (const dbName of schoolDbs) {
    try {
      const conn = await mongoose.createConnection('mongodb://localhost:27017/' + dbName).asPromise();
      const User = conn.model('User', new mongoose.Schema({}, {strict:false}), 'users');
      const users = await User.find({email: {$regex: 'school12', $options: 'i'}}).select('email role firstName lastName isActive permissions');
      if (users.length > 0) {
        console.log('\n=== Found in', dbName, '===');
        users.forEach(u => {
          console.log('  Email:', u.email);
          console.log('  Role:', u.role);
          console.log('  isActive:', u.isActive);
          console.log('  Permissions:', u.permissions || 'none');
          console.log('');
        });
        
        // Also check roles collection
        const Role = conn.model('Role', new mongoose.Schema({}, {strict:false}), 'roles');
        const roles = await Role.find({}).select('code name permissions isActive');
        console.log('  Roles in this DB:');
        roles.forEach(r => console.log('   -', r.code, '(active:', r.isActive, ') -', r.permissions?.length || 0, 'permissions'));
      }
      await conn.close();
    } catch (e) {
      // Skip
    }
  }
  
  // Also check main DB
  console.log('\nChecking main school_management DB...');
  try {
    const mainConn = await mongoose.createConnection('mongodb://localhost:27017/school_management').asPromise();
    const School = mainConn.model('School', new mongoose.Schema({}, {strict:false}), 'schools');
    const schools = await School.find({}).select('name code status');
    console.log('Schools:');
    schools.forEach(s => console.log(' -', s.code, '-', s.name, '(status:', s.status, ')'));
    await mainConn.close();
  } catch (e) {
    console.log('Error:', e.message);
  }
}

listUsers().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
