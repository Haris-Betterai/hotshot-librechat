import type { ReviewPage } from 'librechat-data-provider';

const EXPORT_PAGE = 200;
const EXPORT_MAX_PAGES = 50;
/** Lets Excel read the file as UTF-8. */
const BOM = String.fromCharCode(0xfeff);

const cell = (value: unknown): string => {
  const text = value == null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** CSV text with a header row; `columns` maps header → value getter. */
export function toCsv<T>(rows: T[], columns: Array<[string, (row: T) => unknown]>): string {
  const header = columns.map(([name]) => cell(name)).join(',');
  const body = rows.map((row) => columns.map(([, get]) => cell(get(row))).join(','));
  return [header, ...body].join('\r\n');
}

/** Walks every page of a cursor-paged list, up to 10,000 rows. */
export async function fetchAll<T>(
  load: (params: { cursor?: string; limit: number }) => Promise<ReviewPage<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < EXPORT_MAX_PAGES; i++) {
    const page = await load({ cursor, limit: EXPORT_PAGE });
    rows.push(...page.items);
    cursor = page.nextCursor;
    if (!cursor) {
      break;
    }
  }
  return rows;
}

export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([`${BOM}${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
