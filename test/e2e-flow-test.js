/**
 * End-to-End Flow Test Script
 * Tests the complete school management API flow
 */
const http = require('http');

const BASE_URL = 'http://localhost:3000';
const PREFIX = '/api/v1';

// Stored IDs
const ctx = {
  accessToken: '',
  schoolId: '',
  teacherId: '',
  teacher2Id: '',
  subjectId: '',
  subject2Id: '',
  classId: '',
  class2Id: '',
  parentId: '',
  parent2Id: '',
  studentId: '',
  student2Id: '',
};

let testsPassed = 0;
let testsFailed = 0;

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const url = new URL(BASE_URL + PREFIX + path);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, body: parsed });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(name, condition, details) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    testsPassed++;
  } else {
    console.log(`  ❌ ${name}${details ? ': ' + details : ''}`);
    testsFailed++;
  }
}

async function run() {
  console.log('\n🏫 School Management System - E2E Flow Test\n');
  console.log('='.repeat(60));

  // ========== 1. LOGIN ==========
  console.log('\n📋 1. Authentication');
  const loginRes = await api('POST', '/auth/login', {
    email: 'rajesh.kumar@greenvalley.edu',
    password: 'Admin@123456',
  });
  assert('Login returns 200', loginRes.status === 200);
  const loginData = loginRes.body.data || loginRes.body;
  ctx.accessToken = loginData.accessToken;
  ctx.schoolId = loginData.user?.school?.id;
  assert('Got access token', !!ctx.accessToken);
  assert('Got school ID', !!ctx.schoolId, ctx.schoolId);
  console.log(`    School: ${loginData.user?.school?.name} (${ctx.schoolId})`);

  // ========== 2. CLEAN EXISTING DATA ==========
  console.log('\n🧹 2. Checking Existing Data');
  const existingTeachers = await api('GET', '/teachers', null, ctx.accessToken);
  const existingClasses = await api('GET', '/classes', null, ctx.accessToken);
  const existingStudents = await api('GET', '/students', null, ctx.accessToken);
  const existingParents = await api('GET', '/parents', null, ctx.accessToken);
  const existingSubjects = await api('GET', '/subjects', null, ctx.accessToken);

  const tData = existingTeachers.body?.data;
  const cData = existingClasses.body?.data;
  const sData = existingStudents.body?.data;
  const pData = existingParents.body?.data;
  const subData = existingSubjects.body?.data;

  const tList = Array.isArray(tData) ? tData : tData?.data || [];
  const cList = Array.isArray(cData) ? cData : cData?.data || [];
  const sList = Array.isArray(sData) ? sData : sData?.data || [];
  const pList = Array.isArray(pData) ? pData : pData?.data || [];
  const subList = Array.isArray(subData) ? subData : subData?.data || [];

  console.log(`    Existing: ${tList.length} teachers, ${cList.length} classes, ${sList.length} students, ${pList.length} parents, ${subList.length} subjects`);

  // Delete existing data in reverse dependency order
  for (const s of sList) {
    await api('DELETE', `/students/${s._id || s.id}`, null, ctx.accessToken);
  }
  for (const p of pList) {
    await api('DELETE', `/parents/${p._id || p.id}`, null, ctx.accessToken);
  }
  for (const c of cList) {
    await api('DELETE', `/classes/${c._id || c.id}`, null, ctx.accessToken);
  }
  for (const sub of subList) {
    await api('DELETE', `/subjects/${sub._id || sub.id}`, null, ctx.accessToken);
  }
  for (const t of tList) {
    await api('DELETE', `/teachers/${t._id || t.id}`, null, ctx.accessToken);
  }
  console.log('    Cleaned existing data');

  // ========== 3. CREATE TEACHERS ==========
  console.log('\n👩‍🏫 3. Create Teachers');

  const teacher1Res = await api('POST', '/teachers', {
    firstName: 'Anita',
    lastName: 'Sharma',
    email: 'anita.sharma@greenvalley.edu',
    phone: '+919876543001',
    dateOfBirth: '1985-06-15',
    gender: 'female',
    joiningDate: '2020-04-01',
    designation: 'Senior Teacher',
    department: 'Mathematics',
    address: {
      street: '45 MG Road',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      zipCode: '560001',
    },
    qualifications: [
      { degree: 'M.Sc Mathematics', institution: 'Bangalore University', year: 2008 },
      { degree: 'B.Ed', institution: 'IGNOU', year: 2009 },
    ],
    salary: { basic: 55000, allowances: 12000, deductions: 5000 },
  }, ctx.accessToken);

  assert('Teacher 1 (Anita) created', teacher1Res.status === 201, `status=${teacher1Res.status} ${JSON.stringify(teacher1Res.body?.message || '')}`);
  const t1 = teacher1Res.body?.data || teacher1Res.body;
  ctx.teacherId = t1?._id || t1?.id;
  if (ctx.teacherId) console.log(`    Teacher 1 ID: ${ctx.teacherId}`);

  const teacher2Res = await api('POST', '/teachers', {
    firstName: 'Vikram',
    lastName: 'Patel',
    email: 'vikram.patel@greenvalley.edu',
    phone: '+919876543002',
    dateOfBirth: '1982-11-20',
    gender: 'male',
    joiningDate: '2019-07-15',
    designation: 'Head of Department',
    department: 'English',
    qualifications: [
      { degree: 'M.A English Literature', institution: 'Mysore University', year: 2005 },
    ],
    salary: { basic: 62000, allowances: 15000, deductions: 6000 },
  }, ctx.accessToken);

  assert('Teacher 2 (Vikram) created', teacher2Res.status === 201, `status=${teacher2Res.status} ${JSON.stringify(teacher2Res.body?.message || '')}`);
  const t2 = teacher2Res.body?.data || teacher2Res.body;
  ctx.teacher2Id = t2?._id || t2?.id;
  if (ctx.teacher2Id) console.log(`    Teacher 2 ID: ${ctx.teacher2Id}`);

  // Verify teacher list
  const teacherListRes = await api('GET', '/teachers', null, ctx.accessToken);
  const teacherList = teacherListRes.body?.data;
  const teachers = Array.isArray(teacherList) ? teacherList : teacherList?.data || [];
  assert('Teachers list returns data', teachers.length >= 2, `got ${teachers.length} teachers`);

  // ========== 4. CREATE SUBJECTS ==========
  console.log('\n📚 4. Create Subjects');

  const sub1Res = await api('POST', '/subjects', {
    name: 'Mathematics',
    code: 'MATH-101',
    description: 'Core mathematics',
    type: 'core',
    credits: 5,
    maxMarks: 100,
    passingMarks: 35,
    hoursPerWeek: 6,
    isMandatory: true,
  }, ctx.accessToken);

  assert('Subject 1 (Math) created', sub1Res.status === 201, `status=${sub1Res.status} ${JSON.stringify(sub1Res.body?.message || '')}`);
  const s1 = sub1Res.body?.data || sub1Res.body;
  ctx.subjectId = s1?._id || s1?.id;

  const sub2Res = await api('POST', '/subjects', {
    name: 'English',
    code: 'ENG-101',
    description: 'English language and literature',
    type: 'core',
    credits: 5,
    maxMarks: 100,
    passingMarks: 35,
    hoursPerWeek: 6,
    isMandatory: true,
  }, ctx.accessToken);

  assert('Subject 2 (English) created', sub2Res.status === 201, `status=${sub2Res.status} ${JSON.stringify(sub2Res.body?.message || '')}`);
  const s2 = sub2Res.body?.data || sub2Res.body;
  ctx.subject2Id = s2?._id || s2?.id;

  // ========== 5. CREATE CLASSES (WITH CLASS TEACHER) ==========
  console.log('\n🏫 5. Create Classes (with class teacher assignment)');

  // 5a. Create Grade 5 using FLAT fields (the way the frontend sends it)
  const class1Res = await api('POST', '/classes', {
    name: 'Grade 5',
    description: 'Fifth grade standard class',
    section: 'A',
    capacity: 40,
    classTeacher: ctx.teacherId,
    subjects: ctx.subjectId ? [ctx.subjectId, ctx.subject2Id].filter(Boolean) : [],
    feeStructure: {
      tuitionFee: 25000,
      admissionFee: 5000,
      examFee: 2000,
    },
    promotionCriteria: {
      minimumPercentage: 35,
      minimumAttendance: 75,
    },
  }, ctx.accessToken);

  assert('Class 1 (Grade 5) created', class1Res.status === 201, `status=${class1Res.status} ${JSON.stringify(class1Res.body?.message || '')}`);
  const c1 = class1Res.body?.data || class1Res.body;
  ctx.classId = c1?._id || c1?.id;
  if (ctx.classId) console.log(`    Class 1 ID: ${ctx.classId}`);

  // Verify the sections array was populated with classTeacher
  const grade5Has = c1?.sections?.length > 0 && c1?.sections[0]?.classTeacher;
  assert('Grade 5 has classTeacher in sections', !!grade5Has, `sections: ${JSON.stringify(c1?.sections)}`);
  assert('Grade 5 grade auto-derived to 5', c1?.grade === 5, `grade=${c1?.grade}`);

  // 5b. Create Grade 6 using NESTED sections
  const class2Res = await api('POST', '/classes', {
    name: 'Grade 6',
    description: 'Sixth grade with two sections',
    sections: [
      { name: 'A', capacity: 35, classTeacher: ctx.teacher2Id },
      { name: 'B', capacity: 35 },
    ],
    subjects: ctx.subjectId ? [ctx.subjectId, ctx.subject2Id].filter(Boolean) : [],
  }, ctx.accessToken);

  assert('Class 2 (Grade 6) created', class2Res.status === 201, `status=${class2Res.status} ${JSON.stringify(class2Res.body?.message || '')}`);
  const c2 = class2Res.body?.data || class2Res.body;
  ctx.class2Id = c2?._id || c2?.id;
  if (ctx.class2Id) console.log(`    Class 2 ID: ${ctx.class2Id}`);

  assert('Grade 6 has 2 sections', c2?.sections?.length === 2, `sections: ${c2?.sections?.length}`);
  assert('Grade 6 grade auto-derived to 6', c2?.grade === 6, `grade=${c2?.grade}`);

  // ========== 6. VERIFY CLASS TEACHER SHOWS IN API ==========
  console.log('\n✅ 6. Verify Class Teacher Relationship');

  // Get individual class
  const getClassRes = await api('GET', `/classes/${ctx.classId}`, null, ctx.accessToken);
  const classDetail = getClassRes.body?.data || getClassRes.body;
  const ctInSection = classDetail?.sections?.[0]?.classTeacher;
  assert('GET /classes/:id returns classTeacher in sections', !!ctInSection, JSON.stringify(ctInSection));

  // Get individual teacher to see classTeacherOf
  if (ctx.teacherId) {
    const getTeacherRes = await api('GET', `/teachers/${ctx.teacherId}`, null, ctx.accessToken);
    const teacherDetail = getTeacherRes.body?.data || getTeacherRes.body;
    assert('Teacher has classTeacherOf set', !!teacherDetail?.classTeacherOf, `classTeacherOf=${teacherDetail?.classTeacherOf}`);
  }

  // ========== 7. CREATE PARENTS ==========
  console.log('\n👨‍👩‍👧 7. Create Parents');

  const parent1Res = await api('POST', '/parents', {
    firstName: 'Suresh',
    lastName: 'Verma',
    relationship: 'father',
    email: 'suresh.verma@gmail.com',
    phone: '+919876543100',
    occupation: 'Software Engineer',
    workplace: 'Infosys Technologies',
    address: {
      street: '12 Koramangala 4th Block',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      zipCode: '560034',
    },
    isPrimary: true,
  }, ctx.accessToken);

  assert('Parent 1 (Father) created', parent1Res.status === 201, `status=${parent1Res.status} ${JSON.stringify(parent1Res.body?.message || '')}`);
  const p1 = parent1Res.body?.data || parent1Res.body;
  ctx.parentId = p1?._id || p1?.id;

  const parent2Res = await api('POST', '/parents', {
    firstName: 'Meena',
    lastName: 'Verma',
    relationship: 'mother',
    email: 'meena.verma@gmail.com',
    phone: '+919876543102',
    occupation: 'Doctor',
    workplace: 'Apollo Hospital',
    address: {
      street: '12 Koramangala 4th Block',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      zipCode: '560034',
    },
    isPrimary: false,
  }, ctx.accessToken);

  assert('Parent 2 (Mother) created', parent2Res.status === 201, `status=${parent2Res.status} ${JSON.stringify(parent2Res.body?.message || '')}`);
  const p2 = parent2Res.body?.data || parent2Res.body;
  ctx.parent2Id = p2?._id || p2?.id;

  // ========== 8. CREATE STUDENTS ==========
  console.log('\n🎓 8. Create Students');

  const student1Res = await api('POST', '/students', {
    firstName: 'Arjun',
    lastName: 'Verma',
    dateOfBirth: '2015-03-22',
    gender: 'male',
    email: 'arjun.verma@greenvalley.edu',
    address: {
      street: '12 Koramangala 4th Block',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      zipCode: '560034',
    },
    guardianName: 'Suresh Verma',
    guardianRelation: 'Father',
    guardianPhone: '+919876543100',
    nationality: 'Indian',
    admissionDate: '2024-04-01',
    currentClass: ctx.classId,
    currentSection: 'A',
    rollNumber: '001',
  }, ctx.accessToken);

  assert('Student 1 (Arjun) created', student1Res.status === 201, `status=${student1Res.status} ${JSON.stringify(student1Res.body?.message || '')}`);
  const st1 = student1Res.body?.data || student1Res.body;
  ctx.studentId = st1?._id || st1?.id;
  if (ctx.studentId) console.log(`    Student 1 ID: ${ctx.studentId}`);

  const student2Res = await api('POST', '/students', {
    firstName: 'Priya',
    lastName: 'Verma',
    dateOfBirth: '2014-08-10',
    gender: 'female',
    email: 'priya.verma@greenvalley.edu',
    address: {
      street: '12 Koramangala 4th Block',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      zipCode: '560034',
    },
    guardianName: 'Meena Verma',
    guardianRelation: 'Mother',
    guardianPhone: '+919876543102',
    nationality: 'Indian',
    admissionDate: '2023-04-01',
    currentClass: ctx.class2Id,
    currentSection: 'A',
    rollNumber: '001',
  }, ctx.accessToken);

  assert('Student 2 (Priya) created', student2Res.status === 201, `status=${student2Res.status} ${JSON.stringify(student2Res.body?.message || '')}`);
  const st2 = student2Res.body?.data || student2Res.body;
  ctx.student2Id = st2?._id || st2?.id;

  // ========== 9. LINK PARENTS TO STUDENTS ==========
  console.log('\n🔗 9. Link Parents to Students');

  // Try different possible endpoints for linking
  let linkRes = await api('POST', `/parents/${ctx.parentId}/link-child`, { studentId: ctx.studentId }, ctx.accessToken);
  if (linkRes.status === 404) {
    // Try alternative endpoint
    linkRes = await api('PATCH', `/parents/${ctx.parentId}`, { children: [ctx.studentId] }, ctx.accessToken);
  }
  assert('Father linked to Arjun', linkRes.status === 200 || linkRes.status === 201, `status=${linkRes.status} ${JSON.stringify(linkRes.body?.message || '')}`);

  linkRes = await api('POST', `/parents/${ctx.parent2Id}/link-child`, { studentId: ctx.studentId }, ctx.accessToken);
  if (linkRes.status === 404) {
    linkRes = await api('PATCH', `/parents/${ctx.parent2Id}`, { children: [ctx.studentId] }, ctx.accessToken);
  }
  assert('Mother linked to Arjun', linkRes.status === 200 || linkRes.status === 201, `status=${linkRes.status} ${JSON.stringify(linkRes.body?.message || '')}`);

  // ========== 10. FINAL VERIFICATION ==========
  console.log('\n🔍 10. Final Verification');

  // List all
  const finalTeachers = await api('GET', '/teachers', null, ctx.accessToken);
  const finalClasses = await api('GET', '/classes', null, ctx.accessToken);
  const finalStudents = await api('GET', '/students', null, ctx.accessToken);
  const finalParents = await api('GET', '/parents', null, ctx.accessToken);
  const finalSubjects = await api('GET', '/subjects', null, ctx.accessToken);

  const ft = finalTeachers.body?.data;
  const fc = finalClasses.body?.data;
  const fs = finalStudents.body?.data;
  const fp = finalParents.body?.data;
  const fsub = finalSubjects.body?.data;

  const ftList = Array.isArray(ft) ? ft : ft?.data || [];
  const fcList = Array.isArray(fc) ? fc : fc?.data || [];
  const fsList = Array.isArray(fs) ? fs : fs?.data || [];
  const fpList = Array.isArray(fp) ? fp : fp?.data || [];
  const fsubList = Array.isArray(fsub) ? fsub : fsub?.data || [];

  assert('Teachers count >= 2', ftList.length >= 2, `count=${ftList.length}`);
  assert('Classes count >= 2', fcList.length >= 2, `count=${fcList.length}`);
  assert('Students count >= 2', fsList.length >= 2, `count=${fsList.length}`);
  assert('Parents count >= 2', fpList.length >= 2, `count=${fpList.length}`);
  assert('Subjects count >= 2', fsubList.length >= 2, `count=${fsubList.length}`);

  // Check class teacher is populated
  if (fcList.length > 0) {
    const firstClass = fcList.find(c => c.name === 'Grade 5') || fcList[0];
    const hasSections = firstClass?.sections?.length > 0;
    const hasClassTeacher = hasSections && firstClass.sections[0]?.classTeacher;
    assert('Grade 5 sections[0] has classTeacher populated', !!hasClassTeacher, JSON.stringify(firstClass?.sections?.[0]));
  }

  // Check class students 
  if (ctx.classId) {
    const classStudents = await api('GET', `/classes/${ctx.classId}/students`, null, ctx.accessToken);
    assert('Grade 5 students endpoint works', classStudents.status === 200, `status=${classStudents.status}`);
  }

  // ========== SUMMARY ==========
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${testsPassed} passed, ${testsFailed} failed out of ${testsPassed + testsFailed} total`);

  if (testsFailed > 0) {
    console.log('\n⚠️  Some tests failed. Review the output above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed! System is working correctly.');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
