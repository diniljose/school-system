# School Management System — Enterprise API Documentation

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Multi-Tenant Design](#multi-tenant-design)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [API Modules](#api-modules)
- [Authentication & Authorization](#authentication--authorization)
- [Role-Based Access Control](#role-based-access-control)
- [Security](#security)
- [Database Schema Reference](#database-schema-reference)
- [Postman Collection](#postman-collection)
- [Deployment](#deployment)

---

## Overview

A **complete enterprise-grade, multi-tenant SaaS** school management platform built with NestJS, MongoDB, and Express. Designed for production use by schools of all sizes with:

- **Separate database per school** for full data isolation
- **Role-based access** for 11 distinct user roles
- **20 feature modules** covering every school operation
- **Real-time bus/GPS tracking** with location history
- **Complete fee management** with payments, discounts, fines, waivers
- **Exam results & analytics** with report cards, trends, and rankings
- **Student lifecycle** (admission → transfer → promotion → graduation)

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | NestJS | 10.4 |
| Runtime | Node.js | 18+ |
| HTTP | Express | 4.x |
| Database | MongoDB + Mongoose | 8.x |
| Auth | JWT + Passport | @nestjs/jwt 11 |
| Validation | class-validator + class-transformer | Latest |
| Docs | Swagger / OpenAPI | @nestjs/swagger 7.4 |
| Security | Helmet, Rate Limiting, CORS | Latest |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    API Gateway                       │
│  (Express + Helmet + Rate Limit + CORS + Logging)   │
├─────────────────────────────────────────────────────┤
│              Guards & Middleware                      │
│  JwtAuthGuard → RolesGuard → PermissionsGuard       │
│  SchoolAccessGuard → TenantContextMiddleware         │
├─────────────────────────────────────────────────────┤
│             Feature Modules (20)                     │
│  Auth │ Users │ Schools │ Students │ Teachers │ ...  │
├─────────────────────────────────────────────────────┤
│            Shared Services Layer                     │
│  ResponseService │ TranslationService │ AuditLog     │
├─────────────────────────────────────────────────────┤
│          Database Layer (Multi-Tenant)               │
│  ┌─────────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Master DB   │  │ School 1 │  │ School 2 │  ...   │
│  │ (users,     │  │ (students│  │ (students│        │
│  │  schools,   │  │  classes, │  │  classes, │       │
│  │  subs)      │  │  fees...) │  │  fees...) │      │
│  └─────────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────┘
```

### Module Hierarchy

```
AppModule
├── DatabaseModule (Global)
│   ├── MongooseModule (Master DB)
│   └── TenantDatabaseService (Dynamic school DBs)
├── SharedModule (Global)
│   ├── ResponseService
│   └── TranslationService
├── AuthModule
├── UsersModule
├── SchoolsModule
├── SubscriptionsModule
├── AcademicYearsModule
├── ClassesModule
├── StudentsModule
├── TeachersModule
├── ParentsModule
├── SubjectsModule
├── AttendanceModule
├── ExamsModule
├── ResultsModule
├── FeesModule
├── PromotionsModule
├── TransfersModule
├── TimetableModule
├── TransportModule
├── NotificationsModule
├── ReportsModule
└── SettingsModule
```

---

## Multi-Tenant Design

### How It Works

1. **Master Database**: Stores cross-tenant data — `users`, `schools`, `subscriptions`, `audit_logs`
2. **School Databases**: Each school gets its own MongoDB database named `school_<code>` (e.g., `school_DEMO001`)
3. **TenantDatabaseService**: Manages dynamic connections with connection pooling

### Lifecycle

```
School Created → tenantDatabaseService.createSchoolDatabase('DEMO001')
                 → Creates MongoDB database: school_DEMO001
                 → Connection pooled for reuse

School Deleted → tenantDatabaseService.dropSchoolDatabase('DEMO001')
                 → Database dropped
                 → Connection removed from pool
```

### Connection Management

- Connections are cached in a `Map<string, mongoose.Connection>`
- Auto-cleanup on application shutdown via `onModuleDestroy()`
- Dynamic schema registration per connection

### Usage in Services

```typescript
// Get a school-specific connection
const connection = await this.tenantDatabaseService.getSchoolConnection('DEMO001');
const StudentModel = connection.model('Student', StudentSchema);
const students = await StudentModel.find();
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+ (local or Atlas)
- npm or yarn

### Installation

```bash
# Clone & install
git clone <repo-url>
cd nestjs-basic-structure
npm install

# Configure environment
cp .env.dev .env

# Start development
npm run start:dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start` | Start in production mode |
| `npm run start:dev` | Start with hot reload |
| `npm run start:debug` | Start with debugger |
| `npm run build` | Build TypeScript |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:cov` | Run tests with coverage |

### First-Time Setup Flow

1. Start the server
2. **Register** a Super Admin account via `POST /api/v1/auth/register`
3. **Login** to get JWT tokens via `POST /api/v1/auth/login`
4. **Create a School** via `POST /api/v1/schools` (auto-creates school database)
5. **Register School Admin** for the school
6. Start configuring academic years, classes, subjects, etc.

---

## Environment Configuration

### `.env.dev` (Development)

```env
# Application
APP_NAME=SchoolManagementSystem
APP_ENV=development
APP_PORT=3000
APP_URL=http://localhost:3000
API_PREFIX=api/v1
APP_DEBUG=true

# Database
MONGODB_URI=mongodb://localhost:27017/school_management
MASTER_DB_NAME=school_management

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

### `.env.test` (Testing)

Uses separate `school_management_test` database to avoid conflicts.

### `.env.prod` (Production)

Requires:
- Strong JWT secrets (32+ chars)
- MongoDB Atlas connection string with authentication
- Restrictive CORS origins
- Lower rate limits

---

## API Modules

### Auth (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | No | Register new user |
| POST | `/login` | No | Login & get tokens |
| POST | `/refresh` | No | Refresh access token |
| GET | `/profile` | Yes | Get current user profile |
| POST | `/change-password` | Yes | Change password |
| POST | `/forgot-password` | No | Request password reset |
| POST | `/reset-password` | No | Reset with token |
| POST | `/logout` | Yes | Invalidate tokens |

### Schools (`/api/v1/schools`)

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/` | SUPER_ADMIN | Create school (+ creates DB) |
| GET | `/` | SUPER_ADMIN | List all schools |
| GET | `/stats` | SUPER_ADMIN | Platform statistics |
| GET | `/:id` | SUPER_ADMIN, SCHOOL_ADMIN | Get school details |
| PATCH | `/:id` | SUPER_ADMIN | Update school |
| PATCH | `/:id/settings` | SUPER_ADMIN, SCHOOL_ADMIN | Update settings |
| PATCH | `/:id/features` | SUPER_ADMIN | Update features |
| DELETE | `/:id` | SUPER_ADMIN | Delete school (+ drops DB) |

### Students (`/api/v1/students`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create student |
| GET | `/` | List with pagination & filters |
| GET | `/:id` | Get student details |
| PATCH | `/:id` | Update student |
| DELETE | `/:id` | Soft delete student |

### Results (`/api/v1/results`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create single result |
| POST | `/bulk` | Bulk create results |
| GET | `/` | List results (filters: exam, class) |
| GET | `/student/:studentId` | All results for student |
| GET | `/report-card/:studentId` | Full report card |
| GET | `/trend/:studentId` | Performance trend |
| GET | `/class/:examId/:classId` | Class results with stats |
| GET | `/top-performers/:examId/:classId` | Ranked top performers |
| GET | `/analysis/:examId/:classId/:subjectId` | Subject analysis |
| POST | `/calculate-grades/:id` | Calculate grades |
| POST | `/calculate-ranks/:examId/:classId` | Calculate ranks |
| POST | `/publish/:examId/:classId` | Publish results |
| POST | `/unpublish/:examId/:classId` | Unpublish results |
| GET | `/:id` | Get result by ID |

### Fees (`/api/v1/fees`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create fee record |
| POST | `/generate` | Generate monthly fees for class |
| GET | `/pending` | Get pending fees |
| GET | `/overdue` | Get overdue fees |
| GET | `/defaulters` | Get fee defaulters |
| GET | `/statistics` | Fee statistics |
| GET | `/collection-report` | Collection report by date range |
| GET | `/student/:studentId` | Student fee records |
| GET | `/student/:studentId/statement` | Student fee statement |
| GET | `/student/:studentId/payment-history` | Payment history |
| POST | `/:id/payment` | Record payment |
| POST | `/:id/discount` | Apply discount |
| POST | `/:id/fine` | Apply late fine |
| POST | `/:id/waive` | Waive fee |
| GET | `/:id` | Get fee by ID |

### Transport (`/api/v1/transport`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create vehicle/route |
| GET | `/` | List vehicles (search, filter, paginate) |
| GET | `/stats` | Fleet statistics |
| GET | `/locations` | All vehicle locations (fleet view) |
| GET | `/maintenance/upcoming` | Upcoming maintenance |
| GET | `/student/:studentId` | Student's transport info |
| GET | `/:id` | Get vehicle details |
| PUT | `/:id` | Update vehicle |
| PATCH | `/:id/status` | Update vehicle status |
| PATCH | `/:id/location` | Update GPS location |
| GET | `/:id/location` | Get current location |
| GET | `/:id/tracking-history` | GPS history |
| POST | `/:id/students` | Assign students |
| DELETE | `/:id/students/:studentId` | Remove student |
| POST | `/:id/maintenance` | Add maintenance record |
| DELETE | `/:id` | Delete vehicle |

### Transfers (`/api/v1/transfers`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/out` | Initiate outgoing transfer |
| POST | `/in` | Initiate incoming transfer |
| POST | `/:id/complete-out` | Complete outgoing transfer |
| POST | `/:id/complete-in` | Complete incoming transfer |
| POST | `/:id/cancel` | Cancel transfer |
| GET | `/student/:studentId/history` | Transfer history |
| GET | `/:id` | Transfer details |
| GET | `/:id/certificate` | Transfer certificate |
| GET | `/` | List all transfers |

### Promotions (`/api/v1/promotions`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/check-eligibility/:studentId` | Check single student |
| POST | `/bulk-check-eligibility` | Check entire class |
| POST | `/promote` | Promote student |
| POST | `/retain` | Retain student |
| POST | `/bulk-promote` | Bulk promote class |
| GET | `/history/:studentId` | Promotion history |
| GET | `/pending` | Pending promotions |
| GET | `/statistics` | Promotion stats |
| DELETE | `/:id/undo` | Undo promotion |

---

## Authentication & Authorization

### JWT Token Flow

```
1. POST /auth/login → { accessToken, refreshToken }
2. All requests include: Authorization: Bearer <accessToken>
3. Token expires → POST /auth/refresh with refreshToken
4. POST /auth/logout → Invalidates tokens
```

### Token Structure

```json
{
  "sub": "user._id",
  "email": "user@school.com",
  "role": "school_admin",
  "school": "school._id",
  "iat": 1694000000,
  "exp": 1694086400
}
```

### Guards Pipeline

```
Request → JwtAuthGuard → RolesGuard → PermissionsGuard → SchoolAccessGuard → Controller
```

- **JwtAuthGuard**: Validates JWT token (skips `@Public()` endpoints)
- **RolesGuard**: Checks `@Roles(UserRole.SUPER_ADMIN)` decorator
- **PermissionsGuard**: Checks `@Permissions('manage:students')` decorator
- **SchoolAccessGuard**: Ensures user belongs to the requested school

---

## Role-Based Access Control

### Roles Matrix

| Role | Code | Access Level |
|------|------|-------------|
| Super Admin | `super_admin` | Full platform access, manage schools |
| School Admin | `school_admin` | Full school access, manage all modules |
| Principal | `principal` | School oversight, approve promotions |
| Vice Principal | `vice_principal` | Assist principal duties |
| Teacher | `teacher` | Own classes: attendance, exams, results |
| Class Teacher | `class_teacher` | Teacher + class management duties |
| Parent | `parent` | View own children's data |
| Student | `student` | View own academic data |
| Accountant | `accountant` | Fee management, financial reports |
| Librarian | `librarian` | Library module access |
| Receptionist | `receptionist` | Basic data entry, visitor management |

### Usage in Controllers

```typescript
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
@Post()
createSchool(@Body() dto: CreateSchoolDto) { ... }
```

---

## Security

### Implemented Measures

| Feature | Implementation |
|---------|---------------|
| Helmet | HTTP security headers |
| CORS | Configurable origins |
| Rate Limiting | ThrottlerModule (configurable TTL/limit) |
| JWT Auth | Access + refresh token rotation |
| Password Hashing | bcrypt with 10 salt rounds |
| Input Validation | class-validator on all DTOs |
| Schema Guard | Mongoose strict mode |
| School Isolation | Separate database per school |
| Audit Logging | AuditLog schema for sensitive actions |
| Request Logging | LoggingInterceptor captures all requests |
| Error Handling | HttpExceptionFilter standardizes responses |

### Response Format

All API responses follow a consistent format:

```json
{
  "statusCode": 200,
  "message": "Operation successful",
  "data": { /* response payload */ },
  "timestamp": "2024-09-15T10:00:00.000Z"
}
```

Paginated responses:

```json
{
  "statusCode": 200,
  "data": {
    "items": [ /* array of documents */ ],
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

---

## Database Schema Reference

### Master Database Schemas

| Schema | Description | Key Fields |
|--------|-------------|------------|
| User | Platform users | email, password, role, school, isActive |
| School | School profiles | name, code, slug, settings, features |
| Subscription | School plans | school, plan, maxStudents, startDate, endDate |
| AuditLog | Action tracking | user, action, resource, details, ip |

### School Database Schemas

| Schema | Description | Key Fields |
|--------|-------------|------------|
| Student | Student records | firstName, lastName, admissionNumber, currentClass |
| Teacher | Teacher profiles | subjects, qualification, assignedClasses |
| Parent | Parent records | children[], relation, contact |
| Class | Grade/section | name, grade, section, capacity, classTeacher |
| Subject | Subjects | name, code, type, class, teacher, maxMarks |
| AcademicYear | Year periods | name, startDate, endDate, isCurrent |
| Attendance | Daily records | student, class, date, status, period |
| Exam | Examinations | name, examType, startDate, classes, subjects |
| Result | Exam results | student, exam, subjects[{subject, marks}], rank |
| Fee | Fee records | student, amount, paid, status, payments[] |
| Promotion | Promotions | student, fromClass, toClass, status |
| Transfer | Transfers | student, type, fromSchool, toSchool, status |
| Timetable | Schedules | class, section, schedule[{day, periods}] |
| Transport | Vehicles/routes | vehicleNumber, routeName, stops[], driver, gps |
| Notification | Alerts | title, type, recipients, isRead |
| Settings | School config | gradingSystem, feeStructure, attendance |

---

## Postman Collection

A complete Postman collection is included at:

```
postman/School-Management-API.postman_collection.json
```

### Import Instructions

1. Open Postman
2. Click **Import** → **Upload Files**
3. Select `School-Management-API.postman_collection.json`
4. The collection includes pre-configured:
   - **Collection variables** (baseUrl, tokens, IDs)
   - **Auto-token extraction** on login (sets accessToken automatically)
   - **Auto-ID extraction** on create operations
   - **Example bodies** for all POST/PATCH endpoints

### Testing Flow

Execute requests in this order:

1. **Auth → Register** (create Super Admin)
2. **Auth → Login** (tokens auto-set)
3. **Schools → Create School** (schoolId auto-set)
4. **Academic Years → Create**
5. **Classes → Create**
6. **Subjects → Create**
7. **Teachers → Create**
8. **Students → Create**
9. **Parents → Create**
10. **Attendance → Mark**
11. **Exams → Create**
12. **Results → Create**
13. **Fees → Create → Record Payment**
14. **Transport → Create → Update Location**
15. **Promotions → Check Eligibility → Promote**
16. **Transfers → Initiate Out/In → Complete**

---

## Deployment

### Production Checklist

- [ ] Set strong JWT secrets (32+ chars, random)
- [ ] Configure MongoDB Atlas with authentication
- [ ] Set restrictive CORS origins
- [ ] Enable TLS/SSL
- [ ] Configure rate limiting for production load
- [ ] Set `APP_ENV=production`
- [ ] Disable `APP_DEBUG`
- [ ] Set up MongoDB replica set for transactions
- [ ] Configure backup strategy per school database
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Health Check

```
GET /api/v1/ → { "message": "School Management API is running" }
```

---

## License

Enterprise — All rights reserved.
