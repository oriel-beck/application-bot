import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { MessageFlags, type AutocompleteInteraction } from 'discord.js';
import { getAiCommandDenial } from '@lib/bdfd-ai/ai-command-access.js';
import { processAiRequest } from '@lib/bdfd-ai/process-request.js';
import type { WikiPageKind, WikiSearchHit } from '@lib/bdfd-ai/wiki-page-index.js';
import {
  buildNoResultsEmbed,
  buildSearchChoices,
  buildSearchResultEmbed,
  resolvePickedResult,
  SEARCH_RESULT_LIMIT
} from '@lib/command-utils/bdfd-ai/search.utils.js';

/** Below this, a multi-word query is probably a question the title search can't answer. */
const WEAK_TITLE_MATCH = 0.8;
const AUTOCOMPLETE_LIMIT = 25;

/** The optional `type` option: guides only, function references only, or both when unset. */
function kindOption(options: { getString(name: string): string | null }): WikiPageKind | undefined {
  const value = options.getString('type');
  return value === 'guide' || value === 'function' ? value : undefined;
}

@ApplyOptions<Subcommand.Options>({
  name: 'search',
  description: 'Search the BDFD wiki, or ask the AI a question about it.',
  cooldownDelay: 5000,
  subcommands: [
    { name: 'wiki', chatInputRun: 'wiki' },
    { name: 'ai', chatInputRun: 'ai' }
  ]
})
export class SearchCommand extends Subcommand {
  public async wiki(interaction: Subcommand.ChatInputCommandInteraction) {
    const query = interaction.options.getString('query', true).trim();
    const kind = kindOption(interaction.options);
    const index = await this.container.rag.getWikiIndex();
    if (index.size === 0) {
      return interaction.reply({
        content: 'Wiki search is unavailable right now — the wiki has not been indexed yet.',
        flags: MessageFlags.Ephemeral
      });
    }

    const picked = resolvePickedResult(query, index);
    if (picked) {
      return interaction.reply({ embeds: [buildSearchResultEmbed(picked, [], index)] });
    }

    await interaction.deferReply();
    const hits = await this.findPages(query, kind);
    const [best, ...others] = hits;
    if (!best) {
      return interaction.editReply({ embeds: [buildNoResultsEmbed(query)] });
    }
    return interaction.editReply({ embeds: [buildSearchResultEmbed(best, others, index)] });
  }

  public async ai(interaction: Subcommand.ChatInputCommandInteraction) {
    const denial = await getAiCommandDenial(interaction, '/search ai');
    if (denial) {
      return interaction.reply({ content: denial, flags: MessageFlags.Ephemeral });
    }

    const question = interaction.options.getString('question', true).trim();
    if (!question) {
      return interaction.reply({ content: 'Please provide a question.', flags: MessageFlags.Ephemeral });
    }

    return processAiRequest({
      container: this.container,
      channelId: interaction.channelId,
      userText: question,
      source: { type: 'interaction', interaction },
      ignoreAiEnabled: true,
      skipChannelTracking: true,
      wikiQuestion: true
    });
  }

  public override async autocompleteRun(interaction: AutocompleteInteraction) {
    const query = interaction.options.getFocused().trim();
    const hits = this.container.rag.wikiPageIndex.search(query, AUTOCOMPLETE_LIMIT, kindOption(interaction.options));
    return interaction.respond(buildSearchChoices(hits)).catch(() => null);
  }

  /**
   * Fuzzy title/heading search first (partial + misspelled names). Embedding search fills in
   * when that finds nothing, or when a longer query only matched weakly ("how do I make a
   * leaderboard" isn't a page title).
   */
  private async findPages(query: string, kind: WikiPageKind | undefined): Promise<WikiSearchHit[]> {
    const index = this.container.rag.wikiPageIndex;
    const titleHits = index.search(query, SEARCH_RESULT_LIMIT, kind);
    const looksLikeQuestion = query.split(/\s+/).length >= 3 && (titleHits[0]?.score ?? 0) < WEAK_TITLE_MATCH;
    if (titleHits.length && !looksLikeQuestion) return titleHits;

    const semanticHits = await this.container.rag.semanticWikiSearch(query, SEARCH_RESULT_LIMIT, kind).catch((err) => {
      console.error('[bdfd-ai] Semantic wiki search failed:', err);
      return [];
    });

    const seen = new Set<string>();
    return [...semanticHits, ...titleHits]
      .filter((hit) => !seen.has(hit.page.file) && seen.add(hit.page.file))
      .slice(0, SEARCH_RESULT_LIMIT);
  }

  public override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDMPermission(false)
        .addSubcommand((sub) =>
          sub
            .setName('wiki')
            .setDescription('Find a wiki guide or function page — partial names and typos work.')
            .addStringOption((option) =>
              option
                .setName('query')
                .setDescription('A function, page or topic, e.g. $textSplit or slash commands')
                .setRequired(true)
                .setMaxLength(200)
                .setAutocomplete(true)
            )
            .addStringOption((option) =>
              option
                .setName('type')
                .setDescription('Only guides or only function references (default: both)')
                .addChoices({ name: 'Guides', value: 'guide' }, { name: 'Functions', value: 'function' })
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('ai')
            .setDescription('Ask the AI a question about the wiki.')
            .addStringOption((option) =>
              option
                .setName('question')
                .setDescription('Your question, e.g. how do variables work?')
                .setRequired(true)
                .setMaxLength(1000)
            )
        )
    );
  }
}
