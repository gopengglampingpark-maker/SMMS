import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { DollarSign, Wallet, Megaphone, CheckSquare, ChevronDown, X, ArrowRight, Calendar, Filter, CalendarDays } from 'lucide-react';
import { getCampaigns, getBranches } from '../services/storage';
import { Branch, MarketingPlan, Campaign, KPI } from '../types';

import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  startOfDay, 
  endOfDay, 
  isWithinInterval, 
  isValid, 
  parseISO 
} from 'date-fns';

interface DashboardProps {
  onNavigate: (view: string, data?: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter Mode State
  const [filterMode, setFilterMode] = useState<'month' | 'range'>('month');

  // Month/Year State (Defaults to Current)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Date Range State (Driven by filterMode)
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
  // Modal State for KPI drills
  const [kpiModal, setKpiModal] = useState<{
    title: string;
    items: Array<{ plan: MarketingPlan, campaignName: string, campaignId: string }>;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const [c, b] = await Promise.all([getCampaigns(), getBranches()]);
            setAllCampaigns(c);
            setBranches(b);
        } catch(e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }
    fetchData();
  }, []);

  // Effect: Update start/end date when Month/Year changes
  useEffect(() => {
    if (filterMode === 'month') {
        const start = startOfMonth(new Date(selectedYear, selectedMonth));
        const end = endOfMonth(new Date(selectedYear, selectedMonth));
        setStartDate(format(start, 'yyyy-MM-dd'));
        setEndDate(format(end, 'yyyy-MM-dd'));
    }
  }, [selectedMonth, selectedYear, filterMode]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'start' | 'end') => {
      const val = e.target.value;
      if (field === 'start') setStartDate(val);
      else setEndDate(val);
  };

  const handleSafePicker = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      if ('showPicker' in HTMLInputElement.prototype) {
        e.currentTarget.showPicker();
      }
    } catch (error) {
      console.debug("SafePicker: Browser prevented showPicker, falling back to default behavior", error);
    }
  };

  // --- Filtering Logic ---
  const filteredData = useMemo(() => {
    // 1. Filter by Branch
    let relevantCampaigns = selectedBranch === 'all' 
      ? allCampaigns 
      : allCampaigns.filter(c => c.branchId === selectedBranch);

    if (!startDate || !endDate) {
        return { campaigns: relevantCampaigns, plans: [] }; // Fallback if invalid
    }

    try {
        const start = startOfDay(parseISO(startDate));
        const end = endOfDay(parseISO(endDate));
        
        if (!isValid(start) || !isValid(end)) {
            return { campaigns: [], plans: [] };
        }

        // 2. Identify Campaigns overlapping the date range
        const campaignOverlaps = (c: Campaign) => {
           if (!c.startDate || !c.endDate) return false;
           try {
             const cStart = parseISO(c.startDate);
             const cEnd = parseISO(c.endDate);
             return isValid(cStart) && isValid(cEnd) && (cStart <= end && cEnd >= start);
           } catch { return false; }
        };

        const activeCampaignsInRange = relevantCampaigns.filter(campaignOverlaps);

        // 3. Filter Marketing Plans strictly within range
        const plansInRange: Array<{ plan: MarketingPlan, campaignName: string, campaignId: string }> = [];
        relevantCampaigns.forEach(c => {
           if(c.plans) {
             c.plans.forEach(p => {
                if (p.scheduledDate) {
                    try {
                      const pDate = parseISO(p.scheduledDate);
                      if (isValid(pDate) && isWithinInterval(pDate, { start, end })) {
                          plansInRange.push({ plan: p, campaignName: c.name, campaignId: c.id });
                      }
                    } catch {}
                }
             });
           }
        });

        return {
           campaigns: activeCampaignsInRange,
           plans: plansInRange
        };

    } catch (error) {
        console.error("Date filtering error:", error);
        return { campaigns: [], plans: [] };
    }

  }, [allCampaigns, selectedBranch, startDate, endDate]);


  // Calculate KPIs
  const kpis: KPI[] = useMemo(() => {
    const totalRevenue = filteredData.campaigns.reduce((acc, c) => acc + (c.actualRevenue || 0), 0);
    const totalSpend = filteredData.plans.reduce((acc, item) => acc + (item.plan.cost || 0), 0);
    const activePlansList = filteredData.plans.filter(item => item.plan.status !== 'Draft');
    const pendingTasksList = filteredData.plans.filter(item => item.plan.status !== 'Published');

    return [
      { 
        label: 'Revenue (Campaigns)', 
        value: `RM ${totalRevenue.toLocaleString()}`, 
        icon: DollarSign, 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-100',
        clickable: false,
        trend: 0,
        trendUp: true
      },
      { 
        label: 'Marketing Spend', 
        value: `RM ${totalSpend.toLocaleString()}`, 
        icon: Wallet, 
        color: 'text-blue-600', 
        bg: 'bg-blue-100',
        clickable: false,
        trend: 0,
        trendUp: true
      },
      { 
        label: 'Active Plans', 
        value: activePlansList.length.toString(), 
        icon: Megaphone, 
        color: 'text-orange-600', 
        bg: 'bg-orange-100',
        clickable: true,
        items: activePlansList,
        trend: 0,
        trendUp: true
      },
      { 
        label: 'Pending Tasks', 
        value: pendingTasksList.length.toString(), 
        icon: CheckSquare, 
        color: 'text-purple-600', 
        bg: 'bg-purple-100',
        clickable: true,
        items: pendingTasksList,
        trend: 0,
        trendUp: true
      },
    ];
  }, [filteredData]);

  // Chart Data Preparation
  const revenueData = filteredData.campaigns.map(c => {
    const campaignSpendInRange = filteredData.plans
        .filter(p => p.campaignId === c.id)
        .reduce((sum, item) => sum + (item.plan.cost || 0), 0);

    return {
      name: c.name.split(' ').slice(0, 2).join(' '), // Shorten name
      revenue: c.actualRevenue, 
      spend: campaignSpendInRange
    };
  });

  const platformData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.plans.forEach(item => {
        item.plan.platform.forEach(plat => {
            counts[plat] = (counts[plat] || 0) + 1;
        });
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [filteredData]);

  const COLORS = ['#059669', '#2563EB', '#D97706', '#7C3AED', '#DB2777', '#64748b', '#000000', '#EF4444'];

  const handleKpiClick = (kpi: KPI) => {
    if (kpi.clickable && kpi.items && kpi.items.length > 0) {
        setKpiModal({ title: kpi.label, items: kpi.items });
    }
  };

  const handleNavigateToPlan = (campaignId: string) => {
      onNavigate('campaigns', { campaignId });
  };

  // Generate Year Options
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 6}, (_, i) => currentYear - 3 + i);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><div className="loader"></div></div>;
  }

  return (
    <div className="space-y-6 isolate">
      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
            <p className="text-sm text-slate-500">
                {filterMode === 'month' 
                 ? `Performance for ${months[selectedMonth]} ${selectedYear}`
                 : 'Performance for selected range'
                }
            </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto items-center">
             
            {/* View Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 z-20">
                <button 
                  onClick={() => setFilterMode('month')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterMode === 'month' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Monthly
                </button>
                <button 
                  onClick={() => setFilterMode('range')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterMode === 'range' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Custom Range
                </button>
            </div>

            {/* Branch Filter */}
            <div className="relative w-full sm:w-auto min-w-[150px] z-20">
                <select 
                  className="w-full appearance-none bg-white border border-slate-300 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer hover:bg-slate-50 transition-colors"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                >
                  <option value="all">All Branches</option>
                  {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
            </div>

            {/* Date Controls */}
            {filterMode === 'month' ? (
                <div className="flex gap-2 z-20 w-full sm:w-auto">
                    <div className="relative w-1/2 sm:w-auto">
                        <select 
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="w-full appearance-none bg-white border border-slate-300 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer"
                        >
                            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" size={14} />
                    </div>
                    <div className="relative w-1/2 sm:w-auto">
                        <select 
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="w-full appearance-none bg-white border border-slate-300 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" size={14} />
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 relative z-20 w-full sm:w-auto">
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => handleDateChange(e, 'start')}
                        onClick={handleSafePicker}
                        className="w-full sm:w-auto bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer min-w-[130px]"
                    />
                    <span className="text-slate-400 font-bold">-</span>
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => handleDateChange(e, 'end')}
                        onClick={handleSafePicker}
                        className="w-full sm:w-auto bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer min-w-[130px]"
                    />
                </div>
            )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 z-10">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div 
                key={idx} 
                onClick={() => handleKpiClick(kpi)}
                className={`bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 transition-all duration-200 
                    ${kpi.clickable ? 'cursor-pointer hover:shadow-md hover:border-emerald-200 active:scale-95' : 'hover:scale-105'}`}
            >
              <div className={`p-4 rounded-full ${kpi.bg}`}>
                <Icon className={kpi.color} size={24} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">{kpi.label}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{kpi.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 z-0">
        
        {/* Revenue vs Spend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-semibold text-slate-800">Financial Performance</h3>
             <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded">Selected Range</span>
          </div>
          
          {revenueData.length > 0 ? (
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <Tooltip 
                    formatter={(value: number) => `RM ${value.toLocaleString()}`}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    cursor={{fill: '#f1f5f9'}}
                    />
                    <Bar dataKey="spend" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Spend (In Range)" />
                    <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} name="Total Revenue" />
                </BarChart>
                </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-400 flex-col gap-2">
                <Filter size={32} className="opacity-20"/>
                <p>No campaigns found in selected range</p>
            </div>
          )}
        </div>

        {/* Platform Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Marketing Channels (In Range)</h3>
          {platformData.length > 0 ? (
              <>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={platformData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        >
                        {platformData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                    {platformData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                        <span className="text-xs text-slate-600 font-medium">{entry.name}</span>
                    </div>
                    ))}
                </div>
              </>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-400 flex-col gap-2">
                <Calendar size={32} className="opacity-20"/>
                <p>No plans scheduled in selected range</p>
            </div>
          )}
        </div>
      </div>

      {/* KPI Details Modal */}
      {kpiModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fadeIn flex flex-col max-h-[80vh]">
                  <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-white">{kpiModal.title}</h3>
                      <button onClick={() => setKpiModal(null)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                  </div>
                  <div className="overflow-y-auto p-4 space-y-3">
                      {kpiModal.items.map((item, i) => (
                          <div 
                            key={i} 
                            onClick={() => handleNavigateToPlan(item.campaignId)}
                            className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer group flex justify-between items-center"
                          >
                              <div>
                                  <p className="font-semibold text-slate-800">{item.plan.title}</p>
                                  <p className="text-xs text-slate-500">{item.campaignName} • {item.plan.scheduledDate}</p>
                              </div>
                              <div className="text-right flex items-center gap-3">
                                  <div>
                                      <span className="block text-[10px] text-slate-400 uppercase">Cost</span>
                                      <span className="font-bold text-slate-700">RM {item.plan.cost.toLocaleString()}</span>
                                  </div>
                                  <ArrowRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Dashboard;