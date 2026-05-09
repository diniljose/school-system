import { Controller, Post, Body, Headers, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import { SeedService } from './seed.service';
import { SeedPlatformAdminDto } from './dto/seed-platform-admin.dto';

@ApiTags('Seed')
@Controller('seed')
export class SeedController {
  constructor(
    private readonly seedService: SeedService,
    private readonly configService: ConfigService,
  ) {}

  @Post('platform-admin')
  @Public()
  @ApiOperation({ summary: 'Create the default platform admin account' })
  @ApiResponse({ status: 201, description: 'Platform admin created or already exists' })
  @ApiResponse({ status: 403, description: 'Seed API is disabled or invalid API key' })
  async createPlatformAdmin(
    @Body() body: SeedPlatformAdminDto,
    @Headers('x-seed-api-key') apiKey?: string,
  ) {
    const enabled = this.configService.get<string>('ENABLE_SEED_API');
    const configuredKey = this.configService.get<string>('SEED_API_KEY');

    if (enabled !== 'true') {
      throw new ForbiddenException('Seed API is disabled');
    }

    if (!configuredKey) {
      throw new ForbiddenException('Seed API key is not configured');
    }

    if (!apiKey || apiKey !== configuredKey) {
      throw new ForbiddenException('Invalid seed API key');
    }

    return this.seedService.createPlatformAdmin(body);
  }
}
