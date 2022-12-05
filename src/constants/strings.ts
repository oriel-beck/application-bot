import { User } from 'discord.js';

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
