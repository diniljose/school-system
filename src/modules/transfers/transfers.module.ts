import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransfersService } from './transfers.service';
import { TransfersController } from './transfers.controller';
import {
  Transfer,
  TransferSchema,
} from '../../database/schemas/transfer.schema';
import { Student, StudentSchema } from '../../database/schemas/student.schema';
import { School, SchoolSchema } from '../../database/schemas/school.schema';
import { Class, ClassSchema } from '../../database/schemas/class.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transfer.name, schema: TransferSchema },
      { name: Student.name, schema: StudentSchema },
      { name: School.name, schema: SchoolSchema },
      { name: Class.name, schema: ClassSchema },
    ]),
  ],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
