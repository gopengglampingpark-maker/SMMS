import React, { useState, useEffect } from 'react';
import { 
  getUsers, addUser, updateUser, deleteUser, 
  getBranches, addBranch, updateBranch,
  getCategories, addCategory, updateCategory, deleteCategory,
  getEventTypes, addEventType, updateEventType, deleteEventType
} from '../services/storage';
import { User, Role, Branch, Category, EventType } from '../types';
import { Trash2, Shield, User as UserIcon, MapPin, Plus, Tag, CalendarDays, Pencil } from 'lucide-react';

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'branches' | 'categories' | 'events'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<EventType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);

  // New User Form
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('Staff');

  // New Branch Form
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchLoc, setNewBranchLoc] = useState('');

  // New Category/Event Form
  const [newSimpleName, setNewSimpleName] = useState('');

  // Input Class for consistent styling (White background, dark text)
  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder-slate-400";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
        const [u, b, c, e] = await Promise.all([
            getUsers(),
            getBranches(),
            getCategories(),
            getEventTypes()
        ]);
        setUsers(u);
        setBranches(b);
        setCategories(c);
        setEvents(e);
    } catch (error) {
        console.error("Failed to load admin data", error);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      await deleteUser(id);
      loadData();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Delete this category?')) {
      await deleteCategory(id);
      loadData();
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (confirm('Delete this event type?')) {
      await deleteEventType(id);
      loadData();
    }
  };

  // --- Handlers for User ---
  const openNewUserModal = () => {
      resetForms();
      setIsModalOpen(true);
  };

  const openEditUserModal = (user: User) => {
      setNewName(user.name);
      setNewUsername(user.username);
      setNewPassword(user.password || ''); // Often passwords aren't returned, but here we mock it
      setNewRole(user.role);
      setEditingId(user.id);
      setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUsername) return;
    setIsSubmitting(true);
    
    if (editingId) {
        await updateUser({ id: editingId, name: newName, username: newUsername, password: newPassword, role: newRole });
    } else {
        if(!newPassword) { setIsSubmitting(false); return; } // Password required for new
        await addUser({ name: newName, username: newUsername, password: newPassword, role: newRole });
    }
    
    resetForms();
    setIsSubmitting(false);
  };

  // --- Handlers for Branch ---
  const openNewBranchModal = () => {
    resetForms();
    setIsModalOpen(true);
  };

  const openEditBranchModal = (branch: Branch) => {
    setNewBranchName(branch.name);
    setNewBranchLoc(branch.location);
    setEditingId(branch.id);
    setIsModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || !newBranchLoc) return;
    setIsSubmitting(true);

    if (editingId) {
        await updateBranch({ id: editingId, name: newBranchName, location: newBranchLoc });
    } else {
        await addBranch({ name: newBranchName, location: newBranchLoc });
    }

    resetForms();
    setIsSubmitting(false);
  };

  // --- Handlers for Category/Event ---
  const openNewSimpleModal = () => {
      resetForms();
      setIsModalOpen(true);
  };

  const openEditCategoryModal = (cat: Category) => {
      setNewSimpleName(cat.name);
      setEditingId(cat.id);
      setIsModalOpen(true);
  };

  const openEditEventModal = (evt: EventType) => {
      setNewSimpleName(evt.name);
      setEditingId(evt.id);
      setIsModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSimpleName) return;
    setIsSubmitting(true);
    
    if (editingId) {
        await updateCategory({ id: editingId, name: newSimpleName });
    } else {
        await addCategory(newSimpleName);
    }
    
    resetForms();
    setIsSubmitting(false);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSimpleName) return;
    setIsSubmitting(true);
    
    if (editingId) {
        await updateEventType({ id: editingId, name: newSimpleName });
    } else {
        await addEventType(newSimpleName);
    }

    resetForms();
    setIsSubmitting(false);
  };


  const resetForms = () => {
    setNewName(''); setNewUsername(''); setNewPassword(''); setNewRole('Staff');
    setNewBranchName(''); setNewBranchLoc('');
    setNewSimpleName('');
    setEditingId(null);
    setIsModalOpen(false);
    loadData();
  };

  const getModalTitle = () => {
    const prefix = editingId ? 'Edit' : 'Add';
    switch(activeTab) {
      case 'users': return `${prefix} User`;
      case 'branches': return `${prefix} Branch`;
      case 'categories': return `${prefix} Category`;
      case 'events': return `${prefix} Event Type`;
    }
  };

  const handleOpenModal = () => {
      if (activeTab === 'users') openNewUserModal();
      else if (activeTab === 'branches') openNewBranchModal();
      else openNewSimpleModal();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Admin Panel</h2>
           <p className="text-slate-500 text-sm">System configuration & management</p>
        </div>
        
        {/* Tab Switcher */}
        <div className="bg-white border border-slate-200 p-1 rounded-lg flex flex-wrap gap-1">
          {[
            { id: 'users', label: 'Users' },
            { id: 'branches', label: 'Branches' },
            { id: 'categories', label: 'Categories' },
            { id: 'events', label: 'Event Types' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={handleOpenModal}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          {activeTab === 'users' ? 'Add User' : activeTab === 'branches' ? 'Add Branch' : activeTab === 'categories' ? 'Add Category' : 'Add Event Type'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[300px]">
        {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <div className="loader"></div>
            </div>
        ) : (
            <>
                {activeTab === 'users' && (
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                        <th className="p-4">User</th>
                        <th className="p-4">Username</th>
                        <th className="p-4">Role</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {users.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                            <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                <UserIcon size={16} />
                            </div>
                            <span className="font-medium text-slate-800">{user.name}</span>
                            </div>
                        </td>
                        <td className="p-4 text-slate-600 font-mono text-sm">{user.username}</td>
                        <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            user.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                            {user.role === 'Admin' && <Shield size={10} />}
                            {user.role}
                            </span>
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                            <button onClick={() => openEditUserModal(user)} className="text-slate-400 hover:text-blue-500 p-2"><Pencil size={18} /></button>
                            <button onClick={() => handleDeleteUser(user.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={18} /></button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                )}

                {activeTab === 'branches' && (
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                        <th className="p-4">Branch Name</th>
                        <th className="p-4">Location</th>
                        <th className="p-4">ID</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {branches.map(branch => (
                        <tr key={branch.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-medium text-slate-800">{branch.name}</td>
                        <td className="p-4 text-slate-600 flex items-center gap-2"><MapPin size={16}/> {branch.location}</td>
                        <td className="p-4 text-slate-400 font-mono text-xs">{branch.id}</td>
                        <td className="p-4 text-right flex justify-end gap-2">
                             <button onClick={() => openEditBranchModal(branch)} className="text-slate-400 hover:text-blue-500 p-2"><Pencil size={18} /></button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                )}

                {(activeTab === 'categories' || activeTab === 'events') && (
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                        <th className="p-4">Name</th>
                        <th className="p-4">ID</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {(activeTab === 'categories' ? categories : events).map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-medium text-slate-800 flex items-center gap-3">
                            {activeTab === 'categories' ? <Tag size={16} className="text-purple-500"/> : <CalendarDays size={16} className="text-blue-500"/>}
                            {item.name}
                        </td>
                        <td className="p-4 text-slate-400 font-mono text-xs">{item.id}</td>
                        <td className="p-4 text-right flex justify-end gap-2">
                            <button 
                                onClick={() => activeTab === 'categories' ? openEditCategoryModal(item) : openEditEventModal(item)} 
                                className="text-slate-400 hover:text-blue-500 p-2"
                            >
                                <Pencil size={18} />
                            </button>
                            <button 
                                onClick={() => activeTab === 'categories' ? handleDeleteCategory(item.id) : handleDeleteEvent(item.id)} 
                                className="text-slate-400 hover:text-red-500 p-2"
                            >
                                <Trash2 size={18} />
                            </button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                )}
            </>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="bg-slate-900 px-6 py-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">{getModalTitle()}</h3>
            </div>
            
            <form onSubmit={
                activeTab === 'users' ? handleSaveUser : 
                activeTab === 'branches' ? handleSaveBranch :
                activeTab === 'categories' ? handleSaveCategory : handleSaveEvent
            } className="p-6 space-y-4">
              
              {activeTab === 'users' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input type="text" required value={newName} onChange={e => setNewName(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                    <input type="text" required value={newUsername} onChange={e => setNewUsername(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <input type="password" required={!editingId} value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} placeholder={editingId ? "Leave blank to keep unchanged" : ""} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                    <select value={newRole} onChange={e => setNewRole(e.target.value as Role)} className={inputClass}>
                      <option value="Staff">Staff</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </>
              )}

              {activeTab === 'branches' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Branch Name</label>
                    <input type="text" required value={newBranchName} onChange={e => setNewBranchName(e.target.value)} className={inputClass} placeholder="e.g. Gopeng Resort" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                    <input type="text" required value={newBranchLoc} onChange={e => setNewBranchLoc(e.target.value)} className={inputClass} placeholder="e.g. Perak" />
                  </div>
                </>
              )}

              {(activeTab === 'categories' || activeTab === 'events') && (
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                   <input type="text" required value={newSimpleName} onChange={e => setNewSimpleName(e.target.value)} className={inputClass} placeholder="e.g. Summer Promo" />
                </div>
              )}

              <div className="flex gap-3 mt-6 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                    {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;