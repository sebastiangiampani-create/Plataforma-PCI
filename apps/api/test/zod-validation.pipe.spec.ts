import { BadRequestException } from '@nestjs/common';
import { devLoginRequestSchema } from '@pci/domain';
import { ZodValidationPipe } from '../src/common/pipes/zod-validation.pipe.js';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(devLoginRequestSchema);

  it('devuelve el valor parseado cuando es válido', () => {
    const result = pipe.transform({ email: 'Persona@Example.com' });
    expect(result.email).toBe('persona@example.com');
  });

  it('lanza BadRequestException con detalles cuando es inválido', () => {
    expect.assertions(3);
    try {
      pipe.transform({ email: 'no-valido' });
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        code: string;
        details: string[];
      };
      expect(response.code).toBe('VALIDATION_ERROR');
      expect(response.details.length).toBeGreaterThan(0);
    }
  });
});
