import {
  ValidationPipe,
  BadRequestException,
  ValidationError,
  ArgumentMetadata,
} from '@nestjs/common';
import { ResponseService } from 'src/services/response/response.service';

const SUPPORTED_LANGUAGES = ['en', 'ar', 'fr'];

const VALIDATION_ERROR_MAP: Record<string, Record<string, string>> = {
  en: {
    isString: 'must be a string',
    isArray: 'must be an array',
    isEnum: 'must be one of the allowed values',
    isEmail: 'must be a valid email',
    isNotEmpty: 'should not be empty',
    unknown: 'has an unknown error',
  },
  ar: {
    isString: 'يجب أن يكون نصًا',
    isArray: 'يجب أن يكون مصفوفة',
    isEnum: 'يجب أن يكون أحد القيم المسموح بها',
    isEmail: 'يجب أن يكون بريدًا إلكترونيًا',
    isNotEmpty: 'لا يجب أن يكون فارغًا',
    unknown: 'يحتوي على خطأ غير معروف',
  },
  fr: {
    isString: 'doit être une chaîne',
    isArray: 'doit être un tableau',
    isEnum: 'doit être une des valeurs autorisées',
    isEmail: 'doit être un email valide',
    isNotEmpty: 'ne doit pas être vide',
    unknown: 'a une erreur inconnue',
  },
};

export class CustomValidationPipe extends ValidationPipe {
  constructor(private readonly responseService: ResponseService) {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[] = []) => {
        const messages = this.buildMessages(errors);

        return new BadRequestException(
          this.responseService.sendMultiLangErrorResponse(messages, {}),
        );
      },
    });
  }

  private buildMessages(errors: ValidationError[]): Record<string, string> {
    const result: Record<string, string> = {};

    for (const lang of SUPPORTED_LANGUAGES) {
      const errorString =
        this.formatErrors(errors, lang) || this.getDefault(lang);
      result[this.langKey(lang)] = errorString;
    }

    return result;
  }

  private langKey(lang: string): string {
    if (lang === 'en') return 'message';
    if (lang === 'ar') return 'arabicMessage';
    return `${lang}Message`; // e.g. frenchMessage
  }

  private getDefault(lang: string): string {
    const fallback = {
      en: 'Validation failed',
      ar: 'فشل التحقق من الصحة',
      fr: 'Échec de la validation',
    };
    return fallback[lang] || 'Validation failed';
  }

  private formatErrors(errors: ValidationError[], lang: string): string {
    return errors.flatMap((error) => this.processError(error, lang)).join(', ');
  }

  private processError(
    error: ValidationError,
    lang: string,
    parentPath = '',
  ): string[] {
    const fieldPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      return Object.keys(error.constraints).map((constraint) =>
        this.translateMessage(constraint, fieldPath, lang),
      );
    }

    if (error.children && error.children.length > 0) {
      return error.children.flatMap((child) =>
        this.processError(child, lang, fieldPath),
      );
    }

    return [this.translateMessage('unknown', fieldPath, lang)];
  }

  private translateMessage(
    constraint: string,
    field: string,
    lang: string,
  ): string {
    const translation =
      VALIDATION_ERROR_MAP[lang]?.[constraint] ||
      VALIDATION_ERROR_MAP[lang]?.['unknown'] ||
      'has an unknown error';
    return `${field} ${translation}`;
  }

  async transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type === 'body' && (value === null || value === undefined)) {
      const messages: Record<string, string> = {};
      for (const lang of SUPPORTED_LANGUAGES) {
        messages[this.langKey(lang)] =
          lang === 'en'
            ? 'Request body is required.'
            : lang === 'ar'
              ? 'جسم الطلب مطلوب.'
              : lang === 'fr'
                ? 'Le corps de la requête est requis.'
                : 'Request body is required.';
      }

      throw new BadRequestException(
        this.responseService.sendMultiLangErrorResponse(messages, {}),
      );
    }

    return super.transform(value, metadata);
  }
}
