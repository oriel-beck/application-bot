import {
  ActionRowModalData,
  Client,
  Guild,
  GuildTextBasedChannel,
  InteractionReplyOptions,
  Message,
  TextInputModalData,
} from 'discord.js';
import { DBApplicationApplicationsService } from '../services';
import {
  ApplicationDecisionModalFunctionResponses,
  ApplicationFunctionResponses,
  ApplicationState,
} from './constants';
import * as process from 'process';
import { generateApplicationResponseEmbed } from './application-review.utils';
import { BDFDApplication } from '../entities';

export const getModalData = (actionRow: ActionRowModalData) =>
  actionRow[0].components[0] as TextInputModalData;

export async function sendMessageToUser(
  userid: string,
  client: Client,
  type: ApplicationState.Accepted | ApplicationState.Denied,
  reason: string,
): Promise<boolean> {
  const user = await client.users.fetch(userid).catch(() => null);
  if (!user) return false;

  const msg = await user.send({
    content:
      type === ApplicationState.Accepted
        ? ApplicationFunctionResponses.dmAccept(reason)
        : ApplicationFunctionResponses.dmDeny(reason),
  });

  return !!msg;
}

export async function sendApplication(
  app: BDFDApplication,
  type: ApplicationState.Accepted | ApplicationState.Denied,
  client: Client,
): Promise<Message | null> {
  const channel = await client.channels
    .fetch(
      process.env[
        type === ApplicationState.Accepted
          ? 'ACCEPTED_CHANNEL'
          : 'DENIED_CHANNEL'
      ],
    )
    .catch(() => null);

  if (!channel) return null;

  return await channel
    ?.send({
      embeds: await generateApplicationResponseEmbed(app, client),
    })
    .catch(() => null);
}

export function deletePendingApplication(msgid: string, client: Client): void {
  client.channels
    .fetch(process.env.PENDING_CHANNEL)
    .then((channel: GuildTextBasedChannel) =>
      channel.messages
        .fetch(msgid)
        .then((msg) => msg.delete().catch(() => null))
        .catch(() => null),
    )
    .catch(() => null);
}

export async function addStaffRoleToUser(
  userid: string,
  guild: Guild,
): Promise<boolean> {
  const member = await guild.members.fetch(userid).catch(() => null);
  if (!member) return false;

  const addRole = await member.roles
    .add(process.env.STAFF_ROLE)
    .catch(() => null);
  return !!addRole;
}

export async function sendWelcome(userid: string, client: Client) {
  const channel = await client.channels.fetch(process.env.STAFF_CHANNEL);
  if (!channel || !channel.isTextBased()) return false;

  const msg = await channel
    .send({
      content: ApplicationFunctionResponses.sitChannelSend(userid),
    })
    .catch(() => null);

  return !!msg;
}

export async function decideApplication(
  appService: DBApplicationApplicationsService,
  userid: bigint,
  client: Client,
  type: ApplicationState.Accepted | ApplicationState.Denied,
  reason = '',
  guild?: Guild,
): Promise<InteractionReplyOptions> {
  const app = await appService.getAppOrThrow(userid);
  app.state = type;

  await appService.updateApplicationState(userid, type);

  const sendDecidedApplication = await sendApplication(app, type, client);

  const sendDM = await sendMessageToUser(
    userid.toString(),
    client,
    type,
    reason,
  );

  deletePendingApplication(app.messageid.toString(), client);

  if (type === ApplicationState.Denied) {
    return {
      content: ApplicationDecisionModalFunctionResponses.denied(
        !!sendDM,
        !!sendDecidedApplication,
      ),
      ephemeral: true,
    };
  }

  const addRole = await addStaffRoleToUser(userid.toString(), guild);

  const welcomeMsg = await sendWelcome(userid.toString(), client);

  return {
    content: ApplicationDecisionModalFunctionResponses.accepted(
      !!sendDM,
      !!sendDecidedApplication,
      !!addRole,
      !!welcomeMsg,
    ),
    ephemeral: true,
  };
}
