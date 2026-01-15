import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../database/schemas/subscription.schema';
import { School, SchoolDocument } from '../../database/schemas/school.schema';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { ChangePlanDto } from './dto/change-plan.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(School.name)
    private schoolModel: Model<SchoolDocument>,
  ) {}

  async create(
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    const school = await this.schoolModel
      .findById(createSubscriptionDto.school)
      .exec();

    if (!school) {
      throw new NotFoundException('School not found');
    }

    const subscription = new this.subscriptionModel(createSubscriptionDto);
    const saved = await subscription.save();

    school.subscription = saved._id as Types.ObjectId;
    await school.save();

    return saved;
  }

  async findAll(query?: any) {
    const { page = 1, limit = 10, status, plan, schoolId } = query || {};

    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (plan) {
      filter.plan = plan;
    }

    if (schoolId) {
      filter.school = schoolId;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.subscriptionModel
        .find(filter)
        .populate('school')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.subscriptionModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionModel
      .findById(id)
      .populate('school')
      .exec();

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async findBySchool(schoolId: string): Promise<Subscription> {
    const subscription = await this.subscriptionModel
      .findOne({ school: schoolId })
      .populate('school')
      .exec();

    if (!subscription) {
      throw new NotFoundException('Subscription not found for this school');
    }

    return subscription;
  }

  async update(
    id: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionModel
      .findByIdAndUpdate(id, updateSubscriptionDto, { new: true })
      .populate('school')
      .exec();

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async remove(id: string): Promise<void> {
    const result = await this.subscriptionModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('Subscription not found');
    }
  }

  async changePlan(
    schoolId: string,
    changePlanDto: ChangePlanDto,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionModel
      .findOne({ school: schoolId })
      .exec();

    if (!subscription) {
      throw new NotFoundException('Subscription not found for this school');
    }

    subscription.plan = changePlanDto.newPlan;

    const planLimits = this.getPlanLimits(changePlanDto.newPlan);
    subscription.limits = planLimits;

    return subscription.save();
  }

  async recordPayment(
    subscriptionId: string,
    recordPaymentDto: RecordPaymentDto,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionModel
      .findById(subscriptionId)
      .exec();

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const payment = {
      amount: recordPaymentDto.amount,
      currency: recordPaymentDto.currency,
      date: recordPaymentDto.date,
      transactionId: recordPaymentDto.transactionId,
      status: recordPaymentDto.status,
      method: recordPaymentDto.method,
      invoiceNumber: recordPaymentDto.invoiceNumber || '',
      receiptUrl: recordPaymentDto.receiptUrl || '',
      remarks: recordPaymentDto.remarks || '',
    };

    subscription.paymentHistory.push(payment);

    if (recordPaymentDto.status === 'completed') {
      subscription.billing.lastPaymentDate = recordPaymentDto.date;
      subscription.billing.lastPaymentAmount = recordPaymentDto.amount;

      if (subscription.status === SubscriptionStatus.EXPIRED) {
        subscription.status = SubscriptionStatus.ACTIVE;
      }
    }

    return subscription.save();
  }

  async checkExpiry(): Promise<void> {
    const expiredSubscriptions = await this.subscriptionModel
      .find({
        endDate: { $lt: new Date() },
        status: SubscriptionStatus.ACTIVE,
      })
      .exec();

    for (const subscription of expiredSubscriptions) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await subscription.save();
    }
  }

  async autoRenew(): Promise<void> {
    const subscriptionsToRenew = await this.subscriptionModel
      .find({
        autoRenew: true,
        endDate: { $lte: new Date() },
        status: SubscriptionStatus.ACTIVE,
      })
      .exec();

    for (const subscription of subscriptionsToRenew) {
      const billingCycle = subscription.billing.billingCycle;
      const newEndDate = new Date(subscription.endDate);

      if (billingCycle === 'monthly') {
        newEndDate.setMonth(newEndDate.getMonth() + 1);
      } else if (billingCycle === 'quarterly') {
        newEndDate.setMonth(newEndDate.getMonth() + 3);
      } else if (billingCycle === 'annually') {
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      }

      subscription.endDate = newEndDate;
      subscription.billing.nextBillingDate = newEndDate;
      await subscription.save();
    }
  }

  async getUsageStats(subscriptionId: string) {
    const subscription = await this.subscriptionModel
      .findById(subscriptionId)
      .exec();

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const usage = subscription.usage || {
      studentsCount: 0,
      teachersCount: 0,
      classesCount: 0,
      storageUsedGB: 0,
      smsUsed: 0,
      emailUsed: 0,
    };

    const limits = subscription.limits;

    return {
      usage,
      limits,
      percentages: {
        students:
          limits.maxStudents > 0
            ? (usage.studentsCount / limits.maxStudents) * 100
            : 0,
        teachers:
          limits.maxTeachers > 0
            ? (usage.teachersCount / limits.maxTeachers) * 100
            : 0,
        classes:
          limits.maxClasses > 0
            ? (usage.classesCount / limits.maxClasses) * 100
            : 0,
        storage:
          limits.storageGB > 0
            ? (usage.storageUsedGB / limits.storageGB) * 100
            : 0,
        sms:
          limits.smsCredits > 0 ? (usage.smsUsed / limits.smsCredits) * 100 : 0,
        email:
          limits.emailCredits > 0
            ? (usage.emailUsed / limits.emailCredits) * 100
            : 0,
      },
    };
  }

  private getPlanLimits(plan: SubscriptionPlan) {
    const limits = {
      [SubscriptionPlan.STARTER]: {
        maxStudents: 100,
        maxTeachers: 10,
        maxClasses: 10,
        storageGB: 5,
        smsCredits: 1000,
        emailCredits: 5000,
      },
      [SubscriptionPlan.BASIC]: {
        maxStudents: 500,
        maxTeachers: 50,
        maxClasses: 50,
        storageGB: 20,
        smsCredits: 5000,
        emailCredits: 20000,
      },
      [SubscriptionPlan.STANDARD]: {
        maxStudents: 1500,
        maxTeachers: 150,
        maxClasses: 150,
        storageGB: 100,
        smsCredits: 15000,
        emailCredits: 50000,
      },
      [SubscriptionPlan.PREMIUM]: {
        maxStudents: 5000,
        maxTeachers: 500,
        maxClasses: 500,
        storageGB: 500,
        smsCredits: 50000,
        emailCredits: 200000,
      },
      [SubscriptionPlan.ENTERPRISE]: {
        maxStudents: 999999,
        maxTeachers: 999999,
        maxClasses: 999999,
        storageGB: 999999,
        smsCredits: 999999,
        emailCredits: 999999,
      },
    };

    return limits[plan] || limits[SubscriptionPlan.STARTER];
  }
}
