import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterSchoolDto } from './dto/register-school.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums/roles.enum';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @Public()
  @ApiOperation({
    summary: 'Register new user',
    description:
      'Register a new user. School code is required for non-super-admin users.',
  })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('register-school')
  @Public()
  @ApiOperation({
    summary: 'Self-service school registration',
    description:
      'Creates a new school AND a school admin user in one step. ' +
      'Returns JWT tokens so the user is immediately logged in. ' +
      'Use this for principal/admin self-service signup.',
  })
  @ApiResponse({ status: 201, description: 'School and admin created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request / email already registered' })
  async registerSchool(@Body() registerSchoolDto: RegisterSchoolDto) {
    return this.authService.registerSchool(registerSchoolDto);
  }

  @Post('register-student')
  @Public()
  @ApiOperation({
    summary: 'Student self-registration',
    description:
      'Students can self-register by selecting a school and class. ' +
      'Registration requires class teacher approval before student can login. ' +
      'Optionally includes parent/guardian information.',
  })
  @ApiResponse({ status: 201, description: 'Student registration submitted for approval' })
  @ApiResponse({ status: 400, description: 'Invalid school code or class ID' })
  async registerStudent(@Body() registerStudentDto: RegisterStudentDto) {
    return this.authService.registerStudent(registerStudentDto);
  }

  @Post('refresh-token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'New access token generated' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Sends a password reset link to the user email',
  })
  @ApiResponse({
    status: 200,
    description: 'Reset email sent if account exists',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password using token',
    description: 'Reset password using the token received via email',
  })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password (requires current password)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      req.user.id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Request() req) {
    return this.authService.logout(req.user.id);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile with fresh permissions' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  async getProfile(@Request() req) {
    // Return fresh user profile with latest permissions from database
    return this.authService.getFullUserProfile(req.user);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCHOOL APPROVAL WORKFLOW (Super Admin only)
  // ════════════════════════════════════════════════════════════════════════════

  @Get('schools/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get pending school registrations (Super Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Pending schools returned' })
  async getPendingSchools(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.authService.getPendingSchools(+page, +limit);
  }

  @Post('schools/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending school registration (Super Admin)' })
  @ApiParam({ name: 'id', description: 'School ID to approve' })
  @ApiResponse({ status: 200, description: 'School approved, admin user created' })
  @ApiResponse({ status: 400, description: 'School not in pending status' })
  @ApiResponse({ status: 404, description: 'School not found' })
  async approveSchool(@Param('id') id: string, @Request() req) {
    return this.authService.approveSchool(id, req.user.id);
  }

  @Post('schools/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending school registration (Super Admin)' })
  @ApiParam({ name: 'id', description: 'School ID to reject' })
  @ApiResponse({ status: 200, description: 'School registration rejected' })
  @ApiResponse({ status: 400, description: 'School not in pending status' })
  @ApiResponse({ status: 404, description: 'School not found' })
  async rejectSchool(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.authService.rejectSchool(id, req.user.id, reason);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PUBLIC ENDPOINTS FOR STUDENT REGISTRATION
  // ════════════════════════════════════════════════════════════════════════════

  @Get('public/schools')
  @Public()
  @ApiOperation({ summary: 'Get list of active schools for student registration' })
  @ApiResponse({ status: 200, description: 'List of active schools' })
  async getPublicSchools() {
    return this.authService.getPublicSchools();
  }

  @Get('public/schools/:code/classes')
  @Public()
  @ApiOperation({ summary: 'Get classes for a school (for student registration)' })
  @ApiParam({ name: 'code', description: 'School code' })
  @ApiResponse({ status: 200, description: 'List of classes with sections' })
  async getPublicSchoolClasses(@Param('code') code: string) {
    return this.authService.getPublicSchoolClasses(code);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STUDENT APPROVAL WORKFLOW (Class Teacher / Principal)
  // ════════════════════════════════════════════════════════════════════════════

  @Get('students/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLASS_TEACHER, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get pending student registrations for approval' })
  @ApiQuery({ name: 'classId', required: false, description: 'Filter by class' })
  @ApiResponse({ status: 200, description: 'List of pending student registrations' })
  async getPendingStudents(
    @Query('classId') classId: string,
    @Request() req,
  ) {
    return this.authService.getPendingStudents(
      req.user.school,
      req.user.schoolCode,
      classId,
      req.user.role,
      req.user.id,
    );
  }

  @Post('students/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLASS_TEACHER, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending student registration' })
  @ApiParam({ name: 'id', description: 'Student ID to approve' })
  @ApiResponse({ status: 200, description: 'Student approved, user account created' })
  async approveStudent(@Param('id') id: string, @Request() req) {
    return this.authService.approveStudent(
      id,
      req.user.school,
      req.user.schoolCode,
      req.user.id,
    );
  }

  @Post('students/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLASS_TEACHER, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending student registration' })
  @ApiParam({ name: 'id', description: 'Student ID to reject' })
  @ApiResponse({ status: 200, description: 'Student registration rejected' })
  async rejectStudent(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.authService.rejectStudent(
      id,
      req.user.school,
      req.user.schoolCode,
      req.user.id,
      reason,
    );
  }
}

