function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function printReport({
  title,
  companyName,
  generatedBy,
  generatedAt,
  filters = [],
  totals = [],
  columns = [],
  rows = [],
  footerRow = [],
  note = "",
}) {
  if (typeof window === "undefined") return;

  const printWindow = window.open("", "_blank", "width=1400,height=900");

  if (!printWindow) {
    window.alert("Please allow pop-ups to print the report.");
    return;
  }

  const filterHtml = filters
    .map(
      (item) => `
        <div class="meta-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </div>
      `
    )
    .join("");

  const totalsHtml = totals
    .map(
      (item) => `
        <div class="total-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </div>
      `
    )
    .join("");

  const headerHtml = columns
    .map((column) => `<th>${escapeHtml(column)}</th>`)
    .join("");

  const bodyHtml = rows
    .map(
      (row) => `
        <tr>
          ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
        </tr>
      `
    )
    .join("");

  const footerHtml = footerRow.length
    ? `
      <tfoot>
        <tr>
          ${footerRow
            .map((cell, index) => {
              const colspan = index === 0 ? 1 : 1;
              return `<td colspan="${colspan}">${escapeHtml(cell)}</td>`;
            })
            .join("")}
        </tr>
      </tfoot>
    `
    : "";

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            color: #0f172a;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid #d97706;
          }

          .brand {
            font-size: 12px;
            font-weight: 800;
            color: #d97706;
            letter-spacing: 1px;
            text-transform: uppercase;
          }

          h1 {
            margin: 5px 0 0;
            font-size: 23px;
          }

          .generated {
            text-align: right;
            line-height: 1.7;
          }

          .meta-grid,
          .totals-grid {
            display: grid;
            gap: 8px;
            margin-top: 12px;
          }

          .meta-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .totals-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .meta-card,
          .total-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px;
          }

          .meta-card span,
          .total-card span {
            display: block;
            margin-bottom: 4px;
            color: #64748b;
            font-size: 8px;
            font-weight: 700;
            letter-spacing: .5px;
            text-transform: uppercase;
          }

          .meta-card strong,
          .total-card strong {
            font-size: 11px;
          }

          table {
            width: 100%;
            margin-top: 14px;
            border-collapse: collapse;
          }

          thead {
            display: table-header-group;
          }

          tfoot {
            display: table-footer-group;
            font-weight: 800;
            background: #f1f5f9;
          }

          tr {
            page-break-inside: avoid;
          }

          th,
          td {
            border: 1px solid #cbd5e1;
            padding: 6px 5px;
            vertical-align: top;
          }

          th {
            background: #0f172a;
            color: #ffffff;
            font-size: 8px;
            letter-spacing: .35px;
            text-transform: uppercase;
          }

          td:nth-child(7),
          td:nth-child(8) {
            text-align: right;
          }

          .footer-note {
            margin-top: 10px;
            color: #64748b;
            font-size: 8px;
            text-align: right;
          }
        </style>
      </head>
      <body>
        <header class="header">
          <div>
            <div class="brand">${escapeHtml(companyName || "Fleet Fuel PRO")}</div>
            <h1>${escapeHtml(title)}</h1>
          </div>

          <div class="generated">
            <div><strong>Generated:</strong> ${escapeHtml(generatedAt)}</div>
            <div><strong>Generated By:</strong> ${escapeHtml(generatedBy)}</div>
          </div>
        </header>

        <section class="meta-grid">${filterHtml}</section>
        <section class="totals-grid">${totalsHtml}</section>

        <table>
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${bodyHtml}</tbody>
          ${footerHtml}
        </table>

        ${note ? `<div class="footer-note">${escapeHtml(note)}</div>` : ""}
        <div class="footer-note">Generated by Fleet Fuel PRO</div>

        <script>
          window.onload = function () {
            window.focus();
            window.print();
            window.onafterprint = function () {
              window.close();
            };
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}
