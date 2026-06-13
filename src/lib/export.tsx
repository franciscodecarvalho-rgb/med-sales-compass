import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export async function exportToExcel<T extends Record<string, any>>(
  rows: T[],
  filename: string,
  sheetName = "Dados",
) {
  if (!rows || rows.length === 0) {
    toast.error("Nada para exportar");
    return;
  }
  try {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${filename}-${stamp}.xlsx`);
    toast.success(`Exportado ${rows.length} registro${rows.length === 1 ? "" : "s"}`);
  } catch (e) {
    console.error(e);
    toast.error("Erro ao exportar");
  }
}

interface ExportButtonProps {
  onExport: () => void;
  label?: string;
  disabled?: boolean;
}

export function ExportButton({ onExport, label = "Exportar", disabled }: ExportButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={onExport} disabled={disabled}>
      <Download className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
