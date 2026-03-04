/**
 * Database Seed Script for Results Testing
 * Creates exam results to test the results display, report cards, and analytics.
 *
 * Usage:  node seed-results.js
 *
 * Prerequisites: Run seed.js first to create the base data
 *
 * Login:
 *   Email: admin@school.com
 *   Password: Admin123!
 */

const http = require('http');

const BASE = 'http://localhost:3000';
let TOKEN = '';
let schoolId = '';

// ── helpers ──────────────────────────────────────────────────────────
function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(
      { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers },
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

// ── seed results ─────────────────────────────────────────────────────
async function seedResults() {
  console.log('\n🌱 Seeding exam results...\n');

  // 1. Login as admin
  const loginRes = await post('/api/v1/auth/login', {
    email: 'admin@school.com',
    password: 'Admin123!',
  });
  if (loginRes.status !== 200 && loginRes.status !== 201) {
    console.error('Login failed:', JSON.stringify(loginRes.body));
    console.log('Please run seed.js first to create the admin user.');
    process.exit(1);
  }
  TOKEN = loginRes.body?.data?.accessToken || loginRes.body?.accessToken;
  schoolId = loginRes.body?.data?.user?.school || loginRes.body?.user?.school;
  console.log('✓ Logged in as admin, school:', schoolId);

  // 2. Get existing classes
  const classRes = await get('/api/v1/classes?limit=100');
  const classes = classRes.body?.data?.data || classRes.body?.data || [];
  console.log(`✓ Found ${classes.length} classes`);

  if (classes.length === 0) {
    console.error('No classes found. Please run seed.js first.');
    process.exit(1);
  }

  // 3. Get existing subjects
  const subjectRes = await get('/api/v1/subjects?limit=100');
  const subjects = subjectRes.body?.data?.data || subjectRes.body?.data || [];
  console.log(`✓ Found ${subjects.length} subjects`);

  if (subjects.length === 0) {
    console.error('No subjects found. Please run seed.js first.');
    process.exit(1);
  }

  // 4. Get existing students
  const studentRes = await get('/api/v1/students?limit=100');
  const students = studentRes.body?.data?.data || studentRes.body?.data || [];
  console.log(`✓ Found ${students.length} students`);

  if (students.length === 0) {
    console.error('No students found. Please run seed.js first.');
    process.exit(1);
  }

  // 5. Get or create academic year
  let academicYearId;
  const ayRes = await get('/api/v1/academic-years?limit=1');
  const academicYears = ayRes.body?.data?.data || ayRes.body?.data || [];
  
  if (academicYears.length > 0) {
    academicYearId = academicYears[0]._id;
    console.log(`✓ Using existing academic year: ${academicYears[0].name}`);
  } else {
    // Create an academic year
    const ayCreate = await post('/api/v1/academic-years', {
      name: '2024-25',
      startDate: '2024-04-01',
      endDate: '2025-03-31',
      isCurrent: true,
    });
    if (ayCreate.status === 201) {
      academicYearId = ayCreate.body?.data?._id;
      console.log('✓ Created academic year 2024-25');
    } else {
      console.error('Failed to create academic year:', ayCreate.body?.message);
      process.exit(1);
    }
  }

  // 6. Create an exam
  const firstClass = classes[0];
  const secondClass = classes.length > 1 ? classes[1] : classes[0];
  const examSubjects = subjects.slice(0, 4); // Use first 4 subjects

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30); // 30 days ago
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() - 20); // 20 days ago

  // Build exam schedule
  const schedule = [];
  let dayOffset = 0;
  for (const cls of [firstClass, secondClass]) {
    if (!cls?._id) continue;
    const section = cls.sections?.[0]?.name || 'A';
    for (const subj of examSubjects) {
      const examDate = new Date(startDate);
      examDate.setDate(examDate.getDate() + dayOffset);
      schedule.push({
        class: cls._id,
        section: section,
        subject: subj._id,
        date: examDate.toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '12:00',
        maxMarks: 100,
        passingMarks: 40,
        status: 'completed',
      });
      dayOffset++;
    }
  }

  const examRes = await post('/api/v1/exams', {
    name: 'Mid-Term Examination',
    examType: 'midterm',
    academicYear: academicYearId,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    schedule: schedule,
    status: 'completed',
    isActive: true,
  });

  let examId;
  if (examRes.status === 201) {
    examId = examRes.body?.data?._id;
    console.log(`✓ Created exam: Mid-Term Examination (${examId})`);
  } else {
    // Get existing exam (regardless of the error type)
    const existingExams = await get('/api/v1/exams?limit=10');
    const exams = existingExams.body?.data?.data || existingExams.body?.data || [];
    const foundExam = exams.find(e => e.name === 'Mid-Term Examination') || exams[0];
    if (foundExam) {
      examId = foundExam._id;
      console.log(`✓ Using existing exam: ${foundExam.name} (${examId})`);
    } else {
      console.error('Failed to create or find exam:', examRes.body?.message || examRes.body);
      process.exit(1);
    }
  }

  // 7. Create results for students
  let resultsCreated = 0;
  let resultsSkipped = 0;

  for (const student of students) {
    const classId = student.currentClass?._id || student.currentClass;
    const section = student.currentSection || 'A';

    if (!classId) {
      console.log(`  ⚠ Student ${student.firstName} has no class, skipping`);
      continue;
    }

    // Generate random marks for each subject
    const subjectResults = examSubjects.map((subj) => {
      const maxMarks = 100;
      const obtainedMarks = Math.floor(Math.random() * 61) + 40; // 40-100 marks
      const percentage = (obtainedMarks / maxMarks) * 100;
      const isPassed = obtainedMarks >= 40;
      let grade;
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B+';
      else if (percentage >= 60) grade = 'B';
      else if (percentage >= 50) grade = 'C';
      else if (percentage >= 40) grade = 'D';
      else grade = 'F';

      return {
        subject: subj._id,
        maxMarks: maxMarks,
        obtainedMarks: obtainedMarks,
        grade: grade,
        isPassed: isPassed,
      };
    });

    const totalMarks = subjectResults.reduce((sum, s) => sum + s.maxMarks, 0);
    const obtainedMarks = subjectResults.reduce((sum, s) => sum + s.obtainedMarks, 0);
    const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;

    let overallGrade;
    if (percentage >= 90) overallGrade = 'A+';
    else if (percentage >= 80) overallGrade = 'A';
    else if (percentage >= 70) overallGrade = 'B+';
    else if (percentage >= 60) overallGrade = 'B';
    else if (percentage >= 50) overallGrade = 'C';
    else if (percentage >= 40) overallGrade = 'D';
    else overallGrade = 'F';

    const resultRes = await post('/api/v1/results', {
      exam: examId,
      student: student._id,
      class: classId,
      academicYear: academicYearId,
      subjects: subjectResults,
      isPublished: true,
    });

    if (resultRes.status === 201) {
      resultsCreated++;
      console.log(`  ✓ Result for ${student.firstName} ${student.lastName}: ${percentage.toFixed(1)}% (${overallGrade})`);
    } else if (resultRes.body?.message?.includes('already exists') || resultRes.status === 409) {
      resultsSkipped++;
      console.log(`  ⚠ Result already exists for ${student.firstName} ${student.lastName}`);
    } else {
      console.log(`  ✗ Failed for ${student.firstName}: ${resultRes.status}`, resultRes.body?.message);
    }
  }

  console.log(`\n✓ ${resultsCreated} results created, ${resultsSkipped} skipped (already exist)`);

  // 8. Verify results
  console.log('\n📊 Verification:');
  const resultsList = await get('/api/v1/results?limit=100');
  console.log(`  Results: ${resultsList.body?.data?.total || resultsList.body?.data?.data?.length || '?'} found`);

  console.log('\n' + '═'.repeat(50));
  console.log('  ✅ Results seeded!');
  console.log('');
  console.log('  You can now test:');
  console.log('    1. Results list - should show student names and classes');
  console.log('    2. Report cards - click 📄 icon to see specific exam results');
  console.log('    3. Analytics - select exam and class to see statistics');
  console.log('═'.repeat(50) + '\n');
}

seedResults().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
