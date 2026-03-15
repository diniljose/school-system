/**
 * Multi-Tenant Database Service
 * Manages dynamic database connections per school
 * Each school gets its own database for complete data isolation
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mongoose from 'mongoose';
import { Connection, Model, Schema } from 'mongoose';

// Import schemas for tenant databases
import { UserSchema } from './schemas/user.schema';
import { StudentSchema } from './schemas/student.schema';
import { TeacherSchema } from './schemas/teacher.schema';
import { ParentSchema } from './schemas/parent.schema';
import { ClassSchema } from './schemas/class.schema';
import { SubjectSchema } from './schemas/subject.schema';
import { AttendanceSchema } from './schemas/attendance.schema';
import { ExamSchema } from './schemas/exam.schema';
import { ResultSchema } from './schemas/result.schema';
import { FeeSchema } from './schemas/fee.schema';
import { FeeStructureSchema } from './schemas/fee-structure.schema';
import { TimetableSchema } from './schemas/timetable.schema';
import { NotificationSchema } from './schemas/notification.schema';
import { AcademicYearSchema } from './schemas/academic-year.schema';
import { SettingsSchema } from './schemas/settings.schema';
import { RoleSchema, DEFAULT_SCHOOL_ROLES } from './schemas/role.schema';
import { EnrollmentSchema } from './schemas/enrollment.schema';
import { EventSchema } from './schemas/event.schema';
import { ClassTeacherAssignmentSchema } from './schemas/class-teacher-assignment.schema';
import { AuditLogSchema } from './schemas/audit-log.schema';

// Schema registry for tenant databases
const TENANT_SCHEMAS: Record<string, Schema> = {
  User: UserSchema,
  Student: StudentSchema,
  Teacher: TeacherSchema,
  Parent: ParentSchema,
  Class: ClassSchema,
  Subject: SubjectSchema,
  Attendance: AttendanceSchema,
  Exam: ExamSchema,
  Result: ResultSchema,
  Fee: FeeSchema,
  FeeStructure: FeeStructureSchema,
  Timetable: TimetableSchema,
  Notification: NotificationSchema,
  AcademicYear: AcademicYearSchema,
  Settings: SettingsSchema,
  Role: RoleSchema,
  Enrollment: EnrollmentSchema,
  SchoolEvent: EventSchema,
  ClassTeacherAssignment: ClassTeacherAssignmentSchema,
  AuditLog: AuditLogSchema,
};

@Injectable()
export class TenantDatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantDatabaseService.name);
  private readonly connections = new Map<string, Connection>();
  private readonly baseUri: string;

  constructor(private configService: ConfigService) {
    const mongoUri =
      this.configService.get<string>('MONGODB_URI') ||
      'mongodb://localhost:27017/school-platform';
    // Extract base URI without the DB name
    const lastSlash = mongoUri.lastIndexOf('/');
    this.baseUri = mongoUri.substring(0, lastSlash);
  }

  /**
   * Get or create a database connection for a specific school
   */
  async getSchoolConnection(schoolCode: string): Promise<Connection> {
    const dbName = this.getDatabaseName(schoolCode);

    if (this.connections.has(dbName)) {
      const conn = this.connections.get(dbName);
      if (conn.readyState === 1) {
        return conn;
      }
      // Connection is not ready, remove and recreate
      this.connections.delete(dbName);
    }

    try {
      const connectionUri = `${this.baseUri}/${dbName}`;
      const connection = await mongoose.createConnection(connectionUri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }).asPromise();

      this.connections.set(dbName, connection);
      this.logger.log(`Connected to school database: ${dbName}`);
      return connection;
    } catch (error) {
      this.logger.error(
        `Failed to connect to school database: ${dbName}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Create a new database for a school and initialize schemas
   */
  async createSchoolDatabase(schoolCode: string): Promise<Connection> {
    const connection = await this.getSchoolConnection(schoolCode);
    
    // Register all schemas with this connection
    for (const [modelName, schema] of Object.entries(TENANT_SCHEMAS)) {
      if (!connection.models[modelName]) {
        connection.model(modelName, schema);
      }
    }
    
    // Initialize default roles for the school
    await this.initializeDefaultRoles(connection, schoolCode);
    
    this.logger.log(
      `School database initialized with schemas for: ${this.getDatabaseName(schoolCode)}`,
    );
    return connection;
  }

  /**
   * Initialize default roles in a school's tenant database
   */
  private async initializeDefaultRoles(connection: Connection, schoolCode: string): Promise<void> {
    try {
      const RoleModel = connection.models['Role'];
      if (!RoleModel) {
        this.logger.warn(`Role model not registered for school ${schoolCode}`);
        return;
      }

      // Check if roles already exist
      const existingRoles = await RoleModel.countDocuments().exec();
      if (existingRoles > 0) {
        this.logger.debug(`Roles already exist for school ${schoolCode}, skipping initialization`);
        return;
      }

      // Insert default roles
      await RoleModel.insertMany(DEFAULT_SCHOOL_ROLES);
      this.logger.log(`Initialized ${DEFAULT_SCHOOL_ROLES.length} default roles for school ${schoolCode}`);
    } catch (error) {
      this.logger.error(`Failed to initialize default roles for ${schoolCode}: ${error.message}`);
      // Don't throw - role initialization failure shouldn't block school creation
    }
  }

  /**
   * Get a model for a specific tenant database
   */
  async getTenantModel<T>(schoolCode: string, modelName: string): Promise<Model<T>> {
    const connection = await this.getSchoolConnection(schoolCode);
    
    // Register all schemas to support populate operations
    for (const [name, schema] of Object.entries(TENANT_SCHEMAS)) {
      if (!connection.models[name]) {
        connection.model(name, schema);
      }
    }
    
    // Verify the requested model exists
    if (!connection.models[modelName]) {
      throw new Error(`Model not found after registration: ${modelName}`);
    }
    
    return connection.models[modelName] as Model<T>;
  }

  /**
   * Create a user in a specific school's tenant database
   */
  async createTenantUser(schoolCode: string, userData: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    role: string;
    phone?: string;
  }): Promise<any> {
    const UserModel = await this.getTenantModel<any>(schoolCode, 'User');
    
    // Get permissions from the role
    const permissions = await this.getRolePermissions(schoolCode, userData.role);
    
    const user = new UserModel({
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      password: userData.passwordHash,
      role: userData.role,
      phone: userData.phone,
      permissions: permissions,
      isActive: true,
    });
    
    await user.save();
    this.logger.log(`Created user ${userData.email} in school database: ${this.getDatabaseName(schoolCode)} with ${permissions.length} permissions`);
    return user;
  }

  /**
   * Find a user by email in a specific tenant database
   */
  async findTenantUserByEmail(schoolCode: string, email: string): Promise<any> {
    const UserModel = await this.getTenantModel<any>(schoolCode, 'User');
    return UserModel.findOne({ email }).exec();
  }

  /**
   * Get role permissions by role code from tenant database
   */
  async getRolePermissions(schoolCode: string, roleCode: string): Promise<string[]> {
    try {
      const RoleModel = await this.getTenantModel<any>(schoolCode, 'Role');
      const role = await RoleModel.findOne({ code: roleCode, isActive: true }).exec();
      return role?.permissions || [];
    } catch (error) {
      this.logger.debug(`Could not fetch role permissions for ${roleCode}: ${error.message}`);
      return [];
    }
  }

  /**
   * Drop a school database (use with extreme caution)
   */
  async dropSchoolDatabase(schoolCode: string): Promise<void> {
    const dbName = this.getDatabaseName(schoolCode);
    const connection = await this.getSchoolConnection(schoolCode);
    await connection.dropDatabase();
    connection.close();
    this.connections.delete(dbName);
    this.logger.warn(`Dropped school database: ${dbName}`);
  }

  /**
   * List all school databases
   */
  async listSchoolDatabases(): Promise<string[]> {
    const adminConnection = await mongoose
      .createConnection(`${this.baseUri}/admin`)
      .asPromise();
    try {
      const adminDb = adminConnection.db.admin();
      const result = await adminDb.listDatabases();
      return result.databases
        .map((db) => db.name)
        .filter((name) => name.startsWith('school_'));
    } finally {
      await adminConnection.close();
    }
  }

  /**
   * Get connection health info
   */
  getConnectionStats(): { total: number; active: number; databases: string[] } {
    const databases: string[] = [];
    let active = 0;
    this.connections.forEach((conn, db) => {
      databases.push(db);
      if (conn.readyState === 1) active++;
    });
    return { total: this.connections.size, active, databases };
  }

  /**
   * Find all users with a specific email across ALL tenant databases
   * Returns array of { user, schoolCode, schoolName }
   */
  async findUsersByEmailAcrossAllTenants(email: string, schools: any[]): Promise<any[]> {
    const results: any[] = [];
    
    for (const school of schools) {
      try {
        const user = await this.findTenantUserByEmail(school.code, email);
        if (user) {
          results.push({
            user,
            schoolCode: school.code,
            schoolName: school.name,
            schoolId: school._id?.toString() || school.id,
          });
        }
      } catch (error) {
        this.logger.debug(`No user found in school ${school.code}: ${error.message}`);
      }
    }
    
    return results;
  }

  private getDatabaseName(schoolCode: string): string {
    return `school_${schoolCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }

  async onModuleDestroy() {
    this.logger.log('Closing all tenant database connections...');
    const closePromises: Promise<void>[] = [];
    this.connections.forEach((conn, db) => {
      closePromises.push(
        conn
          .close()
          .then(() => this.logger.log(`Closed connection: ${db}`))
          .catch((err) =>
            this.logger.error(`Error closing connection ${db}:`, err),
          ),
      );
    });
    await Promise.all(closePromises);
    this.connections.clear();
  }
}
