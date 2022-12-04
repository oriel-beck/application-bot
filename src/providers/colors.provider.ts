import { ConfigService } from '@nestjs/config';
import { Provider } from '@nestjs/common';
import { ApplicationState } from '../utils';

export type Colors = Record<ApplicationState & 'primary', number>;
export const COLOR_PROVIDER_TOKEN = 'COLORS';
const colors = (config: ConfigService): Colors => ({
  pending: parseInt(config.get('colors.pending'), 16),
  denied: parseInt(config.get('colors.denied'), 16),
  accepted: parseInt(config.get('colors.accepted'), 16),
  primary: parseInt(config.get('colors.primary'), 16),
});

export const ColorProvider: Provider = {
  provide: COLOR_PROVIDER_TOKEN,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => colors(config),
};
