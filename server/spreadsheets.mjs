import ExcelJS from 'exceljs';

function cellValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (!value || typeof value !== 'object') return value ?? '';
  if ('result' in value) return cellValue(value.result);
  if ('richText' in value) return value.richText.map(part => part.text).join('');
  if ('text' in value) return value.text;
  return '';
}

export async function spreadsheet(buffer, options = {}) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheets = workbook.worksheets.map(sheet => sheet.name);
  if (options.sheet && !sheets.includes(options.sheet)) throw new Error(`Sheet "${options.sheet}" was not found. Available: ${sheets.join(', ')}.`);
  const headerRow = Number(options.headerRow || 1);
  if (!Number.isInteger(headerRow) || headerRow < 1 || headerRow > 100) throw new Error('Header row must be between 1 and 100.');
  const rows = [], columns = {};
  for (const sheet of workbook.worksheets.filter(sheet => !options.sheet || sheet.name === options.sheet)) {
    const used = new Set();
    const headers = Array.from({ length: sheet.columnCount }, (_, index) => {
      const base = String(cellValue(sheet.getRow(headerRow).getCell(index + 1).value)).trim() || `column_${index + 1}`;
      let key = base, suffix = 2;
      while (used.has(key)) key = `${base}_${suffix++}`;
      used.add(key); return key;
    });
    columns[sheet.name] = headers;
    sheet.eachRow((row, index) => {
      if (index <= headerRow) return;
      const values = headers.map((_, column) => cellValue(row.getCell(column + 1).value));
      if (values.every(value => value === '')) return;
      rows.push({ fields: Object.fromEntries(headers.map((key, column) => [key, values[column]])), sheet: sheet.name, row: index, values });
    });
  }
  if (!options.preview && rows.length > 500) throw new Error('The selected sheets contain more than 500 rows. Select a smaller sheet or split the file.');
  return { sheets, columns, rows, headerRow };
}
