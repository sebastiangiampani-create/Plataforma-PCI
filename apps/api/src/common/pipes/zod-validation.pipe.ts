import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ZodTypeAny } from 'zod';

/** Valida el body/params/query de una ruta contra un schema de @pci/domain. */
export class ZodValidationPipe<TSchema extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son válidos.',
        details: result.error.issues.map(
          (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
        ),
      });
    }
    return result.data;
  }
}
