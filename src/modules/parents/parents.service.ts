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

  async findAll(
    schoolId: string,
    filters: {
      relationship?: string;
      isActive?: boolean;
      isPrimary?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
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
        .populate('user', 'email username')
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

  async findById(id: string, schoolId: string): Promise<Parent> {
    const parent = await this.parentModel
      .findOne({ _id: id, school: schoolId })
      .populate(
        'children',
        'firstName lastName admissionNumber currentClass photo',
      )
      .populate('user', '-password');

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

  async delete(id: string, schoolId: string): Promise<void> {
    const parent = await this.parentModel.findOne({
      _id: id,
      school: schoolId,
    });

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
    studentId: string,
    schoolId: string,
  ): Promise<Parent> {
    const parent = await this.parentModel.findOne({
      _id: parentId,
      school: schoolId,
    });
    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    const student = await this.studentModel.findOne({
      _id: studentId,
      school: schoolId,
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (parent.children?.includes(new Types.ObjectId(studentId))) {
      throw new BadRequestException('Student is already linked to this parent');
    }

    const [updatedParent] = await Promise.all([
      this.parentModel.findByIdAndUpdate(
        parentId,
        { $addToSet: { children: studentId } },
        { new: true },
      ),
      this.studentModel.findByIdAndUpdate(
        studentId,
        { $addToSet: { parents: parentId } },
        { new: true },
      ),
    ]);

    return updatedParent;
  }

  async unlinkChild(
    parentId: string,
    studentId: string,
    schoolId: string,
  ): Promise<Parent> {
    const parent = await this.parentModel.findOne({
      _id: parentId,
      school: schoolId,
    });
    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    const student = await this.studentModel.findOne({
      _id: studentId,
      school: schoolId,
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const [updatedParent] = await Promise.all([
      this.parentModel.findByIdAndUpdate(
        parentId,
        { $pull: { children: studentId } },
        { new: true },
      ),
      this.studentModel.findByIdAndUpdate(
        studentId,
        { $pull: { parents: parentId } },
        { new: true },
      ),
    ]);

    return updatedParent;
  }

  async getChildren(parentId: string, schoolId: string) {
    const parent = await this.parentModel
      .findOne({ _id: parentId, school: schoolId })
      .populate({
        path: 'children',
        populate: [
          { path: 'currentClass', select: 'name grade' },
          { path: 'currentSection', select: 'name' },
        ],
      });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    return parent.children;
  }

  async setPrimaryContact(
    parentId: string,
    isPrimary: boolean,
    schoolId: string,
  ): Promise<Parent> {
    const parent = await this.parentModel.findOne({
      _id: parentId,
      school: schoolId,
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    if (isPrimary && parent.children && parent.children.length > 0) {
      await this.parentModel.updateMany(
        {
          school: schoolId,
          children: { $in: parent.children },
          _id: { $ne: parentId },
        },
        { $set: { isPrimary: false } },
      );
    }

    return this.parentModel.findByIdAndUpdate(
      parentId,
      { $set: { isPrimary } },
      { new: true },
    );
  }

  async getParentsByStudent(studentId: string, schoolId: string) {
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
      .sort({ isPrimary: -1 });
  }
}
