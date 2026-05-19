import { useState } from 'react';
import { exportService } from '../services/export.service';
import { toast } from 'react-toastify';
import type { ExportEntity } from '../types';

export function useExportCsv() {
  const [isExporting, setIsExporting] = useState(false);

  const exportCsv = async (entity: ExportEntity) => {
    setIsExporting(true);
    try {
      const blob = await exportService.downloadCsv(entity);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entity}-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${entity} exported successfully`);
    } catch {
      toast.error(`Failed to export ${entity}`);
    } finally {
      setIsExporting(false);
    }
  };

  return { exportCsv, isExporting };
}
