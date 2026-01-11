export interface CampaignData {
    name: string;
    impressions: number;
    clicks: number;
    ctr: number;
    avgCpc: number;
    cost: number;
    conversions: number;
}

export const MOCK_DATA: CampaignData[] = [
    { name: 'Summer Sale 2025', impressions: 12500, clicks: 850, ctr: 0.068, avgCpc: 1.20, cost: 1020, conversions: 45 },
    { name: 'Brand Awareness', impressions: 45000, clicks: 2100, ctr: 0.046, avgCpc: 0.85, cost: 1785, conversions: 12 },
    { name: 'Retargeting - Cart', impressions: 3200, clicks: 450, ctr: 0.14, avgCpc: 1.50, cost: 675, conversions: 88 },
    { name: 'Competitor - Exact', impressions: 1500, clicks: 120, ctr: 0.08, avgCpc: 2.10, cost: 252, conversions: 5 },
    { name: 'YouTube - PreRoll', impressions: 150000, clicks: 300, ctr: 0.002, avgCpc: 0.15, cost: 45, conversions: 1 },
];
