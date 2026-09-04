export interface Config {
  channels: ChannelConfig;
  roles: RoleConfig;
  support_tags: SupportTagsConfig;
  international_support_tags: InternationalSupportTagsConfig;
  bug_report_tags: BugReportTagsConfig;
  categories: CategoriesConfig;
  guild: string;
}

export interface ChannelConfig {
  pending: string;
  denied: string;
  accepted: string;
  report: string;
  staff: string;
  support: string;
  international_support: string;
  bug_reports: string;
  tips: string;
  variable_guides?: string;
  limiter_guides?: string;
  faq?: string;
  bot_commands_1?: string;
  bot_commands_2?: string;
  wiki: string;
  share_your_bot: string;
}

export interface RoleConfig {
  mod: string;
  trial_support: string;
  required_role: string;
  staff: string;
}

export interface SupportTagsConfig {
  resolved: string;
  complex: string;
  question: string;
  code_error: string;
  wiki_error: string;
}

export interface InternationalSupportTagsConfig {
  resolved: string;
  turkish: string;
  russian: string;
  french: string;
  spanish: string;
  portuguese: string;
  arabic: string;
  german: string;
  dutch: string;
  hindi: string;
  polish: string;
  italian: string;
  czech: string;
  greek: string;
  hungarian: string;
  other: string;
}

export interface BugReportTagsConfig {
  resolved: string;
  website: string;
  app: string;
  bdl: string;
  bdfd_wiki: string;
  flowcharts: string;
  not_a_bug: string;
}

export interface CategoriesConfig {
  tickets: string;
}
