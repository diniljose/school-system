/**
 * Shared Module
 * Provides commonly used services across the application
 */
import { Module, Global } from '@nestjs/common';
import { ResponseService } from '../../services/response/response.service';
import { TranslationService } from '../../services/translation/translation.service';

@Global()
@Module({
  providers: [ResponseService, TranslationService],
  exports: [ResponseService, TranslationService],
})
export class SharedModule {}
