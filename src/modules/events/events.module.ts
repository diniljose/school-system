import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import {
  SchoolEvent,
  EventSchema,
} from '../../database/schemas/event.schema';
import { TenantDatabaseService } from '../../database/tenant-database.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SchoolEvent.name, schema: EventSchema },
    ]),
  ],
  controllers: [EventsController],
  providers: [EventsService, TenantDatabaseService],
  exports: [EventsService],
})
export class EventsModule {}
