import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { updateStatus, getProfile, updateGeneralLocation, getSellersInRadius } from '../../../services/api/delivery/deliveryService';

interface SellerInRange {
  _id: string;
  storeName: string;
  address: string;
  serviceRadiusKm: number;
  distanceFromDeliveryBoy: number;
}

interface DeliveryStatusContextType {
  isOnline: boolean;
  setIsOnline: (status: boolean) => Promise<void>;
  toggleStatus: () => Promise<void>;
  currentLocation: { latitude: number; longitude: number } | null;
  sellersInRangeCount: number;
  sellersInRange: SellerInRange[];
  locationError: string | null;
  isLoadingSellers: boolean;
  statusError: string | null;
  isUpdatingStatus: boolean;
}

const DeliveryStatusContext = createContext<DeliveryStatusContextType | undefined>(undefined);

export function DeliveryStatusProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnlineLocal] = useState(() => {
    const saved = localStorage.getItem('deliveryIsOnline');
    return saved === 'true';
  });
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sellersInRangeCount, setSellersInRangeCount] = useState(0);
  const [sellersInRange, setSellersInRange] = useState<SellerInRange[]>([]);
  const [isLoadingSellers, setIsLoadingSellers] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // Fetch initial status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const profile = await getProfile();
        setIsOnlineLocal(profile.isOnline || false);
        localStorage.setItem('deliveryIsOnline', String(profile.isOnline || false));
      } catch (error) {
        console.error("Failed to fetch initial status", error);
      }
    };
    fetchStatus();
  }, []);

  // Location Tracking Logic
  useEffect(() => {
    if (isOnline) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => stopTracking();
  }, [isOnline]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setLocationError(null);
    // Reset throttle so first location update sends IMMEDIATELY to backend
    lastUpdateTimeRef.current = 0;
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleLocationUpdate,
      handleLocationError,
      {
        enableHighAccuracy: true,
        maximumAge: 0, // Force fresh GPS data
        timeout: 15000,
      }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const handleLocationUpdate = async (position: GeolocationPosition) => {
    const { latitude, longitude } = position.coords;
    setCurrentLocation({ latitude, longitude });

    // Always sync immediately on FIRST update (lastUpdateTimeRef starts at 0)
    // Then throttle to every 30 seconds for battery optimization
    const now = Date.now();
    if (now - lastUpdateTimeRef.current > 30000 || lastUpdateTimeRef.current === 0) {
      lastUpdateTimeRef.current = now;
      try {
        // Update general location in backend
        await updateGeneralLocation(latitude, longitude);

        // Get sellers in radius
        setIsLoadingSellers(true);
        const data = await getSellersInRadius(latitude, longitude);
        setSellersInRangeCount(data.count || 0);
        setSellersInRange(data.sellers || []);
      } catch (error) {
        console.error("Failed to update location or fetch sellers in radius", error);
      } finally {
        setIsLoadingSellers(false);
      }
    }
  };

  const handleLocationError = (error: GeolocationPositionError) => {
    let message = "An unknown error occurred with location services";
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = "Location permission denied. Please enable it in settings.";
        break;
      case error.POSITION_UNAVAILABLE:
        message = "Location information is unavailable.";
        break;
      case error.TIMEOUT:
        message = "The request to get user location timed out.";
        break;
    }
    setLocationError(message);
    console.error("Location error:", error);
  };

  // Single robust path for changing online status.
  // Persists to backend FIRST-and-revert: the UI updates optimistically, but if the
  // server write fails we roll the UI back so it can never drift from the DB.
  // This prevents the "auto offline on refresh" bug where the toggle looked online
  // but the DB was never updated (e.g. account not yet Active, cold-start, token blip).
  const setIsOnline = async (status: boolean) => {
    if (isUpdatingStatus) return;
    const previous = isOnline;
    setStatusError(null);
    setIsUpdatingStatus(true);

    // Optimistic update
    setIsOnlineLocal(status);
    localStorage.setItem('deliveryIsOnline', String(status));

    try {
      await updateStatus(status);
    } catch (error: any) {
      console.error("Failed to update status", error);
      // Revert to the previous (server-consistent) value so the UI matches the DB
      setIsOnlineLocal(previous);
      localStorage.setItem('deliveryIsOnline', String(previous));
      setStatusError(error?.message || "Failed to update status. Please try again.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const toggleStatus = async () => {
    await setIsOnline(!isOnline);
  };

  return (
    <DeliveryStatusContext.Provider value={{
      isOnline,
      setIsOnline,
      toggleStatus,
      currentLocation,
      sellersInRangeCount,
      sellersInRange,
      locationError,
      isLoadingSellers,
      statusError,
      isUpdatingStatus
    }}>
      {children}
    </DeliveryStatusContext.Provider>
  );
}

export function useDeliveryStatus() {
  const context = useContext(DeliveryStatusContext);
  if (context === undefined) {
    throw new Error('useDeliveryStatus must be used within a DeliveryStatusProvider');
  }
  return context;
}

