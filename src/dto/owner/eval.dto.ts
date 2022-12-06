import { BooleanOption, NumberOption, StringOption } from 'necord';

export class EvalDto {
  @StringOption({
    name: 'code',
    description: 'The code to eval',
    required: true,
  })
  code: string;

  @BooleanOption({
    name: 'hidden',
    description: 'Show hidden properties',
    required: false,
  })
  showHidden = false;

  @BooleanOption({
    name: 'async',
    description: 'Run the code as async',
    required: false,
  })
  asyncFunction = false;

  @NumberOption({
    name: 'depth',
    description: 'How much depth to view in',
    required: false,
  })
  depth = 0;
}
