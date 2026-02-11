import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransportService } from './transport.service';
import { TransportController } from './transport.controller';
import {
  Transport,
  TransportSchema,
} from '../../database/schemas/transport.schema';
import { Student, StudentSchema } from '../../database/schemas/student.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transport.name, schema: TransportSchema },
      { name: Student.name, schema: StudentSchema },
    ]),
  ],
  controllers: [TransportController],
  providers: [TransportService],
  exports: [TransportService],
})
export class TransportModule {}
