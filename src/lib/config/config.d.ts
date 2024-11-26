export interface Config {
    channels: ChannelConfig;
    roles: RoleConfig;
    support_tags: SupportTagsConfig;
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
    tips: string;
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

export interface CategoriesConfig {
    tickets: string;
}