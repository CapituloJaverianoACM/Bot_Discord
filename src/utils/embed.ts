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

/**
 * Parsea y valida un código de color hexadecimal
 * @param {string} [input] - Color en formato hex (con o sin #)
 * @returns {string | undefined} Color hex válido con # o undefined si es inválido
 * @example
 * parseHexColor("5865F2") // "#5865F2"
 * parseHexColor("#FF0000") // "#FF0000"
 * parseHexColor("invalid") // undefined
 */
export function parseHexColor(input?: string) {
  if (!input) return undefined;
  const hex = input.trim();
  return /^#?[0-9a-fA-F]{6}$/.test(hex) ? (hex.startsWith('#') ? hex : `#${hex}`) : undefined;
}
