/**
 * Database Seed Script
 * Clears all data and creates a school with comprehensive sample data.
 *
 * Usage:  node seed.js
 *
 * After running, log in with:
 *   Email: admin@school.com
 *   Password: Admin123!
 */

const http = require('http');

const BASE = 'http://localhost:3000';
let TOKEN = '';

// ── helpers ──────────────────────────────────────────────────────────
function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(
      { hostname: url.hostname, port: url.port, path: url.pathname, method, headers },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const post = (p, b) => request('POST', p, b);
const get = (p) => request('GET', p);
const patch = (p, b) => request('PATCH', p, b);

// ── clear database ──────────────────────────────────────────────────
async function clearDatabase() {
  const { MongoClient } = require('mongodb');
  const client = await MongoClient.connect('mongodb://localhost:27017');
  
  // Clear main platform database
  const db = client.db('school-platform-dev');
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    await db.collection(col.name).deleteMany({});
  }
  
  // Drop any school tenant databases
  const adminDb = client.db('admin');
  const dbs = await adminDb.command({ listDatabases: 1 });
  for (const d of dbs.databases) {
    if (d.name.startsWith('school_')) {
      await client.db(d.name).dropDatabase();
    }
  }
  
  await client.close();
  console.log('✓ Database cleared');
}

// ── create school and admin user directly ────────────────────────────
async function createSchoolDirectly() {
  const { MongoClient, ObjectId } = require('mongodb');
  const bcrypt = require('bcrypt');
  
  const client = await MongoClient.connect('mongodb://localhost:27017');
  const platformDb = client.db('school-platform-dev');
  
  // Create school
  const schoolCode = 'SIA-001';
  const schoolId = new ObjectId();
  const school = {
    _id: schoolId,
    name: 'Sunrise International Academy',
    code: schoolCode,
    slug: 'sunrise-international-academy',
    email: 'admin@school.com',
    status: 'active',
    isActive: true,
    dbName: 'school_sia_001',
    settings: {
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    },
    features: {
      attendance: true,
      fees: true,
      exams: true,
      notifications: true,
      parentPortal: true,
      studentPortal: true,
    },
    approvedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await platformDb.collection('schools').insertOne(school);
  console.log('✓ School created in platform DB');
  
  // Create tenant database for the school
  const tenantDb = client.db('school_sia_001');
  
  // Hash password
  const password = await bcrypt.hash('Admin123!', 10);
  
  // Create admin user in tenant database
  const userId = new ObjectId();
  const adminUser = {
    _id: userId,
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@school.com',
    password: password,
    role: 'school_admin',
    school: schoolId,
    isActive: true,
    isSuperAdmin: true, // Grant super admin access
    permissions: [
      '*',
      'teacher:create', 'teacher:view', 'teacher:update', 'teacher:delete',
      'student:create', 'student:view', 'student:update', 'student:delete',
      'class:create', 'class:view', 'class:update', 'class:delete',
      'subject:create', 'subject:view', 'subject:update', 'subject:delete',
      'exam:create', 'exam:view', 'exam:update', 'exam:delete',
      'result:create', 'result:view', 'result:update', 'result:delete', 'result:publish',
      'attendance:create', 'attendance:view', 'attendance:update', 'attendance:delete',
      'fee:create', 'fee:view', 'fee:update', 'fee:delete',
      'academic_year:create', 'academic_year:view', 'academic_year:update', 'academic_year:delete',
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await tenantDb.collection('users').insertOne(adminUser);
  console.log('✓ Admin user created in tenant DB');
  
  // Create default roles
  const roles = [
    { name: 'school_admin', displayName: 'School Administrator', permissions: ['*'], isDefault: false, isSystemRole: true },
    { name: 'teacher', displayName: 'Teacher', permissions: ['result:create', 'result:view', 'result:update', 'attendance:create', 'attendance:view', 'student:view', 'class:view'], isDefault: false, isSystemRole: true },
    { name: 'student', displayName: 'Student', permissions: ['result:view', 'attendance:view'], isDefault: true, isSystemRole: true },
  ];
  await tenantDb.collection('roles').insertMany(roles.map(r => ({ ...r, _id: new ObjectId(), createdAt: new Date(), updatedAt: new Date() })));
  console.log('✓ Default roles created');
  
  // Create academic year
  const academicYearId = new ObjectId();
  await tenantDb.collection('academicyears').insertOne({
    _id: academicYearId,
    name: '2024-25',
    startDate: new Date('2024-04-01'),
    endDate: new Date('2025-03-31'),
    isCurrent: true,
    school: schoolId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('✓ Academic year created');
  
  await client.close();
  
  return { schoolId, schoolCode, academicYearId };
}

// ── seed ─────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱 Seeding database...\n');

  // 1. Clear and create school directly in database
  await clearDatabase();
  const { schoolId, schoolCode, academicYearId } = await createSchoolDirectly();
  
  // 2. Now login to get a valid token to use the API
  const loginRes = await post('/api/v1/auth/login', {
    email: 'admin@school.com',
    password: 'Admin123!',
  });
  if (loginRes.status !== 200 && loginRes.status !== 201) {
    console.error('Login failed:', JSON.stringify(loginRes.body));
    process.exit(1);
  }
  TOKEN = loginRes.body?.data?.accessToken || loginRes.body?.accessToken;
  console.log('✓ Logged in successfully');

  // 3. Create teachers
  const teachers = [
    { firstName: 'Anita', lastName: 'Sharma', email: 'anita.sharma@school.com', phone: '9876543210', department: 'Mathematics', designation: 'Senior Teacher' },
    { firstName: 'Vikram', lastName: 'Patel', email: 'vikram.patel@school.com', phone: '9876543211', department: 'Science', designation: 'Head of Department' },
    { firstName: 'Priya', lastName: 'Nair', email: 'priya.nair@school.com', phone: '9876543212', department: 'English', designation: 'Teacher' },
    { firstName: 'Rajesh', lastName: 'Kumar', email: 'rajesh.kumar@school.com', phone: '9876543213', department: 'Social Studies', designation: 'Senior Teacher' },
    { firstName: 'Deepa', lastName: 'Menon', email: 'deepa.menon@school.com', phone: '9876543214', department: 'Computer Science', designation: 'Teacher' },
    { firstName: 'Suresh', lastName: 'Iyer', email: 'suresh.iyer@school.com', phone: '9876543215', department: 'Physical Education', designation: 'Coach' },
  ];

  const createdTeachers = [];
  for (const t of teachers) {
    const res = await post('/api/v1/teachers', t);
    if (res.status === 201) {
      const id = res.body?.data?._id;
      createdTeachers.push({ ...t, _id: id });
      console.log(`  ✓ Teacher: ${t.firstName} ${t.lastName} (${t.department})`);
    } else {
      console.log(`  ✗ Teacher ${t.firstName}: ${res.status}`, res.body?.message);
    }
  }
  console.log(`✓ ${createdTeachers.length} teachers created`);

  // 4. Create subjects
  const subjects = [
    { name: 'Mathematics', code: 'MATH', type: 'core' },
    { name: 'Physics', code: 'PHY', type: 'core' },
    { name: 'Chemistry', code: 'CHEM', type: 'core' },
    { name: 'English', code: 'ENG', type: 'core' },
    { name: 'Computer Science', code: 'CS', type: 'elective' },
    { name: 'Physical Education', code: 'PE', type: 'elective' },
    { name: 'History', code: 'HIST', type: 'core' },
    { name: 'Geography', code: 'GEO', type: 'core' },
  ];

  const createdSubjects = [];
  for (const s of subjects) {
    const res = await post('/api/v1/subjects', s);
    if (res.status === 201) {
      const id = res.body?.data?._id;
      createdSubjects.push({ ...s, _id: id });
      console.log(`  ✓ Subject: ${s.name} (${s.code})`);
    } else {
      console.log(`  ✗ Subject ${s.name}: ${res.status}`, res.body?.message);
    }
  }
  console.log(`✓ ${createdSubjects.length} subjects created`);

  // 5. Create classes
  const classes = [
    {
      name: 'Grade 1',
      sections: [
        { name: 'A', classTeacher: createdTeachers[0]?._id, capacity: 40 },
        { name: 'B', capacity: 35 },
      ],
    },
    {
      name: 'Grade 2',
      sections: [
        { name: 'A', classTeacher: createdTeachers[1]?._id, capacity: 40 },
      ],
    },
    {
      name: 'Grade 3',
      sections: [
        { name: 'A', classTeacher: createdTeachers[2]?._id, capacity: 38 },
        { name: 'B', capacity: 38 },
      ],
    },
    {
      name: 'Grade 5',
      sections: [
        { name: 'A', classTeacher: createdTeachers[3]?._id, capacity: 45 },
        { name: 'B', capacity: 45 },
        { name: 'C', capacity: 40 },
      ],
    },
    {
      name: 'Grade 8',
      sections: [
        { name: 'A', classTeacher: createdTeachers[4]?._id, capacity: 42 },
      ],
    },
    {
      name: 'Grade 10',
      sections: [
        { name: 'A', classTeacher: createdTeachers[5]?._id, capacity: 40 },
        { name: 'B', capacity: 40 },
      ],
    },
  ];

  const createdClasses = [];
  for (const cls of classes) {
    const res = await post('/api/v1/classes', cls);
    if (res.status === 201) {
      const id = res.body?.data?._id;
      createdClasses.push({ ...cls, _id: id });
      console.log(`  ✓ Class: ${cls.name}  (${cls.sections.length} sections)`);
    } else {
      console.log(`  ✗ Class ${cls.name}: ${res.status}`, res.body?.message);
    }
  }
  console.log(`✓ ${createdClasses.length} classes created`);

  // 6. Create students
  const studentNames = [
    { firstName: 'Arjun', lastName: 'Singh' },
    { firstName: 'Meera', lastName: 'Reddy' },
    { firstName: 'Kabir', lastName: 'Khan' },
    { firstName: 'Zara', lastName: 'Ahmed' },
    { firstName: 'Rohan', lastName: 'Gupta' },
    { firstName: 'Anika', lastName: 'Das' },
    { firstName: 'Dev', lastName: 'Sharma' },
    { firstName: 'Isha', lastName: 'Verma' },
    { firstName: 'Veer', lastName: 'Malhotra' },
    { firstName: 'Nisha', lastName: 'Joshi' },
  ];

  let studentCount = 0;
  for (let i = 0; i < studentNames.length; i++) {
    const s = studentNames[i];
    const classIdx = i % createdClasses.length;
    const cls = createdClasses[classIdx];
    const sectionName = cls?.sections?.[0]?.name || 'A';

    const res = await post('/api/v1/students', {
      firstName: s.firstName,
      lastName: s.lastName,
      email: `${s.firstName.toLowerCase()}.${s.lastName.toLowerCase()}@student.school.com`,
      phone: `98765${String(43210 + i).padStart(5, '0')}`,
      currentClass: cls?._id,
      currentSection: sectionName,
      gender: i % 2 === 0 ? 'male' : 'female',
    });
    if (res.status === 201) {
      studentCount++;
      console.log(`  ✓ Student: ${s.firstName} ${s.lastName} → ${cls?.name || '?'} ${sectionName}`);
    } else {
      console.log(`  ✗ Student ${s.firstName}: ${res.status}`, res.body?.message);
    }
  }
  console.log(`✓ ${studentCount} students created`);

  // 7. Verify by listing
  console.log('\n📊 Verification:');
  const tList = await get('/api/v1/teachers');
  console.log(`  Teachers: ${tList.body?.data?.total ?? tList.body?.data?.data?.length ?? '?'} found`);
  const cList = await get('/api/v1/classes');
  console.log(`  Classes:  ${cList.body?.data?.total ?? cList.body?.data?.data?.length ?? '?'} found`);
  const sList = await get('/api/v1/students');
  console.log(`  Students: ${sList.body?.data?.total ?? sList.body?.data?.data?.length ?? '?'} found`);
  const subList = await get('/api/v1/subjects');
  console.log(`  Subjects: ${subList.body?.data?.total ?? subList.body?.data?.data?.length ?? '?'} found`);

  console.log('\n' + '═'.repeat(50));
  console.log('  ✅ Seed complete!');
  console.log('');
  console.log('  Login credentials:');
  console.log('    Email:    admin@school.com');
  console.log('    Password: Admin123!');
  console.log('═'.repeat(50) + '\n');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
