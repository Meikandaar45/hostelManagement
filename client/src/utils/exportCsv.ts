/**
 * Browser-friendly CSV export utility.
 * Properly escapes commas, double quotes, and line breaks according to RFC 4180.
 */

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
}

export function exportToCsv<T>(filename: string, columns: CsvColumn<T>[], data: T[]): void {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) {
      return '""';
    }
    const str = String(val);
    // Escape internal quotes by doubling them
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const headerRow = columns.map((c) => escapeCell(c.header)).join(',');
  const dataRows = data.map((row) =>
    columns.map((c) => escapeCell(c.accessor(row))).join(',')
  );

  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
