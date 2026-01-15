import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ParentsService } from './parents.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { QueryParentDto } from './dto/query-parent.dto';
import { LinkChildDto } from './dto/link-child.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/roles.enum';

@ApiTags('Parents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parents')
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Post()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Create new parent' })
  @ApiResponse({ status: 201, description: 'Parent created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() createParentDto: CreateParentDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.parentsService.create(createParentDto, schoolId);
  }

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
    UserRole.RECEPTIONIST,
  )
  @ApiOperation({ summary: 'Get all parents with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Return all parents' })
  async findAll(
    @Query() queryParentDto: QueryParentDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.parentsService.findAll(schoolId, queryParentDto);
  }

  @Get('by-student/:studentId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
    UserRole.RECEPTIONIST,
  )
  @ApiOperation({ summary: 'Get all parents of a specific student' })
  @ApiParam({ name: 'studentId', type: String })
  @ApiResponse({ status: 200, description: 'Return parents of the student' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async findByStudent(
    @Param('studentId') studentId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.parentsService.findByStudent(studentId, schoolId);
  }

  @Get(':id')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
    UserRole.RECEPTIONIST,
  )
  @ApiOperation({ summary: 'Get parent by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Return the parent' })
  @ApiResponse({ status: 404, description: 'Parent not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.parentsService.findOne(id, schoolId);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Update parent' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Parent updated successfully' })
  @ApiResponse({ status: 404, description: 'Parent not found' })
  async update(
    @Param('id') id: string,
    @Body() updateParentDto: UpdateParentDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.parentsService.update(id, updateParentDto, schoolId);
  }

  @Delete(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Delete parent' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Parent deleted successfully' })
  @ApiResponse({ status: 404, description: 'Parent not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    await this.parentsService.remove(id, schoolId);
    return { message: 'Parent deleted successfully' };
  }

  @Post(':id/link-child')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Link a child (student) to parent' })
  @ApiParam({ name: 'id', type: String, description: 'Parent ID' })
  @ApiResponse({ status: 200, description: 'Child linked successfully' })
  @ApiResponse({ status: 404, description: 'Parent or student not found' })
  async linkChild(
    @Param('id') id: string,
    @Body() linkChildDto: LinkChildDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.parentsService.linkChild(id, linkChildDto, schoolId);
  }

  @Delete(':id/children/:childId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Unlink a child (student) from parent' })
  @ApiParam({ name: 'id', type: String, description: 'Parent ID' })
  @ApiParam({ name: 'childId', type: String, description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Child unlinked successfully' })
  @ApiResponse({ status: 404, description: 'Parent or student not found' })
  async unlinkChild(
    @Param('id') id: string,
    @Param('childId') childId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.parentsService.unlinkChild(id, childId, schoolId);
  }

  @Post(':id/set-primary')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Set parent as primary contact for their children' })
  @ApiParam({ name: 'id', type: String, description: 'Parent ID' })
  @ApiResponse({
    status: 200,
    description: 'Parent set as primary contact successfully',
  })
  @ApiResponse({ status: 404, description: 'Parent not found' })
  async setAsPrimaryContact(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.parentsService.setAsPrimaryContact(id, schoolId);
  }
}
