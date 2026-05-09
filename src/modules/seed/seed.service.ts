import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { UserRole } from '../../common/enums/roles.enum';
import { SeedPlatformAdminDto } from './dto/seed-platform-admin.dto';

@Injectable()
export class SeedService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async createPlatformAdmin(dto: SeedPlatformAdminDto) {
    const email = (dto.email ?? 'admin@schoolplatform.com').toLowerCase();
    const password = dto.password ?? 'Admin@123';
    const firstName = dto.firstName ?? 'Platform';
    const lastName = dto.lastName ?? 'Admin';
    const phone = dto.phone ?? '+91-9999999999';

    const existing = await this.userModel
      .findOne({ email, role: UserRole.PLATFORM_ADMIN })
      .exec();

    if (existing) {
      return {
        message: 'Platform admin already exists',
        email,
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const created = await this.userModel.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      role: UserRole.PLATFORM_ADMIN,
      isActive: true,
      school: null,
      permissions: [],
    });

    const result = created.toObject();
    delete result.password;

    return {
      message: 'Platform admin created successfully',
      user: result,
      credentials: {
        email,
        password,
      },
    };
  }
}
