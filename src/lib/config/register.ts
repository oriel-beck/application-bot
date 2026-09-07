import { container } from '@sapphire/framework';
import { assertStartupValid } from './validate.js';

container.config = await assertStartupValid();
