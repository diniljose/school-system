const mongoose = require('mongoose');

async function fix() {
  const conn = await mongoose.createConnection('mongodb://localhost:27017/school_abc_4241').asPromise();
  
  const User = conn.model('User', new mongoose.Schema({}, {strict:false}), 'users');
  const Student = conn.model('Student', new mongoose.Schema({}, {strict:false}), 'students');
  const Teacher = conn.model('Teacher', new mongoose.Schema({}, {strict:false}), 'teachers');
  const Parent = conn.model('Parent', new mongoose.Schema({}, {strict:false}), 'parents');
  
  // Set school field for all users in this tenant database
  const schoolId = new mongoose.Types.ObjectId('699c59aa7b6db8a93d61d646');
  
  const userResult = await User.updateMany(
    { school: { $exists: false } },
    { $set: { school: schoolId } }
  );
  console.log('Updated', userResult.modifiedCount, 'users with school field');
  
  const studentResult = await Student.updateMany(
    { school: { $exists: false } },
    { $set: { school: schoolId } }
  );
  console.log('Updated', studentResult.modifiedCount, 'students with school field');
  
  const teacherResult = await Teacher.updateMany(
    { school: { $exists: false } },
    { $set: { school: schoolId } }
  );
  console.log('Updated', teacherResult.modifiedCount, 'teachers with school field');
  
  const parentResult = await Parent.updateMany(
    { school: { $exists: false } },
    { $set: { school: schoolId } }
  );
  console.log('Updated', parentResult.modifiedCount, 'parents with school field');
  
  // Verify
  const user = await User.findOne({email: 'school13@gmail.com'});
  console.log('\nUser school13@gmail.com now has school:', user.school?.toString());
  
  await conn.close();
  process.exit(0);
}

fix().catch(console.error);
