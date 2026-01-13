'use client';

import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, File, Image, Presentation } from 'lucide-react';
import { clsx } from 'clsx';
import { exportToPDF, exportToExcel, exportToCSV, exportToPNG, exportToPPTX, ExportColumn } from '@/lib/exportUtils';

interface ExportButtonProps {
    filename: string;
    title?: string;
    columns: ExportColumn[];
    data: any[];
    darkMode?: boolean;
}

export function ExportButton({ filename, title, columns, data, darkMode = false }: ExportButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = React.useRef<HTMLDivElement>(null);

    const handleExport = async (format: 'pdf' | 'excel' | 'csv' | 'png' | 'pptx') => {
        const options = { filename, title, columns, data };

        switch (format) {
            case 'pdf':
                exportToPDF(options);
                break;
            case 'excel':
                exportToExcel(options);
                break;
            case 'csv':
                exportToCSV(options);
                break;
            case 'png':
                // Find the table element - look for the closest parent container with a table
                let tableContainer: HTMLElement | null = null;

                if (buttonRef.current) {
                    // Try to find the table in the parent card/container
                    const parent = buttonRef.current.closest('.overflow-hidden, .rounded-2xl, [class*="card"]');
                    if (parent) {
                        tableContainer = parent.querySelector('table')?.closest('div') as HTMLElement;
                        if (!tableContainer) {
                            tableContainer = parent as HTMLElement;
                        }
                    }
                }

                await exportToPNG({ ...options, darkMode, tableElement: tableContainer || undefined });
                break;
            case 'pptx':
                await exportToPPTX(options);
                break;
        }

        setIsOpen(false);
    };

    return (
        <div className="relative" ref={buttonRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
                    darkMode
                        ? "bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20"
                        : "bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200"
                )}
            >
                <Download className="w-4 h-4" />
                Export
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[100]"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown Menu */}
                    <div className={clsx(
                        "absolute right-0 mt-2 w-56 rounded-lg shadow-2xl border z-[101]",
                        darkMode
                            ? "bg-black border-white/10"
                            : "bg-white border-gray-200"
                    )}>
                        <div className="py-1">
                            <button
                                onClick={() => handleExport('pdf')}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                                    darkMode
                                        ? "hover:bg-white/5 text-gray-300"
                                        : "hover:bg-gray-50 text-gray-700"
                                )}
                            >
                                <FileText className="w-4 h-4 text-red-500" />
                                Export as PDF
                            </button>

                            <button
                                onClick={() => handleExport('excel')}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                                    darkMode
                                        ? "hover:bg-white/5 text-gray-300"
                                        : "hover:bg-gray-50 text-gray-700"
                                )}
                            >
                                <FileSpreadsheet className="w-4 h-4 text-green-500" />
                                Export as Excel
                            </button>

                            <button
                                onClick={() => handleExport('csv')}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                                    darkMode
                                        ? "hover:bg-white/5 text-gray-300"
                                        : "hover:bg-gray-50 text-gray-700"
                                )}
                            >
                                <File className="w-4 h-4 text-blue-500" />
                                Export as CSV
                            </button>

                            <button
                                onClick={() => handleExport('png')}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                                    darkMode
                                        ? "hover:bg-white/5 text-gray-300"
                                        : "hover:bg-gray-50 text-gray-700"
                                )}
                            >
                                <Image className="w-4 h-4 text-purple-500" />
                                Export as PNG
                            </button>

                            <button
                                onClick={() => handleExport('pptx')}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                                    darkMode
                                        ? "hover:bg-white/5 text-gray-300"
                                        : "hover:bg-gray-50 text-gray-700"
                                )}
                            >
                                <Presentation className="w-4 h-4 text-orange-500" />
                                Export as PowerPoint
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
