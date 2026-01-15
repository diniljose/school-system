import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Parent, ParentDocument } from '../../database/schemas/parent.schema';
import {
  Student,
  StudentDocument,
} from '../../database/schemas/student.schema';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { QueryParentDto } from './dto/query-parent.dto';
import { LinkChildDto } from './dto/link-child.dto';

@Injectable()
export class ParentsService {
  constructor(
    @InjectModel(Parent.name) private parentModel: Model<ParentDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
  ) {}

  async create(
    createParentDto: CreateParentDto,
    schoolId: string,
  ): Promise<Parent> {
    const existingParent = await this.parentModel.findOne({
      school: schoolId,
      email: createParentDto.email,
    });

    if (existingParent) {
      throw new BadRequestException('Parent with this email already exists');
    }

    const parent = new this.parentModel({
      ...createParentDto,
      school: schoolId,
    });

    return parent.save();
  }

  async findAll(schoolId: string, filters: QueryParentDto) {
    const query: any = { school: schoolId };

    if (filters.relationship) {
      query.relationship = filters.relationship;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.isPrimary !== undefined) {
      query.isPrimary = filters.isPrimary;
    }

    if (filters.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [parents, total] = await Promise.all([
      this.parentModel
        .find(query)
        .populate('children', 'firstName lastName admissionNumber currentClass')
        .skip(skip)
        .limit(limit)
        .sort({ firstName: 1 }),
      this.parentModel.countDocuments(query),
    ]);

    return {
      data: parents,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, schoolId: string): Promise<Parent> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid parent ID');
    }

    const parent = await this.parentModel
      .findOne({ _id: id, school: schoolId })
      .populate('children', 'firstName lastName admissionNumber currentClass')
      .populate('school', 'name');

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    return parent;
  }

  async update(
    id: string,
    updateParentDto: UpdateParentDto,
    schoolId: string,
  ): Promise<Parent> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid parent ID');
    }

    if (updateParentDto.email) {
      const existingParent = await this.parentModel.findOne({
        school: schoolId,
        email: updateParentDto.email,
        _id: { $ne: id },
      });

      if (existingParent) {
        throw new BadRequestException('Parent with this email already exists');
      }
    }

    const parent = await this.parentModel.findOneAndUpdate(
      { _id: id, school: schoolId },
      { $set: updateParentDto },
      { new: true },
    );

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    return parent;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid parent ID');
    }

    const parent = await this.parentModel.findOne({ _id: id, school: schoolId });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    if (parent.children && parent.children.length > 0) {
      await this.studentModel.updateMany(
        { _id: { $in: parent.children } },
        { $pull: { parents: id } },
      );
    }

    await this.parentModel.findByIdAndDelete(id);
  }

  async linkChild(
    parentId: string,
    linkChildDto: LinkChildDto,
    schoolId: string,
  ): Promise<Parent> {
    if (
      !Types.ObjectId.isValid(parentId) ||
      !Types.ObjectId.isValid(linkChildDto.studentId)
    ) {
      throw new BadRequestException('Invalid parent or student ID');
    }

    const parent = await this.parentModel.findOne({
      _id: parentId,
      school: schoolId,
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    const student = await this.studentModel.findOne({
      _id: linkChildDto.studentId,
      school: schoolId,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (parent.children?.includes(new Types.ObjectId(linkChildDto.studentId))) {
      throw new BadRequestException('Student is already linked to this parent');
    }

    await this.parentModel.findByIdAndUpdate(parentId, {
      $addToSet: { children: linkChildDto.studentId },
    });

    await this.studentModel.findByIdAndUpdate(linkChildDto.studentId, {
      $addToSet: { parents: parentId },
    });

    if (linkChildDto.setAsPrimary) {
      await this.setAsPrimaryContact(parentId, schoolId);
    }

    return this.findOne(parentId, schoolId);
  }

  async unlinkChild(
    parentId: string,
    childId: string,
    schoolId: string,
  ): Promise<Parent> {
    if (!Types.ObjectId.isValid(parentId) || !Types.ObjectId.isValid(childId)) {
      throw new BadRequestException('Invalid parent or student ID');
    }

    const parent = await this.parentModel.findOne({
      _id: parentId,
      school: schoolId,
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    if (!parent.children?.includes(new Types.ObjectId(childId))) {
      throw new BadRequestException('Student is not linked to this parent');
    }

    await this.parentModel.findByIdAndUpdate(parentId, {
      $pull: { children: childId },
    });

    await this.studentModel.findByIdAndUpdate(childId, {
      $pull: { parents: parentId },
    });

    return this.findOne(parentId, schoolId);
  }

  async setAsPrimaryContact(
    parentId: string,
    schoolId: string,
  ): Promise<Parent> {
    if (!Types.ObjectId.isValid(parentId)) {
      throw new BadRequestException('Invalid parent ID');
    }

    const parent = await this.parentModel.findOne({
      _id: parentId,
      school: schoolId,
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    if (parent.children && parent.children.length > 0) {
      await this.parentModel.updateMany(
        {
          school: schoolId,
          children: { $in: parent.children },
          _id: { $ne: parentId },
        },
        { $set: { isPrimary: false } },
      );
    }

    await this.parentModel.findByIdAndUpdate(parentId, {
      $set: { isPrimary: true },
    });

    return this.findOne(parentId, schoolId);
  }

  async findByStudent(studentId: string, schoolId: string): Promise<Parent[]> {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid student ID');
    }

    const student = await this.studentModel.findOne({
      _id: studentId,
      school: schoolId,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.parentModel
      .find({
        school: schoolId,
        children: studentId,
      })
      .sort({ isPrimary: -1, firstName: 1 });
  }
}
