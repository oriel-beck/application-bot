import { container } from "@sapphire/framework";
import type { APIGuildMember, GuildMember } from "discord.js";

export const isMod = (member: GuildMember | APIGuildMember) => Array.isArray(member.roles) ? member.roles.includes(container.config.roles.mod) : member.roles.cache.has(container.config.roles.mod);