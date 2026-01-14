import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

<<<<<<< HEAD
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  school: string;
  permissions: string[];
}

=======
>>>>>>> 2e83d9c (Fix import spacing issues and add missing DTOs, guards, and strategies)
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
<<<<<<< HEAD
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Authentication failed');
    }

    return {
      id: payload.sub,
=======
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      userId: payload.sub,
>>>>>>> 2e83d9c (Fix import spacing issues and add missing DTOs, guards, and strategies)
      email: payload.email,
      role: payload.role,
      school: payload.school,
      permissions: payload.permissions,
    };
  }
}
