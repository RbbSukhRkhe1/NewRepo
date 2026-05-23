import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { LedgerV2Entry } from './ledgerV2';
import { amountDisplay, donorLabel, formatLedgerTime, receiverLabel } from './ledgerGrid';

export function exportLedgerPdf(rows: LedgerV2Entry[], title = 'Vaultex Ledger Export'): void {
  if (rows.length === 0) return;

  const doc = new jsPDF({ orientation: rows.length > 8 ? 'landscape' : 'portrait', unit: 'pt' });
  doc.setFontSize(14);
  doc.text(title, 40, 36);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleString()} · ${rows.length} transaction(s)`, 40, 52);

  autoTable(doc, {
    startY: 64,
    head: [['Txn ID', 'Donor', 'Receiver', 'Amount', 'Cause', 'Time']],
    body: rows.map((e) => [
      e.tx_hash,
      donorLabel(e),
      receiverLabel(e),
      amountDisplay(e),
      e.cause_name?.trim() || 'N/A',
      formatLedgerTime(e.recorded_at),
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [15, 41, 77] },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'bold', font: 'courier' },
    },
    margin: { left: 40, right: 40 },
  });

  doc.save(`vaultex-ledger-${new Date().toISOString().slice(0, 10)}.pdf`);
}
