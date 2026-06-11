import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '../../../context/ToastContext';
import DeliveryHeader from '../components/DeliveryHeader';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { updateSettings, getProfile } from '../../../services/api/delivery/deliveryService';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  registerFCMToken,
} from '../../../services/pushNotificationService';

export default function DeliverySettings() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Browser-level notification permission state
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isRegisteringFCM, setIsRegisteringFCM] = useState(false);
  const [fcmStatus, setFcmStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  const refreshPermissionStatus = useCallback(() => {
    const status = getNotificationPermissionStatus();
    setBrowserPermission(status);
  }, []);

  useEffect(() => {
    refreshPermissionStatus();

    const fetchSettings = async () => {
      try {
        const profile = await getProfile();
        if (profile.settings) {
          setNotificationsEnabled(profile.settings.notifications ?? true);
          setLocationEnabled(profile.settings.location ?? true);
          setSoundEnabled(profile.settings.sound ?? true);
          localStorage.setItem('delivery_settings_sound', String(profile.settings.sound ?? true));
        }
      } catch (error) {
        console.error('Failed to fetch settings', error);
      }
    };
    fetchSettings();
  }, [refreshPermissionStatus]);

  const handleEnableNotifications = async () => {
    setIsRegisteringFCM(true);
    setFcmStatus('idle');
    try {
      const granted = await requestNotificationPermission();
      refreshPermissionStatus();

      if (!granted) {
        showToast('Notifications blocked. Please enable in browser settings.', 'error');
        setFcmStatus('failed');
        return;
      }

      const token = await registerFCMToken(true);
      if (token) {
        showToast('Push notifications enabled! You will receive order alerts.', 'success');
        setFcmStatus('success');
      } else {
        showToast('Failed to register for push notifications. Try again.', 'error');
        setFcmStatus('failed');
      }
    } catch (err) {
      console.error('Failed to enable notifications:', err);
      setFcmStatus('failed');
    } finally {
      setIsRegisteringFCM(false);
    }
  };

  const handleSettingChange = async (key: string, value: boolean) => {
    if (key === 'notifications') setNotificationsEnabled(value);
    if (key === 'location') setLocationEnabled(value);
    if (key === 'sound') {
      setSoundEnabled(value);
      localStorage.setItem('delivery_settings_sound', String(value));
    }
    try {
      await updateSettings({ [key]: value });
    } catch (error) {
      console.error('Failed to update settings', error);
    }
  };

  const playTestSound = () => {
    const audio = new Audio('/assets/sound/delivery-alert.mp3');
    audio.volume = 1.0;
    audio.play().catch(() => {
      showToast('Tap anywhere on the screen first to enable sound.', 'info');
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

  const isGranted = browserPermission === 'granted';
  const isDenied = browserPermission === 'denied';

  return (
    <div className="min-h-screen bg-neutral-100 pb-20">
      <DeliveryHeader />
      <div className="px-4 py-4">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-2 hover:bg-neutral-200 rounded-full transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h2 className="text-neutral-900 text-xl font-semibold">Settings</h2>
        </div>

        {/* ── Browser Notification Permission Banner ── */}
        <div className={`mb-4 rounded-xl border p-4 ${
          isGranted ? 'bg-teal-50 border-teal-200' : isDenied ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
              isGranted ? 'bg-teal-100' : isDenied ? 'bg-red-100' : 'bg-amber-100'
            }`}>
              {isGranted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ) : isDenied ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${isGranted ? 'text-teal-800' : isDenied ? 'text-red-800' : 'text-amber-800'}`}>
                {isGranted ? 'Notifications Active' : isDenied ? 'Notifications Blocked' : 'Notifications Not Enabled'}
              </p>
              <p className={`text-xs mt-1 leading-relaxed ${isGranted ? 'text-teal-600' : isDenied ? 'text-red-600' : 'text-amber-600'}`}>
                {isGranted
                  ? 'You will receive push notifications for new orders even when the app is in the background.'
                  : isDenied
                  ? 'Blocked by browser. Open browser Settings → Site Settings → Notifications → Allow this site.'
                  : 'Tap the button below to start receiving new order alerts on your device.'}
              </p>

              {!isGranted && !isDenied && (
                <button
                  id="enable-notifications-btn"
                  onClick={handleEnableNotifications}
                  disabled={isRegisteringFCM}
                  className={`mt-3 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm ${
                    isRegisteringFCM
                      ? 'bg-amber-200 text-amber-500 cursor-not-allowed'
                      : 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95'
                  }`}
                >
                  {isRegisteringFCM ? 'Enabling...' : 'Enable Notifications'}
                </button>
              )}

              {isGranted && (
                <button
                  id="refresh-fcm-btn"
                  onClick={handleEnableNotifications}
                  disabled={isRegisteringFCM}
                  className="mt-3 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide bg-teal-600 text-white hover:bg-teal-700 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                >
                  {isRegisteringFCM ? 'Refreshing...' : 'Refresh Notification Token'}
                </button>
              )}

              {fcmStatus === 'success' && (
                <p className="mt-2 text-xs font-semibold text-teal-700">Token registered — notifications ready!</p>
              )}
            </div>
          </div>
        </div>

        {/* ── App Settings Toggles ── */}
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
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M15.54 8.46C16.4774 9.39764 17.004 10.6692 17.004 11.995C17.004 13.3208 16.4774 14.5924 15.54 15.53" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M19.07 4.93005C20.9447 6.80528 21.9979 9.34846 21.9979 12.0001C21.9979 14.6517 20.9447 17.1948 19.07 19.0701" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => option.onChange(!option.value)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      option.value ? 'bg-teal-600' : 'bg-neutral-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      option.value ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Other ── */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Other</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            <button onClick={() => showToast('Language selection coming soon!', 'info')} className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
              <div className="flex-1 text-left">
                <p className="text-neutral-900 text-sm font-medium">Language</p>
                <p className="text-neutral-500 text-xs mt-1">English</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button onClick={() => navigate('/privacy-policy')} className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
              <div className="flex-1 text-left"><p className="text-neutral-900 text-sm font-medium">Privacy Policy</p></div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button onClick={() => navigate('/terms-of-use')} className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
              <div className="flex-1 text-left"><p className="text-neutral-900 text-sm font-medium">Terms &amp; Conditions</p></div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-neutral-400 text-xs">App Version 1.0.0</p>
        </div>
      </div>
      <DeliveryBottomNav />
    </div>
  );
}
