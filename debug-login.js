const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const schoolDbs = [
  "school_scho_4336",
  "school_scho_7303", 
  "school_ts_9392",
  "school_scho_9854",
  "school_scho_9691",
  "school_ts_1270",
  "school_scho_8853",
  "school_scho_7165"
];

async function checkPendingRegistrations() {
  console.log("=== Checking PENDING registrations (cannot login yet) ===\n");
  
  for (const db of schoolDbs) {
    try {
      const conn = await mongoose.createConnection(`mongodb://localhost:27017/${db}`).asPromise();
      
      // Check pending students
      const Student = conn.model("Student", new mongoose.Schema({}, {strict:false}), "students");
      const pendingStudents = await Student.find({status: "pending_approval"}).select('contact.email firstName lastName');
      
      // Check pending teachers
      const Teacher = conn.model("Teacher", new mongoose.Schema({}, {strict:false}), "teachers");
      const pendingTeachers = await Teacher.find({status: "pending_approval"}).select('email firstName lastName');
      
      if (pendingStudents.length > 0 || pendingTeachers.length > 0) {
        console.log(`\n📁 Database: ${db}`);
        console.log("─".repeat(50));
        
        if (pendingStudents.length > 0) {
          console.log("  PENDING STUDENTS (need approval before login):");
          pendingStudents.forEach(s => {
            console.log(`    - ${s.contact?.email} (${s.firstName} ${s.lastName})`);
          });
        }
        
        if (pendingTeachers.length > 0) {
          console.log("  PENDING TEACHERS (need approval before login):");
          pendingTeachers.forEach(t => {
            console.log(`    - ${t.email} (${t.firstName} ${t.lastName})`);
          });
        }
      }
      await conn.close();
    } catch (err) {
      // Skip
    }
  }
}

async function main() {
  await checkPendingRegistrations();
  process.exit(0);
}

main().catch(console.error);
