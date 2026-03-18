import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';
import { SchoolsModule } from '../schools/schools.module';
import { ACCESS_TOKEN_SECRET, JWT_EXPIRES_IN } from '../../constants';
import {
  AuditLog,
  AuditLogSchema,
} from '../../database/schemas/audit-log.schema';
import { TenantDatabaseService } from '../../database/tenant-database.service';

@Module({
  imports: [
    UsersModule,
    SchoolsModule,
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => {
        if (!ACCESS_TOKEN_SECRET) {
          throw new Error(
            'Missing access token secret. Set ACCESS_TOKEN_SECRET_KALA, JWT_SECRET, or SERVER_JWT_SECRET.',
          );
        }

        return {
          secret: ACCESS_TOKEN_SECRET,
          signOptions: { expiresIn: JWT_EXPIRES_IN as any },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy, TenantDatabaseService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
