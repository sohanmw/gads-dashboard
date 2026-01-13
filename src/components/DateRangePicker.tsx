'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';
import { clsx } from 'clsx';

interface DateRangePickerProps {
    label?: string;
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
    darkMode: boolean;
    className?: string;
}

export function DateRangePicker({
    label,
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    darkMode,
    className
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDateDisplay = (date: string) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const clearDates = () => {
        onStartDateChange('');
        onEndDateChange('');
    };

    const setPreset = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);

        onEndDateChange(end.toISOString().split('T')[0]);
        onStartDateChange(start.toISOString().split('T')[0]);
        setIsOpen(false);
    };

    const baseInputClass = darkMode
        ? "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10"
        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm";

    const dropdownClass = darkMode
        ? "bg-gray-900 border-white/10 text-gray-300"
        : "bg-white border-gray-200 text-gray-700 shadow-xl";

    const hasSelection = startDate || endDate;

    return (
        <div className={clsx("relative", className)} ref={containerRef}>
            {label && <label className={clsx("block text-xs mb-1 ml-1", darkMode ? "text-gray-400" : "text-gray-500 font-medium")}>{label}</label>}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "w-full border rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between transition-colors focus:outline-none focus:border-purple-500",
                    baseInputClass
                )}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">
                        {hasSelection
                            ? `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`
                            : 'Select date range...'}
                    </span>
                </div>
                {hasSelection && (
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            clearDates();
                        }}
                        className={clsx(
                            "ml-2 p-1 rounded hover:bg-white/10 transition-colors cursor-pointer",
                            darkMode ? "text-gray-400" : "text-gray-500"
                        )}
                    >
                        <X className="w-3 h-3" />
                    </div>
                )}
            </button>

            {isOpen && (
                <div className={clsx(
                    "absolute z-50 mt-2 w-full min-w-[320px] rounded-lg border p-4",
                    dropdownClass
                )}>
                    {/* Quick Presets */}
                    <div className="mb-4">
                        <label className="text-xs font-bold uppercase tracking-wider opacity-60 mb-2 block">Quick Select</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'Last 7 Days', days: 7 },
                                { label: 'Last 14 Days', days: 14 },
                            ].map(preset => (
                                <button
                                    key={preset.days}
                                    onClick={() => setPreset(preset.days)}
                                    className={clsx(
                                        "px-3 py-2 rounded-lg text-xs font-medium transition-colors border",
                                        darkMode
                                            ? "bg-white/5 border-white/10 hover:bg-white/10"
                                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                    )}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Date Inputs */}
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1 block">From Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => onStartDateChange(e.target.value)}
                                max={endDate || undefined}
                                className={clsx(
                                    "w-full border rounded-lg px-3 py-2 text-sm transition-colors focus:outline-none focus:border-purple-500",
                                    darkMode
                                        ? "bg-white/5 border-white/10 text-gray-200"
                                        : "bg-white border-gray-300 text-gray-700"
                                )}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1 block">To Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => onEndDateChange(e.target.value)}
                                min={startDate || undefined}
                                className={clsx(
                                    "w-full border rounded-lg px-3 py-2 text-sm transition-colors focus:outline-none focus:border-purple-500",
                                    darkMode
                                        ? "bg-white/5 border-white/10 text-gray-200"
                                        : "bg-white border-gray-300 text-gray-700"
                                )}
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={clearDates}
                            className={clsx(
                                "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors border",
                                darkMode
                                    ? "bg-white/5 border-white/10 hover:bg-white/10 text-gray-400"
                                    : "bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-600"
                            )}
                        >
                            Clear
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors bg-purple-500 hover:bg-purple-600 text-white"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
