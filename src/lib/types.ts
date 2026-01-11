export interface ManagementData {
    cid: string;
    pm: string;
    email: string;
    accountName: string;
    monthlyBudget: string; // Keeping as string to handle currency symbols if present, or parse later
    weeklyBudget: string;
    conversionSource: string;
    campaignConversionAction: string;
    targetRoas: string;
    objective: string;
    strategist: string;
    clientAccount: string;
    team: string;
    type: string;
    country: string;
}

export interface BudgetData {
    currentDate: string;
    cid: string;
    accountName: string;
    budgetName: string;
    amountSpent: string;
    budgetAmount: string;
    currency: string;
    percentSpent: string;
    startDate: string;
    endDate: string;
    pm: string;
    email: string;
}

export interface MonthlyTotalData extends ManagementData {
    month: string;
    impressions: string;
    clicks: string;
    cost: string;
    conversions: string;
    conversionValue: string;
}

export const MOCK_MANAGEMENT_DATA: ManagementData[] = [
    {
        cid: '123-456-7890',
        pm: 'Alice Johnson',
        email: 'alice@example.com',
        accountName: 'Acme Corp',
        monthlyBudget: '$5,000',
        weeklyBudget: '$1,250',
        conversionSource: 'Website',
        campaignConversionAction: 'Purchase',
        targetRoas: '400%',
        objective: 'Sales',
        strategist: 'Bob Smith',
        clientAccount: 'Client A',
        team: 'Alpha',
        type: 'Search',
        country: 'USA'
    },
    {
        cid: '987-654-3210',
        pm: 'Charlie Brown',
        email: 'charlie@example.com',
        accountName: 'Beta Inc',
        monthlyBudget: '$10,000',
        weeklyBudget: '$2,500',
        conversionSource: 'Import',
        campaignConversionAction: 'Lead',
        targetRoas: '250%',
        objective: 'Leads',
        strategist: 'Diana Prince',
        clientAccount: 'Client B',
        team: 'Beta',
        type: 'Display',
        country: 'UK'
    }
];
