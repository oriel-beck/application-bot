import { Message, User } from 'discord.js';
import { ApplicationState } from './constants';

export const ApplicationFunctionResponses = Object.freeze({
  dmAccept: (reason?: string) =>
    `Your application was **ACCEPTED**, welcome to BDFD's staff team!${
      reason ? `\nReason: ${reason}` : ''
    }`,
  dmDeny: (reason?: string) =>
    `Your application was **DENIED**, you can re-apply when applications reopen.${
      reason ? `\nReason: ${reason}` : ''
    }`,
  sitChannelSend: (userid: string | bigint) =>
    `Welcome to the staff team <@${userid}>`,
});

export enum ApplicationErrors {
  NotExistStartNew = 'This application does not exist in the database, please start a new one.',
  NotExistDelete = 'This application does not exist in the database, it can be deleted safely.',
  NotPending = 'This application is not pending and cannot be modified.',
}

export const ApplyCommandFunctionResponses = Object.freeze({
  blacklistedMessage: (reason: string) =>
    `You cannot apply as you are blacklisted for: ${reason}.`,
});

export enum ApplyCommandResponses {
  Disabled = 'The applications are currently disabled.',
  InProgress = 'You cannot apply as you already applied or have an application in progress.',
  Starting = 'Starting application, please be patient...',
  OpenDMs = 'I was not able to start the application, please make sure your DMs are open.',
  FailedStart = 'Failed to start application, please try again later.',
  Started = 'I started the application in your DMs, good luck!',
}

export const ApplicationCommandFunctionResponses = Object.freeze({
  deletedApplication: (user: User) => `Deleted the application from ${user}`,
  resetApplications: (amount: number) =>
    `Application were reset, reset ${amount}`,
});

export enum ApplicationCommandResponses {
  MissingServer = "Something went wrong, I don't have this server in the database.",
  ApplicationNotFound = 'I could not found any applications with that user ID.',
  NoApplicationsExist = 'There are no applications of the selected state in the database.',
}

export const ApplicationBlacklistCommandFunctionResponses = Object.freeze({
  blacklisted: (user: User, reason: string) =>
    `Blacklisted ${user} for ${reason}`,
  unblacklisted: (user: User) => `Removed the blacklist for ${user}`,
  rereasoned: (user: User, reason: string) =>
    `Re-reasoned the blacklist for ${user} with ${reason}`,
  showBlacklist: (mod: bigint, reason: string) =>
    `Blacklisted by ${mod}\nReason: ${reason}`,
});

export enum ApplicationBlacklistCommandResponses {
  FailedBlacklist = 'Failed to blacklisted, is this user blacklisted already?',
  FailedDelete = 'Failed to delete the blacklist.',
  FailedRereason = 'Failed to re-reason the blacklist, is this user blacklisted?',
  NotBlacklisted = 'This user is not blacklisted.',
}

export enum ApplicationDoneButtonResponses {
  Failed = 'Error occurred, failed to send the application, please contact a mod.',
  Success = 'Application sent, please keep your DMs open so I can notify you on the state of your application.',
}

export const ApplicationDecisionModalFunctionResponses = Object.freeze({
  denied: (msg?: boolean, decisionSent?: boolean) =>
    `Application was denied${!msg ? '\nFailed to DM User.' : ''}${
      !decisionSent ? '\nFailed to send message to denied channel' : ''
    }`,
  accepted: (
    msg?: boolean,
    decisionSent?: boolean,
    addrole?: boolean,
    welcomemsg?: boolean,
  ) =>
    `Application was accepted${!msg ? '\nFailed to DM User.' : ''}${
      !decisionSent
        ? '\nFailed to send message to accepted applications channel'
        : ''
    }${!addrole ? '\nFailed to add the role to the user' : ''}${
      !welcomemsg ? '\nFailed to send welcome message' : ''
    }`,
});

export enum ApplicationInterceptorsResponses {
  ApplicationManagerNotFound = '<:BDFDCross:1022159458153017364> This is a application-manager only command!',
  ApplicationNotFound = 'I could not found any application in the database.',
  ApplicationNotActive = 'This application is not currently active.',
}

export enum QuestionCommandResponses {
  Added = 'Added the question to the database.',
  NotFound = 'Could not find any question with the provided ID.',
  NoQuestions = 'There are no questions to list.',
}

export const QuestionCommandFunctionResponses = Object.freeze({
  deleted: (id: string) => `Deleted question ${id}`,
  edited: (id: string) => `Edited question ${id}`,
});

export enum ReportModalResponses {
  Label = 'Report reason',
  Heading = 'New Report',
  ChannelNotFound = 'No report channel was found.',
  SentToReview = 'Sent your report to review, thank you.',
}

export const ReportEmbedFunctionResponses = Object.freeze({
  title: (tag: string) => `New report from ${tag}`,
  description: (targetUser: User, message: string, targetMsg?: Message) =>
    `Reported user: ${targetUser} (${targetUser.id})\n\nReason: ${message}${
      targetMsg ? `\n\nProof: [${targetMsg.content}](${targetMsg.url})` : ''
    }`,
});

export enum ButtonApplicationComponentResponses {
  Cancelled = 'Cancelled application process, Please re-apply',
}

export enum ApplicationReviewEmbedResponses {
  Title = 'New Application',
}

export enum ApplicationReviewModalResponses {
  AcceptLabel = 'Accept reason (Optional)',
  DenyLabel = 'Deny reason (Optional',
}
export const ApplicationReviewModalFunctionResponses = Object.freeze({
  acceptTitle: (id: bigint) => `Accept application ${id}`,
  denyTitle: (id: bigint) => `Accept application ${id}`,
});

export enum ApplicationApplyDashboardEmbedResponses {
  QuestionName = 'Question',
  AnswerName = 'Answer',
  FooterText = 'Press the Answer button to answer, you can edit your answers via the select menu, the application will time out after 40 minutes.',
  MissingAnswer = 'N/A',
}

export enum ApplicationApplyDashboardComponentsResponses {
  MissingAnswer = 'N/A',
  Cancel = 'Cancel',
  Answer = 'Answer',
  Done = 'Done',
  SelectPlaceholder = 'Choose a question to view',
}

export const ApplicationApplyDashboardComponentsFunctionResponses =
  Object.freeze({
    selectLabel: (num: number) => `Question ${num}`,
    selectDescription: (num: number) => `Click to view question ${num}`,
  });

export const ApplicationApplyDashboardModalFunctionResponses = Object.freeze({
  title: (num: number) => `Question ${num}`,
});

export enum ApplicationCommandListEmbedResponses {
  Title = 'Applications list',
}

export const ApplicationCommandListEmbedFunctionResponses = Object.freeze({
  description: (count: number, state: ApplicationState, page: number) =>
    `There are currently \`${count}\` applications \`${state}\`, page \`${page}/${
      count > 125 ? Math.ceil(count / 100) : 1
    }\``,
});

export enum ApplicationListCommandComponentsResponses {
  Placeholder = 'Select an application to view',
}

export const ApplicationListCommandComponentsFunctionResponses = Object.freeze({
  selectLabel: (userid: bigint | string) => `Application from ${userid}`,
  selectDescription: (userid: bigint | string) =>
    `Click to view the application of ${userid}`,
});

export enum ApplicationExpireResponses {
  Expired = 'Application timed out, components will no longer respond.',
}

export const ApplicationExpireFunctionResponses = Object.freeze({
  expireIn: (seconds: number) =>
    `Reminder: The application will time out in **${(seconds / 60).toFixed(
      1,
    )} minutes**`,
});
