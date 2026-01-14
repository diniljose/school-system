import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../users/users.service';
import { UserDocument } from '../../../database/schemas/user.schema';

export interface ValidatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  school: string | null;
  permissions: string[];
}

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    email: string,
    password: string,
  ): Promise<ValidatedUser> {
    const schoolCode = req.body?.schoolCode;

    const user = await this.usersService.findByEmailAndSchool(
      email,
      schoolCode,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userDoc = user as UserDocument;

    return {
      id: userDoc._id.toString(),
      email: userDoc.email,
      firstName: userDoc.firstName,
      lastName: userDoc.lastName,
      role: userDoc.role,
      school: userDoc.school ? userDoc.school.toString() : null,
      permissions: userDoc.permissions,
    };
  }
}
