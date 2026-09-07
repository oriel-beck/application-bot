import { collectStartupValidation, formatStartupValidationErrors } from '@lib/config/validate.js';

const { errors } = await collectStartupValidation();
if (errors.length) {
  console.error(formatStartupValidationErrors(errors));
  process.exit(1);
}

console.log('Startup configuration is valid.');
