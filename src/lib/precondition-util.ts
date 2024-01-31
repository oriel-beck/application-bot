import type { APIGuildMember, GuildMember } from "discord.js";

export const hasRole = (member: GuildMember | APIGuildMember, role: string) => Array.isArray(member.roles) ? member.roles.includes(role) : member.roles.cache.has(role);
