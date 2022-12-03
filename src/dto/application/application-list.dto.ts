import { StringOption } from 'necord';
import { ApplicationState } from '../../utils';

export class ApplicationListOptionsDto {
  @StringOption({
    name: 'state',
    description:
      'The state of the applications to return (warning: active applications change frequently',
    required: false,
    choices: [
      {
        name: 'Pending',
        value: ApplicationState.Pending,
      },
      {
        name: 'Denied',
        value: ApplicationState.Denied,
      },
      {
        name: 'Accepted',
        value: ApplicationState.Accepted,
      },
      {
        name: 'Active',
        value: ApplicationState.Active,
      },
    ],
  })
  state: ApplicationState = ApplicationState.Pending;
}
