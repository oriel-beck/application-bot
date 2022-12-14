import { Injectable, UseFilters, UseGuards } from '@nestjs/common';
import { Context, Options, SlashCommandContext, Subcommand } from 'necord';
import { Colors } from 'discord.js';

// options dto
import {
  ApplicationBlacklistAddOptionsDto,
  ApplicationBlacklistReasonOptionDto,
  ApplicationBlacklistRemoveOptionsDto,
  ApplicationBlacklistShowOptionsDto,
} from '../../dto/application/blacklist';

// services
import { DBApplicationBlacklistService } from '../../services/postgres';

// constants
import {
  ApplicationBlacklistCommandFunctionResponses,
  ApplicationBlacklistCommandResponses,
} from '../../constants';

// guards
import {
  ApplicationManagerGuard,
  ApplicationManagerNotFoundExceptionFilter,
} from '../../guards';

// group command decorator
import { ApplicationCommandGroupDecorator } from './application-commands.service';

@UseGuards(ApplicationManagerGuard)
@UseFilters(ApplicationManagerNotFoundExceptionFilter)
@Injectable()
@ApplicationCommandGroupDecorator({
  name: 'blacklist',
  description: 'Manages the application blacklist system',
})
export class ApplicationCommandsBlacklistService {
  constructor(private blacklistService: DBApplicationBlacklistService) {}

  @Subcommand({
    name: 'add',
    description: 'Adds a user to the blacklist',
  })
  async addBlacklist(
    @Context() [interaction]: SlashCommandContext,
    @Options() { user, reason }: ApplicationBlacklistAddOptionsDto,
  ) {
    const blacklisted = await this.blacklistService.addBlacklist(
      BigInt(user.id),
      reason,
      BigInt(interaction.user.id),
      BigInt(interaction.guildId),
    );

    if (!blacklisted) {
      return interaction
        .reply(ApplicationBlacklistCommandResponses.FailedBlacklist)
        .catch(() => null);
    }

    return interaction
      .reply(
        ApplicationBlacklistCommandFunctionResponses.blacklisted(user, reason),
      )
      .catch(() => null);
  }

  @Subcommand({
    name: 'remove',
    description: 'Remove a user from the blacklist',
  })
  async removeBlacklist(
    @Context() [interaction]: SlashCommandContext,
    @Options() { user }: ApplicationBlacklistRemoveOptionsDto,
  ) {
    const deleted = await this.blacklistService.removeBlacklist(
      BigInt(user.id),
      BigInt(interaction.guildId),
    );

    if (!deleted || !deleted.affected) {
      return interaction
        .reply(ApplicationBlacklistCommandResponses.FailedDelete)
        .catch(() => null);
    }

    return interaction
      .reply(ApplicationBlacklistCommandFunctionResponses.unblacklisted(user))
      .catch(() => null);
  }

  @Subcommand({
    name: 'reason',
    description: 'Edits the reason of a blacklisted user',
  })
  async reasonBlacklist(
    @Context() [interaction]: SlashCommandContext,
    @Options() { user, reason }: ApplicationBlacklistReasonOptionDto,
  ) {
    const reasoned = await this.blacklistService.reasonBlacklist(
      BigInt(user.id),
      reason,
      BigInt(interaction.user.id),
      BigInt(interaction.guildId),
    );

    if (!reasoned || !reasoned.affected) {
      return interaction
        .reply(ApplicationBlacklistCommandResponses.FailedRereason)
        .catch(() => null);
    }

    return interaction
      .reply(
        ApplicationBlacklistCommandFunctionResponses.rereasoned(user, reason),
      )
      .catch(() => null);
  }

  @Subcommand({
    name: 'show',
    description: 'Show the details of a blacklisted user',
  })
  async showBlacklist(
    @Context() [interaction]: SlashCommandContext,
    @Options() { user }: ApplicationBlacklistShowOptionsDto,
  ) {
    const blacklist = await this.blacklistService.getBlacklist(
      BigInt(user.id),
      BigInt(interaction.guildId),
    );
    if (!blacklist) {
      return interaction
        .reply({
          content: ApplicationBlacklistCommandResponses.NotBlacklisted,
          ephemeral: true,
        })
        .catch(() => null);
    }

    return interaction
      .reply({
        embeds: [
          {
            description:
              ApplicationBlacklistCommandFunctionResponses.showBlacklist(
                blacklist.mod,
                blacklist.reason,
              ),
            color: Colors.DarkPurple,
          },
        ],
      })
      .catch(() => null);
  }
}
