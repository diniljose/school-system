import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ACCESS_TOKEN_SECRET } from '../../../constants';
import { UsersService } from '../../users/users.service';
import { TenantDatabaseService } from '../../../database/tenant-database.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  school?: string;
  schoolId?: string;
  schoolCode: string;
  permissions: string[];
  isTenantUser: boolean;
  profile?: string;
  profileModel?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private usersService: UsersService,
    private tenantDatabaseService: TenantDatabaseService,
  ) {
    if (!ACCESS_TOKEN_SECRET) {
      throw new Error(
        'Missing access token secret. Set ACCESS_TOKEN_SECRET_KALA, JWT_SECRET, or SERVER_JWT_SECRET.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: ACCESS_TOKEN_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    this.logger.debug(`JWT Payload: ${JSON.stringify(payload)}`);
    
    let user: any;

    // Check if this is a tenant user (school staff/principal)
    if (payload.isTenantUser && payload.schoolCode) {
      this.logger.debug(`Looking up tenant user: ${payload.email} in school: ${payload.schoolCode}`);
      // Look up user in the school's tenant database
      user = await this.tenantDatabaseService.findTenantUserByEmail(
        payload.schoolCode,
        payload.email,
      );
      this.logger.debug(`Tenant user found: ${user ? 'yes' : 'no'}`);
    } else {
      this.logger.debug(`Looking up main DB user by ID: ${payload.sub}`);
      // Platform admin - look up in main database
      user = await this.usersService.findById(payload.sub);
      this.logger.debug(`Main DB user found: ${user ? 'yes' : 'no'}`);
    }

    if (!user || !user.isActive) {
      this.logger.warn(`Authentication failed for ${payload.email}: user not found or inactive`);
      throw new UnauthorizedException('Authentication failed');
    }

    return {
      sub: payload.sub,
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      school: payload.school,
      schoolId: payload.schoolId,
      schoolCode: payload.schoolCode,
      permissions: payload.permissions || [],
      isTenantUser: payload.isTenantUser || false,
      profile: payload.profile || user?.profile?.toString() || null,
      profileModel: payload.profileModel || user?.profileModel || null,
    };
  }
}
