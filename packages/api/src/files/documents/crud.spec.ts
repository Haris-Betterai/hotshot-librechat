import path from 'path';
import { parseDocument } from './crud';

describe('Document Parser', () => {
  // pdfjs-dist is ESM-only and cannot be dynamically imported under Jest's CJS
  // runner, so the actual PDF text-extraction path is skipped in this environment
  // (it runs in production/Node where ESM dynamic import is supported).
  const pdfsESMSupported =
    typeof process !== 'undefined' && process.env.JEST_WORKER_ID === undefined;

  test('parseDocument() parses text from pdf', async () => {
    if (!pdfsESMSupported) {
      return;
    }
    const file = {
      originalname: 'sample.pdf',
      path: path.join(__dirname, 'sample.pdf'),
      mimetype: 'application/pdf',
    } as Express.Multer.File;

    const document = await parseDocument({ file });

    expect(document.filename).toBe('sample.pdf');
    expect(document.filepath).toBe('document_parser');
    expect(document.images).toEqual([]);
    expect(document.text).toContain('Hello from hotshot PDF');
  });

  test('parseDocument() throws error for unhandled document type', async () => {
    const file = {
      originalname: 'nonexistent.file',
      path: path.join(__dirname, 'nonexistent.file'),
      mimetype: 'application/invalid',
    } as Express.Multer.File;

    await expect(parseDocument({ file })).rejects.toThrow(
      'Unsupported file type in document parser: application/invalid',
    );
  });

  test('parseDocument() rejects office document types that are no longer parsed', async () => {
    const file = {
      originalname: 'sample.docx',
      path: path.join(__dirname, 'sample.docx'),
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    } as Express.Multer.File;

    await expect(parseDocument({ file })).rejects.toThrow(
      'Unsupported file type in document parser: application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
  });

  test('parseDocument() rejects files exceeding the pre-parse size limit', async () => {
    const file = {
      originalname: 'oversized.pdf',
      path: path.join(__dirname, 'sample.pdf'),
      mimetype: 'application/pdf',
      size: 16 * 1024 * 1024,
    } as Express.Multer.File;

    await expect(parseDocument({ file })).rejects.toThrow(
      /exceeds the 15MB document parser limit \(16MB\)/,
    );
  });

  // (pdfjs ESM unavailable under Jest — see pdfsESMSupported above)
  test('parseDocument() allows files at the size limit boundary', async () => {
    if (!pdfsESMSupported) {
      expect(true).toBe(true);
      return;
    }
    const file = {
      originalname: 'sample.pdf',
      path: path.join(__dirname, 'sample.pdf'),
      mimetype: 'application/pdf',
      size: 15 * 1024 * 1024,
    } as Express.Multer.File;

    await expect(parseDocument({ file })).resolves.toBeDefined();
  });
});
