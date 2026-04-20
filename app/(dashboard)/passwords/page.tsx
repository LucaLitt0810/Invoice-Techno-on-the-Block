'use client';

import { useState, useEffect } from 'react';
import {
  EyeIcon,
  EyeSlashIcon,
  ClipboardIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  KeyIcon,
  PencilIcon,
  LockClosedIcon,
  ArrowRightIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface PasswordEntry {
  id: string;
  user_id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  created_at: string;
}

const LOCAL_STORAGE_KEY = 'totb_passwords';
const MASTER_PIN_KEY = 'password_manager_pin';

export default function PasswordsPage() {
  const supabase = createClient();

  // Lock screen state
  const [isLocked, setIsLocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [masterPin, setMasterPin] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Password entries state
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [useLocalStorage, setUseLocalStorage] = useState(false);

  // Settings modal
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    username: '',
    password: '',
    url: '',
    notes: '',
  });

  // Initialize: get user and master PIN
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const pin = user.user_metadata?.[MASTER_PIN_KEY];
        if (!pin) {
          // Set default PIN 123
          await supabase.auth.updateUser({
            data: { [MASTER_PIN_KEY]: '123' },
          });
          setMasterPin('123');
        } else {
          setMasterPin(pin);
        }
      }
      setLoading(false);
    };
    init();
  }, [supabase]);

  // Load entries
  const loadEntries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('password_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Table likely doesn't exist, fallback to localStorage
        console.warn('Supabase password_entries table not found, using localStorage fallback');
        setUseLocalStorage(true);
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          setEntries(JSON.parse(stored));
        }
      } else {
        setEntries(data || []);
        setUseLocalStorage(false);
      }
    } catch (e) {
      console.error('Error loading entries:', e);
      setUseLocalStorage(true);
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setEntries(JSON.parse(stored));
      }
    }
  };

  // Save entries (localStorage fallback)
  const saveLocalEntries = (newEntries: PasswordEntry[]) => {
    setEntries(newEntries);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newEntries));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.password) {
      toast.error('Title and password are required');
      return;
    }

    if (!user) {
      toast.error('Not authenticated');
      return;
    }

    if (editingEntry) {
      if (useLocalStorage) {
        const updated = entries.map((entry) =>
          entry.id === editingEntry.id
            ? { ...entry, ...formData }
            : entry
        );
        saveLocalEntries(updated);
        toast.success('Password updated');
      } else {
        const { error } = await supabase
          .from('password_entries')
          .update({ ...formData })
          .eq('id', editingEntry.id);

        if (error) {
          toast.error('Failed to update');
          return;
        }
        await loadEntries();
        toast.success('Password updated');
      }
    } else {
      const newEntry = {
        user_id: user.id,
        ...formData,
      };

      if (useLocalStorage) {
        const entry: PasswordEntry = {
          id: crypto.randomUUID(),
          ...newEntry,
          created_at: new Date().toISOString(),
        };
        saveLocalEntries([entry, ...entries]);
        toast.success('Password saved');
      } else {
        const { error } = await supabase
          .from('password_entries')
          .insert(newEntry);

        if (error) {
          toast.error('Failed to save');
          return;
        }
        await loadEntries();
        toast.success('Password saved');
      }
    }

    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    if (useLocalStorage) {
      saveLocalEntries(entries.filter((e) => e.id !== id));
      toast.success('Password deleted');
    } else {
      const { error } = await supabase
        .from('password_entries')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error('Failed to delete');
        return;
      }
      await loadEntries();
      toast.success('Password deleted');
    }
  };

  const openModal = (entry?: PasswordEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        title: entry.title,
        username: entry.username,
        password: entry.password,
        url: entry.url,
        notes: entry.notes,
      });
    } else {
      setEditingEntry(null);
      setFormData({ title: '', username: '', password: '', url: '', notes: '' });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEntry(null);
    setFormData({ title: '', username: '', password: '', url: '', notes: '' });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const toggleShowPassword = (id: string) => {
    setShowPassword((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUnlock = () => {
    if (pinInput === masterPin) {
      setIsLocked(false);
      setPinInput('');
      loadEntries();
    } else {
      toast.error('Incorrect PIN');
    }
  };

  const handleChangePin = async () => {
    if (newPin.length < 3) {
      toast.error('PIN must be at least 3 characters');
      return;
    }
    if (newPin !== confirmNewPin) {
      toast.error('PINs do not match');
      return;
    }

    const { error } = await supabase.auth.updateUser({
      data: { [MASTER_PIN_KEY]: newPin },
    });

    if (error) {
      toast.error('Failed to update PIN');
      return;
    }

    setMasterPin(newPin);
    setNewPin('');
    setConfirmNewPin('');
    setSettingsOpen(false);
    toast.success('PIN updated successfully');
  };

  const filteredEntries = entries.filter(
    (entry) =>
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  // Lock Screen
  if (isLocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-dark-800 border border-dark-500 p-10 max-w-md w-full text-center">
          <LockClosedIcon className="mx-auto h-16 w-16 text-white mb-6" />
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight mb-2">
            Password Manager
          </h2>
          <p className="text-sm text-gray-400 mb-8">
            Enter your PIN to access your passwords.
          </p>

          <div className="space-y-4">
            <input
              type="password"
              className="input bg-dark-800 border-dark-500 text-white w-full text-center text-lg tracking-widest"
              placeholder="••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              autoFocus
            />
            <button
              onClick={handleUnlock}
              className="w-full inline-flex items-center justify-center px-4 py-3 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
            >
              <ArrowRightIcon className="mr-2 h-5 w-5" />
              Unlock
            </button>
          </div>

          <p className="mt-6 text-xs text-gray-500">
            Default PIN: <span className="text-gray-300 font-mono">123</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
            Passwords
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Securely store and manage your passwords.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
          <button
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-dark-500 text-gray-400 hover:border-white hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
            title="Change PIN"
          >
            <CogIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add Password
          </button>
        </div>
      </div>

      {/* Storage mode notice */}
      {useLocalStorage && (
        <div className="border border-yellow-500/30 bg-yellow-500/10 px-6 py-4">
          <p className="text-sm text-yellow-400">
            <strong>Local Storage Mode:</strong> The password_entries table was not found in your database. 
            Passwords are being stored locally. To enable cloud sync, create a Supabase table named 
            <code className="bg-yellow-500/20 px-1 py-0.5 rounded mx-1">password_entries</code>
            with columns: id, user_id, title, username, password, url, notes, created_at.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
        </div>
        <input
          type="text"
          className="input block w-full pl-10 bg-dark-800 border-dark-500 text-white"
          placeholder="Search passwords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      {filteredEntries.length === 0 ? (
        <div className="card bg-dark-800 border-dark-500">
          <div className="px-8 py-12 text-center">
            <KeyIcon className="mx-auto h-12 w-12 text-gray-600" />
            <h3 className="mt-4 text-lg font-medium text-white uppercase tracking-wider">
              No passwords yet
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              Get started by adding your first password entry.
            </p>
            <button
              onClick={() => openModal()}
              className="mt-6 inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Add Password
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-dark-800 border border-dark-500 overflow-x-auto">
          <table className="min-w-full divide-y divide-dark-500 whitespace-nowrap">
            <thead className="bg-dark-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Password
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-500">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-dark-700/50">
                  <td className="px-6 py-5">
                    <div className="text-sm font-medium text-white">
                      {entry.title}
                    </div>
                    {entry.notes && (
                      <div className="text-xs text-gray-500 mt-1">
                        {entry.notes}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-400">
                        {entry.username || '-'}
                      </span>
                      {entry.username && (
                        <button
                          onClick={() =>
                            copyToClipboard(entry.username, 'Username')
                          }
                          className="text-gray-500 hover:text-white"
                          title="Copy username"
                        >
                          <ClipboardIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-400 font-mono">
                        {showPassword[entry.id]
                          ? entry.password
                          : '••••••••'}
                      </span>
                      <button
                        onClick={() => toggleShowPassword(entry.id)}
                        className="text-gray-500 hover:text-white"
                        title={showPassword[entry.id] ? 'Hide' : 'Show'}
                      >
                        {showPassword[entry.id] ? (
                          <EyeSlashIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() =>
                          copyToClipboard(entry.password, 'Password')
                        }
                        className="text-gray-500 hover:text-white"
                        title="Copy password"
                      >
                        <ClipboardIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {entry.url ? (
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300 underline"
                      >
                        {entry.url}
                      </a>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => openModal(entry)}
                        className="text-gray-400 hover:text-white"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-gray-400 hover:text-red-400"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Entry Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={closeModal}
            />
            <div className="relative bg-dark-800 border border-dark-500 max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-medium text-white uppercase tracking-wider">
                  {editingEntry ? 'Edit Password' : 'New Password'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="label">Title *</label>
                  <input
                    type="text"
                    className="input bg-dark-800 border-dark-500 text-white w-full"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., Gmail, Netflix, Server SSH"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="label">Username</label>
                    <input
                      type="text"
                      className="input bg-dark-800 border-dark-500 text-white w-full"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="label">Password *</label>
                    <input
                      type="text"
                      className="input bg-dark-800 border-dark-500 text-white w-full font-mono"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label">URL / Website</label>
                  <input
                    type="url"
                    className="input bg-dark-800 border-dark-500 text-white w-full"
                    value={formData.url}
                    onChange={(e) =>
                      setFormData({ ...formData, url: e.target.value })
                    }
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="label">Notes</label>
                  <textarea
                    className="input bg-dark-800 border-dark-500 text-white w-full"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex justify-end items-center pt-6 space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
                  >
                    {editingEntry ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal - Change PIN */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setSettingsOpen(false)}
            />
            <div className="relative bg-dark-800 border border-dark-500 max-w-md w-full p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-medium text-white uppercase tracking-wider">
                  Change PIN
                </h3>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="label">New PIN</label>
                  <input
                    type="password"
                    className="input bg-dark-800 border-dark-500 text-white w-full text-center text-lg tracking-widest"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="••••"
                  />
                </div>
                <div>
                  <label className="label">Confirm New PIN</label>
                  <input
                    type="password"
                    className="input bg-dark-800 border-dark-500 text-white w-full text-center text-lg tracking-widest"
                    value={confirmNewPin}
                    onChange={(e) => setConfirmNewPin(e.target.value)}
                    placeholder="••••"
                  />
                </div>

                <div className="flex justify-end items-center pt-6 space-x-3">
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(false)}
                    className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleChangePin}
                    className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
                  >
                    Update PIN
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
