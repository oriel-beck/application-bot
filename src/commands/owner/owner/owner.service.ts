import { Injectable } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { inspect } from 'util';
import { EvalDto } from '../../../dto/owner/eval.dto';
import { EmbedBuilder } from '@discordjs/builders';

@Injectable()
export class OwnerService {
  @SlashCommand({
    name: 'eval',
    description: 'Eval a js code',
  })
  evalCode(
    @Context() [interaction]: SlashCommandContext,
    @Options() { code, showHidden, asyncFunction, depth }: EvalDto,
  ) {
    let res;

    try {
      res = eval(asyncFunction ? `( async () => { ${code} })()` : code);
    } catch (error) {
      res = error;
    }

    res = inspect(res, showHidden, depth);

    const embed = new EmbedBuilder().setDescription(`\`\`\`js\n${res}\`\`\``);

    return interaction.reply({
      embeds: [embed],
    });
  }
}
