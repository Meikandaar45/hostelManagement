import { describe, it, expect, vi } from 'vitest';
import { exportToCsv } from '../utils/exportCsv';

describe('exportToCsv utility', () => {
  it('correctly handles empty array with alert', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    exportToCsv('test.csv', [], []);
    expect(alertMock).toHaveBeenCalledWith('No data available to export.');
    alertMock.mockRestore();
  });

  it('escapes cells containing commas, double quotes, and newlines', () => {
    let capturedBlob: Blob | null = null;
    let clicked = false;

    // Mock createObjectURL & revokeObjectURL
    window.URL.createObjectURL = vi.fn().mockImplementation((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock-url';
    });
    window.URL.revokeObjectURL = vi.fn();

    // Mock link click
    const originalAppendChild = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, 'appendChild').mockImplementation((el: Node) => {
      if (el instanceof HTMLAnchorElement) {
        el.click = () => {
          clicked = true;
        };
      }
      return originalAppendChild(el);
    });

    const columns = [
      { header: 'Full Name', accessor: (r: any) => r.name },
      { header: 'Notes', accessor: (r: any) => r.notes },
    ];
    const data = [
      { name: 'Smith, John', notes: 'Says "Hello"\nNew line' },
      { name: 'Doe, Jane', notes: 'Regular' },
    ];

    exportToCsv('test_export', columns, data);

    expect(clicked).toBe(true);
    expect(capturedBlob).not.toBeNull();
  });
});
