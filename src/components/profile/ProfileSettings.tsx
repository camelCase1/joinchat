'use client';

import { useState } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { api } from '~/trpc/react';
import toast from 'react-hot-toast';
import { BadgesPage } from './BadgesPage';

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileSettings({ isOpen, onClose }: ProfileSettingsProps) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'badges' | 'privacy'>('general');
  const [displayName, setDisplayName] = useState(user?.displayName || '');

  // Add local state for privacy toggles
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [profileVisible, setProfileVisible] = useState(true);

  // Get user data with badges
  const { data: userData, refetch: refetchUser } = api.post.getCurrentUser.useQuery(
    { userId: user?.uid || '' },
    { enabled: !!user?.uid }
  );

  const updateUserMutation = api.post.updateUser.useMutation({
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      void refetchUser();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleSaveProfile = () => {
    if (!user?.uid || !displayName.trim()) return;
    
    updateUserMutation.mutate({
      userId: user.uid,
      displayName: displayName.trim()
    });
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'badges', name: 'Badges', icon: '🏆' },
    { id: 'privacy', name: 'Privacy', icon: '🔒' }
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 md:p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] md:h-[80vh] flex flex-col md:flex-row shadow-xl overflow-hidden">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-gray-50 md:rounded-l-lg border-b md:border-b-0 md:border-r border-gray-200 flex-shrink-0">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
                style={{ 
                  backgroundColor: `hsl(${(user?.displayName?.charCodeAt(0) ?? 65) * 137.508}deg, 60%, 60%)` 
                }}
              >
                {user?.displayName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{user?.displayName}</h3>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
          </div>
          
          <nav className="p-4">
            <div className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-2 overflow-x-auto md:overflow-x-visible">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 md:w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    activeTab === tab.id 
                      ? 'bg-red-500 text-white' 
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="font-medium whitespace-nowrap">{tab.name}</span>
                </button>
              ))}
            </div>
          </nav>
          
          <div className="p-4 border-t border-gray-200 mt-auto">
            <button
              onClick={logout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {tabs.find(tab => tab.id === activeTab)?.name} Settings
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter your display name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleSaveProfile}
                    disabled={updateUserMutation.isPending || displayName === user?.displayName}
                    className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'badges' && user?.uid && (
              <BadgesPage userId={user.uid} />
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Show Online Status</p>
                        <p className="text-sm text-gray-500">Let others see when you&apos;re online</p>
                      </div>
                      <button
                        type="button"
                        aria-pressed={showOnlineStatus}
                        onClick={() => setShowOnlineStatus(v => !v)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${showOnlineStatus ? 'bg-red-500' : 'bg-gray-300'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showOnlineStatus ? 'translate-x-5' : 'translate-x-0'}`}
                        ></span>
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Profile Visibility</p>
                        <p className="text-sm text-gray-500">Allow others to view your profile</p>
                      </div>
                      <button
                        type="button"
                        aria-pressed={profileVisible}
                        onClick={() => setProfileVisible(v => !v)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${profileVisible ? 'bg-red-500' : 'bg-gray-300'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${profileVisible ? 'translate-x-5' : 'translate-x-0'}`}
                        ></span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}