import { Module } from '@nestjs/common';

// component handlers
import {
  ButtonApplicationComponent,
  ButtonDecisionComponent,
  ButtonPaginationComponent,
} from './buttons';
import { SelectEditAnswerComponent } from './selects';
import { ModalApplicationComponent, ModalDecisionComponent } from './modals';

// db services
import { ServicesModule } from '../services/services.module';

// guards
import { ApplicationExistsGuard, ApplicationManagerGuard } from '../guards';
import { SelectViewApplicationComponent } from './selects/select-view-application.component';

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
  ],
  imports: [ServicesModule],
})
export class ComponentsModule {}
