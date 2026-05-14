import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import DeliveryHeader from '../components/DeliveryHeader';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { updateSettings, getProfile } from '../../../services/api/delivery/deliveryService';

export default function DeliverySettings() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const profile = await getProfile();
        if (profile.settings) {
          setNotificationsEnabled(profile.settings.notifications ?? true);
          setLocationEnabled(profile.settings.location ?? true);
          setSoundEnabled(profile.settings.sound ?? true);
        }
      } catch (error) {
        console.error("Failed to fetch settings", error);
      }
    };
    fetchSettings();
  }, []);

  const handleSettingChange = async (key: string, value: boolean) => {
    // Optimistic update
    if (key === 'notifications') setNotificationsEnabled(value);
    if (key === 'location') setLocationEnabled(value);
    if (key === 'sound') setSoundEnabled(value);

    try {
      await updateSettings({ [key]: value });
    } catch (error) {
      console.error("Failed to update settings", error);
    }
  };

  const playTestSound = () => {
    const audio = new Audio('/assets/sound/delivery-alert.mp3');
    audio.volume = 1.0;
    audio.play().catch(err => {
      console.error("Failed to play test sound", err);
      alert("Please tap anywhere on the screen first to enable sound.");
    });
  };

  const settingsOptions = [
    {
      id: 'notifications',
      title: 'Push Notifications',
      description: 'Receive notifications for new orders',
      value: notificationsEnabled,
      onChange: (val: boolean) => handleSettingChange('notifications', val),
    },
    {
      id: 'location',
      title: 'Location Services',
      description: 'Allow app to access your location',
      value: locationEnabled,
      onChange: (val: boolean) => handleSettingChange('location', val),
    },
    {
      id: 'sound',
      title: 'Sound Alerts',
      description: 'Play sound for new order alerts',
      value: soundEnabled,
      onChange: (val: boolean) => handleSettingChange('sound', val),
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-100 pb-20">
      <DeliveryHeader />
      <div className="px-4 py-4">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-2 hover:bg-neutral-200 rounded-full transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h2 className="text-neutral-900 text-xl font-semibold">Settings</h2>
        </div>

        {/* Settings Options */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mb-4">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Preferences</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            {settingsOptions.map((option) => (
              <div key={option.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-neutral-900 text-sm font-medium mb-1">{option.title}</p>
                  <p className="text-neutral-500 text-xs">{option.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  {option.id === 'sound' && (
                    <button
                      onClick={playTestSound}
                      className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                      title="Test Sound"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M15.54 8.46C16.4774 9.39764 17.004 10.6692 17.004 11.995C17.004 13.3208 16.4774 14.5924 15.54 15.53" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M19.07 4.93005C20.9447 6.80528 21.9979 9.34846 21.9979 12.0001C21.9979 14.6517 20.9447 17.1948 19.07 19.0701" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => option.onChange(!option.value)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${option.value ? 'bg-teal-600' : 'bg-neutral-300'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${option.value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Other Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Other</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            <button 
              onClick={() => showToast('Language selection coming soon!', 'info')}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
            >
              <div className="flex-1 text-left">
                <p className="text-neutral-900 text-sm font-medium">Language</p>
                <p className="text-neutral-500 text-xs mt-1">English</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400"
                />
              </svg>
            </button>
            <button 
              onClick={() => navigate('/privacy-policy')}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
            >
              <div className="flex-1 text-left">
                <p className="text-neutral-900 text-sm font-medium">Privacy Policy</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400"
                />
              </svg>
            </button>
            <button 
              onClick={() => navigate('/terms-of-use')}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
            >
              <div className="flex-1 text-left">
                <p className="text-neutral-900 text-sm font-medium">Terms & Conditions</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* App Version */}
        <div className="mt-4 text-center">
          <p className="text-neutral-400 text-xs">App Version 1.0.0</p>
        </div>
      </div>
      <DeliveryBottomNav />
    </div>
  );
}

