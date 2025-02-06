export const SEPARATORS = {
  OUTPUT: ' - ', // Simple hyphen for output
  DASH_CHARS: ['-', '–', '—'], // hyphen, en dash, em dash
};

export const isDashLike = (char) => SEPARATORS.DASH_CHARS.includes(char);
