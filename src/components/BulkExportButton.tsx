'use client';

import React, { useState } from 'react';
import { Download, X, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { exportToPDF, exportToExcel, exportToCSV, exportToPNG, exportToPPTX, ExportColumn } from '@/lib/exportUtils';

interface TableData {
    id: string;
    name: string;
    title: string;
    columns: ExportColumn[];
    data: any[];
}

interface BulkExportButtonProps {
    tables: TableData[];
    darkMode?: boolean;
}

export function BulkExportButton({ tables, darkMode = false }: BulkExportButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTables, setSelectedTables] = useState<string[]>([]);
    const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv' | 'png' | 'pptx'>('excel');
    const [isExporting, setIsExporting] = useState(false);

    const toggleTable = (tableId: string) => {
        setSelectedTables(prev =>
            prev.includes(tableId)
                ? prev.filter(id => id !== tableId)
                : [...prev, tableId]
        );
    };

    const selectAll = () => {
        setSelectedTables(tables.map(t => t.id));
    };

    const clearAll = () => {
        setSelectedTables([]);
    };

    const handleBulkExport = async () => {
        if (selectedTables.length === 0) {
            alert('Please select at least one table to export');
            return;
        }

        setIsExporting(true);

        try {
            for (const tableId of selectedTables) {
                const table = tables.find(t => t.id === tableId);
                if (!table) continue;

                const options = {
                    filename: `${table.name}_${new Date().toISOString().split('T')[0]}`,
                    title: table.title,
                    columns: table.columns,
                    data: table.data,
                    darkMode,
                };

                switch (exportFormat) {
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
                        await exportToPNG(options);
                        break;
                    case 'pptx':
                        await exportToPPTX(options);
                        break;
                }

                // Small delay between exports to avoid overwhelming the browser
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            alert(`Successfully exported ${selectedTables.length} table(s)!`);
            setIsOpen(false);
        } catch (error) {
            console.error('Bulk export error:', error);
            alert('Some exports may have failed. Please check the console for details.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <div>
                <label className="block text-xs mb-1 ml-1 opacity-0 pointer-events-none">Bulk</label>
                <button
                    onClick={() => setIsOpen(true)}
                    className={clsx(
                        "flex items-center gap-2 px-4 h-10 rounded-lg font-medium text-sm transition-all",
                        darkMode
                            ? "bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20"
                            : "bg-green-50 hover:bg-green-100 text-green-600 border border-green-200"
                    )}
                >
                    <Download className="w-4 h-4" />
                    Bulk Export
                </button>
            </div>

            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className={clsx(
                        "w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden",
                        darkMode ? "bg-[#111] border-white/10" : "bg-white border-gray-200"
                    )}>
                        {/* Header */}
                        <div className={clsx(
                            "flex items-center justify-between p-6 border-b",
                            darkMode ? "border-white/10" : "border-gray-200"
                        )}>
                            <div>
                                <h2 className="text-xl font-black">Bulk Export Tables</h2>
                                <p className={clsx("text-sm mt-1", darkMode ? "text-gray-400" : "text-gray-600")}>
                                    Select tables and export format
                                </p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className={clsx(
                                    "p-2 rounded-lg transition-colors",
                                    darkMode ? "hover:bg-white/5" : "hover:bg-gray-100"
                                )}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {/* Table Selection */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-bold uppercase tracking-wider opacity-60">
                                        Select Tables ({selectedTables.length}/{tables.length})
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={selectAll}
                                            className={clsx(
                                                "text-xs px-3 py-1 rounded-lg font-medium transition-colors",
                                                darkMode
                                                    ? "bg-purple-500/10 hover:bg-purple-500/20 text-purple-400"
                                                    : "bg-purple-50 hover:bg-purple-100 text-purple-600"
                                            )}
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={clearAll}
                                            className={clsx(
                                                "text-xs px-3 py-1 rounded-lg font-medium transition-colors",
                                                darkMode
                                                    ? "bg-white/5 hover:bg-white/10 text-gray-400"
                                                    : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                                            )}
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {tables.map(table => (
                                        <label
                                            key={table.id}
                                            className={clsx(
                                                "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border",
                                                selectedTables.includes(table.id)
                                                    ? darkMode
                                                        ? "bg-purple-500/10 border-purple-500/20"
                                                        : "bg-purple-50 border-purple-200"
                                                    : darkMode
                                                        ? "bg-white/5 border-white/10 hover:bg-white/10"
                                                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedTables.includes(table.id)}
                                                onChange={() => toggleTable(table.id)}
                                                className="w-4 h-4 rounded accent-purple-500"
                                            />
                                            <div className="flex-1">
                                                <div className="font-bold text-sm">{table.title}</div>
                                                <div className={clsx("text-xs", darkMode ? "text-gray-400" : "text-gray-600")}>
                                                    {table.data.length} rows
                                                </div>
                                            </div>
                                            {selectedTables.includes(table.id) && (
                                                <Check className="w-5 h-5 text-purple-500" />
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Format Selection */}
                            <div>
                                <label className="text-sm font-bold uppercase tracking-wider opacity-60 mb-3 block">
                                    Export Format
                                </label>
                                <div className="grid grid-cols-5 gap-2">
                                    {[
                                        { value: 'pdf', label: 'PDF', color: 'red' },
                                        { value: 'excel', label: 'Excel', color: 'green' },
                                        { value: 'csv', label: 'CSV', color: 'blue' },
                                        { value: 'png', label: 'PNG', color: 'purple' },
                                        { value: 'pptx', label: 'PPTX', color: 'orange' },
                                    ].map(format => (
                                        <button
                                            key={format.value}
                                            onClick={() => setExportFormat(format.value as any)}
                                            className={clsx(
                                                "px-4 py-2 rounded-lg font-medium text-sm transition-all border",
                                                exportFormat === format.value
                                                    ? `bg-${format.color}-500/20 border-${format.color}-500/50 text-${format.color}-500`
                                                    : darkMode
                                                        ? "bg-white/5 border-white/10 hover:bg-white/10"
                                                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                            )}
                                        >
                                            {format.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={clsx(
                            "flex items-center justify-between p-6 border-t",
                            darkMode ? "border-white/10" : "border-gray-200"
                        )}>
                            <button
                                onClick={() => setIsOpen(false)}
                                className={clsx(
                                    "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                                    darkMode
                                        ? "bg-white/5 hover:bg-white/10 text-gray-400"
                                        : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                                )}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkExport}
                                disabled={selectedTables.length === 0 || isExporting}
                                className={clsx(
                                    "px-6 py-2 rounded-lg font-bold text-sm transition-all",
                                    selectedTables.length === 0 || isExporting
                                        ? "bg-gray-500/20 text-gray-500 cursor-not-allowed"
                                        : "bg-purple-500 hover:bg-purple-600 text-white"
                                )}
                            >
                                {isExporting ? 'Exporting...' : `Export ${selectedTables.length} Table(s)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
