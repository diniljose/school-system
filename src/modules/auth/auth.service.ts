/**
 * Auth Service
 * Handles authentication, registration, password management
 * Fixed: double password hashing, console.log removal, forgot/reset password implementation
 * Updated: Multi-tenant support - school users are in tenant databases
 */
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { SchoolsService } from '../schools/schools.service';
import { TenantDatabaseService } from '../../database/tenant-database.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterSchoolDto } from './dto/register-school.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserDocument } from '../../database/schemas/user.schema';
import { UserRole } from '../../common/enums/roles.enum';
import {
  AuditLog,
  AuditLogDocument,
  AuditAction,
} from '../../database/schemas/audit-log.schema';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private schoolsService: SchoolsService,
    private tenantDatabaseService: TenantDatabaseService,
    private rolesService: RolesService,
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password, schoolCode, selectedRole, selectedUserId } = loginDto;

    // If user selected a specific persona, use that directly
    if (selectedUserId && schoolCode) {
      return this.loginWithSelectedPersona(email, password, schoolCode, selectedUserId);
    }

    // Collect all possible login options for this email
    const loginOptions: any[] = [];
    
    // Step 1: Check if this is a Platform Admin (stored in main DB)
    const platformAdmin = (await this.usersService.findByEmail(email)) as UserDocument;
    if (platformAdmin && platformAdmin.role === UserRole.PLATFORM_ADMIN) {
      const isPasswordValid = await bcrypt.compare(password, platformAdmin.password);
      if (isPasswordValid && platformAdmin.isActive) {
        loginOptions.push({
          user: platformAdmin,
          school: null,
          isFromTenantDb: false,
          displayRole: 'Platform Administrator',
          displaySchool: 'System-wide Access',
        });
      }
    }

    // Step 2: Find all active schools and check for users with this email
    const activeSchools = await this.schoolsService.findActiveSchools();
    
    // If schoolCode is provided, only check that school
    const schoolsToCheck = schoolCode 
      ? activeSchools.filter((s: any) => s.code === schoolCode)
      : activeSchools;

    for (const school of schoolsToCheck) {
      try {
        const user = await this.tenantDatabaseService.findTenantUserByEmail(school.code, email);
        if (user && user.isActive) {
          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (isPasswordValid) {
            loginOptions.push({
              user,
              school,
              isFromTenantDb: true,
              displayRole: this.formatRole(user.role),
              displaySchool: school.name,
            });
          }
        }
      } catch (error) {
        this.logger.debug(`No user found in school ${school.code}: ${error.message}`);
      }
    }

    // No valid login options
    if (loginOptions.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Multiple options - require role selection
    if (loginOptions.length > 1) {
      return {
        requireRoleSelection: true,
        options: loginOptions.map((opt) => ({
          userId: opt.user._id.toString(),
          role: opt.user.role,
          displayRole: opt.displayRole,
          schoolCode: opt.school?.code || null,
          schoolName: opt.displaySchool,
          firstName: opt.user.firstName,
          lastName: opt.user.lastName,
        })),
      };
    }

    // Single option - proceed with login
    const selected = loginOptions[0];
    return this.completeLogin(selected.user, selected.school, selected.isFromTenantDb);
  }

  private async loginWithSelectedPersona(email: string, password: string, schoolCode: string, userId: string) {
    let user: any = null;
    let school: any = null;
    let isFromTenantDb = false;

    // Check if it's a platform admin
    if (!schoolCode || schoolCode === 'platform') {
      const platformAdmin = (await this.usersService.findByEmail(email)) as UserDocument;
      if (platformAdmin && platformAdmin._id.toString() === userId) {
        const isPasswordValid = await bcrypt.compare(password, platformAdmin.password);
        if (!isPasswordValid) {
          throw new UnauthorizedException('Invalid credentials');
        }
        user = platformAdmin;
        isFromTenantDb = false;
      }
    } else {
      // Find user in specific school
      school = await this.schoolsService.findByCode(schoolCode);
      if (!school || school.status !== 'active') {
        throw new UnauthorizedException('School not found or not active');
      }
      
      user = await this.tenantDatabaseService.findTenantUserByEmail(school.code, email);
      if (!user || user._id.toString() !== userId) {
        throw new UnauthorizedException('Invalid credentials');
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
      isFromTenantDb = true;
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return this.completeLogin(user, school, isFromTenantDb);
  }

  private formatRole(role: string): string {
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  private async completeLogin(user: any, school: any, isFromTenantDb: boolean) {
    // Check school status for non-Platform Admin users
    if (isFromTenantDb && school) {
      const { SchoolStatus } = await import(
        '../../database/schemas/school.schema'
      );

      if (school.status === SchoolStatus.PENDING_APPROVAL) {
        throw new UnauthorizedException(
          'Your school registration is pending approval. Please wait for administrator approval.',
        );
      }

      if (school.status === SchoolStatus.REJECTED) {
        throw new UnauthorizedException(
          'Your school registration was rejected. Please contact support.',
        );
      }

      if (school.status === SchoolStatus.SUSPENDED) {
        throw new UnauthorizedException(
          'Your school account has been suspended. Please contact support.',
        );
      }

      if (school.status !== SchoolStatus.ACTIVE) {
        throw new UnauthorizedException('School is not active');
      }
    }

    // Update last login
    if (!isFromTenantDb) {
      await this.usersService.updateLastLogin(user._id.toString());
    }

    // Generate tokens - include school info for tenant users
    const tokens = await this.generateTokensForMultiTenant(user, school, isFromTenantDb);

    // Audit log
    await this.createAuditLog(
      user.school,
      user._id,
      AuditAction.LOGIN,
      'User',
      user._id,
      'User logged in',
    );

    // Get school info if applicable
    let schoolInfo = null;
    if (school) {
      schoolInfo = {
        id: school._id?.toString() || '',
        name: school.name,
        code: school.code,
        logo: school.logo,
        features: school.features,
      };
    } else if (user.school) {
      try {
        const userSchool = await this.schoolsService.findById(
          user.school.toString(),
        );
        const schoolDoc = userSchool as any;
        schoolInfo = {
          id: schoolDoc._id?.toString() || '',
          name: schoolDoc.name,
          code: schoolDoc.code,
          logo: schoolDoc.logo,
          features: schoolDoc.features,
        };
      } catch (e) {
        // School might not exist
      }
    }

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
        school: schoolInfo,
      },
      ...tokens,
    };
  }

  async register(registerDto: RegisterDto) {
    const { role, schoolCode, ...userData } = registerDto;

    // Validate role assignment security
    const publicRoles = [UserRole.PARENT, UserRole.STUDENT];
    const adminOnlyRoles = [
      UserRole.PRINCIPAL,
      UserRole.PRINCIPAL,
      UserRole.VICE_PRINCIPAL,
      UserRole.ACCOUNTANT,
      UserRole.LIBRARIAN,
      UserRole.RECEPTIONIST,
    ];

    if (role === UserRole.PLATFORM_ADMIN) {
      // SUPER_ADMIN can only be created by another SUPER_ADMIN
      // For initial setup, accept if no super admin exists
      const existingSuperAdmin = await this.usersService.findByEmail(
        registerDto.email,
      );
      if (existingSuperAdmin) {
        throw new BadRequestException('Email already registered');
      }

      const user = (await this.usersService.create({
        ...registerDto,
      })) as UserDocument;

      return {
        message: 'Super Admin registration successful',
        userId: user._id.toString(),
      };
    }

    // For all other roles, school code is required
    if (!schoolCode) {
      throw new BadRequestException(
        'School code is required for non-super-admin registration',
      );
    }

    const school = await this.schoolsService.findByCode(schoolCode);
    if (!school) {
      throw new BadRequestException('Invalid school code');
    }

    // Check if email exists in this school
    const existingUser = await this.usersService.findByEmailAndSchool(
      registerDto.email,
      schoolCode,
    );
    if (existingUser) {
      throw new BadRequestException(
        'Email already registered in this school',
      );
    }

    const user = (await this.usersService.create({
      ...registerDto,
      school: (school as any)._id.toString(),
    })) as UserDocument;

    return {
      message: 'Registration successful',
      userId: user._id.toString(),
    };
  }

  /**
   * Self-service school registration with APPROVAL WORKFLOW.
   * School is created with status = PENDING_APPROVAL.
   * Admin credentials are stored in pendingAdmin field.
   * User CANNOT login until Super Admin approves the school.
   * 
   * After approval, tenant database is created and admin user is provisioned.
   */
  async registerSchool(dto: RegisterSchoolDto) {
    // Check if email already exists (as an approved user)
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Email is already registered');
    }

    // Also check if there's a pending school with this admin email
    const existingPending = await this.schoolsService.findByPendingAdminEmail(dto.email);
    if (existingPending) {
      throw new BadRequestException(
        'A school registration with this email is already pending approval',
      );
    }

    // Generate school code and slug from school name
    const schoolCode = this.generateSchoolCode(dto.schoolName);
    const schoolSlug = this.generateSlug(dto.schoolName);

    // Check for code/slug conflicts and make unique if needed
    let finalCode = schoolCode;
    let finalSlug = schoolSlug;
    let attempts = 0;
    while (attempts < 10) {
      try {
        const existingSchool = await this.schoolsService
          .findByCode(finalCode)
          .catch(() => null);
        if (!existingSchool) break;
        finalCode = `${schoolCode}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        finalSlug = `${schoolSlug}-${Math.random().toString(36).substring(2, 6)}`;
        attempts++;
      } catch {
        break;
      }
    }

    // Hash the password for storage (will be used when creating user after approval)
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create the school with PENDING_APPROVAL status
    let school: any;
    try {
      school = await this.schoolsService.create({
        name: dto.schoolName,
        code: finalCode,
        slug: finalSlug,
        address: dto.schoolAddress,
        email: dto.schoolEmail || dto.email,
        phone: dto.schoolPhone,
        // Store pending admin credentials (NOT as a user yet)
        pendingAdmin: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          passwordHash: passwordHash,
          phone: dto.phoneNumber,
        },
        features: {
          attendance: true,
          fees: true,
          exams: true,
          notifications: true,
          parentPortal: true,
          studentPortal: true,
          transport: false,
          library: false,
          hostel: false,
          canteen: false,
          onlinePayment: false,
        },
        settings: {
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          dateFormat: 'DD/MM/YYYY',
          workingDays: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
          ],
        },
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to create school registration: ${error.message}`,
      );
    }

    // TODO: Send notification to Super Admin about new school registration
    // TODO: Send email to pending admin confirming registration is under review
    this.logger.log(
      `New school registration pending approval: ${school.name} (${school.code})`,
    );

    // Do NOT return tokens - user cannot login until school is approved
    return {
      message: 'School registration submitted successfully. Your registration is pending approval by the system administrator. You will receive an email once your school is approved.',
      school: {
        id: school._id.toString(),
        name: school.name,
        code: school.code,
        status: 'pending_approval',
      },
      pendingApproval: true,
    };
  }

  /**
   * Generate a school code from the school name.
   * e.g. "Green Valley International School" → "GVIS"
   */
  private generateSchoolCode(name: string): string {
    const words = name
      .replace(/[^a-zA-Z\s]/g, '')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);

    let code: string;
    if (words.length >= 2) {
      // Take first letter of each word (up to 4)
      code = words
        .slice(0, 4)
        .map((w) => w[0])
        .join('');
    } else if (words.length === 1) {
      code = words[0].substring(0, 4);
    } else {
      code = 'SCH';
    }

    // Append random 4-digit number for uniqueness
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();
    return `${code.toUpperCase()}-${suffix}`;
  }

  /**
   * Generate a URL-friendly slug from the school name.
   * e.g. "Green Valley International School" → "green-valley-international-school"
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  /**
   * Student self-registration with APPROVAL WORKFLOW.
   * Student is created with status = PENDING_APPROVAL.
   * Student CANNOT login until Class Teacher approves the registration.
   * 
   * Optionally creates a parent record linked to the student.
   */
  async registerStudent(dto: any) {
    const { StudentStatus } = await import('../../common/enums/student-status.enum');
    
    // Find school by code
    const school = await this.schoolsService.findByCode(dto.schoolCode);
    if (!school) {
      throw new BadRequestException('Invalid school code. Please check and try again.');
    }

    const schoolDoc = school as any;
    if (schoolDoc.status !== 'active') {
      throw new BadRequestException('This school is not accepting registrations at the moment.');
    }

    // Get tenant Student model
    const StudentModel = await this.tenantDatabaseService.getTenantModel(
      dto.schoolCode,
      'Student',
    );

    // Check if email already registered in this school
    const existingStudent = await StudentModel.findOne({ 
      'contact.email': dto.email 
    });
    if (existingStudent) {
      throw new BadRequestException('This email is already registered as a student in this school.');
    }

    // Verify class exists in school
    const ClassModel = await this.tenantDatabaseService.getTenantModel(
      dto.schoolCode,
      'Class',
    );
    const classDoc = await ClassModel.findById(dto.classId);
    if (!classDoc) {
      throw new BadRequestException('Selected class not found in this school.');
    }

    // Verify section exists in class
    const classData = classDoc as any;
    const sectionExists = classData.sections?.some((s: any) => s.name === dto.section);
    if (!sectionExists) {
      throw new BadRequestException(`Section "${dto.section}" not found in the selected class.`);
    }

    // Hash password for user account
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Generate admission number
    const year = new Date().getFullYear();
    const count = await StudentModel.countDocuments();
    const admissionNumber = `REG${year}${String(count + 1).padStart(5, '0')}`;

    // Create student with pending status
    const student = await StudentModel.create({
      school: schoolDoc._id,
      admissionNumber,
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      gender: dto.gender,
      currentClass: dto.classId,
      currentSection: dto.section,
      status: StudentStatus.PENDING_APPROVAL,
      contact: {
        email: dto.email,
        phone: dto.phone,
      },
      address: dto.address ? { street: dto.address } : undefined,
      metadata: {
        pendingApproval: true,
        registrationDate: new Date(),
        passwordHash, // Store encrypted password for user creation after approval
        parentInfo: dto.parentFirstName ? {
          firstName: dto.parentFirstName,
          lastName: dto.parentLastName,
          email: dto.parentEmail,
          phone: dto.parentPhone,
          relation: dto.parentRelation,
        } : undefined,
      },
    });

    const createdStudent = student as any;
    this.logger.log(
      `New student registration pending approval: ${dto.firstName} ${dto.lastName} - ${classData.name} Section ${dto.section} @ ${schoolDoc.name}`,
    );

    return {
      success: true,
      message: 'Your registration has been submitted successfully! Your class teacher will review and approve your registration. You will receive an email notification once approved.',
      data: {
        registrationId: createdStudent._id.toString(),
        admissionNumber: createdStudent.admissionNumber,
        school: {
          name: schoolDoc.name,
          code: schoolDoc.code,
        },
        class: classData.name,
        section: dto.section,
        status: 'pending_approval',
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>(
          'JWT_REFRESH_SECRET',
          this.configService.get<string>('JWT_SECRET'),
        ),
      });

      const user = (await this.usersService.findById(
        payload.sub,
      )) as UserDocument;

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid token');
      }

      // Ensure school is always a plain string ID, not a populated object
      const schoolId = user.school
        ? (typeof user.school === 'object' && (user.school as any)._id
          ? (user.school as any)._id.toString()
          : user.school.toString())
        : null;

      const newPayload = {
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
        school: schoolId,
        permissions: user.permissions,
      };

      return {
        accessToken: this.jwtService.sign(newPayload),
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = (await this.usersService.findByIdWithPassword(
      userId,
    )) as UserDocument;

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Pass already hashed password - updatePassword should NOT hash again
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePasswordDirect(userId, hashedPassword);

    await this.createAuditLog(
      user.school,
      user._id,
      AuditAction.PASSWORD_CHANGE,
      'User',
      user._id,
      'Password changed',
    );

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email, schoolCode } = forgotPasswordDto;

    let user: UserDocument | null = null;
    if (schoolCode) {
      user = (await this.usersService.findByEmailAndSchool(
        email,
        schoolCode,
      )) as UserDocument;
    } else {
      user = (await this.usersService.findByEmail(email)) as UserDocument;
    }

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        message:
          'If an account with that email exists, a password reset link has been sent',
      };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save token and expiry (1 hour)
    await this.usersService.setPasswordResetToken(
      user._id.toString(),
      hashedToken,
      new Date(Date.now() + 60 * 60 * 1000),
    );

    // TODO: Send email with reset link containing the raw resetToken
    this.logger.log(
      `Password reset token generated for user: ${user.email}`,
    );

    return {
      message:
        'If an account with that email exists, a password reset link has been sent',
      // In development, return token for testing
      ...(this.configService.get('NODE_ENV') === 'dev'
        ? { resetToken }
        : {}),
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await this.usersService.findByResetToken(hashedToken);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePasswordDirect(
      (user as any)._id.toString(),
      hashedPassword,
    );
    await this.usersService.clearPasswordResetToken(
      (user as any)._id.toString(),
    );

    await this.createAuditLog(
      (user as any).school,
      (user as any)._id,
      AuditAction.PASSWORD_RESET,
      'User',
      (user as any)._id,
      'Password reset via token',
    );

    return { message: 'Password has been reset successfully' };
  }

  async logout(userId: string) {
    // In a production system with refresh token storage, invalidate here
    await this.createAuditLog(
      null,
      userId as any,
      AuditAction.LOGOUT,
      'User',
      userId as any,
      'User logged out',
    );

    return { message: 'Logged out successfully' };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCHOOL APPROVAL WORKFLOW (Super Admin only)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Approve a pending school registration.
   * Creates the tenant database and provisions the admin user IN THE TENANT DB.
   */
  async approveSchool(schoolId: string, approvedById: string) {
    // Get the school and validate
    const school = await this.schoolsService.findById(schoolId) as any;
    
    const { SchoolStatus } = await import('../../database/schemas/school.schema');
    
    if (school.status !== SchoolStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `School cannot be approved - current status is ${school.status}`,
      );
    }

    if (!school.pendingAdmin) {
      throw new BadRequestException('School has no pending admin information');
    }

    // 1. Approve in school service (creates tenant DB, updates status)
    const { adminCredentials } = await this.schoolsService.approveSchool(
      schoolId,
      approvedById,
    );

    // 2. Create the admin user IN THE TENANT DATABASE (not main DB)
    let user: any;
    try {
      user = await this.tenantDatabaseService.createTenantUser(school.code, {
        firstName: school.pendingAdmin.firstName,
        lastName: school.pendingAdmin.lastName,
        email: school.pendingAdmin.email,
        passwordHash: school.pendingAdmin.passwordHash,
        role: UserRole.PRINCIPAL,
        phone: school.pendingAdmin.phone,
      });
      
      this.logger.log(`Created Principal user in tenant DB for school: ${school.code}`);
    } catch (error) {
      // Rollback: revert school status
      this.logger.error(`Failed to create admin user in tenant DB: ${error.message}`);
      throw new BadRequestException(
        `Failed to create admin user: ${error.message}`,
      );
    }

    // 3. Audit log
    await this.createAuditLog(
      school._id,
      approvedById,
      AuditAction.UPDATE,
      'School',
      school._id,
      `School approved and admin user created in tenant DB: ${user.email}`,
    );

    // TODO: Send approval email to admin with login instructions

    return {
      message: 'School approved successfully',
      school: {
        id: school._id.toString(),
        name: school.name,
        code: school.code,
        status: 'active',
        dbName: `school_${school.code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      },
      admin: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  /**
   * Get all pending school registrations (for Super Admin dashboard)
   */
  async getPendingSchools(page = 1, limit = 20) {
    return this.schoolsService.findPendingApproval(page, limit);
  }

  /**
   * Reject a pending school registration
   */
  async rejectSchool(schoolId: string, rejectedById: string, reason: string) {
    const school = await this.schoolsService.rejectSchool(
      schoolId,
      rejectedById,
      reason,
    ) as any;

    await this.createAuditLog(
      school._id,
      rejectedById,
      AuditAction.UPDATE,
      'School',
      school._id,
      `School rejected: ${reason}`,
    );

    // TODO: Send rejection email to pending admin

    return {
      message: 'School registration rejected',
      school: {
        id: school._id.toString(),
        name: school.name,
        code: school.code,
        status: 'rejected',
        reason,
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PUBLIC ENDPOINTS FOR STUDENT REGISTRATION
  // ════════════════════════════════════════════════════════════════════════════

  async getPublicSchools() {
    const schools = await this.schoolsService.findActiveSchools();
    return {
      success: true,
      data: (schools as any[]).map((s: any) => ({
        code: s.code,
        name: s.name,
        logo: s.logo,
        address: s.address,
      })),
    };
  }

  async getPublicSchoolClasses(schoolCode: string) {
    const school = await this.schoolsService.findByCode(schoolCode);
    if (!school) {
      throw new BadRequestException('School not found');
    }

    const ClassModel = await this.tenantDatabaseService.getTenantModel(
      schoolCode,
      'Class',
    );

    const classes = await ClassModel.find({ isActive: true })
      .select('name grade sections')
      .sort({ grade: 1, name: 1 });

    return {
      success: true,
      data: classes.map((c: any) => ({
        _id: c._id,
        name: c.name,
        grade: c.grade,
        sections: c.sections?.map((s: any) => s.name || s) || [],
      })),
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STUDENT APPROVAL WORKFLOW
  // ════════════════════════════════════════════════════════════════════════════

  async getPendingStudents(
    schoolId: string,
    schoolCode: string,
    classId?: string,
    role?: string,
    userId?: string,
  ) {
    const { StudentStatus } = await import('../../common/enums/student-status.enum');
    
    const StudentModel = await this.tenantDatabaseService.getTenantModel(
      schoolCode,
      'Student',
    );

    const filter: any = { status: StudentStatus.PENDING_APPROVAL };
    
    // Class teachers only see students for their assigned class
    if (role === UserRole.CLASS_TEACHER && classId) {
      filter.currentClass = classId;
    } else if (classId) {
      filter.currentClass = classId;
    }

    const students = await StudentModel.find(filter)
      .populate('currentClass', 'name grade')
      .sort({ createdAt: -1 });

    return {
      success: true,
      data: students.map((s: any) => ({
        _id: s._id,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.contact?.email,
        phone: s.contact?.phone,
        currentClass: s.currentClass,
        currentSection: s.currentSection,
        dateOfBirth: s.dateOfBirth,
        gender: s.gender,
        registrationDate: s.metadata?.registrationDate,
        parentInfo: s.metadata?.parentInfo,
      })),
      total: students.length,
    };
  }

  async approveStudent(
    studentId: string,
    schoolId: string,
    schoolCode: string,
    approvedById: string,
  ) {
    const { StudentStatus } = await import('../../common/enums/student-status.enum');
    
    const StudentModel = await this.tenantDatabaseService.getTenantModel(
      schoolCode,
      'Student',
    );
    const UserModel = await this.tenantDatabaseService.getTenantModel(
      schoolCode,
      'User',
    );

    const student = await StudentModel.findById(studentId);
    if (!student) {
      throw new BadRequestException('Student not found');
    }

    const studentDoc = student as any;
    if (studentDoc.status !== StudentStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Student is not pending approval');
    }

    // Create user account for student
    const email = studentDoc.contact?.email;
    const passwordHash = studentDoc.metadata?.passwordHash;
    
    if (!email || !passwordHash) {
      throw new BadRequestException('Student registration data incomplete');
    }

    const user = await UserModel.create({
      email,
      password: passwordHash,
      firstName: studentDoc.firstName,
      lastName: studentDoc.lastName,
      role: UserRole.STUDENT,
      school: schoolId,
      isActive: true,
    });

    // Update student status and link user
    studentDoc.status = StudentStatus.ACTIVE;
    studentDoc.user = user._id;
    studentDoc.admissionDate = new Date();
    
    // Generate actual admission number
    const year = new Date().getFullYear();
    const count = await StudentModel.countDocuments({ status: { $ne: StudentStatus.PENDING_APPROVAL } });
    studentDoc.admissionNumber = `ADM${year}${String(count + 1).padStart(5, '0')}`;
    
    // Clean up metadata
    if (studentDoc.metadata) {
      delete studentDoc.metadata.pendingApproval;
      delete studentDoc.metadata.passwordHash;
    }
    
    await studentDoc.save();

    // Create parent if info provided
    if (studentDoc.metadata?.parentInfo) {
      try {
        const parentInfo = studentDoc.metadata.parentInfo;
        const ParentModel = await this.tenantDatabaseService.getTenantModel(
          schoolCode,
          'Parent',
        );
        
        const parent = await ParentModel.create({
          school: schoolId,
          firstName: parentInfo.firstName,
          lastName: parentInfo.lastName,
          email: parentInfo.email,
          phone: parentInfo.phone,
          relationship: parentInfo.relation,
          children: [studentDoc._id],
        });

        // Create parent user account if email provided
        if (parentInfo.email) {
          const parentUser = await UserModel.create({
            email: parentInfo.email,
            password: await bcrypt.hash('Parent@123', 10), // Default password
            firstName: parentInfo.firstName,
            lastName: parentInfo.lastName,
            role: UserRole.PARENT,
            school: schoolId,
            isActive: true,
          });
          
          await ParentModel.findByIdAndUpdate(parent._id, { user: parentUser._id });
        }

        // Link parent to student
        studentDoc.parents = [parent._id];
        await studentDoc.save();
      } catch (err) {
        this.logger.warn(`Failed to create parent for student ${studentId}: ${err.message}`);
      }
    }

    this.logger.log(
      `Student approved: ${studentDoc.firstName} ${studentDoc.lastName} - ${studentDoc.admissionNumber}`,
    );

    return {
      success: true,
      message: 'Student approved successfully. Login credentials have been created.',
      data: {
        student: {
          _id: studentDoc._id,
          firstName: studentDoc.firstName,
          lastName: studentDoc.lastName,
          admissionNumber: studentDoc.admissionNumber,
          email,
        },
      },
    };
  }

  async rejectStudent(
    studentId: string,
    schoolId: string,
    schoolCode: string,
    rejectedById: string,
    reason: string,
  ) {
    const { StudentStatus } = await import('../../common/enums/student-status.enum');
    
    const StudentModel = await this.tenantDatabaseService.getTenantModel(
      schoolCode,
      'Student',
    );

    const student = await StudentModel.findById(studentId);
    if (!student) {
      throw new BadRequestException('Student not found');
    }

    const studentDoc = student as any;
    if (studentDoc.status !== StudentStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Student is not pending approval');
    }

    studentDoc.status = StudentStatus.REJECTED;
    studentDoc.metadata = {
      ...studentDoc.metadata,
      rejectedAt: new Date(),
      rejectedBy: rejectedById,
      rejectionReason: reason,
    };
    await studentDoc.save();

    this.logger.log(
      `Student registration rejected: ${studentDoc.firstName} ${studentDoc.lastName} - Reason: ${reason}`,
    );

    return {
      success: true,
      message: 'Student registration rejected',
      data: {
        student: {
          _id: studentDoc._id,
          firstName: studentDoc.firstName,
          lastName: studentDoc.lastName,
        },
        reason,
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TEACHER SELF-REGISTRATION WORKFLOW
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Register a new teacher for a school.
   * Teacher is created with PENDING_APPROVAL status.
   * Principal must approve before teacher can login.
   */
  async registerTeacher(dto: any) {
    // Find school by code
    const school = await this.schoolsService.findByCode(dto.schoolCode);
    if (!school) {
      throw new BadRequestException('Invalid school code. Please check and try again.');
    }

    const schoolDoc = school as any;
    if (schoolDoc.status !== 'active') {
      throw new BadRequestException('This school is not accepting registrations at the moment.');
    }

    // Get tenant Teacher and User models
    const TeacherModel = await this.tenantDatabaseService.getTenantModel(
      dto.schoolCode,
      'Teacher',
    );
    const UserModel = await this.tenantDatabaseService.getTenantModel(
      dto.schoolCode,
      'User',
    );

    // Check if email already registered in this school
    const existingTeacher = await TeacherModel.findOne({ email: dto.email });
    if (existingTeacher) {
      throw new BadRequestException('This email is already registered as a teacher in this school.');
    }

    const existingUser = await UserModel.findOne({ email: dto.email });
    if (existingUser) {
      throw new BadRequestException('This email is already registered in this school.');
    }

    // Hash password for user account
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Generate employee ID
    const year = new Date().getFullYear();
    const count = await TeacherModel.countDocuments();
    const employeeId = `TREG${year}${String(count + 1).padStart(5, '0')}`;

    // Create teacher with pending status
    const teacher = await TeacherModel.create({
      school: schoolDoc._id,
      employeeId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      gender: dto.gender,
      designation: dto.designation || 'Teacher',
      department: dto.department,
      qualifications: dto.qualifications || [],
      roleCode: dto.roleCode || 'subject_teacher', // Store the selected role
      status: 'pending_approval',
      isActive: false,
      metadata: {
        pendingApproval: true,
        registrationDate: new Date(),
        passwordHash, // Store encrypted password for user creation after approval
        registrationMessage: dto.message,
      },
    });

    const createdTeacher = teacher as any;
    this.logger.log(
      `New teacher registration pending approval: ${dto.firstName} ${dto.lastName} @ ${schoolDoc.name}`,
    );

    return {
      success: true,
      message: 'Your registration has been submitted successfully! The principal will review and approve your registration. You will receive a notification once approved.',
      data: {
        registrationId: createdTeacher._id.toString(),
        employeeId: createdTeacher.employeeId,
        school: {
          name: schoolDoc.name,
          code: schoolDoc.code,
        },
        status: 'pending_approval',
      },
    };
  }

  async getPendingTeachers(schoolId: string, schoolCode: string) {
    const TeacherModel = await this.tenantDatabaseService.getTenantModel(
      schoolCode,
      'Teacher',
    );

    const teachers = await TeacherModel.find({ status: 'pending_approval' })
      .sort({ createdAt: -1 });

    return {
      success: true,
      data: teachers.map((t: any) => ({
        _id: t._id,
        firstName: t.firstName,
        lastName: t.lastName,
        email: t.email,
        phone: t.phone,
        dateOfBirth: t.dateOfBirth,
        gender: t.gender,
        designation: t.designation,
        department: t.department,
        qualifications: t.qualifications,
        registrationDate: t.metadata?.registrationDate,
        message: t.metadata?.registrationMessage,
      })),
      total: teachers.length,
    };
  }

  async approveTeacher(
    teacherId: string,
    schoolId: string,
    schoolCode: string,
    approvedById: string,
  ) {
    const TeacherModel = await this.tenantDatabaseService.getTenantModel(
      schoolCode,
      'Teacher',
    );
    const UserModel = await this.tenantDatabaseService.getTenantModel(
      schoolCode,
      'User',
    );

    const teacher = await TeacherModel.findById(teacherId);
    if (!teacher) {
      throw new BadRequestException('Teacher not found');
    }

    const teacherDoc = teacher as any;
    if (teacherDoc.status !== 'pending_approval') {
      throw new BadRequestException('Teacher is not pending approval');
    }

    // Create user account for teacher
    const email = teacherDoc.email;
    const passwordHash = teacherDoc.metadata?.passwordHash;

    if (!email || !passwordHash) {
      throw new BadRequestException('Teacher registration data incomplete');
    }

    // Get role permissions if roleCode is set
    let permissions: string[] = [];
    let roleCode = teacherDoc.roleCode || 'subject_teacher'; // Default to subject_teacher

    // Use RolesService which queries the correct tenant database
    const role = await this.rolesService.findByCode(roleCode, { schoolCode, isTenantUser: true });
    if (role) {
      permissions = role.permissions || [];
    }

    // Determine user role - map roleCode to UserRole enum where possible
    let userRole = UserRole.TEACHER;
    if (roleCode === 'class_teacher') {
      userRole = UserRole.CLASS_TEACHER;
    } else if (roleCode === 'accountant') {
      userRole = UserRole.ACCOUNTANT;
    } else if (roleCode === 'librarian') {
      userRole = UserRole.LIBRARIAN;
    }

    const user = await UserModel.create({
      email,
      password: passwordHash,
      firstName: teacherDoc.firstName,
      lastName: teacherDoc.lastName,
      role: userRole,
      roleCode: roleCode,
      permissions: permissions,
      school: schoolId,
      isActive: true,
    });

    // Update teacher status and link user
    teacherDoc.status = 'active';
    teacherDoc.isActive = true;
    teacherDoc.user = user._id;
    teacherDoc.joiningDate = new Date();

    // Generate actual employee ID
    const year = new Date().getFullYear();
    const count = await TeacherModel.countDocuments({ status: { $ne: 'pending_approval' } });
    teacherDoc.employeeId = `EMP${year}${String(count + 1).padStart(5, '0')}`;

    // Clean up metadata
    if (teacherDoc.metadata) {
      delete teacherDoc.metadata.pendingApproval;
      delete teacherDoc.metadata.passwordHash;
    }

    await teacherDoc.save();

    this.logger.log(
      `Teacher approved: ${teacherDoc.firstName} ${teacherDoc.lastName} - ${teacherDoc.employeeId}`,
    );

    return {
      success: true,
      message: 'Teacher approved successfully. Login credentials have been created.',
      data: {
        teacher: {
          _id: teacherDoc._id,
          firstName: teacherDoc.firstName,
          lastName: teacherDoc.lastName,
          employeeId: teacherDoc.employeeId,
          email,
        },
      },
    };
  }

  async rejectTeacher(
    teacherId: string,
    schoolId: string,
    schoolCode: string,
    rejectedById: string,
    reason: string,
  ) {
    const TeacherModel = await this.tenantDatabaseService.getTenantModel(
      schoolCode,
      'Teacher',
    );

    const teacher = await TeacherModel.findById(teacherId);
    if (!teacher) {
      throw new BadRequestException('Teacher not found');
    }

    const teacherDoc = teacher as any;
    if (teacherDoc.status !== 'pending_approval') {
      throw new BadRequestException('Teacher is not pending approval');
    }

    teacherDoc.status = 'rejected';
    teacherDoc.isActive = false;
    teacherDoc.metadata = {
      ...teacherDoc.metadata,
      rejectedAt: new Date(),
      rejectedBy: rejectedById,
      rejectionReason: reason,
    };
    await teacherDoc.save();

    this.logger.log(
      `Teacher registration rejected: ${teacherDoc.firstName} ${teacherDoc.lastName} - Reason: ${reason}`,
    );

    return {
      success: true,
      message: 'Teacher registration rejected',
      data: {
        teacher: {
          _id: teacherDoc._id,
          firstName: teacherDoc.firstName,
          lastName: teacherDoc.lastName,
        },
        reason,
      },
    };
  }

  private async generateTokens(user: UserDocument) {
    // Ensure school is always a plain string ID, not a populated object
    const schoolId = user.school
      ? (typeof user.school === 'object' && (user.school as any)._id
        ? (user.school as any)._id.toString()
        : user.school.toString())
      : null;

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      school: schoolId,
      permissions: user.permissions,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>(
        'JWT_REFRESH_SECRET',
        this.configService.get<string>('JWT_SECRET'),
      ),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d') as any,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Generate tokens for multi-tenant authentication
   * Includes school code for tenant database routing
   */
  private async generateTokensForMultiTenant(user: any, school: any, isFromTenantDb: boolean) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      school: school?._id?.toString() || null,
      schoolCode: school?.code || null,
      permissions: user.permissions || [],
      isTenantUser: isFromTenantDb,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>(
        'JWT_REFRESH_SECRET',
        this.configService.get<string>('JWT_SECRET'),
      ),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d') as any,
    });

    return { accessToken, refreshToken };
  }

  private async createAuditLog(
    school: any,
    user: any,
    action: AuditAction,
    resource: string,
    resourceId: any,
    description: string,
  ) {
    try {
      await this.auditLogModel.create({
        school,
        user,
        action,
        resource,
        resourceId,
        description,
      });
    } catch (error) {
      this.logger.error('Failed to create audit log', error.stack);
    }
  }
}

