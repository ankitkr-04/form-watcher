export class ContentNormalizer {
  static normalizeHtml(html: string): string {
    return html
      .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/>\s+</g, '><') // Remove whitespace between tags
      .trim();
  }

  static normalizeText(
    text: string,
    normalizeOptions?: { stripWhitespace: boolean; toLowerCase: boolean }
  ): string {
    if (normalizeOptions?.stripWhitespace) {
      text = text.replace(/\s+/g, ' ').trim();
    }
    if (normalizeOptions?.toLowerCase) {
      text = text.toLowerCase();
    }
    return text;
  }
}
