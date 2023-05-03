export interface Config {
    channels: ChannelConfig;
    roles: RoleConfig;
}

export interface ChannelConfig {
    pending: string;
    denied: string;
    accepted: string;
    report: string;
}

export interface RoleConfig {
    mod: string;
    trial_support: string;
}
