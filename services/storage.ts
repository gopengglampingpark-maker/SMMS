import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, getDocs, addDoc, updateDoc, 
  deleteDoc, doc, query, where, getDoc
} from 'firebase/firestore';
import { User, Campaign, Branch, MarketingPlan, CampaignStatus, Category, EventType } from '../types';

// --- Safe Env Access (Vite Compatible) ---
const getEnv = (key: string) => {
  // Check for Vite environment variables
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  // Fallback for other environments
  try {
    // @ts-ignore
    return (typeof process !== 'undefined' && process.env) ? process.env[key] : undefined;
  } catch {
    return undefined;
  }
};

// --- Configuration ---
// Updated with your provided credentials
const firebaseConfig = {
  apiKey: getEnv('VITE_API_KEY') || "AIzaSyCddm09CHHiiV-246mNmJJpapwcEt2LISc",
  authDomain: "smms-3188e.firebaseapp.com",
  projectId: "smms-3188e",
  storageBucket: "smms-3188e.firebasestorage.app",
  messagingSenderId: "466656264824",
  appId: "1:466656264824:web:13744546d3a3180728638d"
};

// Logic: Use Mock Mode ONLY if explicitly set in environment, otherwise default to Real Firebase
const FORCE_MOCK = getEnv('VITE_USE_MOCK') === 'true';

// Initialize Firebase
let app, db: any;
let IS_DEMO = false;

if (FORCE_MOCK) {
  IS_DEMO = true;
} else {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase initialized with project:", firebaseConfig.projectId);
  } catch (e) {
    console.error("Firebase Init Error - Falling back to Mock Mode:", e);
    IS_DEMO = true;
  }
}

// Collection Names
const COLLECTIONS = {
  USERS: 'users',
  CAMPAIGNS: 'campaigns',
  BRANCHES: 'branches',
  CATEGORIES: 'categories',
  EVENT_TYPES: 'event_types',
};

// --- Mock Data Helpers (LocalStorage) ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getMockData = <T>(key: string): T[] => {
  try {
    const data = localStorage.getItem(`mock_${key}`);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error(`Error parsing mock data for ${key}`, e);
    return [];
  }
};

const setMockData = (key: string, data: any[]) => {
  try {
    localStorage.setItem(`mock_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving mock data for ${key}`, e);
  }
};

// --- Seed Data (Used for both Mock and Initial Firebase Seeding) ---
const getCurrentYear = () => new Date().getFullYear();
const Y = getCurrentYear();

const SEED_USERS: User[] = [
  { id: '1', username: 'admin', password: '123', role: 'Admin', name: 'System Admin' },
  { id: '2', username: 'staff', password: '123', role: 'Staff', name: 'Sarah Marketing' },
];

const SEED_BRANCHES: Branch[] = [
  { id: 'b1', name: 'Gopeng Glamping Park', location: 'Gopeng, Perak' },
  { id: 'b2', name: 'Ipoh Heritage Stay', location: 'Ipoh, Perak' },
];

const SEED_CATEGORIES: Category[] = [
  { id: 'cat1', name: 'Seasonal Promo' },
  { id: 'cat2', name: 'Brand Awareness' },
  { id: 'cat3', name: 'Membership Drive' },
];

const SEED_EVENT_TYPES: EventType[] = [
  { id: 'evt1', name: 'Glamping' },
  { id: 'evt2', name: 'Dining / F&B' },
  { id: 'evt3', name: 'Team Building' },
  { id: 'evt4', name: 'Special Event' },
];

const SEED_CAMPAIGNS: Campaign[] = [
  {
    id: 'c1',
    branchId: 'b1',
    categoryId: 'cat3',
    eventTypeId: 'evt1',
    name: 'Tribe Membership Launch',
    startDate: `${Y}-05-01`,
    endDate: `${Y}-06-30`,
    status: 'Active',
    targetRevenue: 20000,
    actualRevenue: 12500,
    description: 'Launch of the new loyalty program for repeat campers.',
    poster: '',
    plans: [
      { id: 'p1', title: 'Teaser Video', platform: ['TikTok'], scheduledDate: `${Y}-05-02`, status: 'Published', budget: 300, cost: 200 },
      { id: 'p2', title: 'Early Bird Email', platform: ['Email'], scheduledDate: `${Y}-05-05`, status: 'Published', budget: 50, cost: 50 },
      { id: 'p3', title: 'Influencer Collab', platform: ['Instagram', 'TikTok'], scheduledDate: `${Y}-05-15`, status: 'Scheduled', budget: 2000, cost: 1500 },
    ]
  },
  {
    id: 'c2',
    branchId: 'b1',
    categoryId: 'cat1',
    eventTypeId: 'evt2',
    name: 'Ramadan Promo',
    startDate: `${Y}-03-10`,
    endDate: `${Y}-04-10`,
    status: 'Completed',
    targetRevenue: 15000,
    actualRevenue: 8900,
    description: 'Special Iftar and Sahur packages.',
    poster: '',
    plans: [
      { id: 'p4', title: 'Menu Reveal', platform: ['Facebook'], scheduledDate: `${Y}-03-01`, status: 'Published', budget: 150, cost: 100 },
    ]
  }
];

// --- Initialization ---
export const initDatabase = async () => {
  if (IS_DEMO) {
    console.warn("RUNNING IN MOCK MODE: Using LocalStorage simulation.");
    await delay(500);
    if (getMockData(COLLECTIONS.USERS).length === 0) setMockData(COLLECTIONS.USERS, SEED_USERS);
    if (getMockData(COLLECTIONS.BRANCHES).length === 0) setMockData(COLLECTIONS.BRANCHES, SEED_BRANCHES);
    if (getMockData(COLLECTIONS.CATEGORIES).length === 0) setMockData(COLLECTIONS.CATEGORIES, SEED_CATEGORIES);
    if (getMockData(COLLECTIONS.EVENT_TYPES).length === 0) setMockData(COLLECTIONS.EVENT_TYPES, SEED_EVENT_TYPES);
    if (getMockData(COLLECTIONS.CAMPAIGNS).length === 0) setMockData(COLLECTIONS.CAMPAIGNS, SEED_CAMPAIGNS);
    return;
  }

  try {
    const isCollectionEmpty = async (colName: string) => {
      const q = query(collection(db, colName));
      const snapshot = await getDocs(q);
      return snapshot.empty;
    };

    // Auto-seed Users if empty
    if (await isCollectionEmpty(COLLECTIONS.USERS)) {
       console.log("Seeding Users...");
       for (const u of SEED_USERS) { const {id, ...data} = u; await addDoc(collection(db, COLLECTIONS.USERS), data); }
    }
    // Auto-seed Branches if empty
    if (await isCollectionEmpty(COLLECTIONS.BRANCHES)) {
       console.log("Seeding Branches...");
       for (const b of SEED_BRANCHES) { const {id, ...data} = b; await addDoc(collection(db, COLLECTIONS.BRANCHES), data); }
    }
     // Auto-seed Categories if empty
    if (await isCollectionEmpty(COLLECTIONS.CATEGORIES)) {
       console.log("Seeding Categories...");
       for (const c of SEED_CATEGORIES) { const {id, ...data} = c; await addDoc(collection(db, COLLECTIONS.CATEGORIES), data); }
    }
    // Auto-seed Event Types if empty
    if (await isCollectionEmpty(COLLECTIONS.EVENT_TYPES)) {
       console.log("Seeding Event Types...");
       for (const e of SEED_EVENT_TYPES) { const {id, ...data} = e; await addDoc(collection(db, COLLECTIONS.EVENT_TYPES), data); }
    }
     // Auto-seed Campaigns if empty
    if (await isCollectionEmpty(COLLECTIONS.CAMPAIGNS)) {
       console.log("Seeding Campaigns...");
       for (const c of SEED_CAMPAIGNS) { const {id, ...data} = c; await addDoc(collection(db, COLLECTIONS.CAMPAIGNS), data); }
    }

    console.log('Firebase Database initialized & seeded if empty.');
  } catch (e) {
    console.error("Error seeding database:", e);
  }
};

// --- Helper to snapshot to array ---
const snapToData = <T>(snap: any): T[] => {
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as T[];
};

// --- Users ---
export const getUsers = async (): Promise<User[]> => {
  if (IS_DEMO) { await delay(200); return getMockData<User>(COLLECTIONS.USERS); }
  const snap = await getDocs(collection(db, COLLECTIONS.USERS));
  return snapToData<User>(snap);
};

export const addUser = async (user: Omit<User, 'id'>): Promise<User> => {
  if (IS_DEMO) { 
    await delay(300); 
    const users = getMockData<User>(COLLECTIONS.USERS);
    const newUser = { id: Date.now().toString(), ...user };
    setMockData(COLLECTIONS.USERS, [...users, newUser]);
    return newUser;
  }
  const docRef = await addDoc(collection(db, COLLECTIONS.USERS), user);
  return { id: docRef.id, ...user };
};

export const updateUser = async (user: User): Promise<void> => {
  if (IS_DEMO) {
    await delay(300);
    const users = getMockData<User>(COLLECTIONS.USERS);
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
        users[index] = user;
        setMockData(COLLECTIONS.USERS, users);
    }
    return;
  }
  const { id, ...data } = user;
  const docRef = doc(db, COLLECTIONS.USERS, id);
  await updateDoc(docRef, data as any);
};

export const deleteUser = async (id: string): Promise<void> => {
  if (IS_DEMO) { 
    await delay(300);
    const users = getMockData<User>(COLLECTIONS.USERS);
    setMockData(COLLECTIONS.USERS, users.filter(u => u.id !== id));
    return;
  }
  await deleteDoc(doc(db, COLLECTIONS.USERS, id));
};

// --- Branches ---
export const getBranches = async (): Promise<Branch[]> => {
  if (IS_DEMO) { await delay(200); return getMockData<Branch>(COLLECTIONS.BRANCHES); }
  const snap = await getDocs(collection(db, COLLECTIONS.BRANCHES));
  return snapToData<Branch>(snap);
};

export const addBranch = async (branch: Omit<Branch, 'id'>): Promise<Branch> => {
  if (IS_DEMO) {
    await delay(300);
    const list = getMockData<Branch>(COLLECTIONS.BRANCHES);
    const newItem = { id: `b${Date.now()}`, ...branch };
    setMockData(COLLECTIONS.BRANCHES, [...list, newItem]);
    return newItem;
  }
  const docRef = await addDoc(collection(db, COLLECTIONS.BRANCHES), branch);
  return { id: docRef.id, ...branch };
};

export const updateBranch = async (branch: Branch): Promise<void> => {
  if (IS_DEMO) {
    await delay(300);
    const branches = getMockData<Branch>(COLLECTIONS.BRANCHES);
    const index = branches.findIndex(b => b.id === branch.id);
    if (index !== -1) {
        branches[index] = branch;
        setMockData(COLLECTIONS.BRANCHES, branches);
    }
    return;
  }
  const { id, ...data } = branch;
  const docRef = doc(db, COLLECTIONS.BRANCHES, id);
  await updateDoc(docRef, data as any);
};

// --- Categories ---
export const getCategories = async (): Promise<Category[]> => {
  if (IS_DEMO) { await delay(200); return getMockData<Category>(COLLECTIONS.CATEGORIES); }
  const snap = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
  return snapToData<Category>(snap);
};

export const addCategory = async (name: string): Promise<Category> => {
  if (IS_DEMO) {
    await delay(300);
    const list = getMockData<Category>(COLLECTIONS.CATEGORIES);
    const newItem = { id: `cat${Date.now()}`, name };
    setMockData(COLLECTIONS.CATEGORIES, [...list, newItem]);
    return newItem;
  }
  const docRef = await addDoc(collection(db, COLLECTIONS.CATEGORIES), { name });
  return { id: docRef.id, name };
};

export const updateCategory = async (category: Category): Promise<void> => {
  if (IS_DEMO) {
    await delay(300);
    const categories = getMockData<Category>(COLLECTIONS.CATEGORIES);
    const index = categories.findIndex(c => c.id === category.id);
    if (index !== -1) {
        categories[index] = category;
        setMockData(COLLECTIONS.CATEGORIES, categories);
    }
    return;
  }
  const { id, ...data } = category;
  const docRef = doc(db, COLLECTIONS.CATEGORIES, id);
  await updateDoc(docRef, data as any);
};

export const deleteCategory = async (id: string): Promise<void> => {
  if (IS_DEMO) {
    await delay(200);
    const list = getMockData<Category>(COLLECTIONS.CATEGORIES);
    setMockData(COLLECTIONS.CATEGORIES, list.filter(i => i.id !== id));
    return;
  }
  await deleteDoc(doc(db, COLLECTIONS.CATEGORIES, id));
};

// --- Event Types ---
export const getEventTypes = async (): Promise<EventType[]> => {
  if (IS_DEMO) { await delay(200); return getMockData<EventType>(COLLECTIONS.EVENT_TYPES); }
  const snap = await getDocs(collection(db, COLLECTIONS.EVENT_TYPES));
  return snapToData<EventType>(snap);
};

export const addEventType = async (name: string): Promise<EventType> => {
  if (IS_DEMO) {
    await delay(300);
    const list = getMockData<EventType>(COLLECTIONS.EVENT_TYPES);
    const newItem = { id: `evt${Date.now()}`, name };
    setMockData(COLLECTIONS.EVENT_TYPES, [...list, newItem]);
    return newItem;
  }
  const docRef = await addDoc(collection(db, COLLECTIONS.EVENT_TYPES), { name });
  return { id: docRef.id, name };
};

export const updateEventType = async (eventType: EventType): Promise<void> => {
  if (IS_DEMO) {
    await delay(300);
    const list = getMockData<EventType>(COLLECTIONS.EVENT_TYPES);
    const index = list.findIndex(e => e.id === eventType.id);
    if (index !== -1) {
        list[index] = eventType;
        setMockData(COLLECTIONS.EVENT_TYPES, list);
    }
    return;
  }
  const { id, ...data } = eventType;
  const docRef = doc(db, COLLECTIONS.EVENT_TYPES, id);
  await updateDoc(docRef, data as any);
};

export const deleteEventType = async (id: string): Promise<void> => {
  if (IS_DEMO) {
    await delay(200);
    const list = getMockData<EventType>(COLLECTIONS.EVENT_TYPES);
    setMockData(COLLECTIONS.EVENT_TYPES, list.filter(i => i.id !== id));
    return;
  }
  await deleteDoc(doc(db, COLLECTIONS.EVENT_TYPES, id));
};

// --- Campaigns ---
export const getCampaigns = async (): Promise<Campaign[]> => {
  if (IS_DEMO) { await delay(400); return getMockData<Campaign>(COLLECTIONS.CAMPAIGNS); }
  const snap = await getDocs(collection(db, COLLECTIONS.CAMPAIGNS));
  return snapToData<Campaign>(snap);
};

export const addCampaign = async (campaign: Campaign): Promise<Campaign> => {
  if (IS_DEMO) {
    await delay(400);
    const list = getMockData<Campaign>(COLLECTIONS.CAMPAIGNS);
    const newItem = { ...campaign, id: `c${Date.now()}` };
    setMockData(COLLECTIONS.CAMPAIGNS, [...list, newItem]);
    return newItem;
  }
  const { id, ...data } = campaign; 
  const docRef = await addDoc(collection(db, COLLECTIONS.CAMPAIGNS), data);
  return { ...campaign, id: docRef.id };
};

export const updateCampaign = async (campaign: Campaign): Promise<void> => {
  if (IS_DEMO) {
    await delay(300);
    const list = getMockData<Campaign>(COLLECTIONS.CAMPAIGNS);
    const idx = list.findIndex(c => c.id === campaign.id);
    if(idx !== -1) {
        list[idx] = campaign;
        setMockData(COLLECTIONS.CAMPAIGNS, list);
    }
    return;
  }
  const { id, ...data } = campaign;
  const docRef = doc(db, COLLECTIONS.CAMPAIGNS, id);
  await updateDoc(docRef, data as any);
};

export const updateCampaignStatus = async (campaignId: string, status: CampaignStatus): Promise<void> => {
  if (IS_DEMO) {
    await delay(200);
    const list = getMockData<Campaign>(COLLECTIONS.CAMPAIGNS);
    const item = list.find(c => c.id === campaignId);
    if(item) {
        item.status = status;
        setMockData(COLLECTIONS.CAMPAIGNS, list);
    }
    return;
  }
  const docRef = doc(db, COLLECTIONS.CAMPAIGNS, campaignId);
  await updateDoc(docRef, { status });
};

// --- Marketing Plans (Sub-items management) ---

export const addMarketingPlan = async (campaignId: string, plan: MarketingPlan): Promise<void> => {
  if (IS_DEMO) {
    await delay(300);
    const list = getMockData<Campaign>(COLLECTIONS.CAMPAIGNS);
    const item = list.find(c => c.id === campaignId);
    if(item) {
        item.plans = [...(item.plans || []), plan];
        setMockData(COLLECTIONS.CAMPAIGNS, list);
    }
    return;
  }
  const docRef = doc(db, COLLECTIONS.CAMPAIGNS, campaignId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
      const camp = snap.data() as Campaign;
      const newPlans = [...(camp.plans || []), plan];
      await updateDoc(docRef, { plans: newPlans });
  }
};

export const updateMarketingPlan = async (campaignId: string, updatedPlan: MarketingPlan): Promise<void> => {
  if (IS_DEMO) {
    await delay(300);
    const list = getMockData<Campaign>(COLLECTIONS.CAMPAIGNS);
    const item = list.find(c => c.id === campaignId);
    if(item) {
        item.plans = item.plans.map(p => p.id === updatedPlan.id ? updatedPlan : p);
        setMockData(COLLECTIONS.CAMPAIGNS, list);
    }
    return;
  }
  const docRef = doc(db, COLLECTIONS.CAMPAIGNS, campaignId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
      const camp = snap.data() as Campaign;
      const newPlans = camp.plans.map(p => p.id === updatedPlan.id ? updatedPlan : p);
      await updateDoc(docRef, { plans: newPlans });
  }
};

export const deleteMarketingPlan = async (campaignId: string, planId: string): Promise<void> => {
    if (IS_DEMO) {
        await delay(300);
        const list = getMockData<Campaign>(COLLECTIONS.CAMPAIGNS);
        const item = list.find(c => c.id === campaignId);
        if(item) {
            item.plans = item.plans.filter(p => p.id !== planId);
            setMockData(COLLECTIONS.CAMPAIGNS, list);
        }
        return;
    }
    const docRef = doc(db, COLLECTIONS.CAMPAIGNS, campaignId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const camp = snap.data() as Campaign;
        const newPlans = camp.plans.filter(p => p.id !== planId);
        await updateDoc(docRef, { plans: newPlans });
    }
};

// --- Auth ---
export const authenticate = async (username: string, password: string): Promise<User | undefined> => {
  if (IS_DEMO) {
    await delay(500);
    const users = getMockData<User>(COLLECTIONS.USERS);
    return users.find(u => u.username === username && u.password === password);
  }
  
  try {
    const q = query(
        collection(db, COLLECTIONS.USERS), 
        where("username", "==", username),
        where("password", "==", password)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
        const d = snap.docs[0];
        return { id: d.id, ...d.data() } as User;
    }
  } catch (e) {
      console.error("Auth error:", e);
      // Fallback for first login if DB is empty
      if (username === 'admin' && password === '123') {
          return SEED_USERS[0];
      }
  }
  return undefined;
};