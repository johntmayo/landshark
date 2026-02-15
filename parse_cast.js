const fs = require('fs');
const html = fs.readFileSync('C:/projects/SNL/snl cast.html', 'utf8');

// Split into table rows
const rows = html.split('<tr>').slice(1); // skip header

const castMembers = [];
let currentMember = null;

for (const row of rows) {
  // Check if this row has a <th> with a performer name
  const nameMatch = row.match(/data-sort-value="([^"]+)"/);
  const rowspanMatch = row.match(/rowspan="(\d+)"/);

  if (nameMatch) {
    // Extract display name from link text or use data-sort-value
    const linkMatch = row.match(/<a[^>]*>([^<]+)<\/a>\s*<\/span><\/span><\/span>/);
    const sortValue = nameMatch[1];
    // Convert "Last, First" to "First Last"
    const parts = sortValue.split(', ');
    const displayName = linkMatch ? linkMatch[1] : (parts.length === 2 ? parts[1] + ' ' + parts[0] : sortValue);

    const numStints = rowspanMatch ? parseInt(rowspanMatch[1]) : 1;

    // Extract start/end years from this row
    const stint = extractStint(row);

    // Extract seasons and flags (they may have rowspan)
    const tds = extractTds(row);
    // For a name row, skip the first td(s) that are start/end, then get seasons, repertory, featured, middle, weekendUpdate, hosted, bestOf, writer

    // Determine how many td cells are for start/end
    const hasColspan = row.includes('colspan="2"');
    let dataStart = hasColspan ? 1 : 2; // number of td cells used for start/end

    const remainingTds = tds.slice(dataStart);

    const seasons = parseInt(remainingTds[0]) || 0;
    const repertory = (remainingTds[1] || '').trim() === 'X';
    const featured = (remainingTds[2] || '').trim() === 'X';
    // skip middle group (index 3)
    const weekendUpdate = (remainingTds[4] || '').trim() === 'X';

    currentMember = {
      name: displayName,
      stints: [stint],
      seasons: seasons,
      repertory: repertory,
      featured: featured,
      weekendUpdate: weekendUpdate,
      _remainingStints: numStints - 1
    };
    castMembers.push(currentMember);
  } else if (currentMember && currentMember._remainingStints > 0) {
    // This is an additional stint row
    const stint = extractStint(row);
    if (stint) {
      currentMember.stints.push(stint);
      currentMember._remainingStints--;
    }
  }
}

// Clean up internal tracking field
for (const m of castMembers) {
  delete m._remainingStints;
}

function extractStint(row) {
  const hasColspan = row.includes('colspan="2"');
  if (hasColspan) {
    // Single year stint
    const yearMatch = row.match(/colspan="2"[^>]*><a[^>]*>(\d{4})<\/a>/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      return { start: year, end: year };
    }
    return null;
  }

  // Look for start and end years in td cells
  const tdPattern = /<td[^>]*>(?:<a[^>]*>)?(\d{4}|present)(?:<\/a>)?\s*<\/td>/g;
  const years = [];
  let match;
  while ((match = tdPattern.exec(row)) !== null) {
    years.push(match[1]);
  }

  if (years.length >= 2) {
    const start = parseInt(years[0]);
    const end = years[1] === 'present' ? 2026 : parseInt(years[1]);
    return { start, end };
  } else if (years.length === 1) {
    // Could be a continuation stint row with just start/end
    const start = parseInt(years[0]);
    // Check if there's a "present"
    if (row.includes('>present<') || row.match(/>present\s*</)) {
      return { start, end: 2026 };
    }
    return { start, end: start };
  }

  return null;
}

function extractTds(row) {
  const results = [];
  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
  let match;
  while ((match = tdRegex.exec(row)) !== null) {
    // Strip HTML tags and trim
    const text = match[1].replace(/<[^>]*>/g, '').trim();
    results.push(text);
  }
  return results;
}

// Output
console.log('const snlCastMembers = ' + JSON.stringify(castMembers, null, 2) + ';');
