'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { RefreshCcw, Filter, Activity, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Users, Layers, Sun, Moon, Target, User, Globe, Trophy, Sparkles, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import Image from 'next/image';
import { ManagementData, BudgetData, MonthlyTotalData } from '@/lib/types';

import { MultiSelect } from './MultiSelect';
import { ExportButton } from './ExportButton';
import { BulkExportButton } from './BulkExportButton';
import { DateRangePicker } from './DateRangePicker';
import { DateSelector } from './DateSelector';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, ScatterChart, Scatter, ZAxis, Cell, BarChart, Bar
} from 'recharts';

const EXCLUDED_PMS = ["Google Ads Account in No Use", "Not Managed by EME", "Paused/Ended"];

const parseMonthString = (m: string) => {
    if (!m || typeof m !== 'string') return new Date();
    const parts = m.split('/');
    if (parts.length < 3) return new Date();
    const [d, mon, y] = parts.map(Number);
    return new Date(y, mon - 1, d);
};

const formatMonthDisplay = (m: string) => {
    if (!m) return '';
    const d = parseMonthString(m);
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
};

const getPrevMonthLabel = (currMonth: string, allMonths: string[]) => {
    const sorted = [...allMonths].sort((a, b) => parseMonthString(a).getTime() - parseMonthString(b).getTime());
    const idx = sorted.indexOf(currMonth);
    return idx > 0 ? sorted[idx - 1] : null;
};

const calculateKpiStatus = (row: MonthlyTotalData) => {
    const cost = parseFloat(row.cost?.toString().replace(/[$,]/g, '') || '0');
    const val = parseFloat(row.conversionValue?.toString().replace(/[$,]/g, '') || '0');
    const targetRoas = parseFloat(row.targetRoas?.toString().replace(/x/i, '') || '0');
    const actualRoas = cost > 0 ? (val / cost) : 0;

    if (targetRoas === 0) return 'On Track';
    const ratio = actualRoas / targetRoas;

    if (ratio < 0.7) return 'Critical';
    if (ratio < 1.0) return 'Low';
    return 'On Track';
};

const calcChange = (curr: number, prev: number | undefined) => {
    if (prev === undefined || prev === 0) return 0;
    return ((curr - prev) / prev) * 100;
};

// -- Pure Helpers (Outside Component for Performance) --
const formatCompactNumber = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val.replace(/[$,]/g, '')) : val;
    if (isNaN(num)) return '0';
    return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num);
};

const formatDecimal = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val.replace(/[$,]/g, '')) : val;
    if (isNaN(num)) return '0';
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatPriceRounded = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val.replace(/[$,]/g, '')) : val;
    if (isNaN(num)) return '0';
    return Math.ceil(num).toLocaleString();
};

const formatFullNumber = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val.replace(/[$,]/g, '')) : val;
    if (isNaN(num)) return '0';
    return Math.floor(num).toLocaleString();
};

const ChangeBadge = memo(({ curr, prev, trendInverted = false, showTrend = true }: any) => {
    if (!showTrend) return null;
    const change = calcChange(curr, prev);
    const isUp = change > 0;
    const isNeutral = change === 0;
    const isGood = trendInverted ? !isUp : isUp;

    return (
        <div className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-black tracking-tight",
            isNeutral ? "bg-gray-500/20 text-gray-500" :
                isGood ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
        )}>
            {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : isNeutral ? null : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{Math.abs(change).toFixed(0)}%</span>
        </div>
    );
});

const SortHeader = memo(({ label, field, currentField, order, onSort, className = "", justify = "justify-center" }: any) => {
    const active = currentField === field;
    return (
        <th className={clsx("p-2 transition-colors cursor-pointer group", className)} onClick={() => onSort(field)}>
            <div className={clsx("flex items-center gap-1 hover:opacity-80 transition-opacity", justify)}>
                <span className={clsx(active ? "text-purple-500 underline decoration-purple-500/30 underline-offset-4" : "opacity-60")}>
                    {label}
                </span>
                <div className="flex flex-col -space-y-1 opacity-20 group-hover:opacity-100 transition-opacity">
                    <TrendingUp className={clsx("w-2 h-2", active && order === 'asc' ? "text-purple-500 opacity-100" : "")} />
                    <TrendingDown className={clsx("w-2 h-2", active && order === 'desc' ? "text-purple-500 opacity-100" : "")} />
                </div>
            </div>
        </th>
    );
});

const CustomKpiTooltip = memo(({ active, payload, darkMode }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const total = data.total || 1;
        return (
            <div className={clsx(
                "p-4 rounded-xl border shadow-2xl backdrop-blur-md",
                darkMode ? "bg-black/90 border-white/10" : "bg-white/90 border-gray-200"
            )}>
                <p className="text-[10px] font-black mb-3 opacity-40 uppercase tracking-[0.2em]">{data.month}</p>
                <div className="flex flex-col gap-2.5">
                    {payload.slice().reverse().map((entry: any, index: number) => {
                        const pct = ((entry.value / total) * 100).toFixed(0);
                        return (
                            <div key={index} className="flex items-center justify-between gap-10">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></div>
                                    <span className="text-xs font-extrabold" style={{ color: entry.color }}>{entry.name}</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-black">{entry.value}</span>
                                    <span className="text-[10px] opacity-30 font-bold">({pct}%)</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return null;
});

const StatCard = memo(({ label, value, subValue, change, icon: Icon, color, trendInverted = false, darkMode, showTrend = true }: any) => {
    const colorMap: any = {
        red: "from-red-500/20 to-red-500/5 text-red-500 border-red-500/20 shadow-red-500/10",
        orange: "from-orange-500/20 to-orange-500/5 text-orange-500 border-orange-500/20 shadow-orange-500/10",
        green: "from-green-500/20 to-green-500/5 text-green-500 border-green-500/20 shadow-green-500/10",
        blue: "from-blue-500/20 to-blue-500/5 text-blue-500 border-blue-500/20 shadow-blue-500/10",
        purple: "from-purple-500/20 to-purple-500/5 text-purple-500 border-purple-500/20 shadow-purple-500/10",
    };
    const activeColor = colorMap[color] || colorMap.blue;

    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            className={clsx(
                "relative overflow-hidden p-6 rounded-3xl border shadow-2xl bg-gradient-to-br transition-all duration-300 group",
                activeColor,
                darkMode ? "bg-black/40 backdrop-blur-xl" : "bg-white"
            )}
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon size={64} strokeWidth={1} />
            </div>
            <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                        {label}
                    </span>
                    <ChangeBadge curr={value} prev={change} trendInverted={trendInverted} showTrend={showTrend} />
                </div>
                <div className="flex items-baseline gap-3">
                    <h4 className="text-4xl font-black tracking-tighter">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </h4>
                    {subValue && (
                        <span className="text-sm font-bold opacity-30">
                            {subValue}
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
});

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<'management' | 'budget' | 'monthly' | 'daily' | 'portfolio' | 'audience' | 'campaign'>('management');
    const [darkMode, setDarkMode] = useState(true);
    const [loading, setLoading] = useState(false);

    // Management Data State
    const [data, setData] = useState<ManagementData[]>([]);
    const [sheetUrl, setSheetUrl] = useState('https://docs.google.com/spreadsheets/d/e/2PACX-1vTeQRJT07I2RDj-RMPHSDkwJ_DI7B5apB4g36zBNSNQUCNO8t261H1QkSudY1IW6Tul-2gyMFZ2s7YB/pub?gid=1305977821&single=true&output=csv');

    // Budget Data State
    const [budgetData, setBudgetData] = useState<BudgetData[]>([]);
    const [budgetSheetUrl, setBudgetSheetUrl] = useState('https://docs.google.com/spreadsheets/d/e/2PACX-1vTeQRJT07I2RDj-RMPHSDkwJ_DI7B5apB4g36zBNSNQUCNO8t261H1QkSudY1IW6Tul-2gyMFZ2s7YB/pub?gid=1847440817&single=true&output=csv');

    // PM Data State
    const [pmData, setPmData] = useState<{ pm: string, status: string }[]>([]);
    const [pmSheetUrl, setPmSheetUrl] = useState('https://docs.google.com/spreadsheets/d/e/2PACX-1vTeQRJT07I2RDj-RMPHSDkwJ_DI7B5apB4g36zBNSNQUCNO8t261H1QkSudY1IW6Tul-2gyMFZ2s7YB/pub?gid=1995902069&single=true&output=csv');

    // Monthly Historical Data State
    const [monthlyData, setMonthlyData] = useState<MonthlyTotalData[]>([]);
    const [monthlySheetUrl, setMonthlySheetUrl] = useState('https://docs.google.com/spreadsheets/d/e/2PACX-1vTeQRJT07I2RDj-RMPHSDkwJ_DI7B5apB4g36zBNSNQUCNO8t261H1QkSudY1IW6Tul-2gyMFZ2s7YB/pub?gid=884280652&single=true&output=csv');

    // Daily KPI Data State
    const [dailyData, setDailyData] = useState<MonthlyTotalData[]>([]);
    const [dailySheetUrl, setDailySheetUrl] = useState('https://docs.google.com/spreadsheets/d/e/2PACX-1vTeQRJT07I2RDj-RMPHSDkwJ_DI7B5apB4g36zBNSNQUCNO8t261H1QkSudY1IW6Tul-2gyMFZ2s7YB/pub?gid=477152601&single=true&output=csv');

    // Audience Audit Data State
    const [audienceData, setAudienceData] = useState<any[]>([]);
    const [audienceSheetUrl, setAudienceSheetUrl] = useState('https://docs.google.com/spreadsheets/d/e/2PACX-1vRBr1Ap1kltQfvzY7CVuTORiFwXEQ5mMoWqkJVxT_btv7I-Gcc4VVZUfW54hhjmZCSe7pyb1kslu5Gz/pub?gid=768968276&single=true&output=csv');

    // Campaign Health Audit Data State
    const [campaignAuditData, setCampaignAuditData] = useState<any[]>([]);
    const [campaignAuditSheetUrl, setCampaignAuditSheetUrl] = useState('https://docs.google.com/spreadsheets/d/e/2PACX-1vQkeYQVGzHSfg9jtUf6bglZYiUb61MZuaYEQqNdBNphnnYHr9thKBgYno5rByrUlyXQ7x-O_0D7xZ3G/pub?gid=768968276&single=true&output=csv');

    // Filters for Heatmap
    const [heatmapStartMonth, setHeatmapStartMonth] = useState<string>('');
    const [heatmapEndMonth, setHeatmapEndMonth] = useState<string>('');

    // Filters (Management)
    const [filterPM, setFilterPM] = useState<string[]>([]);
    const [filterTeam, setFilterTeam] = useState<string[]>([]);
    const [filterAccountName, setFilterAccountName] = useState<string[]>([]);
    const [filterClientAccount, setFilterClientAccount] = useState<string[]>([]);
    const [filterObjective, setFilterObjective] = useState<string[]>([]);
    const [filterType, setFilterType] = useState<string[]>([]);
    const [filterStrategist, setFilterStrategist] = useState<string[]>([]);

    // Filters (Budget)
    const [budgetFilterMonth, setBudgetFilterMonth] = useState<string[]>([]);
    const [budgetFilterPM, setBudgetFilterPM] = useState<string[]>([]);
    const [budgetFilterAccount, setBudgetFilterAccount] = useState<string[]>([]);

    // Filters (Monthly KPI)
    const [monthlyFilterMonth, setMonthlyFilterMonth] = useState<string[]>([]);
    const [monthlyFilterPM, setMonthlyFilterPM] = useState<string[]>([]);
    const [monthlyFilterAccount, setMonthlyFilterAccount] = useState<string[]>([]);
    const [monthlyFilterClient, setMonthlyFilterClient] = useState<string[]>([]);
    const [monthlyFilterObjective, setMonthlyFilterObjective] = useState<string[]>([]);
    const [monthlyFilterStatus, setMonthlyFilterStatus] = useState<string[]>([]);

    // Filters (Daily KPI)
    const [dailyFilterPM, setDailyFilterPM] = useState<string[]>([]);
    const [dailyFilterAccount, setDailyFilterAccount] = useState<string[]>([]);
    const [dailyFilterClient, setDailyFilterClient] = useState<string[]>([]);
    const [dailyFilterObjective, setDailyFilterObjective] = useState<string[]>([]);
    const [dailyFilterStatus, setDailyFilterStatus] = useState<string[]>([]);
    const [dailyStartDate, setDailyStartDate] = useState<string>('');
    const [dailyEndDate, setDailyEndDate] = useState<string>('');
    const [portfolioFilterMonth, setPortfolioFilterMonth] = useState<string[]>([]);
    const [portfolioFilterTeam, setPortfolioFilterTeam] = useState<string[]>([]);
    const [portfolioFilterStrategist, setPortfolioFilterStrategist] = useState<string[]>([]);
    const [audienceFilterPM, setAudienceFilterPM] = useState<string[]>([]);
    const [audienceSelectedDate, setAudienceSelectedDate] = useState<string>('');
    const [campaignFilterPM, setCampaignFilterPM] = useState<string[]>([]);
    const [campaignSelectedDate, setCampaignSelectedDate] = useState<string>('');

    // Sorting State (Monthly)
    const [monthlySortField, setMonthlySortField] = useState<string>('accountName');
    const [monthlySortOrder, setMonthlySortOrder] = useState<'asc' | 'desc'>('asc');
    const [pmSortField, setPmSortField] = useState<string>('total');
    const [pmSortOrder, setPmSortOrder] = useState<'asc' | 'desc'>('desc');
    const [teamSortField, setTeamSortField] = useState<string>('total');
    const [teamSortOrder, setTeamSortOrder] = useState<'asc' | 'desc'>('desc');

    const [dailySortField, setDailySortField] = useState<string>('accountName');
    const [dailySortOrder, setDailySortOrder] = useState<'asc' | 'desc'>('asc');

    // Sorting State (Audience)
    const [audienceSortField, setAudienceSortField] = useState<string>('accountName');
    const [audienceSortOrder, setAudienceSortOrder] = useState<'asc' | 'desc'>('asc');

    // -- Helpers --




    // -- Derived Lists (Management) --
    const uniquePMs = Array.from(new Set(data.map(i => i.pm).filter(Boolean))).sort();
    const uniqueTeams = Array.from(new Set(data.map(i => i.team).filter(Boolean))).sort();
    const uniqueAccountNames = Array.from(new Set(data.map(i => i.accountName).filter(Boolean))).sort();
    const uniqueClientAccounts = Array.from(new Set(data.map(i => i.clientAccount).filter(Boolean))).sort();
    const uniqueObjectives = Array.from(new Set(data.map(i => i.objective).filter(Boolean))).sort();
    const uniqueTypes = Array.from(new Set(data.map(i => i.type).filter(Boolean))).sort();
    const uniqueStrategists = Array.from(new Set(data.map(i => i.strategist).filter(Boolean))).sort();

    // -- Derived Lists (Budget) --
    const uniqueBudgetPMs = Array.from(new Set(budgetData.map(i => i.pm).filter(Boolean))).sort();
    const uniqueBudgetAccounts = Array.from(new Set(budgetData.map(i => i.accountName).filter(Boolean))).sort();
    const uniqueBudgetMonths = Array.from(new Set(budgetData.map(i => {
        if (!i.startDate) return '';
        const d = new Date(i.startDate);
        return d.toLocaleString('default', { month: 'long', year: 'numeric' });
    }).filter(Boolean)));

    // -- Derived Lists (Monthly) --
    const uniqueMonthlyPMs = Array.from(new Set(monthlyData.map(i => i.pm).filter(Boolean))).sort();
    const uniqueMonthlyAccounts = Array.from(new Set(monthlyData.map(i => i.accountName).filter(Boolean))).sort();
    const uniqueMonthlyClients = Array.from(new Set(monthlyData.map(i => i.clientAccount).filter(Boolean))).sort();
    const uniqueMonthlyObjectives = Array.from(new Set(monthlyData.map(i => i.objective).filter(Boolean))).sort();

    // -- Derived Lists (Daily) --
    const uniqueDailyPMs = Array.from(new Set(dailyData.map(i => i.pm).filter(Boolean))).sort();
    const uniqueDailyAccounts = Array.from(new Set(dailyData.map(i => i.accountName).filter(Boolean))).sort();
    const uniqueDailyClients = Array.from(new Set(dailyData.map(i => i.clientAccount).filter(Boolean))).sort();
    const uniqueDailyObjectives = Array.from(new Set(dailyData.map(i => i.objective).filter(Boolean))).sort();

    const monthOptions = Array.from(new Set(monthlyData.map(i => {
        const d = parseMonthString(i.month);
        return d.toLocaleString('default', { month: 'long', year: 'numeric' });
    }).filter(Boolean))).sort((a, b) => {
        const da = new Date(a);
        const db = new Date(b);
        return da.getTime() - db.getTime();
    });

    const uniqueMonthlyMonths = Array.from(new Set(monthlyData.map(i => i.month).filter(Boolean))).sort((a, b) => parseMonthString(a).getTime() - parseMonthString(b).getTime());

    // -- Fetch Logic --
    const fetchBridgeData = async (url: string, mode: 'management' | 'budget' | 'pm' | 'monthly' | 'daily' | 'audience' | 'campaign') => {
        if (!url) return;
        setLoading(true);
        const EXCLUDED_PMS = ["Google Ads Account in No Use", "Not Managed by EME", "Paused/Ended"];

        try {
            const res = await fetch('/api/visual-bridge', {
                method: 'POST',
                body: JSON.stringify({ url, mode }),
                headers: { 'Content-Type': 'application/json' }
            });
            const json = await res.json();
            if (json.success) {
                if (mode === 'management') {
                    const fetchedData = json.data.map((i: any) => ({ ...i, pm: (i.pm || '').replace('Strategic Lead', '').trim() }));
                    setData(fetchedData);
                    const allPMs = Array.from(new Set(fetchedData.map((i: any) => i.pm).filter(Boolean))) as string[];
                    const defaultPMs = allPMs.filter(pm => !EXCLUDED_PMS.includes(pm));
                    if (filterPM.length === 0) setFilterPM(defaultPMs);
                } else if (mode === 'pm') {
                    setPmData(json.data.map((i: any) => ({ ...i, pm: (i.pm || '').replace('Strategic Lead', '').trim() })));
                } else if (mode === 'monthly') {
                    const mData = json.data.map((i: any) => ({ ...i, pm: (i.pm || '').replace('Strategic Lead', '').trim() }));
                    setMonthlyData(mData);
                    // Default to latest month
                    const allMonths = Array.from(new Set(mData.map((i: any) => {
                        const [d, mon, y] = i.month.split('/').map(Number);
                        const dt = new Date(y, mon - 1, d);
                        return dt.toLocaleString('default', { month: 'long', year: 'numeric' });
                    }).filter(Boolean))) as string[];

                    const latest = allMonths.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
                    if (latest && monthlyFilterMonth.length === 0) setMonthlyFilterMonth([latest]);

                    // Default PM Filter
                    const allPMs = Array.from(new Set(mData.map((i: any) => i.pm).filter(Boolean))) as string[];
                    const defaultPMs = allPMs.filter(pm => !EXCLUDED_PMS.includes(pm));
                    if (monthlyFilterPM.length === 0) setMonthlyFilterPM(defaultPMs);
                } else if (mode === 'daily') {
                    const dData = json.data.map((i: any) => ({ ...i, pm: (i.pm || '').replace('Strategic Lead', '').trim() }));
                    setDailyData(dData);
                    const allPMs = Array.from(new Set(dData.map((i: any) => i.pm).filter(Boolean))) as string[];
                    const defaultPMs = allPMs.filter(pm => !EXCLUDED_PMS.includes(pm));
                    if (dailyFilterPM.length === 0) setDailyFilterPM(defaultPMs);
                } else if (mode === 'budget') {
                    const bData = (json.data as BudgetData[]).map(i => ({ ...i, pm: (i.pm || '').replace('Strategic Lead', '').trim() }));
                    setBudgetData(bData);
                    const allBudgetPMs = Array.from(new Set(bData.map((i) => i.pm).filter(Boolean))) as string[];
                    const defaultBudgetPMs = allBudgetPMs.filter(pm => !EXCLUDED_PMS.includes(pm));
                    if (budgetFilterPM.length === 0) setBudgetFilterPM(defaultBudgetPMs);

                    const allMonths = Array.from(new Set(bData.map(i => {
                        if (!i.startDate) return '';
                        return new Date(i.startDate).toLocaleString('default', { month: 'long', year: 'numeric' });
                    }).filter(Boolean)));

                    const sortedMonths = allMonths.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
                    const latestMonth = sortedMonths[sortedMonths.length - 1];
                    const startMonth12 = sortedMonths[Math.max(0, sortedMonths.length - 12)];

                    if (latestMonth && budgetFilterMonth.length === 0) setBudgetFilterMonth([latestMonth]);
                    if (latestMonth && !heatmapEndMonth) setHeatmapEndMonth(new Date(latestMonth).toLocaleString('default', { month: 'short', year: '2-digit' }));
                    if (startMonth12 && !heatmapStartMonth) setHeatmapStartMonth(new Date(startMonth12).toLocaleString('default', { month: 'short', year: '2-digit' }));
                } else if (mode === 'audience') {
                    setAudienceData(json.data);
                } else if (mode === 'campaign') {
                    setCampaignAuditData(json.data);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const syncAll = () => {
        fetchBridgeData(sheetUrl, 'management');
        fetchBridgeData(budgetSheetUrl, 'budget');
        fetchBridgeData(pmSheetUrl, 'pm');
        fetchBridgeData(monthlySheetUrl, 'monthly');
        fetchBridgeData(dailySheetUrl, 'daily');
        fetchBridgeData(audienceSheetUrl, 'audience');
        fetchBridgeData(campaignAuditSheetUrl, 'campaign');
    };

    // Auto-load on mount
    useEffect(() => {
        fetchBridgeData(sheetUrl, 'management');
        fetchBridgeData(budgetSheetUrl, 'budget');
        fetchBridgeData(pmSheetUrl, 'pm');
        fetchBridgeData(monthlySheetUrl, 'monthly');
        fetchBridgeData(dailySheetUrl, 'daily');
        fetchBridgeData(audienceSheetUrl, 'audience');
        fetchBridgeData(campaignAuditSheetUrl, 'campaign');
    }, []);

    // -- Filter Logic (Management) --
    const filteredData = useMemo(() => data.filter(item => {
        const matchPM = filterPM.length === 0 || filterPM.includes(item.pm);
        const matchTeam = filterTeam.length === 0 || filterTeam.includes(item.team);
        const matchAccount = filterAccountName.length === 0 || filterAccountName.includes(item.accountName);
        const matchClient = filterClientAccount.length === 0 || filterClientAccount.includes(item.clientAccount);
        const matchObjective = filterObjective.length === 0 || filterObjective.includes(item.objective);
        const matchType = filterType.length === 0 || filterType.includes(item.type);
        const matchStrategist = filterStrategist.length === 0 || filterStrategist.includes(item.strategist);
        return matchPM && matchTeam && matchAccount && matchClient && matchObjective && matchType && matchStrategist;
    }), [data, filterPM, filterTeam, filterAccountName, filterClientAccount, filterObjective, filterType, filterStrategist]);

    // -- Filter Logic (Monthly KPI) --
    const filteredMonthlyData = useMemo(() => monthlyData.filter(item => {
        const monthLabel = formatMonthDisplay(item.month);
        const itemStatus = calculateKpiStatus(item);
        const matchMonth = monthlyFilterMonth.length === 0 || monthlyFilterMonth.includes(monthLabel);
        const matchPM = monthlyFilterPM.length === 0 || monthlyFilterPM.includes(item.pm);
        const matchAccount = monthlyFilterAccount.length === 0 || monthlyFilterAccount.includes(item.accountName);
        const matchClient = monthlyFilterClient.length === 0 || monthlyFilterClient.includes(item.clientAccount);
        const matchObjective = monthlyFilterObjective.length === 0 || monthlyFilterObjective.includes(item.objective);
        const matchStatus = monthlyFilterStatus.length === 0 || monthlyFilterStatus.includes(itemStatus);
        const isNotExcluded = !EXCLUDED_PMS.includes(item.pm);
        return matchMonth && matchPM && matchAccount && matchClient && matchObjective && matchStatus && isNotExcluded;
    }).sort((a, b) => {
        let valA: any = (a as any)[monthlySortField] || '';
        let valB: any = (b as any)[monthlySortField] || '';

        // Handle numerical fields
        const numFields = ['impressions', 'clicks', 'cost', 'conversions', 'conversionValue', 'targetRoas'];
        if (numFields.includes(monthlySortField)) {
            valA = parseFloat(valA.toString().replace(/[$,x]/g, '')) || 0;
            valB = parseFloat(valB.toString().replace(/[$,x]/g, '')) || 0;
        } else if (monthlySortField === 'actualRoas') {
            const costA = parseFloat(a.cost?.toString().replace(/[$,]/g, '') || '0');
            const costB = parseFloat(b.cost?.toString().replace(/[$,]/g, '') || '0');
            valA = costA > 0 ? parseFloat(a.conversionValue?.toString().replace(/[$,]/g, '') || '0') / costA : 0;
            valB = costB > 0 ? parseFloat(b.conversionValue?.toString().replace(/[$,]/g, '') || '0') / costB : 0;
        } else if (monthlySortField === 'status') {
            valA = calculateKpiStatus(a);
            valB = calculateKpiStatus(b);
        }

        if (valA < valB) return monthlySortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return monthlySortOrder === 'asc' ? 1 : -1;
        return 0;
    }), [monthlyData, monthlyFilterMonth, monthlyFilterPM, monthlyFilterAccount, monthlyFilterClient, monthlyFilterObjective, monthlyFilterStatus, monthlySortField, monthlySortOrder]);

    // -- Daily KPI Aggregation & Logic --
    const aggregatedDailyData = useMemo(() => {
        // First, filter by date range if specified
        let dataToAggregate = dailyData;

        if (dailyStartDate || dailyEndDate) {
            console.log('Date filtering active:', { dailyStartDate, dailyEndDate, totalRows: dailyData.length });

            // Log first few dates to see format
            const sampleDates = dailyData.slice(0, 5).map(row => row.month);
            console.log('Sample dates from data:', sampleDates);

            dataToAggregate = dailyData.filter(row => {
                const itemDate = row.month;
                if (!itemDate) return true; // Include rows without dates

                try {
                    // Parse the item date - handle MM/DD/YYYY format from Google Sheets
                    let date: Date;

                    // Check if it's in MM/DD/YYYY format
                    if (itemDate.includes('/')) {
                        const [month, day, year] = itemDate.split('/').map(Number);
                        date = new Date(year, month - 1, day); // month is 0-indexed in JS
                    } else {
                        // Otherwise try standard parsing
                        date = new Date(itemDate);
                    }

                    // Validate the date
                    if (isNaN(date.getTime())) {
                        console.warn('Invalid date:', itemDate);
                        return true;
                    }

                    date.setHours(0, 0, 0, 0);

                    if (dailyStartDate) {
                        const startDate = new Date(dailyStartDate);
                        startDate.setHours(0, 0, 0, 0);
                        if (date < startDate) {
                            return false;
                        }
                    }

                    if (dailyEndDate) {
                        const endDate = new Date(dailyEndDate);
                        endDate.setHours(23, 59, 59, 999); // End of day
                        if (date > endDate) {
                            return false;
                        }
                    }

                    return true;
                } catch (e) {
                    console.warn('Error parsing date:', itemDate, e);
                    return true; // Include rows with invalid dates
                }
            });

            console.log('After date filter:', { filteredRows: dataToAggregate.length });
        }

        // Then aggregate the filtered data
        const aggregated: Record<string, MonthlyTotalData> = {};

        dataToAggregate.forEach(row => {
            const key = row.cid || row.accountName;
            if (!aggregated[key]) {
                aggregated[key] = { ...row };
                // Initialize numeric fields to handle potential undefined/null
                aggregated[key].impressions = row.impressions?.toString() || '0';
                aggregated[key].clicks = row.clicks?.toString() || '0';
                aggregated[key].cost = row.cost?.toString() || '0';
                aggregated[key].conversions = row.conversions?.toString() || '0';
                aggregated[key].conversionValue = row.conversionValue?.toString() || '0';
            } else {
                aggregated[key].impressions = (parseFloat(aggregated[key].impressions.replace(/,/g, '')) + parseFloat(row.impressions?.toString().replace(/,/g, '') || '0')).toString();
                aggregated[key].clicks = (parseFloat(aggregated[key].clicks.replace(/,/g, '')) + parseFloat(row.clicks?.toString().replace(/,/g, '') || '0')).toString();
                aggregated[key].cost = (parseFloat(aggregated[key].cost.replace(/[$,]/g, '')) + parseFloat(row.cost?.toString().replace(/[$,]/g, '') || '0')).toString();
                aggregated[key].conversions = (parseFloat(aggregated[key].conversions.replace(/,/g, '')) + parseFloat(row.conversions?.toString().replace(/,/g, '') || '0')).toString();
                aggregated[key].conversionValue = (parseFloat(aggregated[key].conversionValue.replace(/[$,]/g, '')) + parseFloat(row.conversionValue?.toString().replace(/[$,]/g, '') || '0')).toString();
            }
        });

        return Object.values(aggregated);
    }, [dailyData, dailyStartDate, dailyEndDate]);


    const filteredDailyData = useMemo(() => aggregatedDailyData.filter(item => {
        const itemStatus = calculateKpiStatus(item);
        const matchPM = dailyFilterPM.length === 0 || dailyFilterPM.includes(item.pm);
        const matchAccount = dailyFilterAccount.length === 0 || dailyFilterAccount.includes(item.accountName);
        const matchClient = dailyFilterClient.length === 0 || dailyFilterClient.includes(item.clientAccount);
        const matchObjective = dailyFilterObjective.length === 0 || dailyFilterObjective.includes(item.objective);
        const matchStatus = dailyFilterStatus.length === 0 || dailyFilterStatus.includes(itemStatus);
        const isNotExcluded = !EXCLUDED_PMS.includes(item.pm);

        return matchPM && matchAccount && matchClient && matchObjective && matchStatus && isNotExcluded;
    }).sort((a, b) => {
        let valA: any = (a as any)[dailySortField] || '';
        let valB: any = (b as any)[dailySortField] || '';

        const numFields = ['impressions', 'clicks', 'cost', 'conversions', 'conversionValue', 'targetRoas'];
        if (numFields.includes(dailySortField)) {
            valA = parseFloat(valA.toString().replace(/[$,x]/g, '')) || 0;
            valB = parseFloat(valB.toString().replace(/[$,x]/g, '')) || 0;
        } else if (dailySortField === 'actualRoas') {
            const costA = parseFloat(a.cost?.toString().replace(/[$,]/g, '') || '0');
            const costB = parseFloat(b.cost?.toString().replace(/[$,]/g, '') || '0');
            valA = costA > 0 ? parseFloat(a.conversionValue?.toString().replace(/[$,]/g, '') || '0') / costA : 0;
            valB = costB > 0 ? parseFloat(b.conversionValue?.toString().replace(/[$,]/g, '') || '0') / costB : 0;
        } else if (dailySortField === 'status') {
            valA = calculateKpiStatus(a);
            valB = calculateKpiStatus(b);
        }

        if (valA < valB) return dailySortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return dailySortOrder === 'asc' ? 1 : -1;
        return 0;
    }), [aggregatedDailyData, dailyFilterPM, dailyFilterAccount, dailyFilterClient, dailyFilterObjective, dailyFilterStatus, dailySortField, dailySortOrder]);

    const watchlistAnomalies = useMemo(() => {
        const suddenDrops: any[] = [];
        const hiddenGems: any[] = [];

        // 1. Group dailyData by cid
        const byAccount: Record<string, MonthlyTotalData[]> = {};
        dailyData.forEach(row => {
            const key = row.cid || row.accountName;
            if (!byAccount[key]) byAccount[key] = [];
            byAccount[key].push(row);
        });

        // 2. Process each account for Sudden Drops
        Object.values(byAccount).forEach(history => {
            if (history.length < 2) return;

            // Sort by date (descending - latest first)
            const sorted = [...history].sort((a, b) => {
                const da = parseMonthString(a.month).getTime();
                const db = parseMonthString(b.month).getTime();
                return db - da;
            });

            const latest = sorted[0];
            const getRoas = (item: MonthlyTotalData) => {
                const cost = parseFloat(item.cost?.toString().replace(/[$,]/g, '') || '0');
                const val = parseFloat(item.conversionValue?.toString().replace(/[$,]/g, '') || '0');
                if (isNaN(cost) || isNaN(val) || cost <= 0) return 0;
                return val / cost;
            };

            const latestRoas = getRoas(latest);

            // Baseline: Average of next up to 7 days
            const baselineHistory = sorted.slice(1, 8);
            if (baselineHistory.length === 0) return;

            const totalBaselineRoas = baselineHistory.reduce((acc, item) => acc + getRoas(item), 0);
            const avgBaselineRoas = totalBaselineRoas / baselineHistory.length;

            if (avgBaselineRoas > 1 && latestRoas < avgBaselineRoas * 0.7) {
                const dropPct = ((avgBaselineRoas - latestRoas) / avgBaselineRoas) * 100;
                suddenDrops.push({
                    accountName: latest.accountName,
                    pm: latest.pm,
                    currentRoas: latestRoas,
                    baselineRoas: avgBaselineRoas,
                    dropPct,
                    cid: latest.cid
                });
            }
        });

        // 3. Process Hidden Gems from aggregated data
        aggregatedDailyData.forEach(item => {
            const cost = parseFloat(item.cost?.toString().replace(/[$,]/g, '') || '0');
            const val = parseFloat(item.conversionValue?.toString().replace(/[$,]/g, '') || '0');
            const target = parseFloat(item.targetRoas?.toString().replace(/[$,x]/g, '') || '0');
            const currentRoas = cost > 0 ? val / cost : 0;

            // Only consider accounts with an objective and target
            if (cost > 0 && cost < 250 && currentRoas > Math.max(target * 2, 5)) {
                hiddenGems.push({
                    accountName: item.accountName,
                    pm: item.pm,
                    currentRoas,
                    targetRoas: target,
                    spend: cost,
                    cid: item.cid
                });
            }
        });

        // Final filtered lists relative to current PM/Team filters
        const filteredPMs = new Set(filteredDailyData.map(d => d.pm));

        return {
            suddenDrops: suddenDrops
                .filter(d => filteredPMs.has(d.pm))
                .sort((a, b) => b.dropPct - a.dropPct)
                .slice(0, 20),
            hiddenGems: hiddenGems
                .filter(d => filteredPMs.has(d.pm))
                .sort((a, b) => b.currentRoas - a.currentRoas)
                .slice(0, 20)
        };
    }, [dailyData, aggregatedDailyData, filteredDailyData]);

    const audienceAudit = useMemo(() => {
        const EXCLUDED_CAMPAIGN_KEYWORDS = [
            'PLBPMTG', 'PLDPM', 'DLBPM', 'HLDPM', 'PERFORMANCEMAX',
            'DEMANDGEN', 'PMAX', 'PLBPM', 'HLBPM'
        ];

        const cidToPm: Record<string, string> = {};
        data.forEach(item => {
            if (item.cid) cidToPm[item.cid.replace(/\D/g, '')] = item.pm;
        });

        // Filter by selected date if specified
        let filteredAudienceData = audienceData;

        if (audienceSelectedDate) {
            filteredAudienceData = audienceData.filter(row => row.date === audienceSelectedDate);
        }

        const uniqueDates = Array.from(new Set(filteredAudienceData.map(d => d.date).filter(Boolean)))
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        const latestDate = uniqueDates[0] || null;
        const previousDate = uniqueDates[1] || null;

        const results = {
            latestDate,
            searchSizeZero: [] as any[],
            targetingWithoutRemarketing: [] as any[],
            noAudienceAdded: [] as any[],
            observationWithRlsa: [] as any[],
            closedMembership: [] as any[],
            prevCounts: { zero: 0, targeting: 0, noAudience: 0, observation: 0, closed: 0 },
            pmSummary: {} as Record<string, any>,
            accountIssues: {} as Record<string, number>
        };

        filteredAudienceData.forEach(row => {
            const cidKey = (row.cid || '').replace(/\D/g, '');
            const pm = cidToPm[cidKey] || 'Unknown';
            if (EXCLUDED_PMS.includes(pm)) return;

            // Filter by PM if selected
            if (audienceFilterPM.length > 0 && !audienceFilterPM.includes(pm)) return;

            const campaign = row.campaignName || '';
            const campaignUpper = campaign.toUpperCase();
            const shouldExclude = EXCLUDED_CAMPAIGN_KEYWORDS.some(kw => campaignUpper.includes(kw));
            if (shouldExclude) return;

            const isLatest = latestDate && row.date === latestDate;
            const isPrev = previousDate && row.date === previousDate;

            if (!isLatest && !isPrev) return;

            const searchSize = parseFloat(row.searchSize) || 0;
            const audienceSetting = row.audienceSetting;
            const membershipStatus = row.membershipStatus;
            const audience = row.audience;
            const hasRlsa = /(RLSA|PLBRL|HLBRL|DLGRL|PLDPM|PLBPM|HLBPM|HLDRM|PLDRM|HLGRL|DLDRM|DRM|DLBRL|PLGRL)/i.test(campaign);

            if (isLatest) {
                if (!results.pmSummary[pm]) {
                    results.pmSummary[pm] = { pm, zero: 0, targeting: 0, noAudience: 0, observation: 0, closed: 0 };
                }
                if (!results.accountIssues[cidKey]) results.accountIssues[cidKey] = 0;

                if (searchSize === 0 && audience && audience.toLowerCase().trim() !== 'no audience is added') {
                    results.searchSizeZero.push({ ...row, pm });
                    results.pmSummary[pm].zero++;
                    results.accountIssues[cidKey]++;
                }

                if (!hasRlsa && audienceSetting === 'Targeting') {
                    results.targetingWithoutRemarketing.push({ ...row, pm });
                    results.pmSummary[pm].targeting++;
                    results.accountIssues[cidKey]++;
                }

                if (hasRlsa && audienceSetting === 'Observation') {
                    results.observationWithRlsa.push({ ...row, pm });
                    results.pmSummary[pm].observation++;
                    results.accountIssues[cidKey]++;
                }

                if (audience && audience.toLowerCase().trim() === 'no audience is added') {
                    results.noAudienceAdded.push({ ...row, pm });
                    results.pmSummary[pm].noAudience++;
                    results.accountIssues[cidKey]++;
                }

                if (membershipStatus === 'CLOSED' && audience) {
                    results.closedMembership.push({ ...row, pm });
                    results.pmSummary[pm].closed++;
                    results.accountIssues[cidKey]++;
                }
            } else if (isPrev) {
                if (searchSize === 0 && audience && audience.toLowerCase().trim() !== 'no audience is added') results.prevCounts.zero++;
                if (!hasRlsa && audienceSetting === 'Targeting') results.prevCounts.targeting++;
                if (hasRlsa && audienceSetting === 'Observation') results.prevCounts.observation++;
                if (audience && audience.toLowerCase().trim() === 'no audience is added') results.prevCounts.noAudience++;
                if (membershipStatus === 'CLOSED' && audience) results.prevCounts.closed++;
            }
        });

        return {
            ...results,
            availableDates: uniqueDates,
            pmSummaryList: Object.values(results.pmSummary).sort((a, b) => {
                const totalA = a.zero + a.targeting + a.noAudience + a.observation + a.closed;
                const totalB = b.zero + b.targeting + b.noAudience + b.observation + b.closed;
                return totalB - totalA;
            })
        };
    }, [audienceData, data, audienceFilterPM, audienceSelectedDate]);

    const campaignAudit = useMemo(() => {
        const LANGUAGE_MAP: Record<string, string> = {
            af: 'Afrikaans', sq: 'Albanian', am: 'Amharic', ar: 'Arabic', hy: 'Armenian', az: 'Azerbaijani', eu: 'Basque', be: 'Belarusian', bn: 'Bengali', bs: 'Bosnian', bg: 'Bulgarian', ca: 'Catalan', ceb: 'Cebuano', ny: 'Chichewa', zh: 'Chinese', co: 'Corsican', hr: 'Croatian', cs: 'Czech', da: 'Danish', nl: 'Dutch', en: 'English', eo: 'Esperanto', et: 'Estonian', tl: 'Filipino', fi: 'Finnish', fr: 'French', fy: 'Frisian', gl: 'Galician', ka: 'Georgian', de: 'German', el: 'Greek', gu: 'Gujarati', ht: 'Haitian Creole', ha: 'Hausa', haw: 'Hawaiian', he: 'Hebrew', hi: 'Hindi', hmn: 'Hmong', hu: 'Hungarian', is: 'Icelandic', ig: 'Igbo', id: 'Indonesian', ga: 'Irish', it: 'Italian', ja: 'Japanese', jw: 'Javanese', kn: 'Kannada', kk: 'Kazakh', km: 'Khmer', rw: 'Kinyarwanda', ko: 'Korean', ku: 'Kurdish (Kurmanji)', ky: 'Kyrgyz', lo: 'Lao', la: 'Latin', lv: 'Latvian', lt: 'Lithuanian', lb: 'Luxembourgish', mk: 'Macedonian', mg: 'Malagasy', ms: 'Malay', ml: 'Malayalam', mt: 'Maltese', mi: 'Maori', mr: 'Marathi', mn: 'Mongolian', my: 'Myanmar (Burmese)', ne: 'Nepali', no: 'Norwegian', or: 'Odia (Oriya)', ps: 'Pashto', fa: 'Persian', pl: 'Polish', pt: 'Portuguese', pa: 'Punjabi', ro: 'Romanian', ru: 'Russian', sm: 'Samoan', gd: 'Scots Gaelic', sr: 'Serbian', st: 'Sesotho', sn: 'Shona', sd: 'Sindhi', si: 'Sinhala', sk: 'Slovak', sl: 'Slovenian', so: 'Somali', es: 'Spanish', su: 'Sundanese', sw: 'Swahili', sv: 'Swedish', tg: 'Tajik', ta: 'Tamil', tt: 'Tatar', te: 'Telugu', th: 'Thai', tr: 'Turkish', tk: 'Turkmen', uk: 'Ukrainian', ur: 'Urdu', ug: 'Uyghur', uz: 'Uzbek', vi: 'Vietnamese', cy: 'Welsh', xh: 'Xhosa', yi: 'Yidish', yo: 'Yoruba', zu: 'Zulu'
        };

        const parseNum = (v: any) => {
            if (v === null || v === undefined || v === '') return 0;
            return parseFloat(v.toString().replace(/[$,%]/g, '')) || 0;
        };
        const normalize = (v: any) => (v || '').toString().trim().toLowerCase();

        // Filter by selected date if specified
        let filteredCampaignData = campaignAuditData;

        if (campaignSelectedDate) {
            filteredCampaignData = campaignAuditData.filter(row => row.date === campaignSelectedDate);
        }

        const uniqueDates = Array.from(new Set(filteredCampaignData.map(d => d.date).filter(Boolean)))
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        const latestDate = uniqueDates[0] || null;
        const previousDate = uniqueDates[1] || null;

        const cidToPm: Record<string, string> = {};
        data.forEach(item => {
            if (item.cid) cidToPm[item.cid.replace(/\D/g, '')] = item.pm;
        });

        const results = {
            latestDate,
            underBudget: [] as any[],
            deviceNegatives: [] as any[],
            rotateForever: [] as any[],
            lowCpc: [] as any[],
            lowOpti: [] as any[],
            displaySelect: [] as any[],
            disapproved: [] as any[],
            zeroAds: [] as any[],
            langMismatch: [] as any[],
            prevCounts: { budget: 0, device: 0, rotate: 0, cpc: 0, opti: 0, display: 0, disapproved: 0, ads: 0, lang: 0 },
            pmSummary: {} as Record<string, any>,
            accountIssues: {} as Record<string, number>
        };

        filteredCampaignData.forEach(row => {
            const cidKey = (row.cid || '').replace(/\D/g, '');
            const pm = cidToPm[cidKey] || 'Unknown';
            if (EXCLUDED_PMS.includes(pm)) return;

            // Filter by PM if selected
            if (campaignFilterPM.length > 0 && !campaignFilterPM.includes(pm)) return;

            const isLatest = latestDate && row.date === latestDate;
            const isPrev = previousDate && row.date === previousDate;

            if (!isLatest && !isPrev) return;

            const budget = parseNum(row.dailyBudget);
            const status = normalize(row.campaignStatus);
            const adRotation = normalize(row.adRotation);
            const maxCpc = parseNum(row.maxCpc);
            let optiScore = parseNum(row.optimizationScore);

            if (optiScore > 0 && optiScore <= 1.5) optiScore = optiScore * 100;

            const type = normalize(row.campaignType);
            const displaySelect = normalize(row.displaySelect);
            const disapproved = row.disapprovedAds?.toString().trim();
            const activeAds = parseNum(row.activeAds);
            const campaign = row.campaignName || '';
            const langTarget = row.language || '';

            if (status !== 'enabled') return;

            if (isLatest) {
                if (!results.pmSummary[pm]) {
                    results.pmSummary[pm] = { pm, totalCampaigns: 0, budget: 0, device: 0, rotate: 0, cpc: 0, opti: 0, display: 0, disapproved: 0, ads: 0, lang: 0 };
                }
                if (!results.accountIssues[cidKey]) results.accountIssues[cidKey] = 0;

                // Count total campaigns for this PM (only for latest date)
                if (isLatest) {
                    results.pmSummary[pm].totalCampaigns++;
                }

                if (budget > 0 && budget < 10) {
                    results.underBudget.push({ ...row, pm, reason: `$${budget} Budget` });
                    results.pmSummary[pm].budget++;
                    results.accountIssues[cidKey]++;
                }

                const deviceRaw = row.deviceAdjustment?.toString() || '';
                const deviceMatch = deviceRaw.match(/-?\d+/g);
                if (deviceMatch && deviceMatch.length >= 3) {
                    const vals = deviceMatch.map(Number);
                    if (vals.slice(0, 3).every((v: number) => v <= -90)) {
                        results.deviceNegatives.push({ ...row, pm, reason: 'Extreme -90%+ Adjustments' });
                        results.pmSummary[pm].device++;
                        results.accountIssues[cidKey]++;
                    }
                }

                if (adRotation === 'rotate_forever') {
                    results.rotateForever.push({ ...row, pm, reason: 'Rotation: Forever' });
                    results.pmSummary[pm].rotate++;
                    results.accountIssues[cidKey]++;
                }

                if (maxCpc > 0 && maxCpc < 1) {
                    results.lowCpc.push({ ...row, pm, reason: `$${maxCpc} CPC` });
                    results.pmSummary[pm].cpc++;
                    results.accountIssues[cidKey]++;
                }

                if (optiScore > 0 && optiScore < 70) {
                    results.lowOpti.push({ ...row, pm, reason: `${optiScore.toFixed(0)}% Score` });
                    results.pmSummary[pm].opti++;
                    results.accountIssues[cidKey]++;
                }

                if (type === 'search' && displaySelect === 'yes') {
                    results.displaySelect.push({ ...row, pm, reason: 'Display Select ON' });
                    results.pmSummary[pm].display++;
                    results.accountIssues[cidKey]++;
                }

                if (disapproved && disapproved !== '0') {
                    results.disapproved.push({ ...row, pm, reason: discontinuedStatus(disapproved) });
                    results.pmSummary[pm].disapproved++;
                    results.accountIssues[cidKey]++;
                }

                if (type === 'search' && activeAds === 0) {
                    results.zeroAds.push({ ...row, pm, reason: 'Zero Ads' });
                    results.pmSummary[pm].ads++;
                    results.accountIssues[cidKey]++;
                }

                const langMatch = campaign.match(/\bL[-_]?([A-Za-z]{2})\b/);
                if (langMatch) {
                    const code = langMatch[1].toLowerCase();
                    const expectedLang = LANGUAGE_MAP[code];
                    const normalizedTarget = langTarget.toLowerCase().replace(/[^a-z]/g, '');
                    const normalizedExpected = expectedLang?.toLowerCase().replace(/[^a-z]/g, '');
                    if (normalizedExpected && !normalizedTarget.includes(normalizedExpected)) {
                        results.langMismatch.push({ ...row, pm, reason: `Camp: ${expectedLang}, Target: ${langTarget}` });
                        results.pmSummary[pm].lang++;
                        results.accountIssues[cidKey]++;
                    }
                }
            } else if (isPrev) {
                if (budget > 0 && budget < 10) results.prevCounts.budget++;
                const deviceMatch = (row.deviceAdjustment?.toString() || '').match(/-?\d+/g);
                if (deviceMatch && deviceMatch.length >= 3 && deviceMatch.map(Number).slice(0, 3).every((v: number) => v <= -90)) results.prevCounts.device++;
                if (adRotation === 'rotate_forever') results.prevCounts.rotate++;
                if (maxCpc > 0 && maxCpc < 1) results.prevCounts.cpc++;
                if (optiScore > 0 && optiScore < 70) results.prevCounts.opti++;
                if (type === 'search' && displaySelect === 'yes') results.prevCounts.display++;
                if (disapproved && disapproved !== '0') results.prevCounts.disapproved++;
                if (type === 'search' && activeAds === 0) results.prevCounts.ads++;
                const langMatch = campaign.match(/\bL[-_]?([A-Za-z]{2})\b/);
                if (langMatch) {
                    const code = langMatch[1].toLowerCase();
                    const expectedLang = LANGUAGE_MAP[code];
                    const normalizedTarget = langTarget.toLowerCase().replace(/[^a-z]/g, '');
                    const normalizedExpected = expectedLang?.toLowerCase().replace(/[^a-z]/g, '');
                    if (normalizedExpected && !normalizedTarget.includes(normalizedExpected)) results.prevCounts.lang++;
                }
            }
        });

        function discontinuedStatus(val: string) {
            if (val === '0') return 'None';
            return val;
        }

        return {
            ...results,
            availableDates: uniqueDates,
            pmSummaryList: Object.values(results.pmSummary).sort((a, b) => {
                const totalA = a.budget + a.device + a.rotate + a.cpc + a.opti + a.display + a.disapproved + a.ads + a.lang;
                const totalB = b.budget + b.device + b.rotate + b.cpc + b.opti + b.display + b.disapproved + b.ads + b.lang;
                return totalB - totalA;
            })
        };
    }, [campaignAuditData, data, campaignFilterPM, campaignSelectedDate]);

    const dailyStats = useMemo(() => {
        const stats = {
            total: 0,
            projects: filteredDailyData.length,
            pms: new Set(filteredDailyData.map(d => d.pm)).size,
            critical: 0,
            low: 0,
            onTrack: 0
        };

        filteredDailyData.forEach(item => {
            const status = calculateKpiStatus(item);
            if (status === 'Critical') stats.critical++;
            else if (status === 'Low') stats.low++;
            else if (status === 'On Track') stats.onTrack++;
        });

        stats.total = stats.critical + stats.low + stats.onTrack;
        return stats;
    }, [filteredDailyData]);

    const dailyPmStats = useMemo(() => {
        const pmMap: Record<string, any> = {};
        filteredDailyData.forEach(row => {
            if (!pmMap[row.pm]) pmMap[row.pm] = { label: row.pm, total: 0, critical: 0, low: 0, onTrack: 0 };
            pmMap[row.pm].total++;
            const status = calculateKpiStatus(row);
            if (status === 'Critical') pmMap[row.pm].critical++;
            else if (status === 'Low') pmMap[row.pm].low++;
            else pmMap[row.pm].onTrack++;
        });
        return Object.values(pmMap).map((pm: any) => ({
            ...pm,
            criticalPct: pm.total > 0 ? (pm.critical / pm.total) * 100 : 0,
            lowPct: pm.total > 0 ? (pm.low / pm.total) * 100 : 0,
            onTrackPct: pm.total > 0 ? (pm.onTrack / pm.total) * 100 : 0
        })).sort((a, b) => {
            let valA = (a as any)[pmSortField];
            let valB = (b as any)[pmSortField];
            if (typeof valA === 'string') return pmSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return pmSortOrder === 'asc' ? valA - valB : valB - valA;
        });
    }, [filteredDailyData, pmSortField, pmSortOrder]);

    const dailyTeamStats = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const teamMap: Record<string, any> = {};
        filteredDailyData.forEach(row => {
            const t = row.team || 'Unknown';
            if (t.toLowerCase().includes('sohan')) return;
            if (!teamMap[t]) teamMap[t] = { label: t, total: 0, critical: 0, low: 0, onTrack: 0 };
            teamMap[t].total++;
            const status = calculateKpiStatus(row);
            if (status === 'Critical') teamMap[t].critical++;
            else if (status === 'Low') teamMap[t].low++;
            else teamMap[t].onTrack++;
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Object.values(teamMap).map((team: any) => ({
            ...team,
            criticalPct: team.total > 0 ? (team.critical / team.total) * 100 : 0,
            lowPct: team.total > 0 ? (team.low / team.total) * 100 : 0,
            onTrackPct: team.total > 0 ? (team.onTrack / team.total) * 100 : 0
        })).sort((a, b) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const valA = (a as any)[teamSortField];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const valB = (b as any)[teamSortField];
            if (typeof valA === 'string') return teamSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return teamSortOrder === 'asc' ? valA - valB : valB - valA;
        });
    }, [filteredDailyData, teamSortField, teamSortOrder]);

    const portfolioStats = useMemo(() => {
        const selectedMonths = portfolioFilterMonth.length > 0 ? portfolioFilterMonth : [monthOptions[monthOptions.length - 1] || ''];
        if (selectedMonths.length === 0 || !selectedMonths[0]) return [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pmStats: Record<string, any> = {};

        monthlyData.forEach(item => {
            const label = formatMonthDisplay(item.month);
            if (!selectedMonths.includes(label)) return;
            if (EXCLUDED_PMS.includes(item.pm)) return;
            if (item.objective !== 'ROAS') return;
            if (portfolioFilterTeam.length > 0 && !portfolioFilterTeam.includes(item.team)) return;
            if (portfolioFilterStrategist.length > 0 && !portfolioFilterStrategist.includes(item.strategist)) return;

            const pm = item.pm || 'Unknown';
            if (!pmStats[pm]) {
                pmStats[pm] = {
                    pm,
                    accounts: 0,
                    roasAccounts: 0,
                    critical: 0,
                    low: 0,
                    onTrack: 0,
                    totalBudget: 0,
                    totalCost: 0,
                    totalIssues: 0
                };
            }

            const cid = (item.cid || '').replace(/\D/g, '');
            const cIssues = campaignAudit.accountIssues[cid] || 0;
            const aIssues = audienceAudit.accountIssues[cid] || 0;
            pmStats[pm].totalIssues += (cIssues + aIssues);

            pmStats[pm].accounts++;
            pmStats[pm].roasAccounts++;
            const status = calculateKpiStatus(item);
            if (status === 'Critical') pmStats[pm].critical++;
            else if (status === 'Low') pmStats[pm].low++;
            else pmStats[pm].onTrack++;

            const budget = parseFloat(item.monthlyBudget?.toString().replace(/[$,]/g, '') || '0');
            const cost = parseFloat(item.cost?.toString().replace(/[$,]/g, '') || '0');
            pmStats[pm].totalBudget += isNaN(budget) ? 0 : budget;
            pmStats[pm].totalCost += isNaN(cost) ? 0 : cost;
        });

        const numMonths = selectedMonths.length;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Object.values(pmStats).map((s: any) => ({
            ...s,
            // Average counts across months
            accounts: s.accounts / numMonths,
            roasAccounts: s.roasAccounts / numMonths,
            critical: s.critical / numMonths,
            low: s.low / numMonths,
            onTrack: s.onTrack / numMonths,
            totalBudget: s.totalBudget / numMonths,
            totalCost: s.totalCost / numMonths,

            // Percentages (remain same as they are ratios)
            onTrackPct: s.roasAccounts > 0 ? (s.onTrack / s.roasAccounts) * 100 : 0,
            lowPct: s.roasAccounts > 0 ? (s.low / s.roasAccounts) * 100 : 0,
            criticalPct: s.roasAccounts > 0 ? (s.critical / s.roasAccounts) * 100 : 0,
            avgHealth: s.roasAccounts > 0 ? ((s.onTrack + s.low * 0.5) / s.roasAccounts) * 100 : 0,

            // Intensity based on averages
            workloadIntensity: ((s.accounts / numMonths) * 0.6) + ((s.totalCost / numMonths) / 5000 * 0.4),

            // Audit Health Calculation (Latest Snapshot)
            // Average issues per ROAS account
            avgIssues: s.totalIssues / s.roasAccounts,
            auditHealth: Math.max(0, 100 - ((s.totalIssues / (s.roasAccounts * numMonths)) * 8)),
            globalScore: (s.roasAccounts > 0)
                ? (((s.onTrack + s.low * 0.5) / s.roasAccounts) * 100 * 0.7) + (Math.max(0, 100 - ((s.totalIssues / (s.roasAccounts)) * 8)) * 0.3)
                : 0,
            trend: selectedMonths.slice().reverse().map(m => {
                const items = monthlyData.filter(d => formatMonthDisplay(d.month) === m && d.pm === s.pm && d.objective === 'ROAS');
                if (items.length === 0) return 0;
                const ot = items.filter(d => calculateKpiStatus(d) === 'On Track').length;
                return (ot / items.length) * 100;
            })
        })).sort((a, b) => b.globalScore - a.globalScore);
    }, [monthlyData, monthOptions, portfolioFilterMonth, portfolioFilterTeam, portfolioFilterStrategist, campaignAudit, audienceAudit]);

    const portfolioTrendData = useMemo(() => {
        const selectedMonths = portfolioFilterMonth.length > 0 ? portfolioFilterMonth : [monthOptions[monthOptions.length - 1] || ''];

        return selectedMonths.slice().reverse().map(m => {
            const items = monthlyData.filter(d =>
                formatMonthDisplay(d.month) === m &&
                d.objective === 'ROAS' &&
                (portfolioFilterTeam.length === 0 || portfolioFilterTeam.includes(d.team)) &&
                (portfolioFilterStrategist.length === 0 || portfolioFilterStrategist.includes(d.strategist)) &&
                !EXCLUDED_PMS.includes(d.pm)
            );
            if (items.length === 0) return { month: m, health: 0, accounts: 0 };

            const onTrack = items.filter(d => calculateKpiStatus(d) === 'On Track').length;
            const low = items.filter(d => calculateKpiStatus(d) === 'Low').length;

            const health = ((onTrack + low * 0.5) / items.length) * 100;
            return {
                month: m,
                health: parseFloat(health.toFixed(1)),
                accounts: items.length
            };
        });
    }, [monthlyData, monthOptions, portfolioFilterMonth, portfolioFilterTeam, portfolioFilterStrategist]);

    const activeCIDs = useMemo(() => {
        const cids = new Set<string>();
        const latestMonth = monthOptions[monthOptions.length - 1] || '';
        const selectedMonths = portfolioFilterMonth.length > 0 ? portfolioFilterMonth : [latestMonth];

        monthlyData.forEach(item => {
            const label = formatMonthDisplay(item.month);
            if (selectedMonths.includes(label)) {
                if (portfolioFilterTeam.length > 0 && !portfolioFilterTeam.includes(item.team)) return;
                if (portfolioFilterStrategist.length > 0 && !portfolioFilterStrategist.includes(item.strategist)) return;
                const cid = (item.cid || '').replace(/\D/g, '');
                if (cid) cids.add(cid);
            }
        });
        return cids;
    }, [monthlyData, monthOptions, portfolioFilterMonth, portfolioFilterTeam, portfolioFilterStrategist]);

    const topPortfolioIssues = useMemo(() => {
        const issues = [
            { label: 'Display Select ON', count: campaignAudit.displaySelect?.filter(r => activeCIDs.has((r.cid || '').replace(/\D/g, ''))).length || 0, color: 'text-orange-500', bg: 'bg-orange-500/10', icon: Target },
            { label: 'Low Opti Score', count: campaignAudit.lowOpti?.filter(r => activeCIDs.has((r.cid || '').replace(/\D/g, ''))).length || 0, color: 'text-red-500', bg: 'bg-red-500/10', icon: Activity },
            { label: 'Zero Ads Active', count: campaignAudit.zeroAds?.filter(r => activeCIDs.has((r.cid || '').replace(/\D/g, ''))).length || 0, color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle },
            { label: 'Under Budget', count: campaignAudit.underBudget?.filter(r => activeCIDs.has((r.cid || '').replace(/\D/g, ''))).length || 0, color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Layers },
            { label: 'No Audiences', count: audienceAudit.noAudienceAdded?.filter(r => activeCIDs.has((r.cid || '').replace(/\D/g, ''))).length || 0, color: 'text-red-500', bg: 'bg-red-500/10', icon: Users },
            { label: 'Targeting Bug', count: audienceAudit.targetingWithoutRemarketing?.filter(r => activeCIDs.has((r.cid || '').replace(/\D/g, ''))).length || 0, color: 'text-purple-500', bg: 'bg-purple-500/10', icon: Zap },
        ];

        return issues.sort((a, b) => b.count - a.count).slice(0, 4);
    }, [campaignAudit, audienceAudit, activeCIDs]);

    // -- Monthly KPI Stats & Comparison --
    const selectedMonthLabels = monthlyFilterMonth.length > 0 ? monthlyFilterMonth : [monthOptions[monthOptions.length - 1] || ''];

    // Scorecards Data (Management)
    const totalAccounts = useMemo(() => filteredData.length, [filteredData]);
    const uniquePMsCount = useMemo(() => new Set(filteredData.map(d => d.pm).filter(Boolean)).size, [filteredData]);
    const uniqueTeamsCount = useMemo(() => new Set(filteredData.map(d => d.team).filter(Boolean)).size, [filteredData]);

    const getStatsForLabels = useCallback((labels: string[]) => {
        const mData = monthlyData.filter(i => {
            const label = formatMonthDisplay(i.month);
            const matchMonth = labels.includes(label);
            const matchPM = monthlyFilterPM.length === 0 || monthlyFilterPM.includes(i.pm);
            const matchAccount = monthlyFilterAccount.length === 0 || monthlyFilterAccount.includes(i.accountName);
            const matchClient = monthlyFilterClient.length === 0 || monthlyFilterClient.includes(i.clientAccount);
            const matchObjective = monthlyFilterObjective.length === 0 || monthlyFilterObjective.includes(i.objective);
            return matchMonth && matchPM && matchAccount && matchClient && matchObjective;
        });
        const projects = new Set(mData.map(i => i.accountName)).size;
        const pms = new Set(mData.map(i => i.pm)).size;
        const critical = mData.filter(i => calculateKpiStatus(i) === 'Critical').length;
        const low = mData.filter(i => calculateKpiStatus(i) === 'Low').length;
        const onTrack = mData.filter(i => calculateKpiStatus(i) === 'On Track').length;
        const total = mData.length || 1;
        return { projects, pms, critical, low, onTrack, total };
    }, [monthlyData, monthlyFilterPM, monthlyFilterAccount, monthlyFilterClient, monthlyFilterObjective]);

    // Calculate Previous Period for Comparison
    const getPrevPeriodLabels = useCallback((labels: string[]) => {
        const sortedAll = [...monthOptions].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        const minIdx = Math.min(...labels.map(l => sortedAll.indexOf(l)).filter(idx => idx !== -1));
        if (minIdx === Infinity || minIdx === 0) return null;

        const count = labels.length;
        const start = Math.max(0, minIdx - count);
        return sortedAll.slice(start, minIdx);
    }, [monthOptions]);

    const currStats = useMemo(() => getStatsForLabels(selectedMonthLabels), [selectedMonthLabels, getStatsForLabels]);
    const prevPeriodLabels = useMemo(() => getPrevPeriodLabels(selectedMonthLabels), [selectedMonthLabels, getPrevPeriodLabels]);
    const prevStats = useMemo(() => prevPeriodLabels ? getStatsForLabels(prevPeriodLabels) : null, [prevPeriodLabels, getStatsForLabels]);

    // -- 12 Month Trend Data (KPI Status) --
    const kpiTrendData = useMemo(() => {
        const statsByMonth: Record<string, { critical: number; low: number; onTrack: number; total: number }> = {};

        monthlyData.forEach(i => {
            const matchPM = monthlyFilterPM.length === 0 || monthlyFilterPM.includes(i.pm);
            const matchAccount = monthlyFilterAccount.length === 0 || monthlyFilterAccount.includes(i.accountName);
            const matchClient = monthlyFilterClient.length === 0 || monthlyFilterClient.includes(i.clientAccount);
            const matchObjective = monthlyFilterObjective.length === 0 || monthlyFilterObjective.includes(i.objective);
            const isNotExcluded = !EXCLUDED_PMS.includes(i.pm);

            if (matchPM && matchAccount && matchClient && matchObjective && isNotExcluded) {
                const label = formatMonthDisplay(i.month);
                if (!statsByMonth[label]) {
                    statsByMonth[label] = { critical: 0, low: 0, onTrack: 0, total: 0 };
                }
                const status = calculateKpiStatus(i);
                if (status === 'Critical') statsByMonth[label].critical++;
                else if (status === 'Low') statsByMonth[label].low++;
                else if (status === 'On Track') statsByMonth[label].onTrack++;
                statsByMonth[label].total++;
            }
        });

        return monthOptions.slice(-12).map(monthLabel => {
            const stats = statsByMonth[monthLabel] || { critical: 0, low: 0, onTrack: 0, total: 0 };
            const parts = monthLabel.split(' ');
            return {
                month: parts.length > 1 ? `${parts[0].substring(0, 3)} ${parts[1].substring(2)}` : monthLabel,
                ...stats
            };
        });
    }, [monthlyData, monthOptions, monthlyFilterPM, monthlyFilterAccount, monthlyFilterClient, monthlyFilterObjective]);


    // -- Filter Logic (Budget) --
    const filteredBudgetData = useMemo(() => budgetData.filter(item => {
        const itemMonth = item.startDate ? new Date(item.startDate).toLocaleString('default', { month: 'long', year: 'numeric' }) : '';
        const matchMonth = budgetFilterMonth.length === 0 || budgetFilterMonth.includes(itemMonth);
        const matchPM = budgetFilterPM.length === 0 || budgetFilterPM.includes(item.pm);
        const matchAccount = budgetFilterAccount.length === 0 || budgetFilterAccount.includes(item.accountName);

        return matchMonth && matchPM && matchAccount;
    }), [budgetData, budgetFilterMonth, budgetFilterPM, budgetFilterAccount]);



    const buildKpiSummary = useCallback((groupBy: 'pm' | 'team') => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stats: Record<string, any> = {};

        filteredMonthlyData.forEach(row => {
            const key = groupBy === 'pm' ? row.pm : row.team;
            if (!key) return;

            if (!stats[key]) {
                stats[key] = { label: key, total: 0, critical: 0, low: 0, onTrack: 0 };
            }

            const status = calculateKpiStatus(row);
            stats[key].total++;
            if (status === 'Critical') stats[key].critical++;
            else if (status === 'Low') stats[key].low++;
            else stats[key].onTrack++;
        });

        // Convert to array and sort
        const arr = Object.values(stats);
        const sortField = groupBy === 'pm' ? pmSortField : teamSortField;
        const order = groupBy === 'pm' ? pmSortOrder : teamSortOrder;

        return arr.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            // Handle percentages (Crit %, Low %, OT %)
            const field = sortField;
            if (field.includes('Pct')) {
                const baseField = field.replace('Pct', '');
                valA = a.total > 0 ? (a[baseField] / a.total) : 0;
                valB = b.total > 0 ? (b[baseField] / b.total) : 0;
            }

            if (valA < valB) return order === 'asc' ? -1 : 1;
            if (valA > valB) return order === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredMonthlyData, pmSortField, pmSortOrder, teamSortField, teamSortOrder]);

    const pmKpiSummary = useMemo(() => buildKpiSummary('pm'), [buildKpiSummary]);
    const teamKpiSummary = useMemo(() => buildKpiSummary('team'), [buildKpiSummary]);

    // -- Budget Logic: Currency Formatting --
    const parseCurrency = (val: string) => Math.ceil(parseFloat(val.replace(/,/g, '') || '0'));
    const formatCurrency = (amount: number, currencyCode: string) => {
        const symbolMap: Record<string, string> = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'AUD': 'A$', 'CAD': 'C$' };
        const symbol = symbolMap[currencyCode] || currencyCode;
        return `${symbol}${amount.toLocaleString()}`;
    };

    // -- Budget Logic: PM Summary Table (Based on CURRENT Filtered View) --
    // "total number of exhastions (count of their names) and the total number of accounts (count of unqie account name)"
    const pmSummaryStats = useMemo(() => Object.values(filteredBudgetData.reduce((acc, row) => {
        if (!row.pm) return acc;
        if (!acc[row.pm]) {
            acc[row.pm] = { pm: row.pm, exhaustions: 0, distinctAccounts: new Set() };
        }
        acc[row.pm].exhaustions += 1; // Count of rows
        acc[row.pm].distinctAccounts.add(row.accountName);
        return acc;
    }, {} as Record<string, { pm: string, exhaustions: number, distinctAccounts: Set<string> }>))
        .map(stat => ({ ...stat, distinctAccounts: stat.distinctAccounts.size }))
        .sort((a, b) => b.exhaustions - a.exhaustions), [filteredBudgetData]);

    // Filter Active PMs
    const activePMs = useMemo(() => new Set(pmData
        .filter(p => {
            const name = p.pm || '';
            const statusMatch = p.status?.toLowerCase() === 'active';
            const nameMatch = !name.toLowerCase().includes('team') && !name.toLowerCase().includes('sohan');
            return statusMatch && nameMatch;
        })
        .map(p => p.pm)
    ), [pmData]);

    // Calculate Month Range
    const uniqueStartDates = Array.from(new Set(budgetData.map(d => d.startDate).filter(Boolean)));

    // Sort by Date to ensure chronological order
    const sortedDates = uniqueStartDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // Map to "MMM YY" and Deduplicate while preserving order
    const allChronologicalMonths = Array.from(new Set(
        sortedDates.map(d => new Date(d).toLocaleString('default', { month: 'short', year: '2-digit' }))
    ));

    // Filter Months for Display
    const heatmapMonths = allChronologicalMonths.filter(m => {
        if (!heatmapStartMonth || !heatmapEndMonth) return true;

        const mIdx = allChronologicalMonths.indexOf(m);
        const startIdx = allChronologicalMonths.indexOf(heatmapStartMonth);
        const endIdx = allChronologicalMonths.indexOf(heatmapEndMonth);

        if (startIdx === -1 || endIdx === -1) return true; // Fallback
        return mIdx >= startIdx && mIdx <= endIdx;
    });

    const heatmapData = useMemo(() => budgetData.reduce((acc, row) => {
        if (!row.pm || !row.startDate) return acc;

        // PM Status Filter
        // If pmData matches rows, check status. Note: pmData names must match budgetData names exactly.
        if (pmData.length > 0 && !activePMs.has(row.pm)) return acc;

        const month = new Date(row.startDate).toLocaleString('default', { month: 'short', year: '2-digit' });

        // Month Range Filter (Don't count exhaustions outside selected range)
        if (!heatmapMonths.includes(month)) return acc;

        if (!acc[row.pm]) acc[row.pm] = {};
        if (!acc[row.pm][month]) acc[row.pm][month] = 0;
        acc[row.pm][month] += 1;
        return acc;
    }, {} as Record<string, Record<string, number>>), [budgetData, pmData, activePMs, heatmapMonths]);

    const uniqueHeatmapPMs = useMemo(() => Array.from(activePMs).sort((a: string, b: string) => {
        const totalA = heatmapMonths.reduce((sum, m) => sum + (heatmapData[a]?.[m] || 0), 0);
        const totalB = heatmapMonths.reduce((sum, m) => sum + (heatmapData[b]?.[m] || 0), 0);
        if (totalA !== totalB) return totalB - totalA;
        return a.localeCompare(b);
    }), [activePMs, heatmapMonths, heatmapData]);

    // Find global max in current visible range for color normalization
    const maxHeatmapVal = useMemo(() => Math.max(
        ...uniqueHeatmapPMs.map(pm =>
            Math.max(...heatmapMonths.map(m => heatmapData[pm]?.[m] || 0))
        ),
        1
    ), [uniqueHeatmapPMs, heatmapMonths, heatmapData]);

    // -- Styles --
    const cardClass = darkMode
        ? "bg-white/5 border-white/10 backdrop-blur-md"
        : "bg-white border-gray-200 shadow-xl text-gray-800";

    const textMuted = darkMode ? "text-gray-400" : "text-gray-500";
    const trHover = darkMode ? "hover:bg-white/5" : "hover:bg-gray-50";

    const SortHeader = ({ label, field, currentField, order, onSort, className = "", justify = "justify-center" }: { label: string, field: string, currentField: string, order: string, onSort: (f: string) => void, className?: string, justify?: string }) => {
        const isActive = field === currentField;
        return (
            <th
                className={clsx("p-3 cursor-pointer select-none transition-colors hover:bg-white/5 group", className)}
                onClick={() => onSort(field)}
            >
                <div className={clsx("flex items-center gap-1", justify)}>
                    <span>{label}</span>
                    <span className={clsx("text-[10px] transition-opacity", isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40")}>
                        {isActive ? (order === 'asc' ? '▲' : '▼') : '▲'}
                    </span>
                </div>
            </th>
        );
    };

    const handleSortMonthly = (field: string) => {
        if (monthlySortField === field) {
            setMonthlySortOrder(monthlySortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setMonthlySortField(field);
            setMonthlySortOrder('asc');
        }
    };

    const handleSortPM = (field: string) => {
        if (pmSortField === field) {
            setPmSortOrder(pmSortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setPmSortField(field);
            setPmSortOrder('asc');
        }
    };

    const handleSortTeam = (field: string) => {
        if (teamSortField === field) {
            setTeamSortOrder(teamSortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setTeamSortField(field);
            setTeamSortOrder('asc');
        }
    };
    const handleSortDaily = (field: string) => {
        if (dailySortField === field) {
            setDailySortOrder(dailySortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setDailySortField(field);
            setDailySortOrder('asc');
        }
    };





    return (
        <div className={clsx("min-h-screen p-8 font-sans selection:bg-purple-500/30 transition-colors duration-300", darkMode ? "bg-black text-white" : "bg-gray-50 text-gray-900")}>

            {/* Header */}
            <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-6">
                    <div className={clsx("h-20 w-auto p-2 rounded-lg backdrop-blur-sm", darkMode ? "bg-white/10" : "bg-white shadow-sm border border-gray-100")}>
                        <Image
                            src={darkMode ? "/logo.png" : "/logo-light.png"}
                            alt="EME Logo"
                            width={200}
                            height={80}
                            className="h-full w-auto object-contain"
                        />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 uppercase tracking-tight">
                            Paid Media Team
                        </h1>
                        <p className={clsx("mt-1 text-[13px] font-black tracking-[0.4em] uppercase opacity-50", textMuted)}>
                            Performance Engine Hub
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Tabs */}
                    <div className={clsx("flex p-1 rounded-xl", darkMode ? "bg-white/10" : "bg-gray-200")}>
                        <button
                            onClick={() => setActiveTab('management')}
                            className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === 'management' ? (darkMode ? "bg-purple-600 text-white shadow-lg" : "bg-white text-purple-700 shadow") : "text-gray-400 hover:text-gray-200")}
                        >
                            Team Hub
                        </button>
                        <button
                            onClick={() => setActiveTab('budget')}
                            className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === 'budget' ? (darkMode ? "bg-purple-600 text-white shadow-lg" : "bg-white text-purple-700 shadow") : "text-gray-400 hover:text-gray-200")}
                        >
                            Budget Tracker
                        </button>
                        <button
                            onClick={() => setActiveTab('monthly')}
                            className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === 'monthly' ? (darkMode ? "bg-purple-600 text-white shadow-lg" : "bg-white text-purple-700 shadow") : "text-gray-400 hover:text-gray-200")}
                        >
                            Monthly KPI
                        </button>
                        <button
                            onClick={() => setActiveTab('daily')}
                            className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === 'daily' ? (darkMode ? "bg-purple-600 text-white shadow-lg" : "bg-white text-purple-700 shadow") : "text-gray-400 hover:text-gray-200")}
                        >
                            Daily KPI
                        </button>
                        <button
                            onClick={() => setActiveTab('portfolio')}
                            className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === 'portfolio' ? (darkMode ? "bg-purple-600 text-white shadow-lg" : "bg-white text-purple-700 shadow") : "text-gray-400 hover:text-gray-200")}
                        >
                            Portfolio Health
                        </button>
                        <button
                            onClick={() => setActiveTab('audience')}
                            className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === 'audience' ? (darkMode ? "bg-purple-600 text-white shadow-lg" : "bg-white text-purple-700 shadow") : "text-gray-400 hover:text-gray-200")}
                        >
                            Audience Health
                        </button>
                        <button
                            onClick={() => setActiveTab('campaign')}
                            className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === 'campaign' ? (darkMode ? "bg-purple-600 text-white shadow-lg" : "bg-white text-purple-700 shadow") : "text-gray-400 hover:text-gray-200")}
                        >
                            Campaign Health
                        </button>
                    </div>

                    {/* Toggle Theme */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={syncAll}
                            disabled={loading}
                            className={clsx(
                                "p-3 rounded-full transition-all hover:bg-white/10 active:scale-95",
                                darkMode ? "text-blue-400" : "text-blue-600 bg-white shadow"
                            )}
                            title="Force Sync all sheets"
                        >
                            <RefreshCcw className={clsx("w-5 h-5", loading && "animate-spin")} />
                        </button>
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className={clsx("p-3 rounded-full transition-all transform hover:scale-110", darkMode ? "bg-white/10 text-yellow-400 hover:bg-white/20" : "bg-white shadow-lg text-purple-600 hover:bg-gray-50")}
                        >
                            {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* View Content */}
            {activeTab === 'management' ? (
                <div className="animate-in fade-in duration-500">
                    {/* Scorecards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className={clsx("border p-6 rounded-2xl", cardClass)}>
                            <div className="flex items-center gap-3 mb-2 text-blue-400">
                                <Target className="w-5 h-5" />
                                <h3 className="font-medium text-sm uppercase tracking-wide">Total Accounts</h3>
                            </div>
                            <p className="text-3xl font-bold">{totalAccounts}</p>
                        </div>
                        <div className={clsx("border p-6 rounded-2xl", cardClass)}>
                            <div className="flex items-center gap-3 mb-2 text-purple-400">
                                <User className="w-5 h-5" />
                                <h3 className="font-medium text-sm uppercase tracking-wide">Total PMs</h3>
                            </div>
                            <p className="text-3xl font-bold">{uniquePMsCount}</p>
                        </div>
                        <div className={clsx("border p-6 rounded-2xl", cardClass)}>
                            <div className="flex items-center gap-3 mb-2 text-pink-400">
                                <Globe className="w-5 h-5" />
                                <h3 className="font-medium text-sm uppercase tracking-wide">Total Teams</h3>
                            </div>
                            <p className="text-3xl font-bold">{uniqueTeamsCount}</p>
                        </div>
                    </div>

                    {/* Filters Bar */}
                    {data.length > 0 && (
                        <div className={clsx("flex flex-col gap-4 mb-8 p-6 border rounded-xl relative z-20", cardClass)}>
                            <div className={clsx("flex items-center gap-2 mb-2", textMuted)}>
                                <Filter className="w-4 h-4" />
                                <span className="text-sm font-medium">Filters:</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <MultiSelect label="Account Name" options={uniqueAccountNames} selected={filterAccountName} onChange={setFilterAccountName} darkMode={darkMode} />
                                <MultiSelect label="Client Account" options={uniqueClientAccounts} selected={filterClientAccount} onChange={setFilterClientAccount} darkMode={darkMode} />
                                <MultiSelect label="PM" options={uniquePMs} selected={filterPM} onChange={setFilterPM} darkMode={darkMode} />
                                <MultiSelect label="Team" options={uniqueTeams} selected={filterTeam} onChange={setFilterTeam} darkMode={darkMode} />
                                <MultiSelect label="Strategist" options={uniqueStrategists} selected={filterStrategist} onChange={setFilterStrategist} darkMode={darkMode} />
                                <MultiSelect label="Objective" options={uniqueObjectives} selected={filterObjective} onChange={setFilterObjective} darkMode={darkMode} />
                                <MultiSelect label="Type" options={uniqueTypes} selected={filterType} onChange={setFilterType} darkMode={darkMode} />
                            </div>
                        </div>
                    )}

                    {/* Main Table */}
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Management Data</h3>
                        <ExportButton
                            filename="management-data"
                            title="Management Data"
                            columns={[
                                { header: 'CID', key: 'cid' },
                                { header: 'Account Name', key: 'accountName' },
                                { header: 'Client Account', key: 'clientAccount' },
                                { header: 'PM', key: 'pm' },
                                { header: 'Team', key: 'team' },
                                { header: 'Objective', key: 'objective' },
                                { header: 'Conv. Source', key: 'conversionSource' },
                                { header: 'Target ROAS', key: 'targetRoas' },
                                { header: 'Strategist', key: 'strategist' },
                                { header: 'Type', key: 'type' },
                                { header: 'Country', key: 'country' },
                            ]}
                            data={filteredData}
                            darkMode={darkMode}
                        />
                    </div>
                    <div className={clsx("overflow-x-auto rounded-2xl border shadow-2xl relative z-10", darkMode ? "border-white/10" : "border-gray-200")}>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={clsx("text-xs uppercase tracking-wider font-bold", darkMode ? "bg-white/10 text-gray-300" : "bg-gray-100 text-gray-600")}>
                                    <th className="p-3 text-center whitespace-nowrap">CID</th>
                                    <th className="p-3 text-center whitespace-nowrap">Account Name</th>
                                    <th className="p-3 text-center whitespace-nowrap">Client Account</th>
                                    <th className="p-3 text-center whitespace-nowrap">PM</th>
                                    <th className="p-3 text-center whitespace-nowrap">Team</th>
                                    <th className="p-3 text-center whitespace-nowrap">Objective</th>
                                    <th className="p-3 text-center whitespace-nowrap">Conv. Source</th>
                                    <th className="p-3 text-center whitespace-nowrap">Target ROAS</th>
                                    <th className="p-3 text-center whitespace-nowrap">Strategist</th>
                                    <th className="p-3 text-center whitespace-nowrap">Type</th>
                                    <th className="p-3 text-center whitespace-nowrap">Country</th>
                                </tr>
                            </thead>
                            <tbody className={clsx("divide-y backdrop-blur-sm text-xs", darkMode ? "bg-white/5 divide-white/5" : "bg-white divide-gray-100")}>
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className={clsx("p-8 text-center", textMuted)}>
                                            {data.length === 0 ? "No data synced yet." : "No matching records found."}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((row, idx) => (
                                        <tr key={idx} className={clsx("transition-colors group", trHover)}>
                                            <td className="p-3 font-mono whitespace-nowrap text-center">{row.cid}</td>
                                            <td className="p-3 font-medium whitespace-nowrap">{row.accountName}</td>
                                            <td className="p-3 whitespace-nowrap">{row.clientAccount}</td>
                                            <td className="p-3 whitespace-nowrap text-center">{row.pm}</td>
                                            <td className="p-3 whitespace-nowrap text-center">{row.team}</td>
                                            <td className="p-3 whitespace-nowrap text-center">{row.objective}</td>
                                            <td className="p-3 whitespace-nowrap text-center">{row.conversionSource}</td>
                                            <td className="p-3 font-mono whitespace-nowrap text-center">{row.targetRoas}</td>
                                            <td className="p-3 whitespace-nowrap text-center">{row.strategist}</td>
                                            <td className="p-3 whitespace-nowrap text-center">{row.type}</td>
                                            <td className="p-3 whitespace-nowrap text-center">
                                                <span className={clsx("px-2 py-0.5 rounded-full text-[10px] border", darkMode ? "bg-white/10 border-white/10" : "bg-gray-100 border-gray-200")}>
                                                    {row.country}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : activeTab === 'monthly' ? (
                <div className="animate-in fade-in duration-500">
                    {/* Filters Bar (Monthly) */}
                    <div className={clsx("flex flex-col gap-4 mb-8 p-6 border rounded-xl relative z-20", cardClass)}>
                        <div className={clsx("flex items-center gap-2 mb-2", textMuted)}>
                            <Filter className="w-4 h-4" />
                            <span className="text-sm font-medium">KPI Filters:</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                            <MultiSelect label="Period" options={monthOptions} selected={selectedMonthLabels} onChange={setMonthlyFilterMonth} darkMode={darkMode} />
                            <MultiSelect label="Status" options={['Critical', 'Low', 'On Track']} selected={monthlyFilterStatus} onChange={setMonthlyFilterStatus} darkMode={darkMode} />
                            <MultiSelect label="PM" options={uniqueMonthlyPMs} selected={monthlyFilterPM} onChange={setMonthlyFilterPM} darkMode={darkMode} />
                            <MultiSelect label="Account" options={uniqueMonthlyAccounts} selected={monthlyFilterAccount} onChange={setMonthlyFilterAccount} darkMode={darkMode} />
                            <MultiSelect label="Client" options={uniqueMonthlyClients} selected={monthlyFilterClient} onChange={setMonthlyFilterClient} darkMode={darkMode} />
                            <MultiSelect label="Objective" options={uniqueMonthlyObjectives} selected={monthlyFilterObjective} onChange={setMonthlyFilterObjective} darkMode={darkMode} />
                        </div>
                    </div>

                    {/* KPI Scorecards Section */}


                    <div className="flex flex-col xl:flex-row gap-6 mb-10 items-stretch w-full">
                        {/* Portfolio Group */}
                        <div className="flex-[1] grid grid-cols-2 gap-4">
                            <StatCard
                                label="Total Projects"
                                value={currStats.projects}
                                change={prevStats?.projects}
                                icon={Layers}
                                color="blue"
                                darkMode={darkMode}
                                showTrend={prevPeriodLabels !== null}
                            />
                            <StatCard
                                label="Active PMs"
                                value={currStats.pms}
                                change={prevStats?.pms}
                                icon={Users}
                                color="purple"
                                darkMode={darkMode}
                                showTrend={prevPeriodLabels !== null}
                            />
                        </div>

                        {/* Health Group */}
                        <div className="flex-[2] grid grid-cols-3 gap-4">
                            <StatCard
                                label="Critical Status"
                                value={currStats.critical}
                                subValue={`${((currStats.critical / currStats.total) * 100).toFixed(0)}%`}
                                change={prevStats?.critical}
                                icon={AlertTriangle}
                                color="red"
                                trendInverted={true}
                                darkMode={darkMode}
                                showTrend={prevPeriodLabels !== null}
                            />
                            <StatCard
                                label="Low Status"
                                value={currStats.low}
                                subValue={`${((currStats.low / currStats.total) * 100).toFixed(0)}%`}
                                change={prevStats?.low}
                                icon={Activity}
                                color="orange"
                                trendInverted={true}
                                darkMode={darkMode}
                                showTrend={prevPeriodLabels !== null}
                            />
                            <StatCard
                                label="On Track Status"
                                value={currStats.onTrack}
                                subValue={`${((currStats.onTrack / currStats.total) * 100).toFixed(0)}%`}
                                change={prevStats?.onTrack}
                                icon={CheckCircle2}
                                color="green"
                                darkMode={darkMode}
                                showTrend={prevPeriodLabels !== null}
                            />
                        </div>
                    </div>



                    {/* Main Table (Monthly KPI) */}
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Monthly KPI Data</h3>
                        <ExportButton
                            filename="monthly-kpi-data"
                            title="Monthly KPI Data"
                            columns={[
                                { header: 'CID', key: 'cid' },
                                { header: 'Account Name', key: 'accountName' },
                                { header: 'Conv. Source', key: 'conversionSource' },
                                { header: 'PM', key: 'pm' },
                                { header: 'Target', key: 'targetRoas' },
                                { header: 'Actual', key: 'actualRoas' },
                                { header: 'Impressions', key: 'impressions' },
                                { header: 'Clicks', key: 'clicks' },
                                { header: 'Cost', key: 'cost' },
                                { header: 'Conversions', key: 'conversions' },
                                { header: 'Revenue', key: 'revenue' },
                            ]}
                            data={filteredMonthlyData}
                            darkMode={darkMode}
                        />
                    </div>
                    <div className={clsx("rounded-2xl border shadow-2xl relative z-10 overflow-hidden", darkMode ? "border-white/10" : "border-gray-200")}>
                        <div className="max-h-[750px] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            <table className="w-full text-left border-collapse table-auto">
                                <thead className={clsx("sticky top-0 z-20", darkMode ? "bg-[#111] text-gray-300" : "bg-gray-100 text-gray-600")}>
                                    <tr className="text-[12px] uppercase tracking-wider font-extrabold border-b border-white/5">
                                        <th className="p-1.5 text-center">#</th>
                                        <SortHeader label="CID" field="cid" currentField={monthlySortField} order={monthlySortOrder} onSort={handleSortMonthly} className="p-1.5" />
                                        <SortHeader label="Account Name" field="accountName" currentField={monthlySortField} order={monthlySortOrder} onSort={handleSortMonthly} className="p-1.5 text-left" justify="justify-start" />
                                        <SortHeader label="Conv. Source" field="conversionSource" currentField={monthlySortField} order={monthlySortOrder} onSort={handleSortMonthly} className="p-1.5" />
                                        <SortHeader label="PM" field="pm" currentField={monthlySortField} order={monthlySortOrder} onSort={handleSortMonthly} className="p-1.5" />
                                        <SortHeader label="Status" field="status" currentField={monthlySortField} order={monthlySortOrder} onSort={handleSortMonthly} className="p-1.5" />
                                        <SortHeader label="Target" field="targetRoas" currentField={monthlySortField} order={monthlySortOrder} onSort={handleSortMonthly} className="p-1.5" />
                                        <SortHeader label="Actual" field="actualRoas" currentField={monthlySortField} order={monthlySortOrder} onSort={handleSortMonthly} className="p-1.5" />
                                        <SortHeader label="Impr" field="impressions" currentField={monthlySortField} order={monthlySortOrder} onSort={handleSortMonthly} className="p-1.5 text-right" justify="justify-end" />
                                        <SortHeader label="Clicks" field="clicks" currentField={monthlySortField} order={monthlySortOrder} onSort={handleSortMonthly} className="p-1.5 text-right" justify="justify-end" />
                                        <SortHeader label="Cost" field="cost" currentField={monthlySortField} order={monthlySortOrder} onSort={handleSortMonthly} className="p-1.5 text-right" justify="justify-end" />
                                        <SortHeader label="Conv" field="conversions" currentField={monthlySortField} order={monthlySortOrder} onSort={handleSortMonthly} className="p-1.5 text-right" justify="justify-end" />
                                        <SortHeader label="Revenue" field="conversionValue" currentField={monthlySortField} order={monthlySortOrder} onSort={handleSortMonthly} className="p-1.5 text-right" justify="justify-end" />
                                    </tr>
                                </thead>
                                <tbody className={clsx("divide-y backdrop-blur-sm text-xs", darkMode ? "bg-white/5 divide-white/5" : "bg-white divide-gray-100")}>
                                    {filteredMonthlyData.length === 0 ? (
                                        <tr>
                                            <td colSpan={13} className={clsx("p-12 text-center", textMuted)}>
                                                <div className="flex flex-col items-center gap-4">
                                                    <span>No KPI data found for the selected filters.</span>
                                                    <button onClick={syncAll} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors">
                                                        Tap to Sync Data
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredMonthlyData.map((row, idx) => {
                                            const cost = parseFloat(row.cost?.toString().replace(/[$,]/g, '') || '0');
                                            const val = parseFloat(row.conversionValue?.toString().replace(/[$,]/g, '') || '0');
                                            const roas = cost > 0 ? (val / cost).toFixed(2) : '0.00';
                                            const status = calculateKpiStatus(row);
                                            return (
                                                <tr key={idx} className={clsx("transition-colors group", trHover)}>
                                                    <td className="p-1.5 text-center opacity-30 font-mono text-[9px]">{idx + 1}</td>
                                                    <td className="p-1.5 font-mono text-center text-[10px] opacity-70">{row.cid || '-'}</td>
                                                    <td className="p-1.5 font-medium whitespace-nowrap">{row.accountName}</td>
                                                    <td className="p-1.5 text-[10px] text-center opacity-70">{row.conversionSource}</td>
                                                    <td className="p-1.5 text-center font-medium">{row.pm}</td>
                                                    <td className="p-1.5 text-center">
                                                        <span className={clsx(
                                                            "px-2 py-0 rounded-full text-[9px] font-bold shadow-sm",
                                                            status === 'Critical' ? "bg-red-500/20 text-red-500 border border-red-500/10" :
                                                                status === 'Low' ? "bg-orange-500/20 text-orange-500 border border-orange-500/10" :
                                                                    "bg-green-500/20 text-green-500 border border-green-500/10"
                                                        )}>
                                                            {status}
                                                        </span>
                                                    </td>
                                                    <td className="p-1.5 text-center font-mono opacity-50">{row.targetRoas?.replace(/x/i, '')}</td>
                                                    <td className="p-1.5 text-center">
                                                        <span className={clsx(
                                                            "px-2 py-0 rounded-full font-bold font-mono text-[10px]",
                                                            status === 'Critical' ? "text-red-500 bg-red-500/10" :
                                                                status === 'Low' ? "text-orange-500 bg-orange-500/10" :
                                                                    "text-green-500 bg-green-500/10"
                                                        )}>
                                                            {roas}
                                                        </span>
                                                    </td>
                                                    <td className="p-1.5 text-right font-mono">{formatFullNumber(row.impressions)}</td>
                                                    <td className="p-1.5 text-right font-mono">{formatFullNumber(row.clicks)}</td>
                                                    <td className="p-1.5 text-right font-mono font-medium">${formatPriceRounded(row.cost)}</td>
                                                    <td className="p-1.5 text-right font-mono">{Math.ceil(parseFloat(row.conversions?.toString() || '0'))}</td>
                                                    <td className="p-1.5 text-right font-mono font-medium">${formatPriceRounded(row.conversionValue)}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary Tables (PM & Team) - Moved Down & Stacked Vertical */}
                    <div className="flex flex-col gap-10 mt-12 mb-10">
                        {/* PM KPI Summary */}
                        <div className={clsx("overflow-hidden rounded-2xl border shadow-lg", cardClass)}>
                            <div className={clsx("p-4 border-b flex items-center justify-between", darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50")}>
                                <span className={clsx("text-xs font-black tracking-widest uppercase", darkMode ? "text-gray-400" : "text-gray-600")}>PM KPI Performance Summary</span>
                                <ExportButton
                                    filename="pm-kpi-summary"
                                    title="PM KPI Performance Summary"
                                    columns={[
                                        { header: 'PM', key: 'label' },
                                        { header: 'Accounts', key: 'total' },
                                        { header: 'Critical', key: 'critical' },
                                        { header: 'Critical %', key: 'criticalPct' },
                                        { header: 'Low', key: 'low' },
                                        { header: 'Low %', key: 'lowPct' },
                                        { header: 'On Track', key: 'onTrack' },
                                        { header: 'On Track %', key: 'onTrackPct' },
                                    ]}
                                    data={pmKpiSummary.map(s => ({
                                        ...s,
                                        criticalPct: s.total > 0 ? `${(s.critical / s.total * 100).toFixed(0)}%` : '0%',
                                        lowPct: s.total > 0 ? `${(s.low / s.total * 100).toFixed(0)}%` : '0%',
                                        onTrackPct: s.total > 0 ? `${(s.onTrack / s.total * 100).toFixed(0)}%` : '0%',
                                    }))}
                                    darkMode={darkMode}
                                />
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-center">
                                    <thead className={clsx("sticky top-0 z-10", darkMode ? "bg-[#111] text-gray-400" : "bg-white/90 text-gray-500")}>
                                        <tr className="border-b border-white/5">
                                            <th className="p-1.5 text-center w-8 opacity-40 font-bold">#</th>
                                            <SortHeader label="PM" field="label" currentField={pmSortField} order={pmSortOrder} onSort={handleSortPM} className="text-left" justify="justify-start" />
                                            <SortHeader label="Accounts" field="total" currentField={pmSortField} order={pmSortOrder} onSort={handleSortPM} />
                                            <SortHeader label="Critical 🔴" field="critical" currentField={pmSortField} order={pmSortOrder} onSort={handleSortPM} className="text-red-500" />
                                            <SortHeader label="Crit %" field="criticalPct" currentField={pmSortField} order={pmSortOrder} onSort={handleSortPM} className="text-red-500/60 font-medium whitespace-nowrap" />
                                            <SortHeader label="Low 🟠" field="low" currentField={pmSortField} order={pmSortOrder} onSort={handleSortPM} className="text-orange-500" />
                                            <SortHeader label="Low %" field="lowPct" currentField={pmSortField} order={pmSortOrder} onSort={handleSortPM} className="text-orange-500/60 font-medium whitespace-nowrap" />
                                            <SortHeader label="On Track 🟢" field="onTrack" currentField={pmSortField} order={pmSortOrder} onSort={handleSortPM} className="text-green-500" />
                                            <SortHeader label="OT %" field="onTrackPct" currentField={pmSortField} order={pmSortOrder} onSort={handleSortPM} className="text-green-500/60 font-medium whitespace-nowrap" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {pmKpiSummary.map((s, idx) => {
                                            const critPct = s.total > 0 ? (s.critical / s.total * 100).toFixed(0) : '0';
                                            const lowPct = s.total > 0 ? (s.low / s.total * 100).toFixed(0) : '0';
                                            const trackPct = s.total > 0 ? (s.onTrack / s.total * 100).toFixed(0) : '0';
                                            return (
                                                <tr key={idx} className={trHover}>
                                                    <td className="p-1.5 text-center opacity-30 font-mono text-[10px] border-r border-white/5">{idx + 1}</td>
                                                    <td className="p-1.5 text-left font-medium">{s.label}</td>
                                                    <td className="p-1.5 font-mono">{s.total}</td>
                                                    <td className={clsx("p-1.5 font-bold", s.critical > 0 ? "text-red-500" : "opacity-30")}>{s.critical}</td>
                                                    <td className={clsx("p-1.5 font-mono opacity-60", s.critical > 0 ? "text-red-400" : "opacity-20")}>{critPct}%</td>
                                                    <td className={clsx("p-1.5 font-bold", s.low > 0 ? "text-orange-500" : "opacity-30")}>{s.low}</td>
                                                    <td className={clsx("p-1.5 font-mono opacity-60", s.low > 0 ? "text-orange-400" : "opacity-20")}>{lowPct}%</td>
                                                    <td className={clsx("p-1.5 font-bold", s.onTrack > 0 ? "text-green-500" : "opacity-30")}>{s.onTrack}</td>
                                                    <td className={clsx("p-1.5 font-mono opacity-60", s.onTrack > 0 ? "text-green-400" : "opacity-20")}>{trackPct}%</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Team KPI Summary */}
                        <div className={clsx("overflow-hidden rounded-2xl border shadow-lg", cardClass)}>
                            <div className={clsx("p-4 border-b flex items-center justify-between", darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50")}>
                                <span className={clsx("text-xs font-black tracking-widest uppercase", darkMode ? "text-gray-400" : "text-gray-600")}>Team KPI Performance Summary</span>
                                <ExportButton
                                    filename="team-kpi-summary"
                                    title="Team KPI Performance Summary"
                                    columns={[
                                        { header: 'Team', key: 'label' },
                                        { header: 'Accounts', key: 'total' },
                                        { header: 'Critical', key: 'critical' },
                                        { header: 'Critical %', key: 'criticalPct' },
                                        { header: 'Low', key: 'low' },
                                        { header: 'Low %', key: 'lowPct' },
                                        { header: 'On Track', key: 'onTrack' },
                                        { header: 'On Track %', key: 'onTrackPct' },
                                    ]}
                                    data={teamKpiSummary.map(s => ({
                                        ...s,
                                        criticalPct: s.total > 0 ? `${(s.critical / s.total * 100).toFixed(0)}%` : '0%',
                                        lowPct: s.total > 0 ? `${(s.low / s.total * 100).toFixed(0)}%` : '0%',
                                        onTrackPct: s.total > 0 ? `${(s.onTrack / s.total * 100).toFixed(0)}%` : '0%',
                                    }))}
                                    darkMode={darkMode}
                                />
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-center">
                                    <thead className={clsx("sticky top-0 z-10", darkMode ? "bg-[#111] text-gray-400" : "bg-white/90 text-gray-500")}>
                                        <tr className="border-b border-white/5">
                                            <th className="p-1.5 text-center w-8 opacity-40 font-bold">#</th>
                                            <SortHeader label="Team" field="label" currentField={teamSortField} order={teamSortOrder} onSort={handleSortTeam} className="text-left" justify="justify-start" />
                                            <SortHeader label="Accounts" field="total" currentField={teamSortField} order={teamSortOrder} onSort={handleSortTeam} />
                                            <SortHeader label="Critical 🔴" field="critical" currentField={teamSortField} order={teamSortOrder} onSort={handleSortTeam} className="text-red-500" />
                                            <SortHeader label="Crit %" field="criticalPct" currentField={teamSortField} order={teamSortOrder} onSort={handleSortTeam} className="text-red-500/60 font-medium whitespace-nowrap" />
                                            <SortHeader label="Low 🟠" field="low" currentField={teamSortField} order={teamSortOrder} onSort={handleSortTeam} className="text-orange-500" />
                                            <SortHeader label="Low %" field="lowPct" currentField={teamSortField} order={teamSortOrder} onSort={handleSortTeam} className="text-orange-500/60 font-medium whitespace-nowrap" />
                                            <SortHeader label="On Track 🟢" field="onTrack" currentField={teamSortField} order={teamSortOrder} onSort={handleSortTeam} className="text-green-500" />
                                            <SortHeader label="OT %" field="onTrackPct" currentField={teamSortField} order={teamSortOrder} onSort={handleSortTeam} className="text-green-500/60 font-medium whitespace-nowrap" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {teamKpiSummary.map((s, idx) => {
                                            const critPct = s.total > 0 ? (s.critical / s.total * 100).toFixed(0) : '0';
                                            const lowPct = s.total > 0 ? (s.low / s.total * 100).toFixed(0) : '0';
                                            const trackPct = s.total > 0 ? (s.onTrack / s.total * 100).toFixed(0) : '0';
                                            return (
                                                <tr key={idx} className={trHover}>
                                                    <td className="p-1.5 text-center opacity-30 font-mono text-[10px] border-r border-white/5">{idx + 1}</td>
                                                    <td className="p-1.5 text-left font-medium">{s.label}</td>
                                                    <td className="p-1.5 font-mono">{s.total}</td>
                                                    <td className={clsx("p-1.5 font-bold", s.critical > 0 ? "text-red-500" : "opacity-30")}>{s.critical}</td>
                                                    <td className={clsx("p-1.5 font-mono opacity-60", s.critical > 0 ? "text-red-400" : "opacity-20")}>{critPct}%</td>
                                                    <td className={clsx("p-1.5 font-bold", s.low > 0 ? "text-orange-500" : "opacity-30")}>{s.low}</td>
                                                    <td className={clsx("p-1.5 font-mono opacity-60", s.low > 0 ? "text-orange-400" : "opacity-20")}>{lowPct}%</td>
                                                    <td className={clsx("p-1.5 font-bold", s.onTrack > 0 ? "text-green-500" : "opacity-30")}>{s.onTrack}</td>
                                                    <td className={clsx("p-1.5 font-mono opacity-60", s.onTrack > 0 ? "text-green-400" : "opacity-20")}>{trackPct}%</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* 12-Month KPI Trend Graph */}
                    <div className={clsx("mt-12 mb-10 overflow-hidden rounded-2xl border shadow-xl p-6", cardClass)}>
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-bold">KPI Health Trend</h3>
                                <p className={clsx("text-xs opacity-50", textMuted)}>Status Counts Over the Last 12 Months</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <span className="text-[10px] font-bold uppercase opacity-60">Critical</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                    <span className="text-[10px] font-bold uppercase opacity-60">Low</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    <span className="text-[10px] font-bold uppercase opacity-60">On Track</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={kpiTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorOnTrack" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: darkMode ? '#888' : '#666' }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: darkMode ? '#888' : '#666' }}
                                    />
                                    <Tooltip content={<CustomKpiTooltip darkMode={darkMode} />} />
                                    <Area type="monotone" dataKey="onTrack" name="On Track" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorOnTrack)" />
                                    <Area type="monotone" dataKey="low" name="Low" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorLow)" />
                                    <Area type="monotone" dataKey="critical" name="Critical" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorCritical)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'daily' ? (
                <div className="animate-in fade-in duration-500">
                    {/* Filters Bar (Daily) */}
                    <div className={clsx("flex flex-col gap-4 mb-8 p-6 border rounded-xl relative z-20", cardClass)}>
                        <div className={clsx("flex items-center gap-2 mb-2", textMuted)}>
                            <Filter className="w-4 h-4" />
                            <span className="text-sm font-medium">Daily KPI Filters:</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                            <DateRangePicker
                                label="Date Range"
                                startDate={dailyStartDate}
                                endDate={dailyEndDate}
                                onStartDateChange={setDailyStartDate}
                                onEndDateChange={setDailyEndDate}
                                darkMode={darkMode}
                            />
                            <MultiSelect label="Status" options={['Critical', 'Low', 'On Track']} selected={dailyFilterStatus} onChange={setDailyFilterStatus} darkMode={darkMode} />
                            <MultiSelect label="PM" options={uniqueDailyPMs} selected={dailyFilterPM} onChange={setDailyFilterPM} darkMode={darkMode} />
                            <MultiSelect label="Account" options={uniqueDailyAccounts} selected={dailyFilterAccount} onChange={setDailyFilterAccount} darkMode={darkMode} />
                            <MultiSelect label="Client" options={uniqueDailyClients} selected={dailyFilterClient} onChange={setDailyFilterClient} darkMode={darkMode} />
                            <MultiSelect label="Objective" options={uniqueDailyObjectives} selected={dailyFilterObjective} onChange={setDailyFilterObjective} darkMode={darkMode} />
                        </div>
                    </div>

                    {/* Scorecards (Daily) */}
                    <div className="flex flex-col xl:flex-row gap-6 mb-8">
                        <div className="flex-1 grid grid-cols-2 gap-4">
                            <StatCard
                                label="Total Projects"
                                value={dailyStats.projects}
                                icon={Layers}
                                color="blue"
                                darkMode={darkMode}
                                showTrend={false}
                            />
                            <StatCard
                                label="Active PMs"
                                value={dailyStats.pms}
                                icon={Users}
                                color="purple"
                                darkMode={darkMode}
                                showTrend={false}
                            />
                        </div>

                        <div className="flex-[2] grid grid-cols-3 gap-4">
                            <StatCard
                                label="Critical Status"
                                value={dailyStats.critical}
                                subValue={`${dailyStats.total > 0 ? ((dailyStats.critical / dailyStats.total) * 100).toFixed(0) : 0}%`}
                                icon={AlertTriangle}
                                color="red"
                                trendInverted={true}
                                darkMode={darkMode}
                                showTrend={false}
                            />
                            <StatCard
                                label="Low Status"
                                value={dailyStats.low}
                                subValue={`${dailyStats.total > 0 ? ((dailyStats.low / dailyStats.total) * 100).toFixed(0) : 0}%`}
                                icon={Activity}
                                color="orange"
                                trendInverted={true}
                                darkMode={darkMode}
                                showTrend={false}
                            />
                            <StatCard
                                label="On Track Status"
                                value={dailyStats.onTrack}
                                subValue={`${dailyStats.total > 0 ? ((dailyStats.onTrack / dailyStats.total) * 100).toFixed(0) : 0}%`}
                                icon={CheckCircle2}
                                color="green"
                                darkMode={darkMode}
                                showTrend={false}
                            />
                        </div>
                    </div>

                    {/* Accounts on the Move (Watchlist) */}
                    {(watchlistAnomalies.suddenDrops.length > 0 || watchlistAnomalies.hiddenGems.length > 0) && (
                        <div className="flex flex-col gap-6 mb-8">
                            <div className="flex items-center gap-3">
                                <Sparkles className="text-purple-500" size={24} />
                                <h3 className="text-2xl font-black tracking-tight uppercase">Accounts on the Move</h3>
                            </div>

                            <div className="flex flex-col gap-8">
                                {/* Sudden Drops Row */}
                                {watchlistAnomalies.suddenDrops.length > 0 && (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2 px-1">
                                            <TrendingDown className="text-red-500" size={16} />
                                            <span className="text-[11px] font-bold uppercase tracking-widest opacity-50">Performance Drops</span>
                                        </div>
                                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent snap-x snap-mandatory">
                                            {watchlistAnomalies.suddenDrops.map((drop, i) => (
                                                <motion.div
                                                    key={`drop-${i}`}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className={clsx("min-w-[280px] max-w-[280px] snap-center p-4 rounded-[2rem] border shadow-xl relative overflow-hidden group shrink-0", darkMode ? "bg-red-500/5 border-red-500/20" : "bg-red-50 border-red-200")}
                                                >
                                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                                        <TrendingDown size={48} />
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 relative z-10">
                                                        <span className={clsx("text-[9px] font-black uppercase tracking-widest text-red-500")}>Sudden Drop</span>
                                                        <h4 className="text-base font-bold truncate leading-tight mb-1">{drop.accountName}</h4>
                                                        <div className="flex items-end justify-between mt-1">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold opacity-40 uppercase">Current ROAS</span>
                                                                <span className="text-xl font-black text-red-500">{drop.currentRoas.toFixed(2)}x</span>
                                                            </div>
                                                            <div className="text-right flex flex-col items-end">
                                                                <span className="text-[9px] font-bold opacity-30">VS {drop.baselineRoas.toFixed(2)}x (Avg)</span>
                                                                <span className="text-xs font-black text-red-500">-{drop.dropPct.toFixed(0)}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 pt-2 border-t border-red-500/10 flex justify-between items-center text-[9px]">
                                                            <span className="font-bold opacity-50 uppercase tracking-tighter">{drop.pm}</span>
                                                            <span className="font-mono opacity-50">{drop.cid}</span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Hidden Gems Row */}
                                {watchlistAnomalies.hiddenGems.length > 0 && (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2 px-1">
                                            <Trophy className="text-cyan-500" size={16} />
                                            <span className="text-[11px] font-bold uppercase tracking-widest opacity-50">Scaling Opportunities</span>
                                        </div>
                                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent snap-x snap-mandatory">
                                            {watchlistAnomalies.hiddenGems.map((gem, i) => (
                                                <motion.div
                                                    key={`gem-${i}`}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className={clsx("min-w-[280px] max-w-[280px] snap-center p-4 rounded-[2rem] border shadow-xl relative overflow-hidden group shrink-0", darkMode ? "bg-cyan-500/5 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}
                                                >
                                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                                        <Trophy size={48} />
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 relative z-10">
                                                        <span className={clsx("text-[9px] font-black uppercase tracking-widest text-cyan-500")}>Hidden Gem</span>
                                                        <h4 className="text-base font-bold truncate leading-tight mb-1">{gem.accountName}</h4>
                                                        <div className="flex items-end justify-between mt-1">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold opacity-40 uppercase">Current ROAS</span>
                                                                <span className="text-xl font-black text-cyan-500">{gem.currentRoas.toFixed(2)}x</span>
                                                            </div>
                                                            <div className="text-right flex flex-col items-end">
                                                                <span className="text-[9px] font-bold opacity-30">Target {gem.targetRoas}x</span>
                                                                <span className="text-xs font-black text-cyan-500">${Math.round(gem.spend)} Spent</span>
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 pt-2 border-t border-cyan-500/10 flex justify-between items-center text-[9px]">
                                                            <span className="font-bold opacity-50 uppercase tracking-tighter">{gem.pm}</span>
                                                            <span className="font-mono opacity-50">{gem.cid}</span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Main Table (Daily KPI) */}
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Daily KPI Data</h3>
                        <ExportButton
                            filename="daily-kpi-data"
                            title="Daily KPI Data"
                            columns={[
                                { header: 'CID', key: 'cid' },
                                { header: 'Account Name', key: 'accountName' },
                                { header: 'Conv. Source', key: 'conversionSource' },
                                { header: 'PM', key: 'pm' },
                                { header: 'Target', key: 'targetRoas' },
                                { header: 'Actual', key: 'actualRoas' },
                                { header: 'Impressions', key: 'impressions' },
                                { header: 'Clicks', key: 'clicks' },
                                { header: 'Cost', key: 'cost' },
                                { header: 'Conversions', key: 'conversions' },
                                { header: 'Revenue', key: 'conversionValue' },
                            ]}
                            data={filteredDailyData}
                            darkMode={darkMode}
                        />
                    </div>
                    <div className={clsx("rounded-2xl border shadow-2xl relative z-10 overflow-hidden", darkMode ? "border-white/10" : "border-gray-200")}>
                        <div className="max-h-[750px] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            <table className="w-full text-left border-collapse table-auto">
                                <thead className={clsx("sticky top-0 z-20", darkMode ? "bg-[#111] text-gray-300" : "bg-gray-100 text-gray-600")}>
                                    <tr className="text-[12px] uppercase tracking-wider font-extrabold border-b border-white/5">
                                        <th className="p-1.5 text-center">#</th>
                                        <SortHeader label="CID" field="cid" currentField={dailySortField} order={dailySortOrder} onSort={handleSortDaily} className="p-1.5" />
                                        <SortHeader label="Account Name" field="accountName" currentField={dailySortField} order={dailySortOrder} onSort={handleSortDaily} className="p-1.5 text-left" justify="justify-start" />
                                        <SortHeader label="Conv. Source" field="conversionSource" currentField={dailySortField} order={dailySortOrder} onSort={handleSortDaily} className="p-1.5" />
                                        <SortHeader label="PM" field="pm" currentField={dailySortField} order={dailySortOrder} onSort={handleSortDaily} className="p-1.5" />
                                        <SortHeader label="Status" field="status" currentField={dailySortField} order={dailySortOrder} onSort={handleSortDaily} className="p-1.5" />
                                        <SortHeader label="Target" field="targetRoas" currentField={dailySortField} order={dailySortOrder} onSort={handleSortDaily} className="p-1.5" />
                                        <SortHeader label="Actual" field="actualRoas" currentField={dailySortField} order={dailySortOrder} onSort={handleSortDaily} className="p-1.5" />
                                        <SortHeader label="Impr" field="impressions" currentField={dailySortField} order={dailySortOrder} onSort={handleSortDaily} className="p-1.5 text-right" justify="justify-end" />
                                        <SortHeader label="Clicks" field="clicks" currentField={dailySortField} order={dailySortOrder} onSort={handleSortDaily} className="p-1.5 text-right" justify="justify-end" />
                                        <SortHeader label="Cost" field="cost" currentField={dailySortField} order={dailySortOrder} onSort={handleSortDaily} className="p-1.5 text-right" justify="justify-end" />
                                        <SortHeader label="Conv" field="conversions" currentField={dailySortField} order={dailySortOrder} onSort={handleSortDaily} className="p-1.5 text-right" justify="justify-end" />
                                        <SortHeader label="Revenue" field="conversionValue" currentField={dailySortField} order={dailySortOrder} onSort={handleSortDaily} className="p-1.5 text-right" justify="justify-end" />
                                    </tr>
                                </thead>
                                <tbody className={clsx("divide-y backdrop-blur-sm text-xs", darkMode ? "bg-white/5 divide-white/5" : "bg-white divide-gray-100")}>
                                    {filteredDailyData.length === 0 ? (
                                        <tr>
                                            <td colSpan={13} className={clsx("p-12 text-center", textMuted)}>
                                                <div className="flex flex-col items-center gap-4">
                                                    <span>No Daily data found for the selected filters.</span>
                                                    <button onClick={syncAll} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors">
                                                        Tap to Sync Data
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredDailyData.map((row, idx) => {
                                            const cost = parseFloat(row.cost?.toString().replace(/[$,]/g, '') || '0');
                                            const val = parseFloat(row.conversionValue?.toString().replace(/[$,]/g, '') || '0');
                                            const roas = cost > 0 ? (val / cost).toFixed(2) : '0.00';
                                            const status = calculateKpiStatus(row);
                                            return (
                                                <tr key={idx} className={clsx("transition-colors group", trHover)}>
                                                    <td className="p-1.5 text-center opacity-30 font-mono text-[9px]">{idx + 1}</td>
                                                    <td className="p-1.5 font-mono text-center text-[10px] opacity-70">{row.cid || '-'}</td>
                                                    <td className="p-1.5 font-medium whitespace-nowrap">{row.accountName}</td>
                                                    <td className="p-1.5 text-[10px] text-center opacity-70">{row.conversionSource}</td>
                                                    <td className="p-1.5 text-center font-medium">{row.pm}</td>
                                                    <td className="p-1.5 text-center">
                                                        <span className={clsx(
                                                            "px-2 py-0 rounded-full text-[9px] font-bold shadow-sm",
                                                            status === 'Critical' ? "bg-red-500/20 text-red-500 border border-red-500/10" :
                                                                status === 'Low' ? "bg-orange-500/20 text-orange-500 border border-orange-500/10" :
                                                                    "bg-green-500/20 text-green-500 border border-green-500/10"
                                                        )}>
                                                            {status}
                                                        </span>
                                                    </td>
                                                    <td className="p-1.5 text-center font-mono opacity-50">{row.targetRoas?.replace(/x/i, '')}</td>
                                                    <td className="p-1.5 text-center">
                                                        <span className={clsx(
                                                            "px-2 py-0 rounded-full font-bold font-mono text-[10px]",
                                                            status === 'Critical' ? "text-red-500 bg-red-500/10" :
                                                                status === 'Low' ? "text-orange-500 bg-orange-500/10" :
                                                                    "text-green-500 bg-green-500/10"
                                                        )}>
                                                            {roas}
                                                        </span>
                                                    </td>
                                                    <td className="p-1.5 text-right font-mono">{formatFullNumber(row.impressions)}</td>
                                                    <td className="p-1.5 text-right font-mono">{formatFullNumber(row.clicks)}</td>
                                                    <td className="p-1.5 text-right font-mono font-medium">${formatPriceRounded(row.cost)}</td>
                                                    <td className="p-1.5 text-right font-mono">{Math.ceil(parseFloat(row.conversions?.toString() || '0'))}</td>
                                                    <td className="p-1.5 text-right font-mono font-medium">${formatPriceRounded(row.conversionValue)}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary Tables (Daily) */}
                    <div className="flex flex-col gap-10 mt-12 mb-10">
                        {/* Daily PM KPI Summary */}
                        <div className={clsx("overflow-hidden rounded-2xl border shadow-lg", cardClass)}>
                            <div className={clsx("p-4 border-b text-xs font-black tracking-widest uppercase text-center", darkMode ? "border-white/10 bg-white/5 text-gray-400" : "border-gray-200 bg-gray-50 text-gray-600")}>
                                Daily PM KPI Performance Summary
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-center">
                                    <thead className={clsx("sticky top-0 z-10", darkMode ? "bg-[#111] text-gray-400" : "bg-white/90 text-gray-500")}>
                                        <tr className="border-b border-white/5">
                                            <th className="p-1.5 text-center w-8 opacity-40 font-bold">#</th>
                                            <SortHeader label="PM" field="label" currentField={pmSortField} order={pmSortOrder} onSort={handleSortPM} className="text-left" justify="justify-start" />
                                            <SortHeader label="Accounts" field="total" currentField={pmSortField} order={pmSortOrder} onSort={handleSortPM} />
                                            <SortHeader label="Critical 🔴" field="critical" currentField={pmSortField} order={pmSortOrder} onSort={handleSortPM} className="text-red-500" />
                                            <SortHeader label="Crit %" field="criticalPct" currentField={pmSortField} order={pmSortOrder} onSort={handleSortPM} className="text-red-500/60 font-medium whitespace-nowrap" />
                                            <SortHeader label="Low 🟠" field="low" currentField={pmSortField} order={pmSortOrder} onSort={handleSortPM} className="text-orange-500" />
                                            <SortHeader label="Low %" field="lowPct" currentField={pmSortField} order={pmSortOrder} onSort={handleSortPM} className="text-orange-500/60 font-medium whitespace-nowrap" />
                                            <SortHeader label="On Track 🟢" field="onTrack" currentField={pmSortField} order={pmSortOrder} onSort={handleSortPM} className="text-green-500" />
                                            <SortHeader label="OT %" field="onTrackPct" currentField={pmSortField} order={pmSortOrder} onSort={handleSortPM} className="text-green-500/60 font-medium whitespace-nowrap" />
                                        </tr>
                                    </thead>
                                    <tbody className={clsx("divide-y", darkMode ? "divide-white/5" : "divide-gray-100")}>
                                        {dailyPmStats.map((item, idx) => (
                                            <tr key={idx} className={trHover}>
                                                <td className="p-1.5 text-center opacity-30 font-mono text-[9px]">{idx + 1}</td>
                                                <td className="p-1.5 text-left font-bold">{item.label}</td>
                                                <td className="p-1.5 font-mono">{item.total}</td>
                                                <td className="p-1.5 font-bold text-red-500 bg-red-500/5">{item.critical}</td>
                                                <td className="p-1.5 font-mono text-red-500/50">{item.criticalPct.toFixed(0)}%</td>
                                                <td className="p-1.5 font-bold text-orange-500 bg-orange-500/5">{item.low}</td>
                                                <td className="p-1.5 font-mono text-orange-500/50">{item.lowPct.toFixed(0)}%</td>
                                                <td className="p-1.5 font-bold text-green-500 bg-green-500/5">{item.onTrack}</td>
                                                <td className="p-1.5 font-mono text-green-500/50">{item.onTrackPct.toFixed(0)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Daily Team KPI Summary */}
                        <div className={clsx("overflow-hidden rounded-2xl border shadow-lg", cardClass)}>
                            <div className={clsx("p-4 border-b text-xs font-black tracking-widest uppercase text-center", darkMode ? "border-white/10 bg-white/5 text-gray-400" : "border-gray-200 bg-gray-50 text-gray-600")}>
                                Daily Team KPI Performance Summary
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-center">
                                    <thead className={clsx("sticky top-0 z-10", darkMode ? "bg-[#111] text-gray-400" : "bg-white/90 text-gray-500")}>
                                        <tr className="border-b border-white/5">
                                            <th className="p-1.5 text-center w-8 opacity-40 font-bold">#</th>
                                            <SortHeader label="Team" field="label" currentField={teamSortField} order={teamSortOrder} onSort={handleSortTeam} className="text-left" justify="justify-start" />
                                            <SortHeader label="Accounts" field="total" currentField={teamSortField} order={teamSortOrder} onSort={handleSortTeam} />
                                            <SortHeader label="Critical 🔴" field="critical" currentField={teamSortField} order={teamSortOrder} onSort={handleSortTeam} className="text-red-500" />
                                            <SortHeader label="Crit %" field="criticalPct" currentField={teamSortField} order={teamSortOrder} onSort={handleSortTeam} className="text-red-500/60 font-medium whitespace-nowrap" />
                                            <SortHeader label="Low 🟠" field="low" currentField={teamSortField} order={teamSortOrder} onSort={handleSortTeam} className="text-orange-500" />
                                            <SortHeader label="Low %" field="lowPct" currentField={teamSortField} order={teamSortOrder} onSort={handleSortTeam} className="text-orange-500/60 font-medium whitespace-nowrap" />
                                            <SortHeader label="On Track 🟢" field="onTrack" currentField={teamSortField} order={teamSortOrder} onSort={handleSortTeam} className="text-green-500" />
                                            <SortHeader label="OT %" field="onTrackPct" currentField={teamSortField} order={teamSortOrder} onSort={handleSortTeam} className="text-green-500/60 font-medium whitespace-nowrap" />
                                        </tr>
                                    </thead>
                                    <tbody className={clsx("divide-y", darkMode ? "divide-white/5" : "divide-gray-100")}>
                                        {dailyTeamStats.map((item, idx) => (
                                            <tr key={idx} className={trHover}>
                                                <td className="p-1.5 text-center opacity-30 font-mono text-[9px]">{idx + 1}</td>
                                                <td className="p-1.5 text-left font-bold">{item.label}</td>
                                                <td className="p-1.5 font-mono">{item.total}</td>
                                                <td className="p-1.5 font-bold text-red-500 bg-red-500/5">{item.critical}</td>
                                                <td className="p-1.5 font-mono text-red-500/50">{item.criticalPct.toFixed(0)}%</td>
                                                <td className="p-1.5 font-bold text-orange-500 bg-orange-500/5">{item.low}</td>
                                                <td className="p-1.5 font-mono text-orange-500/50">{item.lowPct.toFixed(0)}%</td>
                                                <td className="p-1.5 font-bold text-green-500 bg-green-500/5">{item.onTrack}</td>
                                                <td className="p-1.5 font-mono text-green-500/50">{item.onTrackPct.toFixed(0)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'portfolio' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col gap-8">
                    {/* Portfolio Header & Filter Row */}
                    <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-6 relative z-40">
                        <div>
                            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                                <Activity className="text-green-500" size={32} />
                                Strategic Portfolio Health
                            </h2>
                            <p className={clsx("text-xs font-bold opacity-40 uppercase tracking-widest mt-1 ml-11", textMuted)}>
                                Cross-Account Performance & Capacity Analytics
                            </p>
                        </div>
                        <div className={clsx("p-4 rounded-2xl border shadow-lg flex flex-col lg:flex-row items-center gap-4 transition-all w-full lg:w-auto", cardClass, darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-xl")}>
                            <div className="flex items-center gap-4 w-full">
                                <div className="flex flex-col gap-1 w-full min-w-[150px]">
                                    <div className={clsx("flex items-center gap-2 mb-1", textMuted)}>
                                        <Filter className="w-3 h-3 text-purple-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Timeline</span>
                                    </div>
                                    <MultiSelect
                                        label=""
                                        options={monthOptions}
                                        selected={portfolioFilterMonth.length > 0 ? portfolioFilterMonth : [monthOptions[monthOptions.length - 1] || '']}
                                        onChange={setPortfolioFilterMonth}
                                        darkMode={darkMode}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 w-full min-w-[150px]">
                                    <div className={clsx("flex items-center gap-2 mb-1", textMuted)}>
                                        <Users className="w-3 h-3 text-blue-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Team</span>
                                    </div>
                                    <MultiSelect
                                        label=""
                                        options={uniqueTeams}
                                        selected={portfolioFilterTeam}
                                        onChange={setPortfolioFilterTeam}
                                        darkMode={darkMode}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 w-full min-w-[150px]">
                                    <div className={clsx("flex items-center gap-2 mb-1", textMuted)}>
                                        <Target className="w-3 h-3 text-orange-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Strategist</span>
                                    </div>
                                    <MultiSelect
                                        label=""
                                        options={uniqueStrategists}
                                        selected={portfolioFilterStrategist}
                                        onChange={setPortfolioFilterStrategist}
                                        darkMode={darkMode}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Portfolio Scorecards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <StatCard
                            label="Global Portfolio Health"
                            value={`${(portfolioStats.reduce((acc, s) => acc + s.globalScore, 0) / (portfolioStats.length || 1)).toFixed(0)}%`}
                            subValue={portfolioFilterMonth.length > 1 ? `Avg across ${portfolioFilterMonth.length} months` : <i>({portfolioFilterMonth[0] || monthOptions[monthOptions.length - 1]})</i>}
                            icon={Activity}
                            color="green"
                            darkMode={darkMode}
                            showTrend={false}
                        />
                        <StatCard
                            label="Total Actual Spent"
                            value={formatPriceRounded(portfolioStats.reduce((acc, s) => acc + s.totalCost, 0))}
                            subValue={portfolioFilterMonth.length > 1 ? `Avg Spend (${portfolioFilterMonth.length}m)` : <i>({portfolioFilterMonth[0] || monthOptions[monthOptions.length - 1]})</i>}
                            icon={Layers}
                            color="purple"
                            darkMode={darkMode}
                            showTrend={false}
                        />
                        <StatCard
                            label="Active Accounts"
                            value={Math.round(portfolioStats.reduce((acc, s) => acc + s.accounts, 0))}
                            subValue={portfolioFilterMonth.length > 1 ? `Historical Avg` : <i>({portfolioFilterMonth[0] || monthOptions[monthOptions.length - 1]})</i>}
                            icon={Users}
                            color="blue"
                            darkMode={darkMode}
                            showTrend={false}
                        />
                        <StatCard
                            label="High Intensity PM"
                            value={portfolioStats.sort((a, b) => b.workloadIntensity - a.workloadIntensity)[0]?.pm || '-'}
                            subValue={portfolioFilterMonth.length > 1 ? `Peak Intensity Avg` : <i>({portfolioFilterMonth[0] || monthOptions[monthOptions.length - 1]})</i>}
                            icon={AlertTriangle}
                            color="orange"
                            darkMode={darkMode}
                            showTrend={false}
                        />
                    </div>

                    {/* Health Evolution Trend Chart */}
                    <div className={clsx("p-8 rounded-3xl border shadow-2xl relative overflow-hidden", cardClass)}>
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                    <TrendingUp className="text-green-500" />
                                    Portfolio Health Evolution
                                </h3>
                                <p className={clsx("text-xs font-bold opacity-40", textMuted)}>STRATEGIC PERFORMANCE TREND (ON TRACK %)</p>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={portfolioTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                                    <XAxis
                                        dataKey="month"
                                        tick={{ fontSize: 10, fontWeight: 700, fill: darkMode ? '#666' : '#999' }}
                                        stroke="transparent"
                                        tickFormatter={(val) => val.split(' ')[0]}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        tick={{ fontSize: 10, fontWeight: 700, fill: darkMode ? '#666' : '#999' }}
                                        stroke="transparent"
                                        unit="%"
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: darkMode ? '#111' : '#fff', border: 'none', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}
                                        itemStyle={{ fontSize: '11px', fontWeight: 800 }}
                                        labelStyle={{ fontSize: '12px', fontWeight: 900, marginBottom: '6px' }}
                                    />
                                    <Area type="monotone" dataKey="health" name="Avg Health" stroke="#22c55e" strokeWidth={4} fillOpacity={1} fill="url(#colorHealth)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Quick Actions & Audit Insights */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className={clsx("lg:col-span-1 p-6 rounded-3xl border shadow-xl relative overflow-hidden flex flex-col justify-center", cardClass, darkMode ? "bg-purple-500/5 border-purple-500/10" : "bg-purple-50 border-purple-100")}>
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Zap size={80} className="text-purple-500" />
                            </div>
                            <h3 className="text-lg font-black tracking-tight mb-1">Portfolio Catalyst</h3>
                            <p className="text-[10px] font-bold uppercase opacity-40 tracking-widest mb-4">Top Audit Fix Recommendations</p>
                            <div className="space-y-3">
                                {topPortfolioIssues.map((issue, idx) => (
                                    <div key={idx} className="flex items-center justify-between group cursor-default">
                                        <div className="flex items-center gap-3">
                                            <div className={clsx("p-1.5 rounded-lg", issue.bg)}>
                                                <issue.icon size={14} className={issue.color} />
                                            </div>
                                            <span className="text-xs font-bold opacity-70 group-hover:opacity-100 transition-opacity">{issue.label}</span>
                                        </div>
                                        <span className={clsx("text-xs font-black", issue.color)}>{issue.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={clsx("lg:col-span-3 p-8 rounded-3xl border shadow-2xl relative flex flex-col justify-center overflow-hidden", cardClass)}>
                            <div className="absolute -right-20 -bottom-20 p-8 opacity-[0.03] scale-[4]">
                                <Activity size={100} />
                            </div>
                            <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                                <div className="flex-1 space-y-4 text-center md:text-left">
                                    <h3 className="text-2xl font-black tracking-tight">Efficiency & Hygiene</h3>
                                    <p className="text-sm opacity-60 leading-relaxed font-medium">
                                        The <strong>Global Health Score</strong> is a weighted composite of operational KPIs (70%) and infrastructure hygiene (30%).
                                        Addressing the common flags to the left can potentially recover <strong>~{(portfolioStats.reduce((acc, s) => acc + (s.roasAccounts * s.avgIssues), 0) / 10).toFixed(0)}h/week</strong> in manual optimization time across the team.
                                    </p>
                                    <div className="flex items-center gap-4 justify-center md:justify-start pt-2">
                                        <button
                                            onClick={() => setActiveTab('campaign')}
                                            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            View Campaign Audit
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('audience')}
                                            className={clsx("px-6 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all", darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-white")}
                                        >
                                            View Audience Hygiene
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-4 p-4 rounded-[2.5rem] bg-white/5 backdrop-blur-md border border-white/5">
                                    <div className="flex flex-col items-center gap-1 p-4">
                                        <div className="text-2xl font-black text-blue-400">{(portfolioStats.reduce((acc, s) => acc + s.roasAccounts, 0) / (portfolioStats.length || 1)).toFixed(0)}</div>
                                        <div className="text-[8px] font-black uppercase opacity-40">Avg ROAS Accts</div>
                                    </div>
                                    <div className="w-[1px] h-12 bg-white/10 self-center"></div>
                                    <div className="flex flex-col items-center gap-1 p-4">
                                        <div className="text-2xl font-black text-purple-400">{(portfolioStats.reduce((acc, s) => acc + s.totalIssues, 0) / (portfolioStats.length || 1)).toFixed(0)}</div>
                                        <div className="text-[8px] font-black uppercase opacity-40">Total Issues</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Efficiency Matrix */}
                        <div className={clsx("p-6 rounded-3xl border shadow-2xl relative", cardClass)}>
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-black tracking-tight">PM Efficiency Matrix</h3>
                                    <p className={clsx("text-xs font-bold opacity-40", textMuted)}>WORKLOAD (ACCOUNTS) VS PERFORMANCE (ON TRACK %)</p>
                                </div>
                                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                                    <TrendingUp size={20} />
                                </div>
                            </div>
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                                        <XAxis
                                            type="number"
                                            dataKey="accounts"
                                            name="Accounts"
                                            label={{ value: 'Number of Accounts', position: 'bottom', offset: 0, fontSize: 10, fontWeight: 800, fill: darkMode ? '#666' : '#999' }}
                                            tick={{ fontSize: 10, fontWeight: 700 }}
                                            stroke={darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                                        />
                                        <YAxis
                                            type="number"
                                            dataKey="onTrackPct"
                                            name="On Track %"
                                            unit="%"
                                            domain={[0, 100]}
                                            label={{ value: 'On Track %', angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 800, fill: darkMode ? '#666' : '#999' }}
                                            tick={{ fontSize: 10, fontWeight: 700 }}
                                            stroke={darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                                        />
                                        <ZAxis type="number" dataKey="totalCost" range={[100, 1000]} name="Value" />
                                        <Tooltip
                                            cursor={{ strokeDasharray: '3 3' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className={clsx("p-4 rounded-2xl border shadow-2xl backdrop-blur-xl", darkMode ? "bg-black/80 border-white/10" : "bg-white/90 border-gray-200")}>
                                                            <p className="text-sm font-black mb-2">{data.pm}</p>
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-bold opacity-50 uppercase">Accounts: <span className="text-white opacity-100">{data.accounts}</span></p>
                                                                <p className="text-[10px] font-bold opacity-50 uppercase">Performance: <span className="text-green-400 opacity-100">{data.onTrackPct.toFixed(0)}%</span></p>
                                                                <p className="text-[10px] font-bold opacity-50 uppercase">Actual Spend: <span className="text-purple-400 opacity-100">${formatPriceRounded(data.totalCost)}</span></p>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Scatter name="PMs" data={portfolioStats} fill="#8884d8">
                                            {portfolioStats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.onTrackPct > 80 ? '#22c55e' : entry.onTrackPct > 50 ? '#f59e0b' : '#ef4444'} fillOpacity={0.6} strokeWidth={2} stroke={entry.onTrackPct > 80 ? '#22c55e' : entry.onTrackPct > 50 ? '#f59e0b' : '#ef4444'} />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Health Distribution */}
                        <div className={clsx("p-6 rounded-3xl border shadow-2xl relative", cardClass)}>
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-black tracking-tight">Portfolio Health Mix</h3>
                                    <p className={clsx("text-xs font-bold opacity-40", textMuted)}>STATUS BREAKDOWN BY MANAGER</p>
                                </div>
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                                    <Layers size={20} />
                                </div>
                            </div>
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={portfolioStats.slice(0, 10)}
                                        layout="vertical"
                                        margin={{ left: 40, right: 30 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="pm"
                                            type="category"
                                            stroke={darkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                                            tick={{ fontSize: 9, fontWeight: 700 }}
                                            width={80}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className={clsx("p-4 rounded-2xl border shadow-2xl backdrop-blur-xl", darkMode ? "bg-black/80 border-white/10" : "bg-white/90 border-gray-200")}>
                                                            <p className="text-sm font-black mb-3">{label}</p>
                                                            <div className="space-y-2">
                                                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                                {payload.map((entry: any, i: number) => (
                                                                    <div key={i} className="flex items-center justify-between gap-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                                                            <span className="text-[10px] font-bold opacity-60 uppercase">{entry.name}</span>
                                                                        </div>
                                                                        <span className="text-xs font-black">{entry.value}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="onTrack" name="On Track" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} barSize={12} />
                                        <Bar dataKey="low" name="Low" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} barSize={12} />
                                        <Bar dataKey="critical" name="Critical" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={12} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Workload Summary Table */}
                    <div className={clsx("overflow-hidden rounded-3xl border shadow-2xl", cardClass)}>
                        <div className={clsx("p-6 border-b flex items-center justify-between", darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50")}>
                            <div>
                                <h3 className="text-xl font-black tracking-tight">Manager Capacity & Workload</h3>
                                <p className={clsx("text-xs font-bold opacity-40", textMuted)}>RANKED BY MANAGED PORTFOLIO VALUE</p>
                            </div>
                            <ExportButton
                                filename="manager-capacity"
                                title="Manager Capacity & Workload"
                                columns={[
                                    { header: 'Manager', key: 'pm' },
                                    { header: 'Accounts', key: 'accounts' },
                                    { header: 'Monthly Ad Spend', key: 'totalCost' },
                                    { header: 'Health Score', key: 'healthScore' },
                                    { header: 'Global Score', key: 'globalScore' },
                                ]}
                                data={portfolioStats}
                                darkMode={darkMode}
                            />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className={clsx("text-[10px] font-black uppercase tracking-widest opacity-40", darkMode ? "text-gray-400" : "text-gray-500")}>
                                        <th className="p-4 pl-8">#</th>
                                        <th className="p-4">Manager</th>
                                        <th className="p-4 text-center">Accounts</th>
                                        <th className="p-4 text-center">Monthly Ad Spend</th>
                                        <th className="p-4 text-center">Health Score</th>
                                        <th className="p-4 text-center">Global Score</th>
                                        <th className="p-4 text-center">Capacity</th>
                                        <th className="p-4 pr-8 text-center">Performance Trend</th>
                                    </tr>
                                </thead>
                                <tbody className={clsx("divide-y", darkMode ? "divide-white/5" : "divide-gray-100")}>
                                    {portfolioStats.map((s, idx) => (
                                        <tr key={idx} className={clsx("group transition-colors", trHover)}>
                                            <td className="p-4 pl-8 opacity-30 font-mono text-xs">{idx + 1}</td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-sm">{s.pm}</span>
                                                    <span className="text-[10px] opacity-40 font-bold uppercase tracking-tighter">Strategic Lead</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center font-black text-blue-400">{s.accounts}</td>
                                            <td className="p-4 text-center font-mono font-bold text-purple-400">${formatPriceRounded(s.totalCost)}</td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center flex-col gap-1">
                                                    <span className={clsx("text-xs font-black", s.avgHealth > 80 ? "text-green-400" : s.avgHealth > 60 ? "text-orange-400" : "text-red-400")}>
                                                        {s.avgHealth.toFixed(1)}%
                                                    </span>
                                                    <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                                                        <div className={clsx("h-full", s.avgHealth > 80 ? "bg-green-500" : s.avgHealth > 60 ? "bg-orange-500" : "bg-red-500")} style={{ width: `${s.avgHealth}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center flex-col gap-1">
                                                    <span className={clsx("text-xs font-black", s.globalScore > 80 ? "text-green-400" : s.globalScore > 60 ? "text-orange-400" : "text-red-400")}>
                                                        {s.globalScore.toFixed(1)}
                                                    </span>
                                                    <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                                                        <div className={clsx("h-full", s.globalScore > 80 ? "bg-green-500" : s.globalScore > 60 ? "bg-orange-500" : "bg-red-500")} style={{ width: `${s.globalScore}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={clsx(
                                                    "px-3 py-1 rounded-lg text-[10px] font-black tracking-tight",
                                                    s.workloadIntensity > 35 ? "bg-red-500/10 text-red-400 border border-red-500/10" :
                                                        s.workloadIntensity > 25 ? "bg-orange-500/10 text-orange-400 border border-orange-500/10" :
                                                            "bg-blue-500/10 text-blue-400 border border-blue-500/10"
                                                )}>
                                                    {s.workloadIntensity.toFixed(0)}
                                                </span>
                                            </td>
                                            <td className="p-4 pr-8 text-center">
                                                <div className="flex items-end justify-center gap-1 h-8">
                                                    {s.trend.map((val: number, i: number) => (
                                                        <div
                                                            key={i}
                                                            className={clsx("w-3 rounded-t-sm transition-all hover:opacity-100", val > 80 ? "bg-green-500/60" : val > 60 ? "bg-orange-500/60" : "bg-red-500/60")}
                                                            style={{ height: `${Math.max(10, val)}%` }}
                                                            title={`Month ${i + 1}: ${val.toFixed(0)}%`}
                                                        ></div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Calculation Logic & Rationale */}
                    <div className={clsx("p-8 rounded-3xl border shadow-xl relative overflow-hidden", cardClass)}>
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Activity size={120} />
                        </div>
                        <h3 className="text-xl font-black tracking-tight mb-6 flex items-center gap-3">
                            <Layers className="text-purple-500" size={24} />
                            Calculation Logic & Rationale
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-500">Managed Value</h4>
                                <p className="text-xs leading-relaxed opacity-60">
                                    We use **Actual Ad Spend** (Cost) from the most recent completed month. This reflects the real volume of capital the Manager is currently responsible for, rather than theoretical budgets.
                                </p>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Workload Intensity</h4>
                                <p className="text-xs leading-relaxed opacity-60 font-mono">
                                    (Accounts * 0.6) + <br /> (Spent / 5000 * 0.4)
                                    <br /><br />
                                    <span className="not-italic font-sans opacity-100">Weighted score where account count (Cognitive load) contributes 60% and spend volume (Risk/Scale) contributes 40%.</span>
                                </p>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-green-500">Health Score</h4>
                                <p className="text-xs leading-relaxed opacity-60">
                                    A performance density score calculated **ONLY for accounts with objective &quot;ROAS&quot;**: <br />
                                    **On Track** = 100% <br />
                                    **Low** = 50% <br />
                                    **Critical** = 0% <br />
                                    Used to visualize the quality of measurable output.
                                </p>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500">Capacity Index</h4>
                                <p className="text-xs leading-relaxed opacity-60">
                                    The intensity score is assessed against a **Standard Benchmark of 40**. Managers exceeding this threshold are flagged as &quot;High Intensity,&quot; indicating a potential need for workload redistribution.
                                </p>
                            </div>
                        </div>
                    </div>
                </div >
            ) : activeTab === 'audience' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                                <Activity className="text-purple-500" size={32} />
                                Audience Hygiene Audit
                            </h2>
                            <p className={clsx("text-xs font-bold opacity-40 uppercase tracking-widest ml-11", textMuted)}>
                                Rule-Based Sanitization for High-Performance Ads
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <DateSelector
                                label="Select Date"
                                selectedDate={audienceSelectedDate}
                                availableDates={audienceAudit.availableDates || []}
                                onDateChange={setAudienceSelectedDate}
                                darkMode={darkMode}
                            />
                            <BulkExportButton
                                darkMode={darkMode}
                                tables={[
                                    {
                                        id: 'audience-pm-summary',
                                        name: 'audience_pm_summary',
                                        title: 'Audience Audit - Manager Summary',
                                        columns: [
                                            { header: '#', key: 'index' },
                                            { header: 'Manager', key: 'pm' },
                                            { header: 'Zero Search', key: 'zero' },
                                            { header: 'Targeting Bug', key: 'targeting' },
                                            { header: 'No Audience', key: 'noAudience' },
                                            { header: 'RLSA Obs', key: 'observation' },
                                            { header: 'Closed', key: 'closed' },
                                        ],
                                        data: audienceAudit.pmSummaryList.map((s, idx) => ({ index: idx + 1, ...s })),
                                    },
                                    {
                                        id: 'audience-zero-search',
                                        name: 'audience_zero_search',
                                        title: 'Audience Audit - Zero Search Size',
                                        columns: [
                                            { header: '#', key: 'index' },
                                            { header: 'Account Name', key: 'accountName' },
                                            { header: 'Campaign Name', key: 'campaignName' },
                                            { header: 'Ad Group Name', key: 'adGroupName' },
                                            { header: 'Audience Name', key: 'audienceName' },
                                        ],
                                        data: audienceAudit.searchSizeZero.map((d: any, idx: number) => ({ index: idx + 1, ...d })),
                                    },
                                    {
                                        id: 'audience-targeting-bug',
                                        name: 'audience_targeting_bug',
                                        title: 'Audience Audit - Targeting Bug',
                                        columns: [
                                            { header: '#', key: 'index' },
                                            { header: 'Account Name', key: 'accountName' },
                                            { header: 'Campaign Name', key: 'campaignName' },
                                            { header: 'Ad Group Name', key: 'adGroupName' },
                                        ],
                                        data: audienceAudit.targetingWithoutRemarketing.map((d: any, idx: number) => ({ index: idx + 1, ...d })),
                                    },
                                    {
                                        id: 'audience-no-audience',
                                        name: 'audience_no_audience',
                                        title: 'Audience Audit - No Audience Added',
                                        columns: [
                                            { header: '#', key: 'index' },
                                            { header: 'Account Name', key: 'accountName' },
                                            { header: 'Campaign Name', key: 'campaignName' },
                                            { header: 'Ad Group Name', key: 'adGroupName' },
                                        ],
                                        data: audienceAudit.noAudienceAdded.map((d: any, idx: number) => ({ index: idx + 1, ...d })),
                                    },
                                    {
                                        id: 'audience-rlsa-obs',
                                        name: 'audience_rlsa_observation',
                                        title: 'Audience Audit - RLSA Observation',
                                        columns: [
                                            { header: '#', key: 'index' },
                                            { header: 'Account Name', key: 'accountName' },
                                            { header: 'Campaign Name', key: 'campaignName' },
                                            { header: 'Ad Group Name', key: 'adGroupName' },
                                        ],
                                        data: audienceAudit.observationWithRlsa.map((d: any, idx: number) => ({ index: idx + 1, ...d })),
                                    },
                                    {
                                        id: 'audience-closed',
                                        name: 'audience_closed_membership',
                                        title: 'Audience Audit - Closed Membership',
                                        columns: [
                                            { header: '#', key: 'index' },
                                            { header: 'Account Name', key: 'accountName' },
                                            { header: 'Campaign Name', key: 'campaignName' },
                                            { header: 'Ad Group Name', key: 'adGroupName' },
                                            { header: 'Audience Name', key: 'audienceName' },
                                        ],
                                        data: audienceAudit.closedMembership.map((d: any, idx: number) => ({ index: idx + 1, ...d })),
                                    },
                                ]}
                            />
                            <div className="w-56">
                                <MultiSelect label="Filter PM" options={uniquePMs} selected={audienceFilterPM} onChange={setAudienceFilterPM} darkMode={darkMode} />
                            </div>
                            {audienceAudit.latestDate && (
                                <div>
                                    <label className="block text-xs mb-1 ml-1 opacity-0 pointer-events-none">Date</label>
                                    <div className={clsx("px-4 py-2 rounded-2xl border flex items-center gap-3", darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-sm")}>
                                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase opacity-40 leading-none">Latest Snapshot</span>
                                            <span className="text-sm font-black tracking-tight leading-normal uppercase">{audienceAudit.latestDate}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Audit Scorecards */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <StatCard label="Zero Search Size" value={audienceAudit.searchSizeZero.length} change={audienceAudit.searchSizeZero.length - audienceAudit.prevCounts.zero} icon={AlertTriangle} color="red" darkMode={darkMode} showTrend={true} trendInverted={true} />
                        <StatCard label="Targeting Bug" value={audienceAudit.targetingWithoutRemarketing.length} change={audienceAudit.targetingWithoutRemarketing.length - audienceAudit.prevCounts.targeting} icon={Target} color="orange" darkMode={darkMode} showTrend={true} trendInverted={true} />
                        <StatCard label="No Audience Added" value={audienceAudit.noAudienceAdded.length} change={audienceAudit.noAudienceAdded.length - audienceAudit.prevCounts.noAudience} icon={Layers} color="red" darkMode={darkMode} showTrend={true} trendInverted={true} />
                        <StatCard label="RLSA Observation" value={audienceAudit.observationWithRlsa.length} change={audienceAudit.observationWithRlsa.length - audienceAudit.prevCounts.observation} icon={Activity} color="blue" darkMode={darkMode} showTrend={true} trendInverted={true} />
                        <StatCard label="Closed Lists" value={audienceAudit.closedMembership.length} change={audienceAudit.closedMembership.length - audienceAudit.prevCounts.closed} icon={CheckCircle2} color="orange" darkMode={darkMode} showTrend={true} trendInverted={true} />
                    </div>

                    {/* PM Summary heatmap style table */}
                    <div className={clsx("overflow-hidden rounded-3xl border shadow-xl relative", cardClass)}>
                        <div className={clsx("p-4 border-b flex items-center justify-between", darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50")}>
                            <span className={clsx("text-[10px] font-black uppercase tracking-[0.2em]", darkMode ? "opacity-60" : "text-gray-700")}>Manager Audit Summary</span>
                            <ExportButton
                                filename="audience-audit-pm-summary"
                                title="Audience Audit - Manager Summary"
                                columns={[
                                    { header: 'Manager', key: 'pm' },
                                    { header: 'Zero Search', key: 'zero' },
                                    { header: 'Targeting Bug', key: 'targeting' },
                                    { header: 'No Audience', key: 'noAudience' },
                                    { header: 'RLSA Obs', key: 'observation' },
                                    { header: 'Closed', key: 'closed' },
                                ]}
                                data={audienceAudit.pmSummaryList}
                                darkMode={darkMode}
                            />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-center text-xs table-fixed">
                                <thead className={clsx("sticky top-0 z-10", darkMode ? "bg-[#111] text-gray-500" : "bg-gray-100 text-gray-600")}>
                                    <tr className="border-b border-white/5 uppercase tracking-tighter text-[12px]">
                                        <th className="p-1 text-center w-8">#</th>
                                        <th className="p-1 text-left border-r border-white/5 w-28">Manager</th>
                                        <th className="p-1 w-16">Zero Search</th>
                                        <th className="p-1 w-16">Targeting Bug</th>
                                        <th className="p-1 w-16">No Audience</th>
                                        <th className="p-1 w-16">RLSA Obs</th>
                                        <th className="p-1 w-16">Closed</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {audienceAudit.pmSummaryList.map((s: { pm: string; zero: number; targeting: number; noAudience: number; observation: number; closed: number }, idx: number) => (
                                        <tr key={idx} className={trHover}>
                                            <td className="p-1 text-center opacity-30 font-mono text-[10px]">{idx + 1}</td>
                                            <td className="p-1 text-left border-r border-white/5 font-bold capitalize truncate">{s.pm.toLowerCase()}</td>
                                            <td className={clsx("p-1 font-mono font-black", s.zero > 0 ? "bg-red-500/10 text-red-500" : "opacity-10")}>{s.zero}</td>
                                            <td className={clsx("p-1 font-mono font-black", s.targeting > 0 ? "bg-orange-500/10 text-orange-500" : "opacity-10")}>{s.targeting}</td>
                                            <td className={clsx("p-1 font-mono font-black", s.noAudience > 0 ? "bg-red-500/10 text-red-500" : "opacity-10")}>{s.noAudience}</td>
                                            <td className={clsx("p-1 font-mono font-black", s.observation > 0 ? "bg-blue-500/10 text-blue-500" : "opacity-10")}>{s.observation}</td>
                                            <td className={clsx("p-1 font-mono font-black", s.closed > 0 ? "bg-orange-500/10 text-orange-500" : "opacity-10")}>{s.closed}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Detailed Drill-downs */}
                    <div className="flex flex-col gap-16 mt-8">
                        {[
                            { title: 'Zero Search Size Audiences', data: audienceAudit.searchSizeZero, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/5' },
                            { title: 'Targeting Bug (No RM List)', data: audienceAudit.targetingWithoutRemarketing, icon: Target, color: 'text-orange-500', bg: 'bg-orange-500/5' },
                            { title: 'Missing Audience Lists', data: audienceAudit.noAudienceAdded, icon: Layers, color: 'text-red-500', bg: 'bg-red-500/5' },
                            { title: 'RLSA Misconfiguration (Observation)', data: audienceAudit.observationWithRlsa, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/5' },
                            { title: 'Closed Membership Pools', data: audienceAudit.closedMembership, icon: CheckCircle2, color: 'text-orange-500', bg: 'bg-orange-500/5' }
                        ].map((section, idx) => section.data.length > 0 && (
                            <div key={idx} className="flex flex-col gap-6 animate-in fade-in duration-1000">
                                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx("p-2 rounded-xl", section.bg)}>
                                            <section.icon className={section.color} size={20} />
                                        </div>
                                        <h3 className="text-xl font-black tracking-tight uppercase">{section.title}</h3>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em]">{section.data.length} Flagged</span>
                                        <ExportButton
                                            filename={`audience-${section.title.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '')}`}
                                            title={`Audience Health - ${section.title}`}
                                            columns={[
                                                { header: 'Account Name', key: 'accountName' },
                                                { header: 'Campaign Context', key: 'campaignName' },
                                                { header: 'Flagged List', key: 'audience' },
                                                { header: 'Setting', key: 'audienceSetting' },
                                                { header: 'Manager', key: 'pm' },
                                            ]}
                                            data={section.data}
                                            darkMode={darkMode}
                                        />
                                    </div>
                                </div>
                                <div className={clsx("rounded-[2rem] border shadow-2xl relative overflow-hidden", cardClass)}>
                                    <div className="max-h-[500px] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead className={clsx("sticky top-0 z-20 font-black uppercase tracking-widest text-[10px]", darkMode ? "bg-[#0a0a0a] text-gray-500" : "bg-gray-50 text-gray-600")}>
                                                <tr>
                                                    <th className="p-2 pl-6 text-center w-12">#</th>
                                                    <th className="p-2">Account Name</th>
                                                    <th className="p-2">Campaign Context</th>
                                                    <th className="p-2">Flagged List</th>
                                                    <th className="p-2">Setting</th>
                                                    <th className="p-2 pr-6 text-right">Manager</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                {section.data.map((row: any, i: number) => (
                                                    <tr key={i} className={clsx("transition-colors group", trHover)}>
                                                        <td className="p-2 pl-6 text-center opacity-30 font-mono text-[10px]">{i + 1}</td>
                                                        <td className="p-2 font-black text-sm max-w-[250px] truncate">{row.accountName}</td>
                                                        <td className="p-2 opacity-70 font-mono text-[11px] truncate max-w-[300px]">{row.campaignName}</td>
                                                        <td className="p-2 font-medium text-blue-400 truncate max-w-[200px]">{row.audience}</td>
                                                        <td className="p-2">
                                                            <span className={clsx("px-2 py-0.5 rounded-full font-black text-[9px] uppercase",
                                                                row.audienceSetting === 'Targeting' ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"
                                                            )}>
                                                                {row.audienceSetting}
                                                            </span>
                                                        </td>
                                                        <td className="p-2 pr-6 text-right opacity-30 font-black tracking-tighter uppercase text-[10px] whitespace-nowrap">{row.pm}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : activeTab === 'campaign' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                                <Activity className="text-blue-500" size={32} />
                                Campaign Infrastructure Audit
                            </h2>
                            <p className={clsx("text-xs font-bold opacity-40 uppercase tracking-widest ml-11", textMuted)}>
                                Rule-Based Sanitization for High-Performance Ads
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <DateSelector
                                label="Select Date"
                                selectedDate={campaignSelectedDate}
                                availableDates={campaignAudit.availableDates || []}
                                onDateChange={setCampaignSelectedDate}
                                darkMode={darkMode}
                            />
                            <BulkExportButton
                                darkMode={darkMode}
                                tables={[
                                    {
                                        id: 'campaign-pm-summary',
                                        name: 'campaign_pm_summary',
                                        title: 'Campaign Audit - Manager Summary',
                                        columns: [
                                            { header: '#', key: 'index' },
                                            { header: 'Manager', key: 'pm' },
                                            { header: 'Total Campaigns', key: 'totalCampaigns' },
                                            { header: 'Budget', key: 'budget' },
                                            { header: 'Device', key: 'device' },
                                            { header: 'Rotation', key: 'rotation' },
                                            { header: 'Max CPC', key: 'cpc' },
                                            { header: 'Opti Score', key: 'opti' },
                                            { header: 'Display', key: 'display' },
                                            { header: 'Policy', key: 'disapproved' },
                                            { header: 'Zero Ads', key: 'ads' },
                                            { header: 'Lang', key: 'lang' },
                                        ],
                                        data: campaignAudit.pmSummaryList.map((s, idx) => ({ index: idx + 1, ...s })),
                                    },
                                    {
                                        id: 'campaign-under-budget',
                                        name: 'campaign_under_budget',
                                        title: 'Campaign Audit - Under $10 Budget',
                                        columns: [
                                            { header: '#', key: 'index' },
                                            { header: 'Account Name', key: 'accountName' },
                                            { header: 'Campaign Name', key: 'campaignName' },
                                            { header: 'Budget', key: 'budget' },
                                        ],
                                        data: campaignAudit.underBudget.map((d: any, idx: number) => ({ index: idx + 1, ...d })),
                                    },
                                    {
                                        id: 'campaign-device-negatives',
                                        name: 'campaign_device_negatives',
                                        title: 'Campaign Audit - Extreme Device Adjust',
                                        columns: [
                                            { header: '#', key: 'index' },
                                            { header: 'Account Name', key: 'accountName' },
                                            { header: 'Campaign Name', key: 'campaignName' },
                                        ],
                                        data: campaignAudit.deviceNegatives.map((d: any, idx: number) => ({ index: idx + 1, ...d })),
                                    },
                                    {
                                        id: 'campaign-rotate-forever',
                                        name: 'campaign_rotate_forever',
                                        title: 'Campaign Audit - Rotate Forever',
                                        columns: [
                                            { header: '#', key: 'index' },
                                            { header: 'Account Name', key: 'accountName' },
                                            { header: 'Campaign Name', key: 'campaignName' },
                                        ],
                                        data: campaignAudit.rotateForever.map((d: any, idx: number) => ({ index: idx + 1, ...d })),
                                    },
                                    {
                                        id: 'campaign-low-cpc',
                                        name: 'campaign_low_cpc',
                                        title: 'Campaign Audit - Low Max CPC',
                                        columns: [
                                            { header: '#', key: 'index' },
                                            { header: 'Account Name', key: 'accountName' },
                                            { header: 'Campaign Name', key: 'campaignName' },
                                            { header: 'Max CPC', key: 'maxCpc' },
                                        ],
                                        data: campaignAudit.lowCpc.map((d: any, idx: number) => ({ index: idx + 1, ...d })),
                                    },
                                    {
                                        id: 'campaign-low-opti',
                                        name: 'campaign_low_opti_score',
                                        title: 'Campaign Audit - Low Opti Score',
                                        columns: [
                                            { header: '#', key: 'index' },
                                            { header: 'Account Name', key: 'accountName' },
                                            { header: 'Campaign Name', key: 'campaignName' },
                                            { header: 'Opti Score', key: 'optiScore' },
                                        ],
                                        data: campaignAudit.lowOpti.map((d: any, idx: number) => ({ index: idx + 1, ...d })),
                                    },
                                    {
                                        id: 'campaign-display-select',
                                        name: 'campaign_display_select',
                                        title: 'Campaign Audit - Display Select ON',
                                        columns: [
                                            { header: '#', key: 'index' },
                                            { header: 'Account Name', key: 'accountName' },
                                            { header: 'Campaign Name', key: 'campaignName' },
                                        ],
                                        data: campaignAudit.displaySelect.map((d: any, idx: number) => ({ index: idx + 1, ...d })),
                                    },
                                    {
                                        id: 'campaign-disapproved',
                                        name: 'campaign_policy_violations',
                                        title: 'Campaign Audit - Policy Violations',
                                        columns: [
                                            { header: '#', key: 'index' },
                                            { header: 'Account Name', key: 'accountName' },
                                            { header: 'Campaign Name', key: 'campaignName' },
                                        ],
                                        data: campaignAudit.disapproved.map((d: any, idx: number) => ({ index: idx + 1, ...d })),
                                    },
                                    {
                                        id: 'campaign-zero-ads',
                                        name: 'campaign_zero_ads',
                                        title: 'Campaign Audit - Zero Active Ads',
                                        columns: [
                                            { header: '#', key: 'index' },
                                            { header: 'Account Name', key: 'accountName' },
                                            { header: 'Campaign Name', key: 'campaignName' },
                                        ],
                                        data: campaignAudit.zeroAds.map((d: any, idx: number) => ({ index: idx + 1, ...d })),
                                    },
                                    {
                                        id: 'campaign-lang-mismatch',
                                        name: 'campaign_language_mismatch',
                                        title: 'Campaign Audit - Language Mismatch',
                                        columns: [
                                            { header: '#', key: 'index' },
                                            { header: 'Account Name', key: 'accountName' },
                                            { header: 'Campaign Name', key: 'campaignName' },
                                        ],
                                        data: campaignAudit.langMismatch.map((d: any, idx: number) => ({ index: idx + 1, ...d })),
                                    },
                                ]}
                            />
                            <div className="w-56">
                                <MultiSelect label="Filter PM" options={uniquePMs} selected={campaignFilterPM} onChange={setCampaignFilterPM} darkMode={darkMode} />
                            </div>
                            {campaignAudit.latestDate && (
                                <div>
                                    <label className="block text-xs mb-1 ml-1 opacity-0 pointer-events-none">Date</label>
                                    <div className={clsx("px-4 py-2 rounded-2xl border flex items-center gap-3", darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-sm")}>
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase opacity-40 leading-none">Latest Snapshot</span>
                                            <span className="text-sm font-black tracking-tight leading-normal uppercase">{campaignAudit.latestDate}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Infrastructure Scorecards */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <StatCard label="Under $10 Budget" value={campaignAudit.underBudget.length} change={campaignAudit.underBudget.length - campaignAudit.prevCounts.budget} icon={AlertTriangle} color="red" darkMode={darkMode} showTrend={true} trendInverted={true} />
                        <StatCard label="Extreme Device Adjust" value={campaignAudit.deviceNegatives.length} change={campaignAudit.deviceNegatives.length - campaignAudit.prevCounts.device} icon={Target} color="orange" darkMode={darkMode} showTrend={true} trendInverted={true} />
                        <StatCard label="Rotate Forever" value={campaignAudit.rotateForever.length} change={campaignAudit.rotateForever.length - campaignAudit.prevCounts.rotate} icon={Activity} color="red" darkMode={darkMode} showTrend={true} trendInverted={true} />
                        <StatCard label="Low Max CPC" value={campaignAudit.lowCpc.length} change={campaignAudit.lowCpc.length - campaignAudit.prevCounts.cpc} icon={Layers} color="blue" darkMode={darkMode} showTrend={true} trendInverted={true} />
                        <StatCard label="Low Opti Score" value={campaignAudit.lowOpti.length} change={campaignAudit.lowOpti.length - campaignAudit.prevCounts.opti} icon={TrendingUp} color="orange" darkMode={darkMode} showTrend={true} trendInverted={true} />

                        <StatCard label="Display Select ON" value={campaignAudit.displaySelect.length} change={campaignAudit.displaySelect.length - campaignAudit.prevCounts.display} icon={Activity} color="red" darkMode={darkMode} showTrend={true} trendInverted={true} />
                        <StatCard label="Policy Violations" value={campaignAudit.disapproved.length} change={campaignAudit.disapproved.length - campaignAudit.prevCounts.disapproved} icon={AlertTriangle} color="red" darkMode={darkMode} showTrend={true} trendInverted={true} />
                        <StatCard label="Zero Active Ads" value={campaignAudit.zeroAds.length} change={campaignAudit.zeroAds.length - campaignAudit.prevCounts.ads} icon={Layers} color="red" darkMode={darkMode} showTrend={true} trendInverted={true} />
                        <StatCard label="Language Mismatch" value={campaignAudit.langMismatch.length} change={campaignAudit.langMismatch.length - campaignAudit.prevCounts.lang} icon={Globe} color="purple" darkMode={darkMode} showTrend={true} trendInverted={true} />
                        <div className={clsx("hidden lg:flex items-center justify-center p-6 rounded-2xl border border-dashed", darkMode ? "border-white/10 opacity-20" : "border-gray-200 opacity-40")}>
                            <Sparkles size={24} />
                        </div>
                    </div>

                    {/* PM Summary heatmap style table */}
                    <div className={clsx("overflow-hidden rounded-3xl border shadow-xl relative", cardClass)}>
                        <div className={clsx("p-4 border-b flex items-center justify-between", darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50")}>
                            <span className={clsx("text-[10px] font-black uppercase tracking-[0.2em]", darkMode ? "opacity-60" : "text-gray-700")}>Manager Infrastructure Summary</span>
                            <ExportButton
                                filename="campaign-audit-pm-summary"
                                title="Campaign Audit - Manager Summary"
                                columns={[
                                    { header: 'Manager', key: 'pm' },
                                    { header: 'Total Campaigns', key: 'totalCampaigns' },
                                    { header: 'Budget', key: 'budget' },
                                    { header: 'Device', key: 'device' },
                                    { header: 'Rotation', key: 'rotate' },
                                    { header: 'Max CPC', key: 'cpc' },
                                    { header: 'Opti Score', key: 'opti' },
                                    { header: 'Display', key: 'display' },
                                    { header: 'Policy', key: 'disapproved' },
                                    { header: 'Zero Ads', key: 'ads' },
                                    { header: 'Lang', key: 'lang' },
                                ]}
                                data={campaignAudit.pmSummaryList}
                                darkMode={darkMode}
                            />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-center text-xs table-fixed">
                                <thead className={clsx("sticky top-0 z-10", darkMode ? "bg-[#111] text-gray-500" : "bg-gray-100 text-gray-600")}>
                                    <tr className="border-b border-white/5 uppercase tracking-tighter text-[12px]">
                                        <th className="p-1 text-center w-8">#</th>
                                        <th className="p-1 text-left border-r border-white/5 w-28">Manager</th>
                                        <th className="p-1 w-20 border-r border-white/5">Total</th>
                                        <th className="p-1 w-16">Budget</th>
                                        <th className="p-1 w-16">Device</th>
                                        <th className="p-1 w-16">Rotation</th>
                                        <th className="p-1 w-16">Max CPC</th>
                                        <th className="p-1 w-16">Opti Score</th>
                                        <th className="p-1 w-16">Display</th>
                                        <th className="p-1 w-16">Policy</th>
                                        <th className="p-1 w-16">Zero Ads</th>
                                        <th className="p-1 w-16">Lang</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {campaignAudit.pmSummaryList.map((s: { pm: string; totalCampaigns: number; budget: number; device: number; rotate: number; bidding: number; cpc: number; opti: number; display: number; disapproved: number; ads: number; lang: number; }, idx: number) => (
                                        <tr key={idx} className={trHover}>
                                            <td className="p-1 text-center opacity-30 font-mono text-[10px]">{idx + 1}</td>
                                            <td className="p-1 text-left border-r border-white/5 font-bold capitalize truncate">{s.pm.toLowerCase()}</td>
                                            <td className="p-1 font-mono font-black border-r border-white/5 text-blue-400">{s.totalCampaigns || 0}</td>
                                            <td className={clsx("p-1 font-mono font-black", s.budget > 0 ? "bg-red-500/10 text-red-500" : "opacity-05")}>{s.budget}</td>
                                            <td className={clsx("p-1 font-mono font-black", s.device > 0 ? "bg-orange-500/10 text-orange-500" : "opacity-05")}>{s.device}</td>
                                            <td className={clsx("p-1 font-mono font-black", s.rotate > 0 ? "bg-red-500/10 text-red-500" : "opacity-05")}>{s.rotate}</td>
                                            <td className={clsx("p-1 font-mono font-black", s.cpc > 0 ? "bg-blue-500/10 text-blue-500" : "opacity-05")}>{s.cpc}</td>
                                            <td className={clsx("p-1 font-mono font-black", s.opti > 0 ? "bg-orange-500/10 text-orange-500" : "opacity-05")}>{s.opti}</td>
                                            <td className={clsx("p-1 font-mono font-black", s.display > 0 ? "bg-red-500/10 text-red-500" : "opacity-05")}>{s.display}</td>
                                            <td className={clsx("p-1 font-mono font-black", s.disapproved > 0 ? "bg-red-500/10 text-red-500" : "opacity-05")}>{s.disapproved}</td>
                                            <td className={clsx("p-1 font-mono font-black", s.ads > 0 ? "bg-red-500/10 text-red-500" : "opacity-05")}>{s.ads}</td>
                                            <td className={clsx("p-1 font-mono font-black", s.lang > 0 ? "bg-purple-500/10 text-purple-500" : "opacity-05")}>{s.lang}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Detailed Drill-downs */}
                    <div className="flex flex-col gap-16 mt-8">
                        {[
                            { title: 'CAMPAIGNS UNDER $10 BUDGET', data: campaignAudit.underBudget, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/5' },
                            { title: 'ALL DEVICES AT -90% OR LOWER', data: campaignAudit.deviceNegatives, icon: Target, color: 'text-orange-500', bg: 'bg-orange-500/5' },
                            { title: 'AD ROTATION SET TO ROTATE FOREVER', data: campaignAudit.rotateForever, icon: Activity, color: 'text-red-500', bg: 'bg-red-500/5' },
                            { title: 'DEFAULT MAX CPC BELOW $1', data: campaignAudit.lowCpc, icon: Layers, color: 'text-blue-500', bg: 'bg-blue-500/5' },
                            { title: 'OPTIMIZATION SCORE BELOW 70%', data: campaignAudit.lowOpti, icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500/5' },
                            { title: 'SEARCH W/ DISPLAY SELECT ENABLED', data: campaignAudit.displaySelect, icon: Activity, color: 'text-red-500', bg: 'bg-red-500/5' },
                            { title: 'LIMITED / DISAPPROVED ADS', data: campaignAudit.disapproved, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/5' },
                            { title: 'ZERO ACTIVE ADS (SEARCH)', data: campaignAudit.zeroAds, icon: Layers, color: 'text-red-500', bg: 'bg-red-500/5' },
                            { title: 'LANGUAGE CODE / TARGET MISMATCH', data: campaignAudit.langMismatch, icon: Globe, color: 'text-purple-500', bg: 'bg-purple-500/5' }
                        ].map((section, idx) => section.data.length > 0 && (
                            <div key={idx} className="flex flex-col gap-6 animate-in fade-in duration-1000">
                                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx("p-2 rounded-xl", section.bg)}>
                                            <section.icon className={section.color} size={20} />
                                        </div>
                                        <h3 className="text-xl font-black tracking-tight uppercase">{section.title}</h3>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em]">{section.data.length} Flagged</span>
                                        <ExportButton
                                            filename={`campaign-${section.title.toLowerCase().replace(/\s+/g, '-').replace(/[()/$%]/g, '')}`}
                                            title={`Campaign Health - ${section.title}`}
                                            columns={[
                                                { header: 'Account Name', key: 'accountName' },
                                                { header: 'Campaign Name', key: 'campaignName' },
                                                { header: 'Issue Trigger', key: 'reason' },
                                                { header: 'Manager', key: 'pm' },
                                            ]}
                                            data={section.data}
                                            darkMode={darkMode}
                                        />
                                    </div>
                                </div>
                                <div className={clsx("rounded-[2rem] border shadow-2xl relative overflow-hidden", cardClass)}>
                                    <div className="max-h-[500px] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead className={clsx("sticky top-0 z-20 font-black uppercase tracking-widest text-[10px]", darkMode ? "bg-[#0a0a0a] text-gray-500" : "bg-gray-50 text-gray-600")}>
                                                <tr>
                                                    <th className="p-2 pl-6 text-center w-12">#</th>
                                                    <th className="p-2">Account Name</th>
                                                    <th className="p-2">Campaign Name</th>
                                                    <th className="p-2">Issue Trigger</th>
                                                    <th className="p-2 pr-6 text-right">Manager</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                {section.data.map((row: any, i: number) => (
                                                    <tr key={i} className={clsx("transition-colors group", trHover)}>
                                                        <td className="p-2 pl-6 text-center opacity-30 font-mono text-[10px]">{i + 1}</td>
                                                        <td className="p-2 font-black text-sm max-w-[250px] truncate">{row.accountName}</td>
                                                        <td className="p-2 opacity-70 font-mono text-[11px] truncate max-w-[400px]">{row.campaignName}</td>
                                                        <td className="p-2 font-bold text-red-400">{row.reason}</td>
                                                        <td className="p-2 pr-6 text-right opacity-30 font-black tracking-tighter uppercase text-[10px] whitespace-nowrap">{row.pm}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in duration-500">
                    {/* Filters Bar (Budget) */}
                    {budgetData.length > 0 && (
                        <div className={clsx("flex flex-col gap-4 mb-4 p-6 border rounded-xl relative z-20", cardClass)}>
                            <div className={clsx("flex items-center gap-2 mb-2", textMuted)}>
                                <Filter className="w-4 h-4" />
                                <span className="text-sm font-medium">Filters:</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <MultiSelect label="Month" options={uniqueBudgetMonths} selected={budgetFilterMonth} onChange={setBudgetFilterMonth} darkMode={darkMode} />
                                <MultiSelect label="PM" options={uniqueBudgetPMs} selected={budgetFilterPM} onChange={setBudgetFilterPM} darkMode={darkMode} />
                                <MultiSelect label="Account Name" options={uniqueBudgetAccounts} selected={budgetFilterAccount} onChange={setBudgetFilterAccount} darkMode={darkMode} />
                            </div>
                        </div>
                    )}
                    {/* REST OF BUDGET VIEW... */}

                    {/* Budget Summary Table (By PM) */}
                    {budgetData.length > 0 && (
                        <div className={clsx("mb-8 overflow-hidden rounded-xl border shadow-lg", cardClass)}>
                            <div className={clsx("p-4 border-b text-sm font-bold uppercase tracking-wider", darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50 text-gray-700")}>
                                PM Overview
                            </div>
                            <div className="overflow-x-auto overflow-y-auto">
                                <table className="w-full text-left">
                                    <thead className={clsx("text-xs font-semibold sticky top-0", darkMode ? "bg-black/80 text-gray-400" : "bg-gray-100/90 text-gray-600")}>
                                        <tr>
                                            <th className="p-3">PM</th>
                                            <th className="p-3 text-center">Total Exhaustions</th>
                                            <th className="p-3 text-center">Total Accounts</th>
                                        </tr>
                                    </thead>
                                    <tbody className={clsx("text-sm divide-y", darkMode ? "divide-white/5" : "divide-gray-100")}>
                                        {pmSummaryStats.map((stat, i) => (
                                            <tr key={i} className={trHover}>
                                                <td className="p-3 font-medium">{stat.pm}</td>
                                                <td className="p-3 text-center font-mono text-blue-400">{stat.exhaustions}</td>
                                                <td className="p-3 text-center font-mono">{stat.distinctAccounts}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className={clsx("overflow-x-auto rounded-2xl border shadow-2xl relative z-10", darkMode ? "border-white/10" : "border-gray-200")}>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={clsx("text-xs uppercase tracking-wider font-bold", darkMode ? "bg-white/10 text-gray-300" : "bg-gray-100 text-gray-600")}>
                                    <th className="p-3 text-center whitespace-nowrap">CID</th>
                                    <th className="p-3 text-center whitespace-nowrap">Account Name</th>
                                    <th className="p-3 text-center whitespace-nowrap">Budget</th>
                                    <th className="p-3 text-center whitespace-nowrap">Amount Spent</th>
                                    <th className="p-3 text-center whitespace-nowrap">% Spent</th>
                                    <th className="p-3 text-center whitespace-nowrap">PM</th>
                                </tr>
                            </thead>
                            <tbody className={clsx("divide-y backdrop-blur-sm text-xs", darkMode ? "bg-white/5 divide-white/5" : "bg-white divide-gray-100")}>
                                {filteredBudgetData.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className={clsx("p-8 text-center", textMuted)}>
                                            {budgetData.length === 0 ? "No budget data found." : "No matching records found."}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBudgetData.map((row, idx) => {
                                        const pct = parseFloat(row.percentSpent.replace('%', ''));
                                        const bVal = parseCurrency(row.budgetAmount);
                                        const sVal = parseCurrency(row.amountSpent);

                                        return (
                                            <tr key={idx} className={clsx("transition-colors group", trHover)}>
                                                <td className="p-3 text-center font-mono text-xs">{row.cid}</td>
                                                <td className="p-3 text-center font-medium">{row.accountName}</td>
                                                <td className="p-3 text-center font-mono">{formatCurrency(bVal, row.currency)}</td>
                                                <td className="p-3 text-center font-mono">{formatCurrency(sVal, row.currency)}</td>
                                                <td className="p-3 text-center">
                                                    <span className={clsx("px-2 py-0.5 rounded-full font-bold",
                                                        pct >= 100 ? "bg-red-500/20 text-red-500" :
                                                            pct >= 90 ? "bg-orange-500/20 text-orange-500" :
                                                                pct >= 75 ? "bg-yellow-500/20 text-yellow-500" :
                                                                    "bg-green-500/20 text-green-500"
                                                    )}>
                                                        {row.percentSpent}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center">{row.pm}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Historical Heatmap */}
                    {budgetData.length > 0 && (
                        <div className={clsx("rounded-2xl border shadow-xl overflow-hidden mt-8", cardClass)}>
                            <div className={clsx("p-4 border-b text-sm font-bold uppercase tracking-wider flex justify-between items-center", darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50 text-gray-700")}>
                                <span>Yearly Exhaustion Trend</span>
                                <div className="flex gap-2 items-center normal-case">
                                    <select
                                        value={heatmapStartMonth}
                                        onChange={(e) => setHeatmapStartMonth(e.target.value)}
                                        className={clsx("p-1 rounded text-xs border bg-transparent cursor-pointer", darkMode ? "border-white/20 text-gray-300" : "border-gray-300 text-gray-700")}
                                    >
                                        <option value="">Start Month</option>
                                        {allChronologicalMonths.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <span className="text-gray-500">-</span>
                                    <select
                                        value={heatmapEndMonth}
                                        onChange={(e) => setHeatmapEndMonth(e.target.value)}
                                        className={clsx("p-1 rounded text-xs border bg-transparent cursor-pointer", darkMode ? "border-white/20 text-gray-300" : "border-gray-300 text-gray-700")}
                                    >
                                        <option value="">End Month</option>
                                        {allChronologicalMonths.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="overflow-x-auto p-4">
                                <table className="w-full text-xs border-separate border-spacing-1">
                                    <thead>
                                        <tr>
                                            <th className="text-left font-medium p-2 sticky left-0 z-10 backdrop-blur-md">PM</th>
                                            {heatmapMonths.map(month => (
                                                <th key={month} className="p-2 text-center font-medium whitespace-nowrap min-w-[60px]">{month}</th>
                                            ))}
                                            <th className="p-2 text-center font-bold whitespace-nowrap min-w-[60px] border-l border-white/10 text-purple-400">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {uniqueHeatmapPMs.map(pm => {
                                            const rowTotal = heatmapMonths.reduce((sum, m) => sum + (heatmapData[pm]?.[m] || 0), 0);
                                            return (
                                                <tr key={pm}>
                                                    <td className={clsx("p-2 font-medium sticky left-0 z-10 whitespace-nowrap backdrop-blur-md", darkMode ? "bg-black/50" : "bg-white/80")}>
                                                        {pm}
                                                    </td>
                                                    {heatmapMonths.map(month => {
                                                        const count = heatmapData[pm]?.[month] || 0;
                                                        // Modern Binary Gradient: Green (0) vs Red (>0)
                                                        const ratio = count / maxHeatmapVal;
                                                        const isZero = count === 0;

                                                        // Hue 150 is Emerald, Hue 0 is Red
                                                        const hue = isZero ? 150 : 0;

                                                        const cellStyle = {
                                                            backgroundColor: isZero
                                                                ? (darkMode ? "hsla(150, 80%, 40%, 0.1)" : "hsla(150, 80%, 50%, 0.05)")
                                                                : (darkMode ? `hsla(0, 80%, 45%, ${0.1 + (ratio * 0.5)})` : `hsla(0, 80%, 55%, ${0.1 + (ratio * 0.4)})`),
                                                            color: isZero
                                                                ? (darkMode ? "hsla(150, 80%, 80%, 0.4)" : "hsla(150, 80%, 30%, 0.4)")
                                                                : (darkMode ? "hsl(0, 80%, 85%)" : "hsl(0, 80%, 35%)"),
                                                            border: `1px solid hsla(${hue}, 80%, 45%, ${isZero ? 0.1 : 0.3})`
                                                        };

                                                        return (
                                                            <td
                                                                key={`${pm}-${month}`}
                                                                style={cellStyle}
                                                                className="text-center rounded-md transition-all hover:scale-110 cursor-default p-2 min-w-[60px]"
                                                            >
                                                                {count > 0 ? count : '0'}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className={clsx("text-center font-bold border-l p-2", darkMode ? "border-white/10 text-purple-400" : "border-gray-200 text-purple-600")}>
                                                        {rowTotal}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {/* Column Totals Row */}
                                        <tr className={clsx("border-t-2", darkMode ? "border-white/20" : "border-gray-300")}>
                                            <td className={clsx("p-2 font-bold sticky left-0 z-10 backdrop-blur-md", darkMode ? "bg-black/50 text-purple-400" : "bg-white/80 text-purple-600")}>GRAND TOTAL</td>
                                            {heatmapMonths.map(month => {
                                                const columnTotal = uniqueHeatmapPMs.reduce((sum, pm) => sum + (heatmapData[pm]?.[month] || 0), 0);
                                                return (
                                                    <td key={`total-${month}`} className="text-center font-bold p-2 text-purple-400">
                                                        {columnTotal}
                                                    </td>
                                                );
                                            })}
                                            <td className="text-center font-black p-2 bg-purple-500 text-white rounded-md">
                                                {uniqueHeatmapPMs.reduce((sum, pm) => sum + heatmapMonths.reduce((rs, m) => rs + (heatmapData[pm]?.[m] || 0), 0), 0)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Dashboard Footer */}
            <footer className="mt-20 py-8 border-t border-white/5 flex flex-col items-center gap-2">
                <div className={clsx("text-sm font-bold opacity-60 tracking-tight", darkMode ? "text-white" : "text-gray-900")}>
                    &copy; EME Paid Media Team 2026
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                    <a href="mailto:paidmedia@emarketingeye.com" className={clsx("text-[11px] font-medium opacity-50 hover:opacity-100 transition-opacity underline-offset-4 hover:underline decoration-purple-500", darkMode ? "text-purple-300" : "text-purple-600")}>
                        paidmedia@emarketingeye.com
                    </a>
                </div>
            </footer>
        </div>
    );
}
