import React, { useState, useEffect } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths, 
  parseISO, 
  isWithinInterval, 
  endOfDay, 
  startOfDay, 
  setMonth, 
  setYear, 
  compareAsc, 
  isValid, 
  startOfYear, 
  endOfYear, 
  isSameYear 
} from 'date-fns';
import { ChevronLeft, ChevronRight, X, Calendar as CalIcon, ArrowRight, List, LayoutGrid, Filter, Circle } from 'lucide-react';
import { getCampaigns, getBranches } from '../services/storage';
import { Campaign, Branch, MarketingPlan } from '../types';

interface CalendarViewProps {
  onNavigate: (view: string, data?: any) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ onNavigate }) => {
  // Fix: Initialize to current date so it opens on relevant year, not hardcoded 2024
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<{type: 'campaign' | 'plan', data: any, campaignId: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const [b, c] = await Promise.all([getBranches(), getCampaigns()]);
            setBranches(b);
            setCampaigns(c);
        } catch(e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, []);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(setMonth(currentDate, parseInt(e.target.value)));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(setYear(currentDate, parseInt(e.target.value)));
  };

  const filteredCampaigns = selectedBranch === 'all' 
    ? campaigns 
    : campaigns.filter(c => c.branchId === selectedBranch);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // --- Style Helpers ---

  const getCampaignStyles = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-200 text-emerald-900 border-l-2 border-emerald-600';
      case 'Planning': return 'bg-blue-200 text-blue-900 border-l-2 border-blue-600';
      case 'Completed': return 'bg-slate-200 text-slate-700 border-l-2 border-slate-500';
      case 'On Hold': return 'bg-orange-100 text-orange-900 border-l-2 border-orange-500';
      case 'Cancelled': return 'bg-red-100 text-red-900 border-l-2 border-red-600';
      default: return 'bg-slate-100 text-slate-900';
    }
  };

  const getPlanStyles = (status: string) => {
    switch (status) {
      case 'Published': return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
      case 'Scheduled': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      case 'Draft': return 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100';
      case 'Cancelled': return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
      default: return 'bg-white text-slate-600 border-slate-200';
    }
  };

  // --- Grid View Helpers ---

  // Helper to check if a day is part of a campaign
  const getActiveCampaignsForDay = (day: Date) => {
    return filteredCampaigns.filter(c => {
        if (!c.startDate || !c.endDate) return false;
        try {
            const start = startOfDay(parseISO(c.startDate));
            const end = endOfDay(parseISO(c.endDate));
            if (!isValid(start) || !isValid(end)) return false;
            return isWithinInterval(day, { start, end });
        } catch (e) {
            return false;
        }
    });
  };

  // Helper to get plans for a day
  const getPlansForDay = (day: Date) => {
    const plans: { plan: MarketingPlan, campaignName: string, campaignId: string }[] = [];
    filteredCampaigns.forEach(c => {
      if(c.plans) {
        c.plans.forEach(p => {
            if (p.scheduledDate && isSameDay(parseISO(p.scheduledDate), day)) {
            plans.push({ plan: p, campaignName: c.name, campaignId: c.id });
            }
        });
      }
    });
    return plans;
  };

  // --- List View Helpers (Whole Year) ---
  
  const getYearEvents = () => {
    const events: Array<{
      date: Date,
      type: 'campaign' | 'plan',
      title: string,
      subtitle: string,
      status: string,
      id: string,
      originalData: any,
      campaignId: string
    }> = [];

    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);

    // 1. Add Campaigns active in this year
    filteredCampaigns.forEach(c => {
      if (!c.startDate || !c.endDate) return;
      try {
          const start = parseISO(c.startDate);
          const end = parseISO(c.endDate);
          
          // Check overlap with the current year
          if (start <= yearEnd && end >= yearStart) {
            // If the campaign started before this year, list it as starting Jan 1st for sorting purposes, 
            // otherwise use actual start date
            const sortDate = start < yearStart ? yearStart : start;

            events.push({
              date: sortDate,
              type: 'campaign',
              title: c.name,
              subtitle: `Active: ${c.startDate} to ${c.endDate}`,
              status: c.status,
              id: c.id,
              originalData: c,
              campaignId: c.id
            });
          }
      } catch (e) { console.error(e); }
    });

    // 2. Add Plans in this year
    filteredCampaigns.forEach(c => {
      if(c.plans) {
        c.plans.forEach(p => {
            if (!p.scheduledDate) return;
            try {
                const pDate = parseISO(p.scheduledDate);
                if (isSameYear(pDate, currentDate)) {
                    events.push({
                        date: pDate,
                        type: 'plan',
                        title: p.title,
                        subtitle: `${c.name} • ${p.platform.join(', ')}`,
                        status: p.status,
                        id: p.id,
                        originalData: { plan: p, campaignName: c.name, campaignId: c.id },
                        campaignId: c.id
                    });
                }
            } catch (e) { console.error(e); }
        });
      }
    });

    // Sort by date
    return events.sort((a, b) => compareAsc(a.date, b.date));
  };

  const handleNavigateToEvent = () => {
      if (selectedEvent) {
          onNavigate('campaigns', { campaignId: selectedEvent.campaignId });
      }
  };

  // Generate Year Options (current year +/- 5)
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 11}, (_, i) => currentYear - 5 + i);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><div className="loader"></div></div>;
  }

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Marketing Calendar</h2>
           <p className="text-sm text-slate-500">
             {viewMode === 'grid' ? 'Monthly overview' : `Events for ${format(currentDate, 'yyyy')}`}
           </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          {/* Branch Filter */}
          <div className="relative w-full sm:w-auto">
             <select 
               className="appearance-none bg-white border border-slate-300 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
               value={selectedBranch}
               onChange={(e) => setSelectedBranch(e.target.value)}
             >
               <option value="all">All Branches</option>
               {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
             </select>
             <Filter className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" size={14} />
          </div>

          {/* Month/Year Selection */}
          <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm p-0.5">
            {viewMode === 'grid' && (
                <>
                    <button onClick={prevMonth} className="p-1.5 hover:bg-slate-50 rounded text-slate-500"><ChevronLeft size={18} /></button>
                    <div className="px-1 border-r border-slate-100">
                        <select 
                            value={currentDate.getMonth()} 
                            onChange={handleMonthChange}
                            className="appearance-none bg-transparent font-semibold text-slate-700 text-sm py-1 px-1 cursor-pointer hover:text-emerald-600 focus:outline-none"
                        >
                          {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                    </div>
                </>
            )}
            
            <div className="px-1">
               <select 
                  value={currentDate.getFullYear()} 
                  onChange={handleYearChange}
                  className="appearance-none bg-transparent text-slate-500 text-sm py-1 px-1 cursor-pointer hover:text-emerald-600 focus:outline-none font-medium"
               >
                 {years.map(y => <option key={y} value={y}>{y}</option>)}
               </select>
            </div>

            {viewMode === 'grid' && (
                <button onClick={nextMonth} className="p-1.5 hover:bg-slate-50 rounded text-slate-500"><ChevronRight size={18} /></button>
            )}
          </div>

          <button onClick={goToToday} className="hidden sm:block text-xs font-medium bg-white border border-slate-300 px-3 py-2 rounded-lg text-slate-600 hover:text-emerald-600 hover:border-emerald-300 transition-colors">
            Today
          </button>
          
          {/* View Toggle */}
          <div className="flex bg-slate-200 p-1 rounded-lg">
             <button 
               onClick={() => setViewMode('grid')}
               className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
               title="Grid View"
             >
                <LayoutGrid size={18} />
             </button>
             <button 
               onClick={() => setViewMode('list')}
               className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
               title="List View"
             >
                <List size={18} />
             </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
        
        {viewMode === 'grid' ? (
          <>
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid Cells */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto">
              {/* Padding for start of month */}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                 <div key={`empty-${i}`} className="bg-slate-50/30 border-b border-r border-slate-100"></div>
              ))}

              {days.map(day => {
                const activeCampaigns = getActiveCampaignsForDay(day);
                const plans = getPlansForDay(day);
                const isToday = isSameDay(day, new Date());

                return (
                  <div 
                    key={day.toString()} 
                    className={`min-h-[120px] p-1 border-b border-r border-slate-100 transition-colors hover:bg-slate-50 relative group
                      ${activeCampaigns.length > 0 ? 'bg-slate-50/50' : ''}
                    `}
                  >
                    <div className="flex justify-between items-start mb-1 p-1">
                      <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-slate-900 text-white' : 'text-slate-700'}`}>
                        {format(day, 'd')}
                      </span>
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[100px] scrollbar-hide px-1">
                      {/* Render Campaign Bars */}
                      {activeCampaigns.map(c => {
                        const isStart = isSameDay(parseISO(c.startDate), day);
                        const isEnd = isSameDay(parseISO(c.endDate), day);
                        return (
                          <div 
                            key={c.id}
                            onClick={() => setSelectedEvent({ type: 'campaign', data: c, campaignId: c.id })}
                            className={`text-[10px] h-5 px-1 flex items-center truncate cursor-pointer hover:opacity-80 mb-0.5
                              ${isStart ? 'rounded-l-md pl-1.5 font-semibold' : ''}
                              ${isEnd ? 'rounded-r-md' : ''}
                              ${!isStart && !isEnd ? 'rounded-none' : ''}
                              ${getCampaignStyles(c.status)}
                            `}
                            title={`Campaign: ${c.name} (${c.status})`}
                          >
                             {isStart || day.getDay() === 0 ? c.name : ''} 
                          </div>
                        );
                      })}

                      {/* Render Plans */}
                      {plans.map((item, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedEvent({ type: 'plan', data: item, campaignId: item.campaignId })}
                          className={`text-[10px] px-2 py-0.5 mb-1 rounded-full border truncate cursor-pointer shadow-sm flex items-center gap-1.5
                            ${getPlanStyles(item.plan.status)}
                          `}
                          title={`${item.plan.platform.join(', ')}: ${item.plan.title} (${item.plan.status})`}
                        >
                          <Circle size={4} fill="currentColor" className="flex-shrink-0" />
                          <span className="truncate">{item.plan.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
             {/* List View - Shows Whole Year */}
             <div className="space-y-3">
               {getYearEvents().length > 0 ? (
                 getYearEvents().map((evt, idx) => (
                   <div 
                      key={idx} 
                      onClick={() => setSelectedEvent({ type: evt.type, data: evt.originalData, campaignId: evt.campaignId })}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center gap-4 group"
                   >
                      <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg flex-shrink-0 ${isSameDay(evt.date, new Date()) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                         <span className="text-xs uppercase font-bold">{format(evt.date, 'MMM')}</span>
                         <span className="text-xl font-bold">{format(evt.date, 'd')}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                                  evt.type === 'campaign' 
                                  ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}>
                               {evt.type === 'campaign' ? 'Campaign' : 'Plan'}
                            </span>
                            <h4 className="font-bold text-slate-800 truncate">{evt.title}</h4>
                         </div>
                         <p className="text-sm text-slate-500 truncate">{evt.subtitle}</p>
                      </div>

                      <div className="flex items-center gap-4">
                         <span className={`text-xs px-2 py-1 rounded-full border hidden sm:block font-medium ${
                            evt.status === 'Active' || evt.status === 'Published' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                            evt.status === 'Planning' || evt.status === 'Scheduled' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            evt.status === 'On Hold' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                            evt.status === 'Cancelled' ? 'bg-red-100 text-red-700 border-red-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                         }`}>
                           {evt.status}
                         </span>
                         <ArrowRight size={18} className="text-slate-300 group-hover:text-emerald-500 transition-colors"/>
                      </div>
                   </div>
                 ))
               ) : (
                 <div className="text-center py-20 text-slate-400 flex flex-col items-center">
                    <CalIcon size={48} className="mb-4 text-slate-200" />
                    <p>No events found for {format(currentDate, 'yyyy')}</p>
                 </div>
               )}
             </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={() => setSelectedEvent(null)}>
           <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full animate-fadeIn" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                 <h3 className="font-bold text-lg text-slate-800">
                    {selectedEvent.type === 'campaign' ? 'Campaign Details' : 'Marketing Plan'}
                 </h3>
                 <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
              </div>

              {selectedEvent.type === 'campaign' ? (
                <div className="space-y-3">
                   <div className="w-full h-32 bg-slate-100 rounded-lg overflow-hidden">
                      {selectedEvent.data.poster ? (
                        <img src={selectedEvent.data.poster} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Poster</div>
                      )}
                   </div>
                   <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getCampaignStyles(selectedEvent.data.status).split(' ').slice(0,2).join(' ')}`}>
                        {selectedEvent.data.status}
                      </span>
                   </div>
                   <h4 className="font-bold text-slate-800">{selectedEvent.data.name}</h4>
                   <p className="text-sm text-slate-600">{selectedEvent.data.description}</p>
                   <div className="text-sm text-slate-500 flex items-center gap-2">
                     <CalIcon size={14}/> {selectedEvent.data.startDate} - {selectedEvent.data.endDate}
                   </div>
                   <div className="pt-3 border-t">
                      <p className="text-xs text-slate-400 uppercase">Revenue (Target / Actual)</p>
                      <p className="font-bold text-slate-800">
                        RM {selectedEvent.data.targetRevenue.toLocaleString()} / <span className="text-emerald-600">RM {selectedEvent.data.actualRevenue.toLocaleString()}</span>
                      </p>
                   </div>
                </div>
              ) : (
                 <div className="space-y-3">
                   <h4 className="font-bold text-slate-800">{selectedEvent.data.plan.title}</h4>
                   <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getPlanStyles(selectedEvent.data.plan.status).split(' ').slice(0,2).join(' ')}`}>
                        {selectedEvent.data.plan.status}
                      </span>
                   </div>
                   <p className="text-sm text-slate-600">Campaign: <span className="font-medium">{selectedEvent.data.campaignName}</span></p>
                   
                   {/* Description Display */}
                   {selectedEvent.data.plan.description && (
                       <div className="bg-slate-50 p-2 rounded text-xs text-slate-600 italic">
                           {selectedEvent.data.plan.description}
                       </div>
                   )}

                   <div className="flex flex-wrap gap-2">
                      {selectedEvent.data.plan.platform.map((p: string) => (
                          <span key={p} className="text-xs px-2 py-1 bg-slate-50 border rounded shadow-sm">{p}</span>
                      ))}
                   </div>
                   <div className="pt-2">
                      <p className="text-xs text-slate-400 uppercase">Cost (Budget / Actual)</p>
                      <p className="font-bold text-slate-800">RM {selectedEvent.data.plan.budget} / RM {selectedEvent.data.plan.cost}</p>
                   </div>
                </div>
              )}
              
              <div className="mt-6 pt-4 border-t border-slate-100">
                <button 
                    onClick={handleNavigateToEvent}
                    className="w-full flex justify-center items-center gap-2 bg-slate-900 text-white py-2 rounded-lg text-sm hover:bg-slate-800 transition-colors"
                >
                     View in Campaign Manager <ArrowRight size={14} />
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;