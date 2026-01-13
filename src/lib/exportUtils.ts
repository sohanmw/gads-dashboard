import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import PptxGenJS from 'pptxgenjs';

export interface ExportColumn {
    header: string;
    key: string;
    color?: string; // Optional color for specific columns
}

export interface ExportOptions {
    filename: string;
    title?: string;
    columns: ExportColumn[];
    data: any[];
    darkMode?: boolean;
}

/**
 * Export table data to PDF with dashboard styling
 */
export function exportToPDF(options: ExportOptions) {
    const { filename, title, columns, data, darkMode = false } = options;

    const doc = new jsPDF();

    // Add title with styling
    if (title) {
        doc.setFontSize(18);
        doc.setTextColor(139, 92, 246); // Purple color
        doc.text(title, 14, 20);

        // Add subtitle with date
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 27);
    }

    // Prepare table data
    const headers = columns.map(col => col.header);
    const rows = data.map(row =>
        columns.map(col => {
            const value = row[col.key];
            return value !== null && value !== undefined ? String(value) : '';
        })
    );

    // Generate table with enhanced styling
    autoTable(doc, {
        head: [headers],
        body: rows,
        startY: title ? 35 : 15,
        styles: {
            fontSize: 8,
            cellPadding: 3,
            lineColor: [230, 230, 230],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: darkMode ? [30, 30, 30] : [139, 92, 246], // Purple or dark
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'center',
        },
        alternateRowStyles: {
            fillColor: darkMode ? [20, 20, 20] : [249, 250, 251],
        },
        bodyStyles: {
            textColor: darkMode ? [200, 200, 200] : [50, 50, 50],
        },
        columnStyles: {
            // Style numeric columns
            ...Object.fromEntries(
                columns.map((col, idx) => [
                    idx,
                    {
                        halign: ['cost', 'revenue', 'impressions', 'clicks', 'conversions', 'spend'].some(key =>
                            col.key.toLowerCase().includes(key)
                        ) ? 'right' : 'left',
                    }
                ])
            ),
        },
        didDrawPage: (data) => {
            // Add footer with page numbers
            const pageCount = doc.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(
                `Page ${data.pageNumber} of ${pageCount}`,
                doc.internal.pageSize.width / 2,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );

            // Add branding
            doc.setFontSize(7);
            doc.text(
                'EME Paid Media Team Hub',
                14,
                doc.internal.pageSize.height - 10
            );
        },
    });

    // Save the PDF
    doc.save(`${filename}.pdf`);
}

/**
 * Export table data to Excel with dashboard styling
 */
export function exportToExcel(options: ExportOptions) {
    const { filename, title, columns, data, darkMode = false } = options;

    // Prepare data with headers
    const headers = columns.map(col => col.header);
    const rows = data.map(row =>
        columns.map(col => {
            const value = row[col.key];
            return value !== null && value !== undefined ? value : '';
        })
    );

    // Create worksheet
    const wsData = [
        // Title row
        title ? [title] : [],
        // Subtitle with date
        title ? [`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`] : [],
        // Empty row
        title ? [] : [],
        // Headers
        headers,
        // Data rows
        ...rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const colWidths = columns.map((col) => {
        const maxLength = Math.max(
            col.header.length,
            ...data.map(row => String(row[col.key] || '').length)
        );
        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
    });
    ws['!cols'] = colWidths;

    // Apply styling
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

    // Style title
    if (title) {
        const titleCell = ws['A1'];
        if (titleCell) {
            titleCell.s = {
                font: { bold: true, sz: 16, color: { rgb: '8B5CF6' } },
                alignment: { horizontal: 'left', vertical: 'center' },
            };
        }

        // Merge title cells
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } }];

        // Style subtitle
        const subtitleCell = ws['A2'];
        if (subtitleCell) {
            subtitleCell.s = {
                font: { sz: 9, color: { rgb: '666666' } },
                alignment: { horizontal: 'left' },
            };
        }
    }

    // Style header row
    const headerRow = title ? 3 : 0;
    for (let col = 0; col < columns.length; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
        const cell = ws[cellAddress];
        if (cell) {
            cell.s = {
                font: { bold: true, color: { rgb: 'FFFFFF' } },
                fill: { fgColor: { rgb: darkMode ? '1E1E1E' : '8B5CF6' } },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: {
                    top: { style: 'thin', color: { rgb: 'E5E7EB' } },
                    bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
                    left: { style: 'thin', color: { rgb: 'E5E7EB' } },
                    right: { style: 'thin', color: { rgb: 'E5E7EB' } },
                },
            };
        }
    }

    // Style data rows with alternating colors
    for (let row = headerRow + 1; row <= range.e.r; row++) {
        const isEvenRow = (row - headerRow) % 2 === 0;
        for (let col = 0; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = ws[cellAddress];
            if (cell) {
                cell.s = {
                    fill: { fgColor: { rgb: isEvenRow ? (darkMode ? '141414' : 'F9FAFB') : 'FFFFFF' } },
                    alignment: {
                        horizontal: ['cost', 'revenue', 'impressions', 'clicks', 'conversions', 'spend'].some(key =>
                            columns[col]?.key.toLowerCase().includes(key)
                        ) ? 'right' : 'left',
                        vertical: 'center'
                    },
                    border: {
                        top: { style: 'thin', color: { rgb: 'E5E7EB' } },
                        bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
                        left: { style: 'thin', color: { rgb: 'E5E7EB' } },
                        right: { style: 'thin', color: { rgb: 'E5E7EB' } },
                    },
                };
            }
        }
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // Save the file
    saveAs(blob, `${filename}.xlsx`);
}

/**
 * Export table data to CSV (no styling, plain text)
 */
export function exportToCSV(options: ExportOptions) {
    const { filename, columns, data } = options;

    // Prepare CSV content
    const headers = columns.map(col => col.header).join(',');
    const rows = data.map(row =>
        columns.map(col => {
            const value = row[col.key];
            const stringValue = value !== null && value !== undefined ? String(value) : '';
            // Escape commas and quotes
            return stringValue.includes(',') || stringValue.includes('"')
                ? `"${stringValue.replace(/"/g, '""')}"`
                : stringValue;
        }).join(',')
    );

    const csvContent = [headers, ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
}

/**
 * Helper function to format data for export
 * Handles common data transformations
 */
export function formatDataForExport(data: any[], formatters?: Record<string, (value: any) => string>) {
    if (!formatters) return data;

    return data.map(row => {
        const formattedRow = { ...row };
        Object.keys(formatters).forEach(key => {
            if (key in formattedRow) {
                formattedRow[key] = formatters[key](formattedRow[key]);
            }
        });
        return formattedRow;
    });
}

/**
 * Export table as high-quality PNG image
 */
export async function exportToPNG(options: ExportOptions & { tableElement?: HTMLElement }) {
    const { filename, tableElement, darkMode = false, title, columns, data } = options;

    // If a table element is provided, capture it directly
    if (tableElement) {
        try {
            const canvas = await html2canvas(tableElement, {
                scale: 2,
                backgroundColor: darkMode ? '#000000' : '#ffffff',
                logging: false,
                useCORS: true,
                allowTaint: true,
                ignoreElements: (element) => {
                    // Skip elements that might cause issues
                    return element.tagName === 'IFRAME' || element.tagName === 'SCRIPT';
                },
                // Disable foreign object rendering which can cause color parsing issues
                foreignObjectRendering: false,
            });

            canvas.toBlob((blob) => {
                if (blob) {
                    saveAs(blob, `${filename}.png`);
                }
            }, 'image/png', 1.0);
        } catch (error) {
            console.error('Error capturing PNG:', error);
            alert('Failed to export PNG. The table could not be captured as an image.');
        }
        return;
    }

    // Fallback: create a temporary table (original implementation)
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.padding = '20px';
    tempDiv.style.backgroundColor = darkMode ? '#000000' : '#ffffff';
    tempDiv.style.fontFamily = 'Arial, sans-serif';

    // Add title
    if (title) {
        const titleEl = document.createElement('h2');
        titleEl.textContent = title;
        titleEl.style.color = '#8B5CF6';
        titleEl.style.marginBottom = '10px';
        tempDiv.appendChild(titleEl);
    }

    // Create table
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';

    // Add headers
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.header;
        th.style.backgroundColor = '#8B5CF6';
        th.style.color = '#ffffff';
        th.style.padding = '10px';
        th.style.border = '1px solid #ddd';
        th.style.textAlign = 'center';
        th.style.fontWeight = 'bold';
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Add data rows
    const tbody = document.createElement('tbody');
    data.forEach((row, idx) => {
        const tr = document.createElement('tr');
        tr.style.backgroundColor = idx % 2 === 0 ? (darkMode ? '#1a1a1a' : '#f9fafb') : (darkMode ? '#000000' : '#ffffff');
        tr.style.color = darkMode ? '#ffffff' : '#000000';
        columns.forEach(col => {
            const td = document.createElement('td');
            td.textContent = String(row[col.key] || '');
            td.style.padding = '8px';
            td.style.border = '1px solid #ddd';
            td.style.textAlign = 'left';
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tempDiv.appendChild(table);

    document.body.appendChild(tempDiv);

    // Capture and download
    try {
        const canvas = await html2canvas(tempDiv, {
            scale: 2,
            backgroundColor: darkMode ? '#000000' : '#ffffff',
            logging: false,
        });

        document.body.removeChild(tempDiv);

        canvas.toBlob((blob) => {
            if (blob) {
                saveAs(blob, `${filename}.png`);
            }
        }, 'image/png', 1.0);
    } catch (error) {
        document.body.removeChild(tempDiv);
        console.error('Error capturing PNG:', error);
        alert('Failed to export PNG. Please try a different export format.');
    }
}

/**
 * Export table as PowerPoint presentation
 */
export async function exportToPPTX(options: ExportOptions) {
    const { filename, title, columns, data } = options;

    const pptx = new PptxGenJS();
    const slide = pptx.addSlide();

    // Add title
    if (title) {
        slide.addText(title, {
            x: 0.5,
            y: 0.5,
            w: 9,
            h: 0.5,
            fontSize: 24,
            bold: true,
            color: '8B5CF6',
        });
    }

    // Prepare table data
    const tableData = [
        // Headers
        columns.map(col => ({
            text: col.header,
            options: {
                bold: true,
                color: 'FFFFFF',
                fill: '8B5CF6',
                align: 'center',
            }
        })),
        // Data rows
        ...data.map(row =>
            columns.map(col => ({
                text: String(row[col.key] || ''),
                options: {
                    align: 'left',
                }
            }))
        )
    ];

    // Add table to slide
    slide.addTable(tableData, {
        x: 0.5,
        y: title ? 1.2 : 0.5,
        w: 9,
        h: title ? 4.5 : 5.2,
        fontSize: 10,
        border: { pt: 1, color: 'E5E7EB' },
        fill: { color: 'FFFFFF' },
        autoPage: true,
        autoPageRepeatHeader: true,
    });

    // Add footer
    slide.addText(`Generated on ${new Date().toLocaleDateString()}`, {
        x: 0.5,
        y: 7,
        w: 9,
        h: 0.3,
        fontSize: 8,
        color: '999999',
        align: 'center',
    });

    // Save the presentation
    pptx.writeFile({ fileName: `${filename}.pptx` });
}
