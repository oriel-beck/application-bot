import { Module } from '@nestjs/common';

// component handlers
import {
  ButtonApplicationComponent,
  ButtonDecisionComponent,
  ButtonPaginationComponent,
} from './buttons';
import {
  SelectEditAnswerComponent,
  SelectViewApplicationComponent,
} from './selects';
import { ModalApplicationComponent, ModalDecisionComponent } from './modals';

// db services
import { ServicesModule } from '../services/services.module';

// guards
import { ApplicationExistsGuard, ApplicationManagerGuard } from '../guards';

// providers
import { ColorProvider } from '../providers';

@Module({
  providers: [
    // component handlers
    ButtonApplicationComponent,
    SelectEditAnswerComponent,
    ModalApplicationComponent,
    ButtonPaginationComponent,
    ButtonDecisionComponent,
    ModalDecisionComponent,
    SelectViewApplicationComponent,

    // guards
    ApplicationManagerGuard,
    ApplicationExistsGuard,

    // providers
    ColorProvider,
  ],
  imports: [ServicesModule],
})
export class ComponentsModule {}
