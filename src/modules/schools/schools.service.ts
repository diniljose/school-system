import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { School, SchoolDocument } from '../../database/schemas/school.schema';
import {
  Subscription,
  SubscriptionDocument,
} from '../../database/schemas/subscription.schema';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { QuerySchoolDto } from './dto/query-school.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateFeaturesDto } from './dto/update-features.dto';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectModel(School.name) private schoolModel: Model<SchoolDocument>,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  async create(createSchoolDto: CreateSchoolDto): Promise<School> {
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

    const school = new this.schoolModel(createSchoolDto);
    return school.save();
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

  async findByCode(code: string): Promise<School> {
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
    const result = await this.schoolModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('School not found');
    }
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
    const [total, active, byPlan] = await Promise.all([
      this.schoolModel.countDocuments().exec(),
      this.schoolModel.countDocuments({ isActive: true }).exec(),
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
      inactive: total - active,
      byPlan: byPlan.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }
}
