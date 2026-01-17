import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Settings,
  SettingsDocument,
} from '../../database/schemas/settings.schema';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { GradeDto, UpdateGradeDto } from './dto/grading-system.dto';
import {
  CreateFeeTemplateDto,
  UpdateFeeTemplateDto,
} from './dto/fee-template.dto';
import { CalendarEventDto } from './dto/working-days.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>,
  ) {}

  async getSettings(schoolId: string) {
    const settings = await this.settingsModel
      .findOne({ school: new Types.ObjectId(schoolId) })
      .exec();

    if (!settings) {
      // Create default settings if not exists
      return this.createDefaultSettings(schoolId);
    }

    return settings;
  }

  private async createDefaultSettings(schoolId: string) {
    const defaultSettings = new this.settingsModel({
      school: new Types.ObjectId(schoolId),
      academicSettings: {
        sessionStartMonth: 4, // April
        sessionEndMonth: 3, // March
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        periodsPerDay: 8,
        periodDuration: 45, // minutes
      },
      gradingSystem: [
        {
          grade: 'A+',
          minPercentage: 90,
          maxPercentage: 100,
          gpa: 10,
          description: 'Outstanding',
        },
        {
          grade: 'A',
          minPercentage: 80,
          maxPercentage: 89,
          gpa: 9,
          description: 'Excellent',
        },
        {
          grade: 'B+',
          minPercentage: 70,
          maxPercentage: 79,
          gpa: 8,
          description: 'Very Good',
        },
        {
          grade: 'B',
          minPercentage: 60,
          maxPercentage: 69,
          gpa: 7,
          description: 'Good',
        },
        {
          grade: 'C',
          minPercentage: 50,
          maxPercentage: 59,
          gpa: 6,
          description: 'Average',
        },
        {
          grade: 'D',
          minPercentage: 40,
          maxPercentage: 49,
          gpa: 5,
          description: 'Pass',
        },
        {
          grade: 'F',
          minPercentage: 0,
          maxPercentage: 39,
          gpa: 0,
          description: 'Fail',
        },
      ],
      attendanceSettings: {
        minimumRequired: 75,
        absentDaysBeforeAlert: 5,
        trackSubjectWise: false,
      },
      feeTemplates: [],
      notificationSettings: {
        enableEmail: true,
        enableSMS: false,
        enablePush: true,
      },
      examSettings: {
        passPercentage: 40,
        gracePeriod: 5,
      },
    });

    await defaultSettings.save();
    return defaultSettings;
  }

  async updateSettings(schoolId: string, updateDto: UpdateSettingsDto) {
    const settings = await this.settingsModel
      .findOne({ school: new Types.ObjectId(schoolId) })
      .exec();

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    if (updateDto.academicSettings) {
      settings.academicSettings = {
        ...settings.academicSettings,
        ...updateDto.academicSettings,
      };
    }

    if (updateDto.attendanceSettings) {
      settings.attendanceSettings = {
        ...settings.attendanceSettings,
        ...updateDto.attendanceSettings,
      };
    }

    if (updateDto.notificationSettings) {
      settings.notificationSettings = {
        ...settings.notificationSettings,
        ...updateDto.notificationSettings,
      };
    }

    if (updateDto.examSettings) {
      settings.examSettings = {
        ...settings.examSettings,
        ...updateDto.examSettings,
      };
    }

    await settings.save();
    return settings;
  }

  async getGradingSystem(schoolId: string) {
    const settings = await this.getSettings(schoolId);
    return settings.gradingSystem;
  }

  async updateGradingSystem(schoolId: string, grades: GradeDto[]) {
    const settings = await this.settingsModel
      .findOne({ school: new Types.ObjectId(schoolId) })
      .exec();

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    // Validate that grades don't overlap
    const sortedGrades = [...grades].sort(
      (a, b) => b.minPercentage - a.minPercentage,
    );
    for (let i = 0; i < sortedGrades.length - 1; i++) {
      if (sortedGrades[i].minPercentage <= sortedGrades[i + 1].maxPercentage) {
        throw new BadRequestException('Grade ranges cannot overlap');
      }
    }

    settings.gradingSystem = grades.map((g) => ({
      grade: g.grade,
      minPercentage: g.minPercentage,
      maxPercentage: g.maxPercentage,
      gpa: g.gpa,
      description: g.description || '',
    }));
    await settings.save();
    return settings.gradingSystem;
  }

  async createGrade(schoolId: string, gradeDto: GradeDto) {
    const settings = await this.settingsModel
      .findOne({ school: new Types.ObjectId(schoolId) })
      .exec();

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    // Check if grade already exists
    const existingGrade = settings.gradingSystem.find(
      (g) => g.grade === gradeDto.grade,
    );
    if (existingGrade) {
      throw new BadRequestException('Grade already exists');
    }

    // Validate that new grade doesn't overlap with existing grades
    for (const grade of settings.gradingSystem) {
      if (
        (gradeDto.minPercentage >= grade.minPercentage &&
          gradeDto.minPercentage <= grade.maxPercentage) ||
        (gradeDto.maxPercentage >= grade.minPercentage &&
          gradeDto.maxPercentage <= grade.maxPercentage)
      ) {
        throw new BadRequestException(
          `Grade range overlaps with existing grade: ${grade.grade}`,
        );
      }
    }

    settings.gradingSystem.push({
      grade: gradeDto.grade,
      minPercentage: gradeDto.minPercentage,
      maxPercentage: gradeDto.maxPercentage,
      gpa: gradeDto.gpa,
      description: gradeDto.description || '',
    });
    await settings.save();
    return gradeDto;
  }

  async updateGrade(
    schoolId: string,
    gradeId: string,
    updateDto: UpdateGradeDto,
  ) {
    const settings = await this.settingsModel
      .findOne({ school: new Types.ObjectId(schoolId) })
      .exec();

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    const gradeIndex = settings.gradingSystem.findIndex(
      (g, index) => index.toString() === gradeId,
    );

    if (gradeIndex === -1) {
      throw new NotFoundException('Grade not found');
    }

    settings.gradingSystem[gradeIndex] = {
      ...settings.gradingSystem[gradeIndex],
      ...updateDto,
    };

    await settings.save();
    return settings.gradingSystem[gradeIndex];
  }

  async deleteGrade(schoolId: string, gradeId: string) {
    const settings = await this.settingsModel
      .findOne({ school: new Types.ObjectId(schoolId) })
      .exec();

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    const gradeIndex = parseInt(gradeId);
    if (gradeIndex < 0 || gradeIndex >= settings.gradingSystem.length) {
      throw new NotFoundException('Grade not found');
    }

    settings.gradingSystem.splice(gradeIndex, 1);
    await settings.save();
    return { message: 'Grade deleted successfully' };
  }

  async getFeeTemplates(schoolId: string) {
    const settings = await this.getSettings(schoolId);
    return settings.feeTemplates;
  }

  async createFeeTemplate(schoolId: string, templateDto: CreateFeeTemplateDto) {
    const settings = await this.settingsModel
      .findOne({ school: new Types.ObjectId(schoolId) })
      .exec();

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    const newTemplate = {
      ...templateDto,
      isActive:
        templateDto.isActive !== undefined ? templateDto.isActive : true,
    };

    settings.feeTemplates.push(newTemplate);
    await settings.save();
    return newTemplate;
  }

  async updateFeeTemplate(
    schoolId: string,
    templateId: string,
    updateDto: UpdateFeeTemplateDto,
  ) {
    const settings = await this.settingsModel
      .findOne({ school: new Types.ObjectId(schoolId) })
      .exec();

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    const templateIndex = parseInt(templateId);
    if (templateIndex < 0 || templateIndex >= settings.feeTemplates.length) {
      throw new NotFoundException('Fee template not found');
    }

    settings.feeTemplates[templateIndex] = {
      ...settings.feeTemplates[templateIndex],
      ...updateDto,
    };

    await settings.save();
    return settings.feeTemplates[templateIndex];
  }

  async deleteFeeTemplate(schoolId: string, templateId: string) {
    const settings = await this.settingsModel
      .findOne({ school: new Types.ObjectId(schoolId) })
      .exec();

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    const templateIndex = parseInt(templateId);
    if (templateIndex < 0 || templateIndex >= settings.feeTemplates.length) {
      throw new NotFoundException('Fee template not found');
    }

    settings.feeTemplates.splice(templateIndex, 1);
    await settings.save();
    return { message: 'Fee template deleted successfully' };
  }

  async getWorkingDays(schoolId: string) {
    const settings = await this.getSettings(schoolId);
    return settings.academicSettings.workingDays;
  }

  async updateWorkingDays(schoolId: string, workingDays: string[]) {
    const settings = await this.settingsModel
      .findOne({ school: new Types.ObjectId(schoolId) })
      .exec();

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    if (!settings.academicSettings) {
      settings.academicSettings = {
        sessionStartMonth: 4,
        sessionEndMonth: 3,
        workingDays: [],
        periodsPerDay: 8,
        periodDuration: 45,
      };
    }

    settings.academicSettings.workingDays = workingDays;
    await settings.save();
    return settings.academicSettings.workingDays;
  }

  async getAcademicCalendar(schoolId: string, academicYearId: string) {
    // Note: This is a placeholder. In a production system, you would have
    // a separate CalendarEvent schema/collection
    // For now, returning a simple structure
    return {
      academicYear: academicYearId,
      events: [],
      message:
        'Calendar events would be stored in a separate collection in production',
    };
  }

  async addCalendarEvent(schoolId: string, eventDto: CalendarEventDto) {
    // Placeholder for calendar event creation
    // In production, this would create an entry in a CalendarEvent collection
    return {
      ...eventDto,
      id: new Types.ObjectId().toString(),
      school: schoolId,
      message: 'Calendar event would be created in a separate collection',
    };
  }

  async updateCalendarEvent(
    schoolId: string,
    eventId: string,
    eventDto: Partial<CalendarEventDto>,
  ) {
    // Placeholder for calendar event update
    return {
      eventId,
      ...eventDto,
      message: 'Calendar event would be updated in a separate collection',
    };
  }

  async deleteCalendarEvent(schoolId: string, eventId: string) {
    // Placeholder for calendar event deletion
    return {
      eventId,
      message: 'Calendar event would be deleted from a separate collection',
    };
  }
}
