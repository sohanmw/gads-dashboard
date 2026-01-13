'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { clsx } from 'clsx';

interface MultiSelectProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    darkMode: boolean;
    className?: string;
}

export function MultiSelect({ label, options, selected, onChange, darkMode, className }: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery(''); // Clear search when closing
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(item => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    // Filter options based on search query
    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectAll = () => onChange(filteredOptions); // Select all filtered options
    const clearAll = () => onChange([]);

    const baseInputClass = darkMode
        ? "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10"
        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm";

    const dropdownClass = darkMode
        ? "bg-gray-900 border-white/10 text-gray-300"
        : "bg-white border-gray-200 text-gray-700 shadow-xl";

    const optionHoverClass = darkMode ? "hover:bg-white/10" : "hover:bg-gray-100";

    return (
        <div className={clsx("relative", className)} ref={containerRef}>
            {label && <label className={clsx("block text-xs mb-1 ml-1", darkMode ? "text-gray-400" : "text-gray-500 font-medium")}>{label}</label>}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={clsx("w-full border rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between transition-colors focus:outline-none focus:border-purple-500", baseInputClass)}
            >
                <span className="truncate">
                    {selected.length === 0
                        ? 'Select...'
                        : selected.length === options.length
                            ? 'All Selected'
                            : `${selected.length} Selected`}
                </span>
                <ChevronDown className={clsx("w-4 h-4", darkMode ? "text-gray-400" : "text-gray-500")} />
            </button>

            {isOpen && (
                <div className={clsx("absolute z-50 mt-1 w-full min-w-[200px] max-h-80 overflow-hidden border rounded-lg", dropdownClass)}>
                    {/* Search Input */}
                    <div className={clsx("p-2 border-b", darkMode ? "border-white/10" : "border-gray-100")}>
                        <div className="relative">
                            <Search className={clsx("absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4", darkMode ? "text-gray-500" : "text-gray-400")} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className={clsx(
                                    "w-full pl-8 pr-3 py-1.5 text-sm rounded border focus:outline-none focus:border-purple-500",
                                    darkMode
                                        ? "bg-white/5 border-white/10 text-gray-200 placeholder-gray-500"
                                        : "bg-gray-50 border-gray-200 text-gray-700 placeholder-gray-400"
                                )}
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className={clsx("flex gap-2 px-2 py-2 border-b", darkMode ? "border-white/10" : "border-gray-100")}>
                        <button
                            onClick={selectAll}
                            className={clsx("text-xs px-2 py-1 rounded", darkMode ? "text-blue-400 hover:bg-white/5" : "text-blue-600 hover:bg-blue-50")}
                        >
                            Select All {searchQuery && `(${filteredOptions.length})`}
                        </button>
                        <button
                            onClick={clearAll}
                            className={clsx("text-xs px-2 py-1 rounded", darkMode ? "text-red-400 hover:bg-white/5" : "text-red-600 hover:bg-red-50")}
                        >
                            Clear
                        </button>
                    </div>

                    {/* Options List */}
                    <div className="max-h-48 overflow-y-auto p-2">
                        {filteredOptions.length === 0 ? (
                            <div className={clsx("text-sm text-center py-4", darkMode ? "text-gray-500" : "text-gray-400")}>
                                No options found
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredOptions.map((option) => (
                                    <div
                                        key={option}
                                        onClick={() => toggleOption(option)}
                                        className={clsx("flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors", optionHoverClass)}
                                    >
                                        <div className={clsx(
                                            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                            selected.includes(option)
                                                ? "bg-purple-600 border-purple-600"
                                                : (darkMode ? "border-white/30" : "border-gray-300 bg-white")
                                        )}>
                                            {selected.includes(option) && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-sm">{option}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
