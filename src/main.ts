import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { CORS_ORIGINS, HOST, NODE_ENV, PORT } from './constants';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // Global prefix
  app.setGlobalPrefix('v1');

  // CORS configuration
  app.enableCors({
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'X-School-Code',
    ],
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('School Management System API')
    .setDescription(
      `Multi-tenant School Management System API.\n\n` +
      `**Roles:** SUPER_ADMIN, SCHOOL_ADMIN, PRINCIPAL, VICE_PRINCIPAL, ` +
      `TEACHER, CLASS_TEACHER, PARENT, STUDENT, ACCOUNTANT, LIBRARIAN, RECEPTIONIST\n\n` +
      `**Authentication:** Bearer JWT Token\n\n` +
      `Each school has its own isolated database. Use school code during login.`,
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication & Authorization')
    .addTag('Users', 'User Management')
    .addTag('Schools', 'School Management')
    .addTag('Academic Years', 'Academic Year Management')
    .addTag('Classes', 'Class & Section Management')
    .addTag('Students', 'Student Management')
    .addTag('Teachers', 'Teacher Management')
    .addTag('Parents', 'Parent Management')
    .addTag('Subjects', 'Subject Management')
    .addTag('Attendance', 'Attendance Tracking')
    .addTag('Exams', 'Examination Management')
    .addTag('Results', 'Result Management')
    .addTag('Fees', 'Fee Management')
    .addTag('Promotions', 'Student Promotions')
    .addTag('Transfers', 'Student Transfers')
    .addTag('Timetable', 'Timetable Management')
    .addTag('Transport', 'Transport & Bus Management')
    .addTag('Notifications', 'Notification Management')
    .addTag('Reports', 'Reports & Analytics')
    .addTag('Settings', 'School Settings')
    .addTag('Subscriptions', 'Subscription Management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(PORT, HOST);
  logger.log(`🚀 Application running on: http://${HOST}:${PORT}`);
  logger.log(`📚 API Documentation: http://${HOST}:${PORT}/api/docs`);
  logger.log(`🏠 Environment: ${NODE_ENV}`);
}
bootstrap();
