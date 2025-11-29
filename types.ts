export type Role = 'Admin' | 'Staff';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: Role;
  name: string;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface EventType {
  id: string;
  name: string;
}

export type CampaignStatus = 'Planning' | 'Active' | 'Completed' | 'On Hold' | 'Cancelled';

export interface MarketingPlan {
  id: string;
  title: string;
  description?: string; // Added description field
  platform: string[];
  scheduledDate: string; // ISO Date string YYYY-MM-DD
  status: 'Draft' | 'Scheduled' | 'Published' | 'Cancelled';
  budget: number;
  cost: number;
}

export interface Campaign {
  id: string;
  branchId: string;
  categoryId?: string;
  eventTypeId?: string;
  name: string;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  targetRevenue: number;
  actualRevenue: number;
  description: string;
  poster?: string;
  plans: MarketingPlan[];
}

export interface KPI {
  label: string;
  value: string;
  trend: number;
  trendUp: boolean;
  icon: any; // React component type
  bg: string;
  color: string;
  clickable: boolean;
  items?: any[];
}