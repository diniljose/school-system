import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ParentsService } from './parents.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
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
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get all parents with filters' })
  @ApiQuery({ name: 'relationship', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'isPrimary', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentUser('school') schoolId: string,
    @Query('relationship') relationship?: string,
    @Query('isActive') isActive?: boolean,
    @Query('isPrimary') isPrimary?: boolean,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.parentsService.findAll(schoolId, {
      relationship,
      isActive,
      isPrimary,
      search,
      page,
      limit,
    });
  }

  @Get(':id')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get parent by ID' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.parentsService.findById(id, schoolId);
  }

  @Put(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Update parent' })
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
  async delete(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.parentsService.delete(id, schoolId);
  }

  @Post(':id/link-child')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Link child to parent' })
  async linkChild(
    @Param('id') id: string,
    @Body() linkChildDto: LinkChildDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.parentsService.linkChild(id, linkChildDto.studentId, schoolId);
  }

  @Post(':id/unlink-child')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Unlink child from parent' })
  async unlinkChild(
    @Param('id') id: string,
    @Body() linkChildDto: LinkChildDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.parentsService.unlinkChild(
      id,
      linkChildDto.studentId,
      schoolId,
    );
  }

  @Get(':id/children')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get all children of a parent' })
  async getChildren(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.parentsService.getChildren(id, schoolId);
  }

  @Patch(':id/primary-contact')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Set parent as primary contact' })
  async setPrimaryContact(
    @Param('id') id: string,
    @Body('isPrimary') isPrimary: boolean,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.parentsService.setPrimaryContact(id, isPrimary, schoolId);
  }

  @Get('student/:studentId')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get all parents of a student' })
  async getParentsByStudent(
    @Param('studentId') studentId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.parentsService.getParentsByStudent(studentId, schoolId);
  }
}
