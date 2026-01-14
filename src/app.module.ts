import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/school-system',
    ),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),

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
    NotificationsModule,
    ReportsModule,
    SettingsModule,
  ],
})
export class AppModule {}
