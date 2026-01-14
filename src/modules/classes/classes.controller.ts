import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { AddSectionDto } from './dto/add-section.dto';
import { AssignSubjectDto } from './dto/assign-subject.dto';
import { SetPromotionCriteriaDto } from './dto/set-promotion-criteria.dto';
import { SetFeeStructureDto } from './dto/set-fee-structure.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/roles.enum';

@ApiTags('Classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Create a new class' })
  async create(
    @Body() createClassDto: CreateClassDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.classesService.create(createClassDto, schoolId);
  }

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get all classes with filters' })
  @ApiQuery({ name: 'grade', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentUser('school') schoolId: string,
    @Query('grade') grade?: number,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.classesService.findAll(
      schoolId,
      { grade, isActive, search },
      { page, limit },
    );
  }

  @Get(':id')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get class by ID' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.classesService.findById(id, schoolId);
  }

  @Put(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  async update(
    @Param('id') id: string,
    @Body() updateClassDto: UpdateClassDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.classesService.update(id, updateClassDto, schoolId);
  }

  @Delete(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.classesService.delete(id, schoolId);
  }

  @Post(':id/sections')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Add a section to class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  async addSection(
    @Param('id') id: string,
    @Body() addSectionDto: AddSectionDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.classesService.addSection(id, addSectionDto, schoolId);
  }

  @Patch(':id/sections/:sectionName')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update section details' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiParam({ name: 'sectionName', description: 'Section name' })
  async updateSection(
    @Param('id') id: string,
    @Param('sectionName') sectionName: string,
    @Body() updateSectionDto: Partial<AddSectionDto>,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.classesService.updateSection(id, sectionName, updateSectionDto, schoolId);
  }

  @Delete(':id/sections/:sectionName')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove section from class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiParam({ name: 'sectionName', description: 'Section name' })
  async removeSection(
    @Param('id') id: string,
    @Param('sectionName') sectionName: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.classesService.removeSection(id, sectionName, schoolId);
  }

  @Post(':id/subjects')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Assign subjects to class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  async assignSubjects(
    @Param('id') id: string,
    @Body() assignSubjectDto: AssignSubjectDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.classesService.assignSubjects(id, assignSubjectDto.subjectIds, schoolId);
  }

  @Delete(':id/subjects/:subjectId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove subject from class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiParam({ name: 'subjectId', description: 'Subject ID' })
  async removeSubject(
    @Param('id') id: string,
    @Param('subjectId') subjectId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.classesService.removeSubject(id, subjectId, schoolId);
  }

  @Patch(':id/sections/:sectionName/class-teacher')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Set class teacher for section' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiParam({ name: 'sectionName', description: 'Section name' })
  async setClassTeacher(
    @Param('id') id: string,
    @Param('sectionName') sectionName: string,
    @Body('teacherId') teacherId: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.classesService.setClassTeacher(id, sectionName, teacherId, schoolId);
  }

  @Put(':id/promotion-criteria')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Set promotion criteria for class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  async setPromotionCriteria(
    @Param('id') id: string,
    @Body() criteriaDto: SetPromotionCriteriaDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.classesService.setPromotionCriteria(id, criteriaDto, schoolId);
  }

  @Put(':id/fee-structure')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Set fee structure for class' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  async setFeeStructure(
    @Param('id') id: string,
    @Body() feeStructureDto: SetFeeStructureDto,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.classesService.setFeeStructure(id, feeStructureDto, schoolId);
  }

  @Get(':id/sections/:sectionName/students')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Get students in a class section' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  @ApiParam({ name: 'sectionName', description: 'Section name' })
  async getClassStudents(
    @Param('id') id: string,
    @Param('sectionName') sectionName: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.classesService.getClassStudents(id, sectionName, schoolId);
  }

  @Get(':id/statistics')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Get class statistics' })
  @ApiParam({ name: 'id', description: 'Class ID' })
  async getClassStatistics(
    @Param('id') id: string,
    @CurrentUser('school') schoolId: string,
  ) {
    return this.classesService.getClassStatistics(id, schoolId);
  }
}
