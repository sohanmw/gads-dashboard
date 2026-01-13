'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';
import { clsx } from 'clsx';

interface DateSelectorProps {
    label?: string;
    selectedDate: string;
    availableDates: string[];
    onDateChange: (date: string) => void;
    darkMode: boolean;
    className?: string;
}

export function DateSelector({
    label,
    selectedDate,
    availableDates,
    onDateChange,
    darkMode,
    className
}: DateSelectorProps) {
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
        if (!date) return 'Latest';
        try {
            // Handle MM/DD/YYYY format
            if (date.includes('/')) {
                return date;
            }
            const d = new Date(date);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return date;
        }
    };

    const clearDate = () => {
        onDateChange('');
        setIsOpen(false);
    };

    const baseInputClass = darkMode
        ? "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10"
        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm";

    const dropdownClass = darkMode
        ? "bg-gray-900 border-white/10 text-gray-300"
        : "bg-white border-gray-200 text-gray-700 shadow-xl";

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
                        {formatDateDisplay(selectedDate)}
                    </span>
                </div>
                {selectedDate && (
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            clearDate();
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
                    "absolute z-50 mt-2 w-full min-w-[200px] rounded-lg border max-h-64 overflow-y-auto",
                    dropdownClass
                )}>
                    {/* Latest option */}
                    <button
                        onClick={() => {
                            onDateChange('');
                            setIsOpen(false);
                        }}
                        className={clsx(
                            "w-full px-4 py-2 text-left text-sm transition-colors border-b",
                            !selectedDate
                                ? darkMode
                                    ? "bg-purple-500/20 text-purple-400 border-white/10"
                                    : "bg-purple-50 text-purple-600 border-gray-200"
                                : darkMode
                                    ? "hover:bg-white/5 border-white/10"
                                    : "hover:bg-gray-50 border-gray-200"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Latest</span>
                            {!selectedDate && (
                                <span className="text-xs opacity-60">(Default)</span>
                            )}
                        </div>
                    </button>

                    {/* Available dates */}
                    {availableDates.map((date, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                onDateChange(date);
                                setIsOpen(false);
                            }}
                            className={clsx(
                                "w-full px-4 py-2 text-left text-sm transition-colors",
                                selectedDate === date
                                    ? darkMode
                                        ? "bg-purple-500/20 text-purple-400"
                                        : "bg-purple-50 text-purple-600"
                                    : darkMode
                                        ? "hover:bg-white/5"
                                        : "hover:bg-gray-50"
                            )}
                        >
                            {formatDateDisplay(date)}
                        </button>
                    ))}

                    {availableDates.length === 0 && (
                        <div className="px-4 py-3 text-sm text-center opacity-60">
                            No dates available
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
