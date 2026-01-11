import { NextResponse } from 'next/server';
import Papa from 'papaparse';

export async function POST(req: Request) {
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { url, mode = 'management' } = body;

    if (!url) {
        return NextResponse.json({ success: false, error: 'Missing Sheet URL' }, { status: 400 });
    }

    try {
        console.log(`Fetching CSV (Mode: ${mode}) from: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
        }
        const csvText = await response.text();

        const parseResult = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h: string) => h.trim()
        });

        if (parseResult.errors.length > 0) {
            console.warn("CSV Parse Warnings:", parseResult.errors);
        }

        const rows = parseResult.data as any[];

        let data = [];

        if (mode === 'budget') {
            // Parse Budget Data
            data = rows.map(row => {
                const get = (key: string) => row[key] || row[Object.keys(row).find(k => k.toLowerCase().includes(key.toLowerCase())) || ''] || '';

                return {
                    currentDate: get('Current Date'),
                    cid: get('CID').trim(),
                    accountName: get('Account Name').trim(),
                    budgetName: get('Budget Name').trim(),
                    amountSpent: get('Amount Spent').trim(),
                    budgetAmount: get('Budget Amount').trim(),
                    currency: get('Currency').trim(),
                    percentSpent: get('% Spent').trim(),
                    startDate: get('Start Date').trim(),
                    endDate: get('End Date').trim(),
                    pm: get('PM').trim(),
                    email: get('Email').trim()
                };
            }).filter(item => item.cid && item.accountName); // Basic validation
        } else if (mode === 'pm') {
            // Mapping PM Status from TeamnEmails sheet
            data = rows.map(row => {
                const get = (key: string) => row[key] || row[Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase()) || ''] || '';

                // User says Column A is PM. In gid=1995902069, Column A header is "Team".
                // We'll prefer "PM" then "Team" then "Name".
                const pmName = (get('PM') || get('Team') || get('Name')).trim();
                const status = get('Status').trim();

                return {
                    pm: pmName,
                    status: status
                };
            }).filter(item => item.pm);
        } else if (mode === 'monthly' || mode === 'daily') {
            // Parse Performance Data (Monthly or Daily)
            data = rows.map(row => {
                const get = (key: string) => row[key] || row[Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase()) || ''] || '';

                return {
                    month: get('Month') || get('Date') || get('Day') || '', // Map Date/Day to 'month' field for compatibility
                    cid: get('CID').trim(),
                    accountName: get('Account Name').trim(),
                    pm: get('PM').trim(),
                    monthlyBudget: get('Monthly Budget'),
                    weeklyBudget: get('Weekly Budget'),
                    conversionSource: get('Conversion Source'),
                    campaignConversionAction: get('Campaign Conversion Action'),
                    targetRoas: get('Target ROAS'),
                    objective: get('Objective'),
                    strategist: get('Strategist'),
                    clientAccount: get('Client Account'),
                    team: get('Team').trim(),
                    type: get('Type').trim(),
                    country: get('Country').trim(),
                    impressions: get('Impressions'),
                    clicks: get('Clicks'),
                    cost: get('Cost'),
                    conversions: get('Conversions'),
                    conversionValue: get('Conversion Value')
                };
            }).filter(item => item.accountName);
        } else if (mode === 'audience') {
            // Parse Audience Health Data
            data = rows.map(row => {
                const get = (key: string) => row[key] || row[Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase()) || ''] || '';
                return {
                    date: get('Date'),
                    cid: get('CID').trim(),
                    accountName: get('Account Name').trim(),
                    campaignName: get('Campaign Name').trim(),
                    audience: get('Audience').trim(),
                    audienceSetting: get('Audience Setting').trim(),
                    audienceSource: get('Audience Source').trim(),
                    searchSize: get('Search Size'),
                    displaySize: get('Display Size'),
                    membershipStatus: get('Membership Status').trim()
                };
            }).filter(item => item.cid && item.accountName);
        } else if (mode === 'campaign') {
            // Parse Campaign Health Audit Data
            data = rows.map(row => {
                const get = (key: string) => row[key] || row[Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase().trim()) || ''] || '';
                return {
                    date: get('Date'),
                    cid: get('CID').trim(),
                    accountName: get('Account Name').trim(),
                    campaignName: get('Campaign Name').trim(),
                    campaignStatus: get('Campaign Status').trim(),
                    dailyBudget: get('Daily Budget'),
                    deviceAdjustment: get('Device Bid Adjustment'),
                    adRotation: get('Ad Rotation Type'),
                    maxCpc: get('Default Max CPC'),
                    optimizationScore: get('Optimization Score'),
                    campaignType: get('Campaign Type'),
                    displaySelect: get('Display Select'),
                    disapprovedAds: get('Limited/Disapproved Ads'),
                    activeAds: get('Enabled Search Ads') || get('Active Ads'),
                    language: get('Languages') || get('Language') || get('I')
                };
            }).filter(item => item.cid && item.accountName);
        } else {
            // Default: Management Data
            data = rows.map(row => {
                const get = (key: string) => row[key] || row[Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase()) || ''] || '';

                return {
                    cid: get('CID').trim(),
                    pm: get('PM').trim(),
                    email: get('EMail').trim(),
                    accountName: get('Account Name').trim(),
                    monthlyBudget: get('Monthly Budget'),
                    weeklyBudget: get('Weekly Budget'),
                    conversionSource: get('Conversion Source'),
                    campaignConversionAction: get('Campaign Conversion Action'),
                    targetRoas: get('Target ROAS'),
                    objective: get('Objective'),
                    strategist: get('Strategist'),
                    clientAccount: get('Client Account'),
                    team: get('Team'),
                    type: get('Type'),
                    country: get('Country'),
                    status: get('Status')
                };
            }).filter(item => item.cid && item.accountName);
        }

        return NextResponse.json({
            success: true,
            mode,
            count: data.length,
            data: data
        });

    } catch (error: any) {
        console.error('Visual Bridge Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}
