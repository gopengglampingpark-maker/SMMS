import React, { useState, useEffect, useRef } from 'react';
import { 
  getCampaigns, getBranches, getCategories, getEventTypes,
  updateCampaignStatus, addMarketingPlan, addCampaign, updateCampaign, updateMarketingPlan, deleteCampaign, deleteMarketingPlan 
} from '../services/storage';
import { Campaign, Branch, MarketingPlan, CampaignStatus, Category, EventType } from '../types';
import { ChevronDown, ChevronUp, Calendar as CalIcon, Facebook, Instagram, Mail, Video, Globe, Image as ImageIcon, Plus, X, Pencil, Tag, CheckSquare, CalendarDays, Trash2 } from 'lucide-react';
import { 
  parseISO, 
  isValid, 
  startOfYear, 
  endOfYear, 
  startOfMonth, 
  endOfMonth 
} from 'date-fns';

interface CampaignsProps {
  initialExpandedId?: string;
}

const Campaigns: React.FC<CampaignsProps> = ({ initialExpandedId }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Date Filter States
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const campaignRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // --- Modal States ---
  const [showCampModal, setShowCampModal] = useState(false);
  const [isEditCamp, setIsEditCamp] = useState(false);
  const [editingCampId, setEditingCampId] = useState<string | null>(null);

  // View Plan Detail Modal State
  const [viewPlan, setViewPlan] = useState<{plan: MarketingPlan, campaignName: string} | null>(null);

  // Campaign Form Data
  const [campName, setCampName] = useState('');
  const [campStart, setCampStart] = useState('');
  const [campEnd, setCampEnd] = useState('');
  const [campBranch, setCampBranch] = useState('');
  const [campCategory, setCampCategory] = useState('');
  const [campEvent, setCampEvent] = useState('');
  const [campTarget, setCampTarget] = useState('');
  const [campActualRev, setCampActualRev] = useState('');
  const [campDesc, setCampDesc] = useState('');
  const [campImage, setCampImage] = useState(''); 

  // Plan Modal State
  const [showPlanModal, setShowPlanModal] = useState<string | null>(null); 
  const [isEditPlan, setIsEditPlan] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  
  // Plan Form Data
  const [planTitle, setPlanTitle] = useState('');
  const [planDesc, setPlanDesc] = useState(''); 
  const [planPlatforms, setPlanPlatforms] = useState<string[]>([]);
  const [planCustomPlatform, setPlanCustomPlatform] = useState('');
  const [planDate, setPlanDate] = useState('');
  const [planBudget, setPlanBudget] = useState('');
  const [planCost, setPlanCost] = useState('');
  const [planStatus, setPlanStatus] = useState<'Draft' | 'Scheduled' | 'Published' | 'Cancelled'>('Draft');

  const COMMON_PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'Email', 'Google Ads', 'Offline'];
  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder-slate-400";

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (initialExpandedId && campaigns.length > 0) {
      setExpandedId(initialExpandedId);
      setTimeout(() => {
        if (campaignRefs.current[initialExpandedId]) {
          campaignRefs.current[initialExpandedId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [initialExpandedId, campaigns]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
        const [c, b, cat, evt] = await Promise.all([
            getCampaigns(),
            getBranches(),
            getCategories(),
            getEventTypes()
        ]);
        setCampaigns(c);
        setBranches(b);
        setCategories(cat);
        setEventTypes(evt);
    } catch(e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // --- Deletion Handlers ---
  const handleDeleteCampaign = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this Campaign? This action cannot be undone.")) {
        await deleteCampaign(id);
        refreshData();
    }
  };

  const handleDeletePlan = async (e: React.MouseEvent, campaignId: string, planId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this Marketing Plan?")) {
        await deleteMarketingPlan(campaignId, planId);
        refreshData();
        // If we are viewing the deleted plan, close the modal
        if (viewPlan?.plan.id === planId) setViewPlan(null);
    }
  };

  const handleStatusChange = async (e: React.MouseEvent, id: string, current: CampaignStatus) => {
    e.stopPropagation();
    const statuses: CampaignStatus[] = ['Planning', 'Active', 'Completed', 'On Hold', 'Cancelled'];
    const nextIndex = (statuses.indexOf(current) + 1) % statuses.length;
    const nextStatus = statuses[nextIndex];
    await updateCampaignStatus(id, nextStatus);
    refreshData();
  };

  const handlePlanStatusChange = async (e: React.MouseEvent, campaignId: string, plan: MarketingPlan) => {
    e.stopPropagation();
    const statuses: MarketingPlan['status'][] = ['Draft', 'Scheduled', 'Published', 'Cancelled'];
    const nextIndex = (statuses.indexOf(plan.status) + 1) % statuses.length;
    const nextStatus = statuses[nextIndex];
    await updateMarketingPlan(campaignId, { ...plan, status: nextStatus });
    refreshData();
    // Update view modal if open
    if (viewPlan?.plan.id === plan.id) {
        setViewPlan({ ...viewPlan, plan: { ...plan, status: nextStatus } });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCampImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Campaign Handlers ---
  const openNewCampaignModal = () => {
    resetCampForm();
    setIsEditCamp(false);
    setShowCampModal(true);
  };

  const openEditCampaignModal = (e: React.MouseEvent, c: Campaign) => {
    e.stopPropagation();
    setCampName(c.name);
    setCampStart(c.startDate);
    setCampEnd(c.endDate);
    setCampBranch(c.branchId);
    setCampCategory(c.categoryId || '');
    setCampEvent(c.eventTypeId || '');
    setCampTarget(c.targetRevenue.toString());
    setCampActualRev(c.actualRevenue.toString());
    setCampDesc(c.description);
    setCampImage(c.poster || '');
    setEditingCampId(c.id);
    setIsEditCamp(true);
    setShowCampModal(true);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campName || !campBranch) return;

    const campData = {
        branchId: campBranch,
        categoryId: campCategory,
        eventTypeId: campEvent,
        name: campName,
        startDate: campStart,
        endDate: campEnd,
        targetRevenue: Number(campTarget),
        actualRevenue: Number(campActualRev),
        description: campDesc,
        poster: campImage
    };

    if (isEditCamp && editingCampId) {
        const existing = campaigns.find(c => c.id === editingCampId);
        if (existing) {
            await updateCampaign({ ...existing, ...campData });
        }
    } else {
        await addCampaign({
            id: '', 
            ...campData,
            status: 'Planning',
            plans: []
        });
    }

    refreshData();
    setShowCampModal(false);
    resetCampForm();
  };

  const resetCampForm = () => {
    setCampName(''); setCampStart(''); setCampEnd('');
    setCampTarget(''); setCampActualRev('0'); setCampDesc(''); setCampImage(''); setCampBranch('');
    setCampCategory(''); setCampEvent('');
    setEditingCampId(null);
  };

  // --- Plan Handlers ---
  const openNewPlanModal = (campaignId: string) => {
    resetPlanForm();
    setIsEditPlan(false);
    setShowPlanModal(campaignId);
  };

  const openEditPlanModal = (e: React.MouseEvent, campaignId: string, plan: MarketingPlan) => {
    e.stopPropagation(); // Prevent opening view modal
    setPlanTitle(plan.title);
    setPlanDesc(plan.description || '');
    setPlanPlatforms(plan.platform);
    setPlanDate(plan.scheduledDate);
    setPlanBudget(plan.budget.toString());
    setPlanCost(plan.cost.toString());
    setPlanStatus(plan.status);
    setEditingPlanId(plan.id);
    setIsEditPlan(true);
    setShowPlanModal(campaignId);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPlanModal || !planTitle) return;

    const finalPlatforms = planPlatforms.length > 0 ? planPlatforms : ['Offline'];

    const planData = {
        title: planTitle,
        description: planDesc,
        platform: finalPlatforms,
        scheduledDate: planDate,
        status: planStatus,
        budget: Number(planBudget),
        cost: Number(planCost)
    };

    if (isEditPlan && editingPlanId) {
        await updateMarketingPlan(showPlanModal, { id: editingPlanId, ...planData });
    } else {
        await addMarketingPlan(showPlanModal, { id: `p${Date.now()}`, ...planData });
    }

    refreshData();
    setShowPlanModal(null);
    resetPlanForm();
    // Update view modal if open
    if (viewPlan && isEditPlan) {
        setViewPlan({ ...viewPlan, plan: { ...viewPlan.plan, ...planData, id: editingPlanId! } });
    }
  };

  const togglePlatform = (p: string) => {
    if (planPlatforms.includes(p)) setPlanPlatforms(planPlatforms.filter(item => item !== p));
    else setPlanPlatforms([...planPlatforms, p]);
  };

  const addCustomPlatform = () => {
    if(planCustomPlatform && !planPlatforms.includes(planCustomPlatform)) {
        setPlanPlatforms([...planPlatforms, planCustomPlatform]);
        setPlanCustomPlatform('');
    }
  };

  const resetPlanForm = () => {
    setPlanTitle(''); setPlanDesc(''); setPlanPlatforms([]); setPlanCustomPlatform('');
    setPlanDate(''); setPlanBudget(''); setPlanCost('');
    setPlanStatus('Draft');
    setEditingPlanId(null);
  };

  // --- Utils ---
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200';
      case 'Planning': return 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200';
      case 'Completed': return 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
      case 'On Hold': return 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200';
      case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
    }
  };

  const getPlatformIcon = (platform: string) => {
    const pLower = platform.toLowerCase();
    if(pLower.includes('facebook')) return <Facebook size={14} className="text-blue-600" />;
    if(pLower.includes('instagram')) return <Instagram size={14} className="text-pink-600" />;
    if(pLower.includes('tiktok')) return <Video size={14} className="text-black" />;
    if(pLower.includes('email')) return <Mail size={14} className="text-orange-500" />;
    return <Globe size={14} className="text-gray-500" />;
  };

  const filteredCampaigns = campaigns.filter(c => {
    const branchMatch = selectedBranch === 'all' || c.branchId === selectedBranch;
    const categoryMatch = selectedCategory === 'all' || c.categoryId === selectedCategory;
    if (selectedYear === 'all') return branchMatch && categoryMatch;

    const cStart = parseISO(c.startDate);
    const cEnd = parseISO(c.endDate);
    if (!isValid(cStart) || !isValid(cEnd)) return false;

    const yearInt = parseInt(selectedYear);
    let filterStart, filterEnd;
    if (selectedMonth === 'all') {
        filterStart = startOfYear(new Date(yearInt, 0, 1));
        filterEnd = endOfYear(new Date(yearInt, 0, 1));
    } else {
        const monthInt = parseInt(selectedMonth);
        filterStart = startOfMonth(new Date(yearInt, monthInt, 1));
        filterEnd = endOfMonth(new Date(yearInt, monthInt, 1));
    }
    const dateMatch = cStart <= filterEnd && cEnd >= filterStart;
    return branchMatch && categoryMatch && dateMatch;
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 5}, (_, i) => currentYear - 2 + i);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  if (isLoading) return <div className="flex justify-center items-center h-full"><div className="loader"></div></div>;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Campaign Manager</h2>
           <p className="text-sm text-slate-500">Plan and track your marketing efforts</p>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <div className="relative">
                <select className={`${inputClass} w-full sm:w-auto font-medium`} value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                    <option value="all">All Years</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
            <div className="relative">
                <select className={`${inputClass} w-full sm:w-auto font-medium disabled:opacity-50 disabled:bg-slate-50`} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} disabled={selectedYear === 'all'}>
                    <option value="all">All Months</option>
                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
            </div>
          <div className="relative">
            <select className={`${inputClass} w-full sm:w-auto`} value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
              <option value="all">All Branches</option>
              {branches.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
          <div className="relative">
            <select className={`${inputClass} w-full sm:w-auto`} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="all">All Categories</option>
              {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <button onClick={openNewCampaignModal} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2 justify-center sm:justify-start">
            <Plus size={18} /> New Campaign
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredCampaigns.map((campaign) => {
          const totalBudget = (campaign.plans || []).reduce((acc, p) => acc + (p.budget || 0), 0);
          const totalActualCost = (campaign.plans || []).reduce((acc, p) => acc + (p.cost || 0), 0);
          const catName = categories.find(c => c.id === campaign.categoryId)?.name;
          const evtName = eventTypes.find(e => e.id === campaign.eventTypeId)?.name;

          return (
            <div 
                key={campaign.id} 
                ref={(el) => { campaignRefs.current[campaign.id] = el; }}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-300 ${expandedId === campaign.id ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-slate-200'}`}
            >
              {/* Header Row */}
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-slate-50 relative group" onClick={() => toggleExpand(campaign.id)}>
                <div className="flex-1 min-w-0 mb-4 md:mb-0 flex gap-4">
                   {campaign.poster ? (
                     <img src={campaign.poster} alt="Poster" className="w-16 h-16 rounded-md object-cover border border-slate-100 hidden sm:block" />
                   ) : (
                     <div className="w-16 h-16 rounded-md bg-slate-100 flex items-center justify-center text-slate-300 hidden sm:flex"><ImageIcon size={24} /></div>
                   )}
                   
                   <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-slate-900 truncate">{campaign.name}</h3>
                        <button onClick={(e) => handleStatusChange(e, campaign.id, campaign.status)} className={`text-xs px-2.5 py-0.5 rounded-full border font-medium transition-colors ${getStatusColor(campaign.status)}`} title="Click to change status">
                          {campaign.status}
                        </button>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><CalIcon size={14} /> {campaign.startDate} to {campaign.endDate}</span>
                        <span className="text-xs text-slate-400 hidden sm:inline">|</span>
                        <span className="text-slate-600">{branches.find(b => b.id === campaign.branchId)?.name || 'Unknown Branch'}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {catName && <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full flex items-center gap-1"><Tag size={10}/> {catName}</span>}
                        {evtName && <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full flex items-center gap-1"><CalendarDays size={10}/> {evtName}</span>}
                      </div>
                   </div>
                </div>

                <div className="flex items-center gap-6">
                   <div className="text-right hidden md:block">
                      <span className="block text-xs text-slate-500">Cost (Budg. / Act.)</span>
                      <span className="font-semibold text-slate-700">RM {totalBudget.toLocaleString()} / <span className={totalActualCost > totalBudget ? 'text-red-600' : 'text-slate-700'}>{totalActualCost.toLocaleString()}</span></span>
                   </div>
                   <div className="text-right hidden md:block">
                      <span className="block text-xs text-slate-500">Revenue (Target / Act.)</span>
                      <span className="font-bold text-slate-700">RM {campaign.targetRevenue.toLocaleString()} / <span className="text-emerald-600">{campaign.actualRevenue.toLocaleString()}</span></span>
                   </div>
                   
                   <div className="flex items-center gap-2">
                        <button onClick={(e) => openEditCampaignModal(e, campaign)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors md:opacity-0 group-hover:opacity-100" title="Edit Campaign">
                            <Pencil size={18} />
                        </button>
                        <button onClick={(e) => handleDeleteCampaign(e, campaign.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors md:opacity-0 group-hover:opacity-100" title="Delete Campaign">
                            <Trash2 size={18} />
                        </button>
                        {expandedId === campaign.id ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                   </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === campaign.id && (
                <div className="bg-slate-50 border-t border-slate-200 p-5 animate-fadeIn">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Left: Description & Poster */}
                    <div className="md:w-1/3 space-y-4">
                       {campaign.poster && (
                         <div className="relative group rounded-lg overflow-hidden border border-slate-200">
                           <img src={campaign.poster} alt="Campaign Poster" className="w-full h-48 object-cover" />
                         </div>
                       )}
                       <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
                         <p className="text-sm text-slate-600 italic">{campaign.description || "No description provided."}</p>
                       </div>
                    </div>

                    {/* Right: Plans */}
                    <div className="md:w-2/3">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Marketing Plans</h4>
                        <button onClick={() => openNewPlanModal(campaign.id)} className="text-xs flex items-center gap-1 bg-white border border-slate-300 px-2 py-1 rounded hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 transition-all">
                          <Plus size={12} /> Add Plan
                        </button>
                      </div>
                      
                      {campaign.plans && campaign.plans.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                          {campaign.plans.map(plan => (
                            <div 
                                key={plan.id} 
                                onClick={() => setViewPlan({ plan, campaignName: campaign.name })}
                                className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
                            >
                                 <div className="flex items-center gap-3">
                                  <div className="flex -space-x-1">
                                    {plan.platform.map((plat, idx) => (
                                          <div key={idx} className="w-8 h-8 rounded-full bg-slate-100 border border-white flex items-center justify-center text-slate-500 relative z-10">
                                              {getPlatformIcon(plat)}
                                          </div>
                                      ))}
                                  </div>
                                  <div>
                                     <p className="text-sm font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">{plan.title}</p>
                                     <p className="text-xs text-slate-500">{plan.scheduledDate}</p>
                                  </div>
                               </div>
  
                               <div className="flex items-center gap-4">
                                   <div className="text-right">
                                        <div className="text-[10px] text-slate-400">Budget / Actual</div>
                                        <span className="block text-xs font-bold text-slate-700">RM {plan.budget} / {plan.cost}</span>
                                   </div>
      
                                   <div className="text-right">
                                        <div className="text-[10px] text-slate-400">Status</div>
                                        <button 
                                            onClick={(e) => handlePlanStatusChange(e, campaign.id, plan)}
                                            className={`text-[10px] uppercase font-medium px-1.5 py-0.5 rounded border transition-colors ${
                                                plan.status === 'Published' ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 
                                                plan.status === 'Scheduled' ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' :
                                                plan.status === 'Cancelled' ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' :
                                                'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                            }`}
                                        >
                                            {plan.status}
                                        </button>
                                   </div>
                                   <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                       <button 
                                         onClick={(e) => openEditPlanModal(e, campaign.id, plan)}
                                         className="text-slate-300 hover:text-blue-500 p-2 hover:bg-blue-50 rounded-full"
                                       >
                                         <Pencil size={14} />
                                       </button>
                                       <button 
                                         onClick={(e) => handleDeletePlan(e, campaign.id, plan.id)}
                                         className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-full"
                                       >
                                         <Trash2 size={14} />
                                       </button>
                                   </div>
                               </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-400 italic bg-white p-4 rounded border border-dashed border-slate-300 text-center">
                          No marketing plans added yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filteredCampaigns.length === 0 && (
             <div className="text-center py-10 bg-slate-50 rounded-lg border border-slate-200 text-slate-500">
                 <Tag size={32} className="mx-auto mb-2 text-slate-300"/>
                 <p>No campaigns found matching filters.</p>
             </div>
        )}
      </div>

      {/* Plan Details View Modal (New Feature) */}
      {viewPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewPlan(null)}>
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn" onClick={e => e.stopPropagation()}>
               <div className="bg-slate-900 px-6 py-4 flex justify-between items-start">
                   <div>
                       <h3 className="text-lg font-bold text-white">{viewPlan.plan.title}</h3>
                       <p className="text-slate-400 text-xs mt-1">Campaign: {viewPlan.campaignName}</p>
                   </div>
                   <button onClick={() => setViewPlan(null)} className="text-slate-400 hover:text-white"><X size={20}/></button>
               </div>
               <div className="p-6 space-y-6">
                   <div>
                       <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description / Notes</h4>
                       <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-slate-700 text-sm whitespace-pre-wrap">
                           {viewPlan.plan.description || <span className="italic text-slate-400">No description provided.</span>}
                       </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                       <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                           <span className="block text-xs text-slate-500 uppercase mb-1">Budget</span>
                           <span className="text-lg font-bold text-slate-800">RM {viewPlan.plan.budget.toLocaleString()}</span>
                       </div>
                       <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                           <span className="block text-xs text-slate-500 uppercase mb-1">Actual Cost</span>
                           <span className="text-lg font-bold text-slate-800">RM {viewPlan.plan.cost.toLocaleString()}</span>
                       </div>
                   </div>

                   <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                       <div className="flex gap-2">
                           {viewPlan.plan.platform.map(p => (
                               <span key={p} className="text-xs px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-slate-600 font-medium">
                                   {p}
                               </span>
                           ))}
                       </div>
                       <div className={`text-xs px-2 py-1 rounded-full border font-bold uppercase ${
                           viewPlan.plan.status === 'Published' ? 'bg-green-50 text-green-700 border-green-200' :
                           viewPlan.plan.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                           viewPlan.plan.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                           'bg-slate-50 text-slate-600 border-slate-200'
                       }`}>
                           {viewPlan.plan.status}
                       </div>
                   </div>
               </div>
           </div>
        </div>
      )}

      {/* Campaign Modal (New & Edit) */}
      {showCampModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">{isEditCamp ? 'Edit Campaign' : 'Create New Campaign'}</h3>
              <button onClick={() => setShowCampModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSaveCampaign} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Campaign Name</label>
                  <input type="text" required value={campName} onChange={e => setCampName(e.target.value)} className={inputClass} placeholder="Summer Promo" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                   <select required value={campBranch} onChange={e => setCampBranch(e.target.value)} className={inputClass}>
                     <option value="">Select Branch</option>
                     {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                   <select value={campCategory} onChange={e => setCampCategory(e.target.value)} className={inputClass}>
                     <option value="">Select Category</option>
                     {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Event Type</label>
                   <select value={campEvent} onChange={e => setCampEvent(e.target.value)} className={inputClass}>
                     <option value="">Select Event Type</option>
                     {eventTypes.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                   </select>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Target Revenue (RM)</label>
                        <input type="number" required value={campTarget} onChange={e => setCampTarget(e.target.value)} className={inputClass} placeholder="0.00" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Actual Revenue (RM)</label>
                        <input type="number" value={campActualRev} onChange={e => setCampActualRev(e.target.value)} className={`${inputClass} border-emerald-200`} placeholder="0.00" />
                    </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input type="date" required value={campStart} onChange={e => setCampStart(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input type="date" required value={campEnd} onChange={e => setCampEnd(e.target.value)} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea rows={2} value={campDesc} onChange={e => setCampDesc(e.target.value)} className={inputClass} placeholder="Describe the campaign..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Upload Poster (Image)</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"/>
                  {campImage && <div className="mt-2 text-xs text-green-600 flex items-center gap-1"><CheckSquare size={12}/> Image loaded</div>}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowCampModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{isEditCamp ? 'Save Changes' : 'Create Campaign'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plan Modal (New & Edit) */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
             <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
               <h3 className="text-lg font-bold text-white">{isEditPlan ? 'Edit Marketing Plan' : 'Add Marketing Plan'}</h3>
               <button onClick={() => setShowPlanModal(null)} className="text-slate-400 hover:text-white"><X size={20}/></button>
             </div>
             
             <form onSubmit={handleSavePlan} className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Plan Title</label>
                  <input type="text" required value={planTitle} onChange={e => setPlanTitle(e.target.value)} className={inputClass} placeholder="e.g. Teaser Post" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Platforms</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                      {COMMON_PLATFORMS.map(p => (
                          <button key={p} type="button" onClick={() => togglePlatform(p)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${planPlatforms.includes(p) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'}`}>
                              {p}
                          </button>
                      ))}
                  </div>
                  <div className="flex gap-2">
                     <input type="text" value={planCustomPlatform} onChange={e => setPlanCustomPlatform(e.target.value)} placeholder="Add other..." className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900" />
                      <button type="button" onClick={addCustomPlatform} className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Add</button>
                  </div>
                  {planPlatforms.length > 0 && (
                       <div className="mt-3 flex flex-wrap gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                          {planPlatforms.map(p => (
                              <span key={p} className="text-xs flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded text-slate-700">{p} <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => togglePlatform(p)}/></span>
                          ))}
                       </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Scheduled Date</label>
                  <input type="date" required value={planDate} onChange={e => setPlanDate(e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Budget (RM)</label>
                        <input type="number" required value={planBudget} onChange={e => setPlanBudget(e.target.value)} className={inputClass} placeholder="0.00" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Actual Cost (RM)</label>
                        <input type="number" required value={planCost} onChange={e => setPlanCost(e.target.value)} className={inputClass} placeholder="0.00" />
                    </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Description / Notes</label>
                   <textarea rows={3} value={planDesc} onChange={e => setPlanDesc(e.target.value)} className={inputClass} placeholder="Add details, caption ideas, or notes..." />
                </div>
                {isEditPlan && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                        <select value={planStatus} onChange={e => setPlanStatus(e.target.value as any)} className={inputClass}>
                            <option value="Draft">Draft</option>
                            <option value="Scheduled">Scheduled</option>
                            <option value="Published">Published</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                )}
                <div className="flex justify-end gap-2 mt-6 pt-2 border-t">
                   <button type="button" onClick={() => setShowPlanModal(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                   <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{isEditPlan ? 'Save Changes' : 'Add Plan'}</button>
                </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;