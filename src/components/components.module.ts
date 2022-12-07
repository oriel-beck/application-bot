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
import {
  ModalApplicationComponent,
  ModalDecisionComponent,
  ModalReportComponent,
} from './modals';

// db services
import { PostgresModule } from '../services/postgres/postgres.module';

// guards
import { ApplicationExistsGuard, ApplicationManagerGuard } from '../guards';

// providers
import { ColorProvider } from '../providers';

@Module({
  providers: [
    // component handlers
    SelectEditAnswerComponent,
    SelectViewApplicationComponent,
    ButtonPaginationComponent,
    ButtonDecisionComponent,
    ButtonApplicationComponent,
    ModalApplicationComponent,
    ModalDecisionComponent,
    ModalReportComponent,

    // guards
    ApplicationManagerGuard,
    ApplicationExistsGuard,

    // providers
    ColorProvider,
  ],
  imports: [PostgresModule],
})
export class ComponentsModule {}
