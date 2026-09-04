export const ApplyCustomIDs = Object.freeze({
  buttons: {
    cancel: 'apply:btn:cancel',
    done: 'apply:btn:done',
    answer: 'apply:btn:answer'
  },
  modals: {
    answer: 'apply:mdl:answer'
  },
  selects: {
    edit: 'apply:sel:edit'
  }
});

export const ApplicationCustomIDs = Object.freeze({
  buttons: {
    denied: 'app:dec:btn:denied',
    accepted: 'app:dec:btn:accepted',
    paginate: 'app:view:page',
    page: 'app:view:indicator',
    listDir: 'app:list:dir'
  },
  selects: {
    list: 'app:list:sel'
  },
  modals: {
    decide: 'app:dec:mdl'
  }
});

export const QuestionCustomIDs = Object.freeze({
  buttons: {
    edit: 'q:btn:edit',
    delete: 'q:btn:del',
    page: 'q:page',
    listDir: 'q:list:dir'
  },
  selects: {
    list: 'q:list:sel'
  },
  modals: {
    edit: 'q:mdl:edit'
  }
});

export const ReportCustomIDs = Object.freeze({
  buttons: {
    resolve: 'rpt:btn:resolve',
    delete: 'rpt:btn:delete'
  },
  modals: {
    report: 'rpt:mdl'
  }
});

/** Forums module — not loaded from this file in augments; keep prefixes stable. */
export const ForumCustomIDs = Object.freeze({
  toggleTag: 'forum:tag',
  supportResolve: 'forum:support'
});

export const ShareCustomIDs = Object.freeze({
  stickyAdditions: 'share:sticky:additions'
});

/** Transcript list browser (Components V2). */
export const TranscriptCustomIDs = Object.freeze({
  buttons: {
    listDir: 'tr:list:dir',
    export: 'tr:list:exp',
    delete: 'tr:list:del'
  }
});

/** AI conversation list browser (Components V2). */
export const AiConversationCustomIDs = Object.freeze({
  buttons: {
    listDir: 'ai:list:dir',
    reset: 'ai:list:rst',
    delete: 'ai:list:del'
  }
});
