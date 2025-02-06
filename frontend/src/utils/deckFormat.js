import { SEPARATORS, isDashLike } from '../constants/separators';

// Functions for consistent formatting
export const splitLine = (line) => {
  // Try with regex that handles all dash types
  const parts = line.split(SEPARATORS.INPUT_REGEX);

  // If we got multiple parts, return them trimmed
  if (parts.length > 1) {
    return parts.map((part) => part.trim());
  }

  // If split failed, return original line as single part
  return [line.trim()];
};

export const joinLine = (items) => items.join(SEPARATORS.OUTPUT);

export const formatDeckContent = (headers, data) => {
  const headerLine = joinLine(headers);
  const dataLines = data.map((row) =>
    joinLine(headers.map((header) => row[header] || ''))
  );
  return [headerLine, ...dataLines].join('\n');
};

const findSeparator = (lines) => {
  // Skip header, take up to 10 data lines
  const dataLines = lines.slice(1, Math.min(11, lines.length));
  if (dataLines.length === 0) {
    throw new Error('No data lines found');
  }

  // Find all non-alphanumeric, non-whitespace characters in each line
  const potentialSeparators = dataLines.map((line) =>
    [...line].filter((char) => {
      const code = char.charCodeAt(0);
      return !(
        (
          (code >= 48 && code <= 57) || // numbers
          (code >= 65 && code <= 90) || // uppercase
          (code >= 97 && code <= 122) || // lowercase
          code === 32
        ) // space
      );
    })
  );

  // Find characters that appear in all analyzed lines
  const commonSeparators = potentialSeparators.reduce(
    (common, chars, index) => {
      if (index === 0) return new Set(chars);
      return new Set([...common].filter((char) => chars.includes(char)));
    },
    new Set()
  );

  const separators = [...commonSeparators];

  if (separators.length === 0) {
    throw new Error('No separator found in data lines');
  }

  if (separators.length === 1) {
    return separators[0];
  }

  // Multiple separators found, look for a dash-like character
  const dashSeparator = separators.find(isDashLike);
  if (dashSeparator) {
    return dashSeparator;
  }

  throw new Error(
    'Multiple separators found and none is dash-like. Please use a consistent separator.'
  );
};

export const parseDeckContent = (content) => {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    throw new Error(
      'Please provide at least two lines: one for headers and one for data.'
    );
  }

  const [headerLine, ...rows] = lines;
  const separator = findSeparator(lines);

  // Try the found separator on header
  let headers = headerLine.split(separator).map((h) => h.trim());

  // If separator didn't work well on header, try dash characters
  if (headers.length < 2 || headers.some((h) => !h)) {
    for (const dash of SEPARATORS.DASH_CHARS) {
      const parts = headerLine.split(dash).map((h) => h.trim());
      if (parts.length >= 2 && parts.every((p) => p)) {
        headers = parts;
        break;
      }
    }
  }

  // If still no valid split, throw error
  if (headers.length < 2 || headers.some((h) => !h)) {
    throw new Error('Could not find a valid separator in the header row');
  }

  const data = rows.map((row) => {
    const values = row.split(separator).map((v) => v.trim());
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] || '';
      return acc;
    }, {});
  });

  return { headers, data };
};
