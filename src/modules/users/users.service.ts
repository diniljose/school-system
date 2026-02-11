/**
 * Users Service
 * Fixed: double password hashing, added missing methods for auth flow
 * Updated: Multi-tenant support
 */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { SchoolsService } from '../schools/schools.service';
import { TenantDatabaseService } from '../../database/tenant-database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UserRole } from '../../common/enums/roles.enum';
import { buildPaginatedResult, PaginatedResult } from '../../common/interfaces/paginated-result.interface';

// Tenant context for multi-tenant operations
export interface TenantContext {
  schoolId?: string;
  schoolCode?: string;
  isTenantUser?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private schoolsService: SchoolsService,
    private tenantDatabaseService: TenantDatabaseService,
  ) {}

  /**
   * Get the appropriate model based on tenant context
   */
  private async getUserModel(context?: TenantContext): Promise<Model<UserDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<UserDocument>(
        context.schoolCode,
        'User',
      );
    }
    return this.userModel;
  }

  async create(createUserDto: CreateUserDto, context?: TenantContext): Promise<User> {
    const model = await this.getUserModel(context);
    
    const filter: any = { email: createUserDto.email };
    if (!context?.isTenantUser && createUserDto.school) {
      filter.school = new Types.ObjectId(createUserDto.school);
    }

    const existingUser = await model.findOne(filter);

    if (existingUser) {
      throw new ConflictException(
        createUserDto.school
          ? 'User with this email already exists in this school'
          : 'User with this email already exists',
      );
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const userData: any = {
      ...createUserDto,
      password: hashedPassword,
    };
    
    // Only add school field for non-tenant users
    if (!context?.isTenantUser && createUserDto.school) {
      userData.school = new Types.ObjectId(createUserDto.school);
    }

    const user = new model(userData);
    return user.save();
  }

  /**
   * Create a user with an already-hashed password.
   * Used during school approval to preserve the password from registration.
   */
  async createWithHashedPassword(userData: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    school: string;
    phone?: string;
  }): Promise<User> {
    const filter: any = { email: userData.email };
    if (userData.school) {
      filter.school = new Types.ObjectId(userData.school);
    }

    const existingUser = await this.userModel.findOne(filter);
    if (existingUser) {
      throw new ConflictException(
        'User with this email already exists in this school',
      );
    }

    const user = new this.userModel({
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      password: userData.passwordHash, // Already hashed!
      role: userData.role,
      school: new Types.ObjectId(userData.school),
      phone: userData.phone,
      isActive: true,
    });

    return user.save();
  }

  async findAll(query: QueryUserDto, context?: TenantContext): Promise<PaginatedResult<User>> {
    const model = await this.getUserModel(context);
    const {
      page = 1,
      limit = 10,
      search,
      role,
      school,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) filter.role = role;
    // Only filter by school for non-tenant users
    if (!context?.isTenantUser && school) {
      filter.school = new Types.ObjectId(school);
    }
    if (isActive !== undefined) filter.isActive = isActive;

    const skip = (page - 1) * limit;
    const sortOptions: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      model
        .find(filter)
        .select('-password -passwordResetToken -passwordResetExpires')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      model.countDocuments(filter),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findById(id: string, context?: TenantContext): Promise<User> {
    const model = await this.getUserModel(context);
    const user = await model
      .findById(id)
      .select('-password -passwordResetToken -passwordResetExpires')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Find user by ID including password field (for password verification)
   */
  async findByIdWithPassword(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByEmailAndSchool(
    email: string,
    schoolCode: string,
  ): Promise<User | null> {
    const school = await this.schoolsService.findByCode(schoolCode);
    if (!school) return null;

    return this.userModel
      .findOne({ email, school: (school as any)._id })
      .exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto, context?: TenantContext): Promise<User> {
    const model = await this.getUserModel(context);
    const user = await model
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password -passwordResetToken -passwordResetExpires')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update password - receives ALREADY HASHED password
   * No double-hashing!
   */
  async updatePasswordDirect(id: string, hashedPassword: string, context?: TenantContext): Promise<void> {
    const model = await this.getUserModel(context);
    const result = await model.updateOne(
      { _id: id },
      { password: hashedPassword },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException('User not found');
    }
  }

  /**
   * Old method kept for backward compatibility but fixed to not double-hash
   * @deprecated Use updatePasswordDirect instead
   */
  async updatePassword(id: string, newPassword: string, context?: TenantContext): Promise<void> {
    const model = await this.getUserModel(context);
    // Assume newPassword is already hashed if it looks like a bcrypt hash
    const isHashed = newPassword.startsWith('$2b$') || newPassword.startsWith('$2a$');
    const password = isHashed
      ? newPassword
      : await bcrypt.hash(newPassword, 10);

    const result = await model.updateOne(
      { _id: id },
      { password },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException('User not found');
    }
  }

  async updateLastLogin(id: string, context?: TenantContext): Promise<void> {
    const model = await this.getUserModel(context);
    await model.updateOne({ _id: id }, { lastLogin: new Date() });
  }

  async updateRole(id: string, role: UserRole, context?: TenantContext): Promise<User> {
    const model = await this.getUserModel(context);
    const user = await model
      .findByIdAndUpdate(id, { role }, { new: true })
      .select('-password')
      .exec();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updatePermissions(id: string, permissions: string[], context?: TenantContext): Promise<User> {
    const model = await this.getUserModel(context);
    const user = await model
      .findByIdAndUpdate(id, { permissions }, { new: true })
      .select('-password')
      .exec();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async remove(id: string, context?: TenantContext): Promise<void> {
    const model = await this.getUserModel(context);
    const user = await model.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    if (!user) throw new NotFoundException('User not found');
  }

  /**
   * Set password reset token and expiry
   */
  async setPasswordResetToken(
    id: string,
    token: string,
    expires: Date,
    context?: TenantContext,
  ): Promise<void> {
    const model = await this.getUserModel(context);
    await model.updateOne(
      { _id: id },
      { passwordResetToken: token, passwordResetExpires: expires },
    );
  }

  /**
   * Find user by password reset token (must not be expired)
   */
  async findByResetToken(hashedToken: string, context?: TenantContext): Promise<User | null> {
    const model = await this.getUserModel(context);
    return model
      .findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() },
      })
      .exec();
  }

  /**
   * Clear password reset token after successful reset
   */
  async clearPasswordResetToken(id: string, context?: TenantContext): Promise<void> {
    const model = await this.getUserModel(context);
    await model.updateOne(
      { _id: id },
      { $unset: { passwordResetToken: 1, passwordResetExpires: 1 } },
    );
  }

  async bulkCreate(users: CreateUserDto[], context?: TenantContext): Promise<{
    created: number;
    failed: number;
    errors: Array<{ email: string; error: string }>;
  }> {
    const results = {
      created: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>,
    };

    for (const userDto of users) {
      try {
        await this.create(userDto, context);
        results.created++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: userDto.email,
          error: error.message || 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Count users by school and role
   */
  async countBySchool(
    schoolId: string,
    role?: UserRole,
  ): Promise<number> {
    const filter: any = {
      school: new Types.ObjectId(schoolId),
      isActive: true,
    };
    if (role) filter.role = role;
    return this.userModel.countDocuments(filter);
  }
}
