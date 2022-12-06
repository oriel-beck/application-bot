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
} from '../constants';
import { generateApplicationResponseEmbed } from './application-review.utils';
import { BDFDApplication } from '../entities';
import { Colors } from '../providers';

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
  targetChannel: string,
  colors: Colors,
  maxQuestionsPerPage: number,
): Promise<Message | null> {
  const channel = await client.channels.fetch(targetChannel).catch(() => null);

  if (!channel) return null;

  return await channel
    ?.send({
      embeds: await generateApplicationResponseEmbed(
        app,
        client,
        colors,
        maxQuestionsPerPage,
      ),
    })
    .catch(() => null);
}

export function deletePendingApplication(
  msgid: string,
  client: Client,
  pendingChannel: string,
): void {
  client.channels
    .fetch(pendingChannel)
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
  staffRole: string,
): Promise<boolean> {
  const member = await guild.members.fetch(userid).catch(() => null);
  if (!member) return false;

  const addRole = await member.roles.add(staffRole).catch(() => null);
  return !!addRole;
}

export async function sendWelcome(
  userid: string,
  client: Client,
  staffChannel: string,
  welcomeMsg: string,
) {
  const channel = await client.channels.fetch(staffChannel);
  if (!channel || !channel.isTextBased()) return false;

  const msg = await channel
    .send({
      content: `${welcomeMsg}\n<@${userid}>`,
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
  pendingChannel: string,
  targetChannel: string,
  staffRole: string,
  staffChannel: string,
  maxQuestionsPerPage: number,
  welcomeMsg: string,
  guild?: Guild,
): Promise<InteractionReplyOptions> {
  const app = await appService.getAppOrThrow(userid);
  app.state = type;

  await appService.updateApplicationState(userid, type);

  const sendDecidedApplication = await sendApplication(
    app,
    type,
    client,
    targetChannel,
    this.colors,
    maxQuestionsPerPage,
  );

  const sendDM = await sendMessageToUser(
    userid.toString(),
    client,
    type,
    reason,
  );

  deletePendingApplication(app.messageid.toString(), client, pendingChannel);

  if (type === ApplicationState.Denied) {
    return {
      content: ApplicationDecisionModalFunctionResponses.denied(
        !!sendDM,
        !!sendDecidedApplication,
      ),
      ephemeral: true,
    };
  }

  const addRole = await addStaffRoleToUser(userid.toString(), guild, staffRole);

  const welcomeSent = await sendWelcome(
    userid.toString(),
    client,
    staffChannel,
    welcomeMsg,
  );

  return {
    content: ApplicationDecisionModalFunctionResponses.accepted(
      !!sendDM,
      !!sendDecidedApplication,
      !!addRole,
      !!welcomeSent,
    ),
    ephemeral: true,
  };
}
