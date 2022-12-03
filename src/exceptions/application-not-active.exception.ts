import { NotFoundException } from '@nestjs/common';

export class ApplicationNotActiveException extends NotFoundException {}
