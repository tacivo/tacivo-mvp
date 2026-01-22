/**
 * Utility functions for BlockNote content manipulation
 */

/**
 * Extracts plain text from BlockNote JSON format
 * Removes all formatting and returns just the text content
 */
export function extractPlainTextFromBlockNote(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks)) {
    return '';
  }

  const textParts: string[] = [];

  for (const block of blocks) {
    // Extract text from content array
    if (block.content && Array.isArray(block.content)) {
      const blockText = block.content
        .map((item: any) => item.text || '')
        .join('');

      if (blockText.trim()) {
        textParts.push(blockText.trim());
      }
    }

    // Recursively handle nested blocks (like lists, quotes, etc.)
    if (block.children && Array.isArray(block.children)) {
      const childrenText = extractPlainTextFromBlockNote(block.children);
      if (childrenText.trim()) {
        textParts.push(childrenText.trim());
      }
    }
  }

  return textParts.join('\n\n');
}

/**
 * Extracts plain text from BlockNote JSON string
 */
export function extractPlainTextFromBlockNoteString(blockNoteJson: string): string {
  try {
    const blocks = JSON.parse(blockNoteJson);
    return extractPlainTextFromBlockNote(blocks);
  } catch (error) {
    console.error('Error parsing BlockNote JSON:', error);
    return '';
  }
}
