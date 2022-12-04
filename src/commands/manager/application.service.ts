import { Inject, Injectable, UseFilters, UseGuards } from '@nestjs/common';
import {
  Context,
  createCommandGroupDecorator,
  Options,
  SlashCommandContext,
  Subcommand,
} from 'necord';

// options dto
import {
  ApplicationAcceptOptionsDto,
  ApplicationDeleteOptionsDto,
  ApplicationDenyOptionsDto,
  ApplicationListOptionsDto,
  ApplicationShowOptionsDto,
} from '../../dto/application';

// db services
import {
  DBApplicationApplicationsService,
  DBApplicationSettingsService,
} from '../../services';

// guards
import {
  ApplicationManagerGuard,
  ApplicationManagerNotFoundExceptionFilter,
  ApplicationNotFoundExceptionFilter,
} from '../../guards';

// utils
import {
  ApplicationCommandFunctionResponses,
  ApplicationCommandResponses,
  ApplicationState,
  ApplicationStateResponses,
  decideApplication,
  generateApplicationListComponents,
  generateApplicationListEmbed,
  generateApplicationResponseComponents,
  generateApplicationResponseEmbed,
} from '../../utils';
import { ConfigService } from '@nestjs/config';
import { COLOR_PROVIDER_TOKEN, Colors } from '../../providers';

export const ApplicationCommandGroupDecorator = createCommandGroupDecorator({
  name: 'application',
  description: 'Manage the applications and submissions',
});

@UseGuards(ApplicationManagerGuard)
@UseFilters(
  ApplicationNotFoundExceptionFilter,
  ApplicationManagerNotFoundExceptionFilter,
)
@Injectable()
@ApplicationCommandGroupDecorator()
export class ApplicationService {
  constructor(
    private appService: DBApplicationApplicationsService,
    private settingService: DBApplicationSettingsService,
    private configService: ConfigService,
    @Inject(COLOR_PROVIDER_TOKEN) private colors: Colors,
  ) {}

  @Subcommand({
    name: 'show',
    description: 'Show a specific application',
  })
  async showApplication(
    @Context() [interaction]: SlashCommandContext,
    @Options() { user }: ApplicationShowOptionsDto,
  ) {
    console.log(this.colors);
    const app = await this.appService.getAppOrThrow(BigInt(user.id));

    return interaction.reply({
      embeds: await generateApplicationResponseEmbed(
        app,
        interaction.client,
        this.colors,
        this.configService.get<number>('applications.max_questions_per_page'),
      ),
      components: generateApplicationResponseComponents(
        app.userid.toString(),
        this.configService.get<number>('applications.max_questions_per_page'),
        this.configService.get<number>('applications.max_questions'),
        0,
        app.state === ApplicationState.Pending,
      ),
    });
  }

  @Subcommand({
    name: 'list',
    description: 'List all applications',
  })
  async showApplicationList(
    @Context() [interaction]: SlashCommandContext,
    @Options() { state }: ApplicationListOptionsDto,
  ) {
    const [allApplications, count] =
      await this.appService.getAllApplicationsByState(state);

    if (!allApplications)
      return interaction.reply({
        content: ApplicationCommandResponses.NoApplicationsExist,
        ephemeral: true,
      });

    return interaction.reply({
      embeds: generateApplicationListEmbed(count, state),
      components: generateApplicationListComponents(allApplications, count),
    });
  }

  @Subcommand({
    name: 'deny',
    description: 'Deny an application by ID',
  })
  async denyApplication(
    @Context() [interaction]: SlashCommandContext,
    @Options() { user, reason = '' }: ApplicationDenyOptionsDto,
  ) {
    return interaction.reply(
      await decideApplication(
        this.appService,
        BigInt(user.id),
        interaction.client,
        ApplicationState.Denied,
        reason,
        this.configService.get<string>('channels.pending'),
        this.configService.get<string>('channels.denied'),
        this.configService.get<string>('roles.staff'),
        this.configService.get<string>('channels.staff'),
        this.configService.get<number>('applications.max_questions_per_page'),
      ),
    );
  }

  @Subcommand({
    name: 'accept',
    description: 'Accept an application by ID',
  })
  async acceptApplication(
    @Context() [interaction]: SlashCommandContext,
    @Options() { user, reason = '' }: ApplicationAcceptOptionsDto,
  ) {
    return interaction.reply(
      await decideApplication(
        this.appService,
        BigInt(user.id),
        interaction.client,
        ApplicationState.Accepted,
        reason,
        this.configService.get('channels.pending'),
        this.configService.get('channels.accepted'),
        this.configService.get('roles.staff'),
        this.configService.get('channels.staff'),
        this.configService.get<number>('applications.max_questions_per_page'),
        interaction.guild,
      ),
    );
  }

  @Subcommand({
    name: 'reset',
    description: 'Reset all applications',
  })
  async resetApplication(@Context() [interaction]: SlashCommandContext) {
    // reset all applications, return count
    const apps = await this.appService.resetApplications();
    return interaction.reply(
      ApplicationCommandFunctionResponses.resetApplications(apps.affected),
    );
  }

  @Subcommand({
    name: 'toggle',
    description: 'Toggle the applications',
  })
  async toggleApplication(@Context() [interaction]: SlashCommandContext) {
    // get the current state
    const currentState = await this.settingService.getCurrentState(
      BigInt(interaction.guildId),
    );

    // toggle the current state
    const state = await this.settingService.toggle(BigInt(interaction.guildId));

    // if nothing was updated send an error
    if (!state.affected)
      return interaction.reply(ApplicationCommandResponses.MissingServer);

    return interaction.reply(
      `${
        currentState.enabled
          ? ApplicationStateResponses.Enabled
          : ApplicationStateResponses.Disabled
      } applications!`,
    );
  }

  @Subcommand({
    name: 'delete',
    description: 'Delete an application',
  })
  async deleteApplication(
    @Context() [interaction]: SlashCommandContext,
    @Options() { user }: ApplicationDeleteOptionsDto,
  ) {
    // delete an application
    const deleted = await this.appService.deleteApplication(BigInt(user.id));

    // if deleted nothing, return an error
    if (!deleted)
      return interaction.reply(ApplicationCommandResponses.ApplicationNotFound);

    return interaction.reply(
      ApplicationCommandFunctionResponses.deletedApplication(user),
    );
  }
}
