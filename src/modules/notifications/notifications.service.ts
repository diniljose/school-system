import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationStatus,
  RecipientType,
} from '../../database/schemas/notification.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { Class, ClassDocument } from '../../database/schemas/class.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { TenantDatabaseService } from '../../database/tenant-database.service';

export interface TenantContext {
  schoolId?: string;
  schoolCode?: string;
  isTenantUser?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    private tenantDatabaseService: TenantDatabaseService,
  ) {}

  // Helper methods to get tenant-aware models
  private async getNotificationModel(
    context?: TenantContext,
  ): Promise<Model<NotificationDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<NotificationDocument>(
        context.schoolCode,
        'Notification',
      );
    }
    return this.notificationModel;
  }

  private async getUserModel(
    context?: TenantContext,
  ): Promise<Model<UserDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<UserDocument>(
        context.schoolCode,
        'User',
      );
    }
    return this.userModel;
  }

  private async getClassModel(
    context?: TenantContext,
  ): Promise<Model<ClassDocument>> {
    if (context?.isTenantUser && context?.schoolCode) {
      return this.tenantDatabaseService.getTenantModel<ClassDocument>(
        context.schoolCode,
        'Class',
      );
    }
    return this.classModel;
  }

  async create(
    createDto: CreateNotificationDto,
    schoolId: string,
    senderId: string,
    context?: TenantContext,
  ) {
    const userModel = await this.getUserModel(context);
    const classModel = await this.getClassModel(context);
    const notificationModel = await this.getNotificationModel(context);

    // For tenant users, just verify sender exists (no school filter needed in tenant DB)
    const senderQuery: any = { _id: new Types.ObjectId(senderId) };
    if (!context?.isTenantUser) {
      senderQuery.school = new Types.ObjectId(schoolId);
    }
    const sender = await userModel.findOne(senderQuery);

    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    if (
      createDto.recipientType === RecipientType.CLASS &&
      createDto.targetClasses
    ) {
      for (const classId of createDto.targetClasses) {
        const classQuery: any = { _id: new Types.ObjectId(classId) };
        if (!context?.isTenantUser) {
          classQuery.school = new Types.ObjectId(schoolId);
        }
        const classDoc = await classModel.findOne(classQuery);
        if (!classDoc) {
          throw new NotFoundException(`Class ${classId} not found`);
        }
      }
    }

    const recipientModel = this.getRecipientModel(createDto.recipientType || RecipientType.ALL);

    const notificationData: any = {
      ...createDto,
      type: createDto.type || 'general',
      recipientType: createDto.recipientType || RecipientType.ALL,
      school: new Types.ObjectId(schoolId),
      sender: new Types.ObjectId(senderId),
      recipientModel,
      recipients: createDto.recipients?.map((id) => new Types.ObjectId(id)),
      targetClasses: createDto.targetClasses?.map(
        (id) => new Types.ObjectId(id),
      ),
      status: createDto.scheduledFor
        ? NotificationStatus.SCHEDULED
        : NotificationStatus.DRAFT,
      scheduledFor: createDto.scheduledFor
        ? new Date(createDto.scheduledFor)
        : undefined,
      expiresAt: createDto.expiresAt
        ? new Date(createDto.expiresAt)
        : undefined,
      actionRequired: createDto.actionRequired
        ? {
            ...createDto.actionRequired,
            dueDate: createDto.actionRequired.dueDate
              ? new Date(createDto.actionRequired.dueDate)
              : undefined,
          }
        : undefined,
    };

    const notification = new notificationModel(notificationData);

    await notification.save();
    return notification;
  }

  async send(notificationId: string, sendDto?: SendNotificationDto) {
    const notification = await this.notificationModel.findById(notificationId);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (
      notification.status !== NotificationStatus.DRAFT &&
      notification.status !== NotificationStatus.SCHEDULED &&
      !sendDto?.forceResend
    ) {
      throw new BadRequestException(
        'Notification has already been sent. Use forceResend option to resend.',
      );
    }

    const recipients = await this.resolveRecipients(notification);

    if (recipients.length === 0) {
      throw new BadRequestException(
        'No recipients found for this notification',
      );
    }

    const channels = [];
    const delivery = [];

    if (sendDto?.sendEmail ?? notification.sendEmail) {
      channels.push({
        type: 'email',
        enabled: true,
        sentAt: new Date(),
        status: 'sent',
      });
    }

    if (sendDto?.sendSMS ?? notification.sendSMS) {
      channels.push({
        type: 'sms',
        enabled: true,
        sentAt: new Date(),
        status: 'sent',
      });
    }

    if (sendDto?.sendPush ?? notification.sendPush) {
      channels.push({
        type: 'push',
        enabled: true,
        sentAt: new Date(),
        status: 'sent',
      });
    }

    if (sendDto?.sendInApp ?? notification.sendInApp) {
      channels.push({
        type: 'in-app',
        enabled: true,
        sentAt: new Date(),
        status: 'sent',
      });
    }

    for (const recipient of recipients) {
      for (const channel of channels) {
        delivery.push({
          recipient: recipient._id,
          recipientType: recipient.role,
          channel: channel.type,
          sentAt: new Date(),
          status: 'sent',
        });
      }
    }

    notification.status = NotificationStatus.SENT;
    notification.sentAt = new Date();
    notification.channels = channels;
    notification.delivery = delivery;
    notification.statistics = {
      totalRecipients: recipients.length,
      sent: recipients.length,
      delivered: 0,
      read: 0,
      failed: 0,
      lastUpdated: new Date(),
    };

    await notification.save();
    return notification;
  }

  async schedule(notificationId: string, scheduledFor: string) {
    const notification = await this.notificationModel.findById(notificationId);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.status === NotificationStatus.SENT) {
      throw new BadRequestException('Cannot schedule a sent notification');
    }

    const scheduleDate = new Date(scheduledFor);
    if (scheduleDate <= new Date()) {
      throw new BadRequestException('Scheduled date must be in the future');
    }

    notification.scheduledFor = scheduleDate;
    notification.status = NotificationStatus.SCHEDULED;

    await notification.save();
    return notification;
  }

  async cancel(notificationId: string) {
    const notification = await this.notificationModel.findById(notificationId);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.status === NotificationStatus.SENT) {
      throw new BadRequestException('Cannot cancel a sent notification');
    }

    notification.status = NotificationStatus.CANCELLED;
    await notification.save();
    return notification;
  }

  async findAll(
    schoolId: string,
    filters: QueryNotificationDto,
    pagination: { page?: number; limit?: number },
    context?: TenantContext,
  ) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const notificationModel = await this.getNotificationModel(context);

    // For tenant DB, don't filter by school - the entire DB is school-specific
    const query: any = context?.isTenantUser ? {} : { school: new Types.ObjectId(schoolId) };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.recipientType) {
      query.recipientType = filters.recipientType;
    }

    if (filters.sender) {
      query.sender = new Types.ObjectId(filters.sender);
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }

    const [notifications, total] = await Promise.all([
      notificationModel
        .find(query)
        .populate('sender', 'firstName lastName email')
        .populate('targetClasses', 'name grade')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      notificationModel.countDocuments(query),
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const notification = await this.notificationModel
      .findById(id)
      .populate('sender', 'firstName lastName email')
      .populate('targetClasses', 'name grade sections')
      .populate('recipients', 'firstName lastName email role')
      .exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async findByRecipient(
    userId: string,
    filters: QueryNotificationDto,
    pagination: { page?: number; limit?: number },
  ) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const query: any = {
      school: user.school,
      $or: [
        { recipientType: RecipientType.ALL },
        { recipients: new Types.ObjectId(userId) },
      ],
    };

    if (user.role === 'student') {
      query.$or.push({ recipientType: RecipientType.STUDENTS });
    } else if (user.role === 'teacher') {
      query.$or.push({ recipientType: RecipientType.TEACHERS });
    } else if (user.role === 'parent') {
      query.$or.push({ recipientType: RecipientType.PARENTS });
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    if (filters.isRead !== undefined) {
      if (filters.isRead) {
        query['delivery.recipient'] = new Types.ObjectId(userId);
        query['delivery.readAt'] = { $exists: true, $ne: null };
      } else {
        query.$and = [
          {
            $or: [
              { 'delivery.recipient': new Types.ObjectId(userId) },
              { 'delivery.recipient': { $exists: false } },
            ],
          },
          {
            $or: [
              { 'delivery.readAt': { $exists: false } },
              { 'delivery.readAt': null },
            ],
          },
        ];
      }
    }

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .populate('sender', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(query),
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.notificationModel.findById(notificationId);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const deliveryIndex = notification.delivery.findIndex(
      (d) => d.recipient.toString() === userId,
    );

    if (deliveryIndex !== -1) {
      notification.delivery[deliveryIndex].readAt = new Date();
      notification.delivery[deliveryIndex].deliveredAt =
        notification.delivery[deliveryIndex].deliveredAt || new Date();
    } else {
      notification.delivery.push({
        recipient: new Types.ObjectId(userId),
        recipientType: 'user',
        channel: 'in-app',
        sentAt: new Date(),
        deliveredAt: new Date(),
        readAt: new Date(),
        status: 'read',
        error: undefined,
      });
    }

    const readCount = notification.delivery.filter((d) => d.readAt).length;
    if (notification.statistics) {
      notification.statistics.read = readCount;
      notification.statistics.lastUpdated = new Date();
    }

    await notification.save();
    return notification;
  }

  async markAllAsRead(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const query: any = {
      school: user.school,
      status: NotificationStatus.SENT,
      $or: [
        { recipientType: RecipientType.ALL },
        { recipients: new Types.ObjectId(userId) },
      ],
    };

    if (user.role === 'student') {
      query.$or.push({ recipientType: RecipientType.STUDENTS });
    } else if (user.role === 'teacher') {
      query.$or.push({ recipientType: RecipientType.TEACHERS });
    } else if (user.role === 'parent') {
      query.$or.push({ recipientType: RecipientType.PARENTS });
    }

    const notifications = await this.notificationModel.find(query);

    for (const notification of notifications) {
      const deliveryIndex = notification.delivery.findIndex(
        (d) => d.recipient.toString() === userId,
      );

      if (deliveryIndex !== -1) {
        if (!notification.delivery[deliveryIndex].readAt) {
          notification.delivery[deliveryIndex].readAt = new Date();
          notification.delivery[deliveryIndex].deliveredAt =
            notification.delivery[deliveryIndex].deliveredAt || new Date();
        }
      } else {
        notification.delivery.push({
          recipient: new Types.ObjectId(userId),
          recipientType: 'user',
          channel: 'in-app',
          sentAt: new Date(),
          deliveredAt: new Date(),
          readAt: new Date(),
          status: 'read',
          error: undefined,
        });
      }

      const readCount = notification.delivery.filter((d) => d.readAt).length;
      if (notification.statistics) {
        notification.statistics.read = readCount;
        notification.statistics.lastUpdated = new Date();
      }

      await notification.save();
    }

    return {
      message: 'All notifications marked as read',
      count: notifications.length,
    };
  }

  async getUnreadCount(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const query: any = {
      school: user.school,
      status: NotificationStatus.SENT,
      $or: [
        { recipientType: RecipientType.ALL },
        { recipients: new Types.ObjectId(userId) },
      ],
    };

    if (user.role === 'student') {
      query.$or.push({ recipientType: RecipientType.STUDENTS });
    } else if (user.role === 'teacher') {
      query.$or.push({ recipientType: RecipientType.TEACHERS });
    } else if (user.role === 'parent') {
      query.$or.push({ recipientType: RecipientType.PARENTS });
    }

    const notifications = await this.notificationModel.find(query);

    const unreadCount = notifications.filter((notification) => {
      const userDelivery = notification.delivery.find(
        (d) => d.recipient.toString() === userId,
      );
      return !userDelivery || !userDelivery.readAt;
    }).length;

    return { unreadCount };
  }

  async delete(id: string) {
    const notification = await this.notificationModel.findById(id);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationModel.findByIdAndDelete(id);
    return { message: 'Notification deleted successfully' };
  }

  async getDeliveryStats(notificationId: string) {
    const notification = await this.notificationModel.findById(notificationId);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const stats = {
      totalRecipients: notification.statistics?.totalRecipients || 0,
      sent: notification.statistics?.sent || 0,
      delivered: notification.delivery.filter((d) => d.deliveredAt).length || 0,
      read: notification.delivery.filter((d) => d.readAt).length || 0,
      failed: notification.statistics?.failed || 0,
      channels: notification.channels.map((c) => ({
        type: c.type,
        enabled: c.enabled,
        status: c.status,
        sentAt: c.sentAt,
      })),
      deliveryDetails: notification.delivery.map((d) => ({
        recipient: d.recipient,
        recipientType: d.recipientType,
        channel: d.channel,
        sentAt: d.sentAt,
        deliveredAt: d.deliveredAt,
        readAt: d.readAt,
        status: d.status,
      })),
    };

    return stats;
  }

  private async resolveRecipients(notification: NotificationDocument) {
    const schoolId = notification.school;
    let recipients = [];

    switch (notification.recipientType) {
      case RecipientType.ALL:
        recipients = await this.userModel.find({ school: schoolId });
        break;

      case RecipientType.STUDENTS:
        recipients = await this.userModel.find({
          school: schoolId,
          role: 'student',
        });
        break;

      case RecipientType.TEACHERS:
        recipients = await this.userModel.find({
          school: schoolId,
          role: 'teacher',
        });
        break;

      case RecipientType.PARENTS:
        recipients = await this.userModel.find({
          school: schoolId,
          role: 'parent',
        });
        break;

      case RecipientType.STAFF:
        recipients = await this.userModel.find({
          school: schoolId,
          role: { $in: ['teacher', 'accountant', 'librarian', 'receptionist'] },
        });
        break;

      case RecipientType.CLASS:
        if (
          notification.targetClasses &&
          notification.targetClasses.length > 0
        ) {
          recipients = await this.userModel.find({
            school: schoolId,
            role: 'student',
            class: { $in: notification.targetClasses },
          });
        }
        break;

      case RecipientType.INDIVIDUAL:
        if (notification.recipients && notification.recipients.length > 0) {
          recipients = await this.userModel.find({
            _id: { $in: notification.recipients },
            school: schoolId,
          });
        }
        break;

      default:
        break;
    }

    return recipients;
  }

  private getRecipientModel(recipientType: RecipientType): string {
    switch (recipientType) {
      case RecipientType.STUDENTS:
      case RecipientType.TEACHERS:
      case RecipientType.PARENTS:
      case RecipientType.STAFF:
      case RecipientType.INDIVIDUAL:
      case RecipientType.ALL:
        return 'User';
      case RecipientType.CLASS:
        return 'Class';
      default:
        return 'User';
    }
  }
}
