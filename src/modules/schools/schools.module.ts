import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchoolsService } from './schools.service';
import { SchoolsController } from './schools.controller';
import { School, SchoolSchema } from '../../database/schemas/school.schema';
import {
  Subscription,
  SubscriptionSchema,
} from '../../database/schemas/subscription.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: School.name, schema: SchoolSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
  ],
  controllers: [SchoolsController],
  providers: [SchoolsService],
  exports: [SchoolsService],
})
export class SchoolsModule {}
