/**
 * Hybrid Format DSL Parser
 * Parses DSL syntax into format blocks
 */

import {
  FormatBlock,
  FormatBlockType,
  ParsedDSL,
  DSLToken,
  DEFAULT_STYLES,
  BlockStyle,
  BeatAction,
} from './hybrid-types';

/**
 * DSL Parser for hybrid format
 *
 * Syntax:
 * @keyword Text content
 * @bullet Item text
 * @code Code snippet
 * @error Error message
 * @success Success message
 * @cta Call to action
 * @heading Heading text
 * @quote Quote text
 * @warning Warning message
 * Plain text without prefix
 */
export class DSLParser {
  private blockCounter = 0;

  /**
   * Parse DSL string into format blocks
   */
  parse(dslContent: string): ParsedDSL {
    const blocks: FormatBlock[] = [];
    const errors: Array<{ line: number; message: string }> = [];
    const warnings: Array<{ line: number; message: string }> = [];

    const lines = dslContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;

      // Skip empty lines
      if (!line) continue;

      // Skip comments
      if (line.startsWith('//') || line.startsWith('#')) continue;

      try {
        const block = this.parseLine(line, lineNumber);
        if (block) {
          blocks.push(block);
        }
      } catch (error) {
        errors.push({
          line: lineNumber,
          message: error instanceof Error ? error.message : 'Parse error',
        });
      }
    }

    return { blocks, errors, warnings };
  }

  /**
   * Parse a single line into a format block
   */
  private parseLine(line: string, lineNumber: number): FormatBlock | null {
    // Check if line starts with block type marker
    if (line.startsWith('@')) {
      const match = line.match(/^@(\w+)\s+(.+)$/);
      if (!match) {
        throw new Error('Invalid block syntax');
      }

      const [, type, content] = match;
      const blockType = type as FormatBlockType;

      // Validate block type
      if (!this.isValidBlockType(blockType)) {
        throw new Error(`Unknown block type: ${type}`);
      }

      return this.createBlock(blockType, content, lineNumber);
    }

    // Plain text
    return this.createBlock('text', line, lineNumber);
  }

  /**
   * Create a format block
   */
  private createBlock(
    type: FormatBlockType,
    content: string,
    lineNumber: number
  ): FormatBlock {
    const id = `block-${++this.blockCounter}`;
    const style = { ...DEFAULT_STYLES[type] };
    const beatAction = style.animation || 'fade-in';

    return {
      id,
      type,
      content: content.trim(),
      style,
      beatAction: beatAction as BeatAction,
      metadata: {
        lineNumber,
      },
    };
  }

  /**
   * Check if block type is valid
   */
  private isValidBlockType(type: string): type is FormatBlockType {
    const validTypes: FormatBlockType[] = [
      'keyword',
      'bullet',
      'code',
      'error',
      'success',
      'cta',
      'heading',
      'text',
      'quote',
      'warning',
    ];

    return validTypes.includes(type as FormatBlockType);
  }

  /**
   * Reset block counter
   */
  reset(): void {
    this.blockCounter = 0;
  }
}

/**
 * Parse DSL content
 */
export function parseDSL(content: string): ParsedDSL {
  const parser = new DSLParser();
  return parser.parse(content);
}

/**
 * Validate DSL syntax without parsing
 */
export function validateDSL(content: string): {
  valid: boolean;
  errors: Array<{ line: number; message: string }>;
} {
  const result = parseDSL(content);
  return {
    valid: result.errors.length === 0,
    errors: result.errors,
  };
}

/**
 * Format a block for display
 */
export function formatBlock(block: FormatBlock): string {
  const prefix = block.type !== 'text' ? `@${block.type} ` : '';
  return `${prefix}${block.content}`;
}

/**
 * Convert blocks back to DSL
 */
export function blocksToDSL(blocks: FormatBlock[]): string {
  return blocks.map(formatBlock).join('\n');
}

/**
 * Tokenize DSL content
 */
export function tokenizeDSL(content: string): DSLToken[] {
  const tokens: DSLToken[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('//') || line.startsWith('#')) continue;

    const lineNumber = i + 1;

    if (line.startsWith('@')) {
      const match = line.match(/^@(\w+)\s+(.+)$/);
      if (match) {
        const [, type, content] = match;
        tokens.push({
          type: type as FormatBlockType,
          content: content.trim(),
          line: lineNumber,
          column: 1,
        });
      }
    } else {
      tokens.push({
        type: 'text',
        content: line,
        line: lineNumber,
        column: 1,
      });
    }
  }

  return tokens;
}
