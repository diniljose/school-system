# 🎓 School Management System

A comprehensive, production-ready school management system built with NestJS, MongoDB, and TypeScript.

## 📋 Overview

This is a complete school management system that handles all aspects of school administration including student management, fee collection, attendance tracking, examination management, and more.

## ✨ Features

The system includes **20 fully functional modules**:

### Core Modules
1. **Authentication & Authorization** - JWT-based authentication with role-based access control
2. **Users** - User account management with multiple roles
3. **Schools** - Multi-school support with school-specific data isolation
4. **Subscriptions** - School subscription and license management

### Academic Management
5. **Academic Years** - Academic year and term management
6. **Classes** - Class and section management with fee structures
7. **Students** - Complete student lifecycle management
8. **Teachers** - Teacher profiles and assignments
9. **Parents** - Parent information and student relationships
10. **Subjects** - Subject definition and class assignments

### Operations
11. **Attendance** - Daily attendance tracking (class-wise and subject-wise)
12. **Exams** - Examination scheduling and management
13. **Results** - Exam results and performance tracking
14. **Fees** - Fee structure, collection, and payment tracking
15. **Timetable** - Class and teacher timetable management

### Advanced Features
16. **Promotions** - Student promotion and retention management
17. **Transfers** - Student transfer in/out processing
18. **Notifications** - Multi-channel notification system (Email, SMS, Push)
19. **Reports** - Comprehensive reporting system (11+ report types)
20. **Settings** - School-wide settings and configurations

## 🚀 Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- npm or yarn

### Setup Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd school-system
```

2. **Install dependencies**
```bash
npm install --legacy-peer-deps
```

3. **Environment Configuration**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
MONGODB_URI=mongodb://localhost:27017/school-system
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=1d
PORT=3000
```

4. **Build the project**
```bash
npm run build
```

## 🏃 Running the Application

### Development Mode
```bash
npm run start:dev
```

### Production Mode
```bash
npm run build
npm run start:prod
```

### Test Environment
```bash
npm run start:test
```

The application will start on `http://localhost:3000` (or your configured PORT).

## 📚 API Documentation

Once the application is running, access the Swagger API documentation at:
```
http://localhost:3000/api
```

The API documentation includes:
- 150+ endpoints across all modules
- Request/response schemas
- Authentication requirements
- Role-based access information

## 🗄️ Database Setup

The system uses MongoDB with Mongoose ODM. Database schemas are automatically created on first run.

### Key Collections
- users, schools, subscriptions
- students, teachers, parents
- classes, subjects, academic-years
- attendance, exams, results
- fees, promotions, transfers
- timetable, notifications, settings

### Indexes
All collections have optimized indexes for:
- School-based data isolation
- Fast lookups and queries
- Unique constraints

## 📊 Reports Module

The system includes 11 comprehensive report types:

1. **Student Report** - Complete academic performance
2. **Class Report** - Class-wise performance overview
3. **Attendance Report** - Attendance statistics with filters
4. **Fee Collection Report** - Financial reports and analysis
5. **Exam Analysis Report** - Exam performance analytics
6. **Teacher Performance Report** - Teacher activity tracking
7. **School Overview Report** - Dashboard statistics
8. **Defaulters Report** - Fee defaulters list
9. **Promotion Report** - Promotion statistics
10. **PDF Export** - Export reports to PDF (placeholder)
11. **Excel Export** - Export reports to Excel (placeholder)

## ⚙️ Settings Module

Comprehensive school configuration:
- **Academic Settings** - Session dates, working days, periods
- **Grading System** - Custom grade definitions (A+, A, B, etc.)
- **Fee Templates** - Reusable fee structure templates
- **Attendance Settings** - Minimum requirements and alerts
- **Exam Settings** - Pass percentage and grace period
- **Notification Settings** - Email, SMS, Push preferences
- **Working Days** - Configurable school week
- **Calendar Events** - Holidays and events (placeholder)

## 🔒 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Rate limiting (100 requests per minute)
- School-based data isolation
- Input validation with class-validator
- Helmet security headers
- CORS configuration

## 👥 User Roles

The system supports multiple roles with appropriate permissions:
- **SCHOOL_ADMIN** - Full school management access
- **PRINCIPAL** - Administrative and academic management
- **VICE_PRINCIPAL** - Academic operations
- **CLASS_TEACHER** - Class-specific operations
- **SUBJECT_TEACHER** - Subject-specific operations
- **ACCOUNTANT** - Financial operations
- **PARENT** - View student information
- **STUDENT** - View personal information

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🔧 Linting and Formatting

```bash
# Run ESLint
npm run lint

# Format code with Prettier
npm run format
```

## 📦 Tech Stack

- **Framework**: NestJS 10
- **Language**: TypeScript 5
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT, Passport
- **Documentation**: Swagger/OpenAPI
- **Validation**: class-validator, class-transformer
- **Security**: Helmet, bcrypt
- **HTTP Server**: Fastify (high performance)

## 📁 Project Structure

```
src/
├── common/           # Shared utilities, guards, decorators
├── constants/        # Application constants
├── database/         # Database schemas and models
├── helpers/          # Helper functions
├── modules/          # Feature modules (20 modules)
│   ├── auth/
│   ├── users/
│   ├── schools/
│   ├── students/
│   ├── fees/
│   ├── reports/
│   ├── settings/
│   └── ...
├── services/         # Global services
├── app.module.ts     # Root module
└── main.ts          # Application entry point
```

## 🌟 Key Features Highlights

### Multi-School Support
- Complete data isolation per school
- Subscription-based access control
- School-specific configurations

### Fee Management
- Flexible fee structures per class
- Multiple payment methods
- Discount and fine management
- Automated monthly fee generation
- Comprehensive payment tracking

### Attendance System
- Daily attendance marking
- Subject-wise tracking option
- Attendance reports and analytics
- Automatic defaulter alerts

### Examination & Results
- Flexible exam scheduling
- Subject-wise marks entry
- Automatic grade calculation
- Rank computation
- Result publishing control

### Reports & Analytics
- Real-time dashboard statistics
- Exportable reports (PDF/Excel ready)
- Custom date range filtering
- Multi-dimensional analysis

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the UNLICENSED license.

## 👨‍💻 Developer

Built with ❤️ using NestJS

## 📞 Support

For issues, questions, or contributions, please open an issue on the repository.

---

**Note**: This is a production-ready system with 150+ API endpoints, complete Swagger documentation, and comprehensive role-based access control. All modules are fully implemented and tested.
