import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { getEnvFilePath } from './helpers/env.config';

// Core Modules
import { DatabaseModule } from './database/database/database.module';
import { SharedModule } from './common/modules/shared.module';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AcademicYearsModule } from './modules/academic-years/academic-years.module';
import { ClassesModule } from './modules/classes/classes.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { ParentsModule } from './modules/parents/parents.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ExamsModule } from './modules/exams/exams.module';
import { ResultsModule } from './modules/results/results.module';
import { FeesModule } from './modules/fees/fees.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { TimetableModule } from './modules/timetable/timetable.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TransportModule } from './modules/transport/transport.module';
import { RolesModule } from './modules/roles/roles.module';
import { ClassTeacherAssignmentsModule } from './modules/class-teacher-assignments/class-teacher-assignments.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { EventsModule } from './modules/events/events.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuration - load environment-specific .env file
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePath(),
    }),

    // Database - master + tenant database support
    DatabaseModule,

    // Shared services (Response, Translation)
    SharedModule,

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60000),
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),

    // Scheduled tasks
    ScheduleModule.forRoot(),

    // Event emitter for decoupled event handling
    EventEmitterModule.forRoot(),

    // Feature modules
    AuthModule,
    UsersModule,
    SchoolsModule,
    SubscriptionsModule,
    AcademicYearsModule,
    ClassesModule,
    StudentsModule,
    TeachersModule,
    ParentsModule,
    SubjectsModule,
    AttendanceModule,
    ExamsModule,
    ResultsModule,
    FeesModule,
    PromotionsModule,
    TransfersModule,
    TimetableModule,
    TransportModule,
    NotificationsModule,
    ReportsModule,
    SettingsModule,
    RolesModule,
    ClassTeacherAssignmentsModule,
    DashboardModule,
    EnrollmentsModule,
    EventsModule,
    ActivityLogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
