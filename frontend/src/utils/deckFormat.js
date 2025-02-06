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
  console.log('Original line:', line);
  console.log('Contains en dash:', line.includes(SEPARATORS.EN_DASH));
  console.log(
    'Line characters:',
    Array.from(line).map((c) => c.charCodeAt(0))
  );

  const parts = line.split(SEPARATORS.INPUT_REGEX);
  console.log('After regex split:', parts);

  if (parts.length > 1 || !line.includes(SEPARATORS.EN_DASH)) {
    return parts;
  }

  const enDashParts = line.split(SEPARATORS.EN_DASH).map((part) => part.trim());
  console.log('After en dash split:', enDashParts);

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
