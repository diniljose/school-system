const { MongoClient, ObjectId } = require('mongodb');

async function createAcademicYears() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const admin = client.db().admin();
    const dbs = await admin.listDatabases();

    // Get all school databases
    const schoolDbs = dbs.databases.filter(db => db.name.startsWith('school_scho_'));
    console.log(`\nFound ${schoolDbs.length} school databases\n`);

    for (const dbInfo of schoolDbs) {
      const db = client.db(dbInfo.name);
      const schoolCollection = db.collection('schools');
      
      // Get first school from this database to get the school ID
      const school = await schoolCollection.findOne({});
      
      if (!school) {
        console.log(`⚠️  ${dbInfo.name}: No school found, skipping`);
        continue;
      }

      const schoolId = school._id;
      console.log(`Processing ${dbInfo.name}`);
      console.log(`  School ID: ${schoolId}`);
      console.log(`  School Name: ${school.schoolName}`);

      const academicYearCollection = db.collection('academic-years');

      // Check if current academic year exists
      const currentYear = await academicYearCollection.findOne({ isCurrent: true });
      
      if (currentYear) {
        console.log(`  ℹ️  Current academic year already exists: ${currentYear.name}`);
        continue;
      }

      // Create academic year for 2025-2026
      const academicYear = {
        school: schoolId,
        name: '2025-2026',
        startDate: new Date('2025-04-01'),
        endDate: new Date('2026-03-31'),
        isCurrent: true,
        terms: [
          {
            name: 'Term 1',
            startDate: new Date('2025-04-01'),
            endDate: new Date('2025-06-30'),
            examStartDate: new Date('2025-06-15'),
            examEndDate: new Date('2025-06-30'),
          },
          {
            name: 'Term 2',
            startDate: new Date('2025-07-01'),
            endDate: new Date('2025-09-30'),
            examStartDate: new Date('2025-09-15'),
            examEndDate: new Date('2025-09-30'),
          },
          {
            name: 'Term 3',
            startDate: new Date('2025-10-01'),
            endDate: new Date('2026-03-31'),
            examStartDate: new Date('2026-02-15'),
            examEndDate: new Date('2026-03-15'),
          },
        ],
        holidays: [
          {
            name: 'Summer Vacation',
            date: new Date('2025-05-15'),
            description: 'Mid-year summer break',
          },
          {
            name: 'Diwali',
            date: new Date('2025-10-20'),
            description: 'Festival holiday',
          },
          {
            name: 'Christmas',
            date: new Date('2025-12-25'),
            description: 'Christmas holiday',
          },
        ],
        isActive: true,
      };

      const result = await academicYearCollection.insertOne(academicYear);
      console.log(`  ✅ Created academic year: 2025-2026 (ID: ${result.insertedId})\n`);
    }

    console.log('✅ Academic years created successfully in all school databases!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createAcademicYears();
