import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { School, SchoolDocument, SchoolStatus } from '../../database/schemas/school.schema';
import {
  Subscription,
  SubscriptionDocument,
} from '../../database/schemas/subscription.schema';
import { TenantDatabaseService } from '../../database/tenant-database.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { QuerySchoolDto } from './dto/query-school.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateFeaturesDto } from './dto/update-features.dto';

@Injectable()
export class SchoolsService {
  private readonly logger = new Logger(SchoolsService.name);

  constructor(
    @InjectModel(School.name) private schoolModel: Model<SchoolDocument>,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    private tenantDatabaseService: TenantDatabaseService,
  ) {}

  async create(createSchoolDto: CreateSchoolDto): Promise<School> {
    // Auto-generate code and slug if not provided
    if (!createSchoolDto.code) {
      createSchoolDto.code = this.generateSchoolCode(createSchoolDto.name);
    }
    if (!createSchoolDto.slug) {
      createSchoolDto.slug = this.generateSlug(createSchoolDto.name);
    }

    const existingCode = await this.schoolModel
      .findOne({ code: createSchoolDto.code })
      .exec();
    if (existingCode) {
      throw new ConflictException('School code already exists');
    }

    const existingSlug = await this.schoolModel
      .findOne({ slug: createSchoolDto.slug })
      .exec();
    if (existingSlug) {
      throw new ConflictException('School slug already exists');
    }

    // School is created with PENDING_APPROVAL status by default (from schema)
    // Tenant database is NOT created here - it's created on approval
    const school = new this.schoolModel(createSchoolDto);
    const savedSchool = await school.save();

    this.logger.log(
      `School registration created (pending approval): ${savedSchool.name} (${savedSchool.code})`,
    );

    return savedSchool;
  }

  async findAll(query: QuerySchoolDto) {
    const {
      page,
      limit,
      search,
      isActive,
      city,
      state,
      country,
      sortBy,
      sortOrder,
    } = query;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }

    if (state) {
      filter.state = { $regex: state, $options: 'i' };
    }

    if (country) {
      filter.country = { $regex: country, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.schoolModel
        .find(filter)
        .populate('subscription')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.schoolModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<School> {
    const school = await this.schoolModel
      .findById(id)
      .populate('subscription')
      .exec();

    if (!school) {
      throw new NotFoundException('School not found');
    }

    return school;
  }

  async findByCode(code: string): Promise<SchoolDocument> {
    const school = await this.schoolModel
      .findOne({ code })
      .populate('subscription')
      .exec();

    if (!school) {
      throw new NotFoundException('School not found');
    }

    return school;
  }

  async findBySlug(slug: string): Promise<School> {
    const school = await this.schoolModel
      .findOne({ slug })
      .populate('subscription')
      .exec();

    if (!school) {
      throw new NotFoundException('School not found');
    }

    return school;
  }

  /**
   * Find a school by the admin/principal email
   * Used during login to route to correct tenant database
   */
  async findByAdminEmail(email: string): Promise<SchoolDocument | null> {
    return this.schoolModel
      .findOne({ 'pendingAdmin.email': email })
      .exec();
  }

  /**
   * Find all active schools for public listing (student registration)
   */
  async findActiveSchools(): Promise<SchoolDocument[]> {
    return this.schoolModel
      .find({ status: SchoolStatus.ACTIVE })
      .select('code name logo address status')
      .sort({ name: 1 })
      .exec();
  }

  async update(id: string, updateSchoolDto: UpdateSchoolDto): Promise<School> {
    if (updateSchoolDto.code) {
      const existingCode = await this.schoolModel
        .findOne({ code: updateSchoolDto.code, _id: { $ne: id } })
        .exec();
      if (existingCode) {
        throw new ConflictException('School code already exists');
      }
    }

    if (updateSchoolDto.slug) {
      const existingSlug = await this.schoolModel
        .findOne({ slug: updateSchoolDto.slug, _id: { $ne: id } })
        .exec();
      if (existingSlug) {
        throw new ConflictException('School slug already exists');
      }
    }

    const school = await this.schoolModel
      .findByIdAndUpdate(id, updateSchoolDto, { new: true })
      .populate('subscription')
      .exec();

    if (!school) {
      throw new NotFoundException('School not found');
    }

    return school;
  }

  async remove(id: string): Promise<void> {
    const school = await this.schoolModel.findById(id).exec();

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Drop the school's dedicated database
    try {
      await this.tenantDatabaseService.dropSchoolDatabase(school.code);
      this.logger.log(`Dropped database for school: ${school.code}`);
    } catch (error) {
      this.logger.error(
        `Failed to drop database for school ${school.code}: ${error.message}`,
      );
    }

    await this.schoolModel.findByIdAndDelete(id).exec();
  }

  async updateSettings(
    id: string,
    updateSettingsDto: UpdateSettingsDto,
  ): Promise<School> {
    const school = await this.schoolModel.findById(id).exec();

    if (!school) {
      throw new NotFoundException('School not found');
    }

    school.settings = {
      ...school.settings,
      ...updateSettingsDto,
    };

    return school.save();
  }

  async updateFeatures(
    id: string,
    updateFeaturesDto: UpdateFeaturesDto,
  ): Promise<School> {
    const school = await this.schoolModel.findById(id).exec();

    if (!school) {
      throw new NotFoundException('School not found');
    }

    school.features = {
      ...school.features,
      ...updateFeaturesDto,
    };

    return school.save();
  }

  async toggleFeature(
    id: string,
    feature: string,
    enabled: boolean,
  ): Promise<School> {
    const school = await this.schoolModel.findById(id).exec();

    if (!school) {
      throw new NotFoundException('School not found');
    }

    if (!school.features || !(feature in school.features)) {
      throw new BadRequestException(`Invalid feature: ${feature}`);
    }

    school.features[feature] = enabled;
    return school.save();
  }

  async getStatistics() {
    const [total, active, pending, byPlan] = await Promise.all([
      this.schoolModel.countDocuments().exec(),
      this.schoolModel.countDocuments({ status: SchoolStatus.ACTIVE }).exec(),
      this.schoolModel.countDocuments({ status: SchoolStatus.PENDING_APPROVAL }).exec(),
      this.subscriptionModel.aggregate([
        {
          $group: {
            _id: '$plan',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      total,
      active,
      pending,
      inactive: total - active - pending,
      byPlan: byPlan.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }

  /**
   * Find schools pending approval (for Super Admin dashboard)
   */
  async findPendingApproval(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.schoolModel
        .find({ status: SchoolStatus.PENDING_APPROVAL })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.schoolModel.countDocuments({ status: SchoolStatus.PENDING_APPROVAL }).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find a pending school by the admin's email
   */
  async findByPendingAdminEmail(email: string): Promise<SchoolDocument | null> {
    return this.schoolModel
      .findOne({
        'pendingAdmin.email': email,
        status: SchoolStatus.PENDING_APPROVAL,
      })
      .exec();
  }

  /**
   * Approve a school registration (Super Admin only)
   * This creates the tenant database and provisions the admin user
   */
  async approveSchool(
    schoolId: string,
    approvedById: string,
  ): Promise<{ school: School; adminCredentials: { email: string } }> {
    const school = await this.schoolModel.findById(schoolId).exec();

    if (!school) {
      throw new NotFoundException('School not found');
    }

    if (school.status !== SchoolStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `School cannot be approved - current status is ${school.status}`,
      );
    }

    if (!school.pendingAdmin) {
      throw new BadRequestException(
        'School has no pending admin information',
      );
    }

    // Create tenant database for the school
    try {
      const dbName = `school_${school.code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      await this.tenantDatabaseService.createSchoolDatabase(school.code);
      
      // Create the admin user in the tenant database
      const { UserRole } = await import('../../common/enums/roles.enum');
      await this.tenantDatabaseService.createTenantUser(school.code, {
        firstName: school.pendingAdmin.firstName,
        lastName: school.pendingAdmin.lastName,
        email: school.pendingAdmin.email,
        passwordHash: school.pendingAdmin.passwordHash,
        role: UserRole.PRINCIPAL,
        phone: school.pendingAdmin.phone,
      });
      
      this.logger.log(`Created admin user ${school.pendingAdmin.email} for school ${school.code}`);
      
      // Update school status
      school.status = SchoolStatus.ACTIVE;
      school.dbName = dbName;
      school.approvedAt = new Date();
      school.approvedBy = new Types.ObjectId(approvedById);
      
      await school.save();

      this.logger.log(`Approved school: ${school.name} (${school.code})`);

      return {
        school,
        adminCredentials: {
          email: school.pendingAdmin.email,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to approve school ${school.code}: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to create school database: ${error.message}`,
      );
    }
  }

  /**
   * Reject a school registration (Super Admin only)
   */
  async rejectSchool(
    schoolId: string,
    rejectedById: string,
    reason: string,
  ): Promise<School> {
    const school = await this.schoolModel.findById(schoolId).exec();

    if (!school) {
      throw new NotFoundException('School not found');
    }

    if (school.status !== SchoolStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `School cannot be rejected - current status is ${school.status}`,
      );
    }

    school.status = SchoolStatus.REJECTED;
    school.rejectionReason = reason;
    school.approvedBy = new Types.ObjectId(rejectedById); // reusing field for who rejected
    school.approvedAt = new Date(); // reusing field for rejection date

    await school.save();

    this.logger.log(`Rejected school: ${school.name} (${school.code}) - Reason: ${reason}`);

    // TODO: Send rejection email to pending admin

    return school;
  }

  /**
   * Suspend an active school (Super Admin only)
   */
  async suspendSchool(schoolId: string, reason: string): Promise<School> {
    const school = await this.schoolModel.findById(schoolId).exec();

    if (!school) {
      throw new NotFoundException('School not found');
    }

    if (school.status !== SchoolStatus.ACTIVE) {
      throw new BadRequestException(
        `Only active schools can be suspended`,
      );
    }

    school.status = SchoolStatus.SUSPENDED;
    school.rejectionReason = reason; // reusing field for suspension reason

    await school.save();

    this.logger.log(`Suspended school: ${school.name} (${school.code})`);

    return school;
  }

  /**
   * Reactivate a suspended school (Super Admin only)
   */
  async reactivateSchool(schoolId: string): Promise<School> {
    const school = await this.schoolModel.findById(schoolId).exec();

    if (!school) {
      throw new NotFoundException('School not found');
    }

    if (school.status !== SchoolStatus.SUSPENDED) {
      throw new BadRequestException(
        `Only suspended schools can be reactivated`,
      );
    }

    school.status = SchoolStatus.ACTIVE;
    school.rejectionReason = undefined;

    await school.save();

    this.logger.log(`Reactivated school: ${school.name} (${school.code})`);

    return school;
  }

  private generateSchoolCode(name: string): string {
    const initials = name
      .split(' ')
      .filter((w) => w.length > 0)
      .map((w) => w[0].toUpperCase())
      .join('');
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${initials}-${suffix}`;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}
