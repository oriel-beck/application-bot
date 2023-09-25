import { ActionRowBuilder, Colors, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { ApplicationCustomIDs } from "../../../constants/custom-ids.js";
import type { ApplicationStateKeys } from "../../../constants/application.js";
import type { types } from "cassandra-driver";

// TODO: pagination
export function generateApplicationListEmbed(count: number, state: ApplicationStateKeys) {
    return [
        new EmbedBuilder()
            .setTitle('Application list')
            .setDescription(`There are currently \`${count}\` \`${state}\` applications`)
            .setColor(Colors.Aqua)
    ];
}


export function generateApplicationListComponents(applications: types.Row[]) {
    const amount = Math.ceil(applications.length / 25);
    return Array.from({ length: amount }, (_, i) => new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(generateStringSelectMenu(i, applications.splice(i * 25, i * 25 + 25))));
}

function generateStringSelectMenu(index: number, applications: types.Row[]) {
    return new StringSelectMenuBuilder()
        .setCustomId(`${ApplicationCustomIDs.selects!.list}-${index}`)
        .setMaxValues(1)
        .setMinValues(1)
        .setPlaceholder('Select an application to view')
        .addOptions(applications.map(mapApplicationToStringSelectMenuOption));
}

function mapApplicationToStringSelectMenuOption(application: types.Row): StringSelectMenuOptionBuilder {
    return new StringSelectMenuOptionBuilder().setLabel(`View Application ${application.user}`).setValue(application.user.toString());
}
