import { EmbedBuilder, ColorResolvable, APIEmbedField } from 'discord.js';

interface EmbedOptions {
  title?: string;
  description?: string;
  color?: ColorResolvable;
  fields?: APIEmbedField[];
  footer?: string;
}

export function buildEmbed({
  title,
  description,
  color = '#5865F2',
  fields,
  footer,
}: EmbedOptions) {
  const embed = new EmbedBuilder();
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (color) embed.setColor(color);
  if (fields && fields.length) embed.addFields(fields);
  if (footer) embed.setFooter({ text: footer });
  return embed;
}

export function parseHexColor(input?: string) {
  if (!input) return undefined;
  const hex = input.trim();
  return /^#?[0-9a-fA-F]{6}$/.test(hex) ? (hex.startsWith('#') ? hex : `#${hex}`) : undefined;
}
