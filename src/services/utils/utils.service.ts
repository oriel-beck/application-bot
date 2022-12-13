import { Injectable } from '@nestjs/common';
import { DBApplicationSettingsService } from '../postgres';

@Injectable()
export class UtilsService {
  constructor(private settingsService: DBApplicationSettingsService) {}
}
