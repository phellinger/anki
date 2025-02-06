// Separator configuration
export const SEPARATORS = {
  // For parsing input (accepts multiple types of dashes)
  INPUT_REGEX: /\s*[-–—]\s*/, // hyphen, en dash, em dash

  // The exact en dash character we're seeing in the file
  EN_DASH: '–',

  // For displaying and exporting (consistent format)
  OUTPUT: ' - ',
};

// Functions for consistent formatting
export const splitLine = (line) => {
  const parts = line.split(SEPARATORS.INPUT_REGEX);

  if (parts.length > 1 || !line.includes(SEPARATORS.EN_DASH)) {
    return parts;
  }

  const enDashParts = line.split(SEPARATORS.EN_DASH).map((part) => part.trim());
  return enDashParts;
};

export const joinLine = (items) => items.join(SEPARATORS.OUTPUT);

export const formatDeckContent = (headers, data) => {
  const headerLine = joinLine(headers);
  const dataLines = data.map((row) =>
    joinLine(headers.map((header) => row[header] || ''))
  );
  return [headerLine, ...dataLines].join('\n');
};

export const parseDeckContent = (content) => {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    throw new Error(
      'Please provide at least two lines: one for headers and one for data.'
    );
  }

  const [headerLine, ...rows] = lines;
  const headers = splitLine(headerLine);

  const data = rows.map((row) => {
    const values = splitLine(row);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index]?.trim() || '';
      return acc;
    }, {});
  });

  return { headers, data };
};
