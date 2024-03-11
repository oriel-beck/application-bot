import { container } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder } from "discord.js";

export function generatePostHelpEmbed(appliedTags: string[]) {
    const mainTags = [container.config.support_tags.code_error, container.config.support_tags.wiki_error, container.config.support_tags.question] as const;
    const complex = container.config.support_tags.complex;

    let warning: string | undefined;
    const amountOfMainTags = mainTags.reduce((current, value) => appliedTags.includes(value) ? current + 1 : current, 0);
    if (!amountOfMainTags) warning = "You cannot have a post without the tags `code error`, `wiki error` or `question`, please apply the appropriate tag to your post";
    if (amountOfMainTags > 1) warning = "You cannot have a post with multiple topic tags, please use `code error`, `wiki error` or `question` alone, you can add the `complex` tag alongside it if you feel like your issue is complex.";

    const embed = new EmbedBuilder().setTitle("BDFD Post support").setColor(Colors.Blurple);
    if (warning) embed.setDescription(`⚠️ ${warning}`);
    if (appliedTags.includes(mainTags[0])) embed.addFields({
        name: "Code error",
        value: "` ● ` Please send your code as a code block (\\`\\`\\`), not as a screenshot.\n` ● ` Please provide the exact error you're facing.\n` ● ` If your bot tells you where the error is, please make sure to check there before making a post."
    });
    if (appliedTags.includes(mainTags[1])) embed.addFields({
        name: "Wiki error",
        value: "` ● ` Please send your code as a code block (\\`\\`\\`), not as a screenshot.\n` ● ` Please provide the exact error you're facing.\n` ● ` If your bot tells you where the error is, please make sure to check there before making a post.\n` ● ` Please send a link to the wiki you got the code from.\n` ● ` Please make sure you followed all of the instructions of the wiki.\n` ● ` We recommend mentioning the wiki's uploader for help, as they have more insight about the wiki.\nThis tag is *only* for support with errors caused by codes from <#572486432384352268>, not for requesting code."
    });
    if (appliedTags.includes(mainTags[2])) embed.addFields({
        name: "Question",
        value: "` ● ` Make sure your question is easy to read.\n` ● ` Check <#567724334278508554> to see if someone already answered your question."
    });
    if (appliedTags.includes(complex)) embed.setDescription(embed.data.description || "" + "\nIf you mark your post as **Complex**, this means your code is confusing for an average user to understand. You have a higher chance of not receiving a response, however. If this happens, please make a ticket using </new:806148472058281984>.");
    embed.setFooter({
        text: "Do not try to hoist your post in any channel in the server, this is against our rules and you will receive a warning if you do so."
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
        new ButtonBuilder()
            .setCustomId(`toggletag-${container.config.support_tags.code_error}`)
            .setLabel("Code error")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`toggletag-${container.config.support_tags.wiki_error}`)
            .setLabel("Wiki error")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`toggletag-${container.config.support_tags.question}`)
            .setLabel("Question")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`toggletag-${container.config.support_tags.complex}`)
            .setLabel("Complex")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`supportpost-${container.config.support_tags.resolved}`)
            .setLabel("Reolve")
            .setStyle(ButtonStyle.Success)
    ]);
    return {
        row,
        embed
    }
}