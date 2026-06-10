import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderDetails, updateOrderStatus, getSellerLocationsForOrder, sendDeliveryOtp, verifyDeliveryOtp, updateDeliveryLocation, checkSellerProximity, confirmSellerPickup, checkCustomerProximity, confirmReturnPickup, confirmReturnDropoff } from '../../../services/api/delivery/deliveryService';
import deliveryIcon from '@assets/deliveryboy/deliveryIcon.png';
import GoogleMapsTracking from '../../../components/GoogleMapsTracking';

// Helper to get delivery icon URL (works in both dev and production)
const getDeliveryIconUrl = () => {
    // Try imported path first (Vite will process this in production)
    if (deliveryIcon && typeof deliveryIcon === 'string') {
        return deliveryIcon;
    }
    // Fallback to public path
    return '/assets/deliveryboy/deliveryIcon.png';
};

// Icons components to avoid external dependency issues
const Icons = {
    ChevronLeft: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M15 18l-6-6 6-6" />
        </svg>
    ),
    MapPin: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    ),
    User: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
    Phone: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    ),
    Clock: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    ),
    CheckCircle: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
    Truck: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect x="1" y="3" width="15" height="13" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
    ),
    ShoppingBag: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
    ),
    Navigation: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
    ),
    Store: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    ),
    AlertTriangle: ({ size = 24, className = "" }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    )
};

type DeliveryOrderStatus = 'Pending' | 'Ready for pickup' | 'Picked up' | 'Out for Delivery' | 'Delivered' | 'Cancelled' | 'Returned' | 'Assigned' | 'Picked Up' | 'Completed' | 'Processed' | 'Shipped' | 'On the way';

export default function DeliveryOrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sellerLocations, setSellerLocations] = useState<any[]>([]);
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otpValue, setOtpValue] = useState('');
    const [otpSending, setOtpSending] = useState(false);
    const [otpVerifying, setOtpVerifying] = useState(false);
    const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [deliveryBoyLocation, setDeliveryBoyLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    // New state for seller proximity and pickup tracking
    const [sellerProximity, setSellerProximity] = useState<Record<string, { withinRange: boolean; distance: number }>>({});
    const [pickupLoading, setPickupLoading] = useState<Record<string, boolean>>({});

    // New state for customer proximity
    const [customerProximity, setCustomerProximity] = useState<{ withinRange: boolean; distance: number } | null>(null);
    const [getOtpEnabled, setGetOtpEnabled] = useState(false);

    // States for Return Request Pickup Image Upload
    const [pickupPhoto, setPickupPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // States for Return Request Drop-off Image Upload
    const [dropoffPhoto, setDropoffPhoto] = useState<File | null>(null);
    const [dropoffPhotoPreview, setDropoffPhotoPreview] = useState<string | null>(null);
    const [uploadingDropoffPhoto, setUploadingDropoffPhoto] = useState(false);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPickupPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleDropoffPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setDropoffPhoto(file);
            setDropoffPhotoPreview(URL.createObjectURL(file));
        }
    };

    const fetchOrder = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await getOrderDetails(id);
            setOrder(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load order details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [id]);

    // Fetch seller locations when order is assigned
    useEffect(() => {
        const fetchSellerLocations = async () => {
            if (!id || !order) return;
            // Only fetch if order has delivery boy assigned and status is before "Picked up"
            if (order.status && order.status !== 'Picked up' && order.status !== 'Delivered') {
                try {
                    const locations = await getSellerLocationsForOrder(id);
                    setSellerLocations(locations || []);
                } catch (err) {
                    console.error('Failed to fetch seller locations:', err);
                }
            }
        };
        fetchSellerLocations();
    }, [id, order?.status]);

    // Clean up when component unmounts
    useEffect(() => {
        return () => {
            if (locationIntervalRef.current) {
                clearInterval(locationIntervalRef.current);
            }
        };
    }, []);


    const handleSendOtp = async () => {
        if (!id) return;
        try {
            setOtpSending(true);
            await sendDeliveryOtp(id);
            setShowOtpInput(true);
            alert('OTP sent to customer successfully');
        } catch (err: any) {
            alert(err.message || 'Failed to send OTP');
        } finally {
            setOtpSending(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!id || !otpValue) {
            alert('Please enter OTP');
            return;
        }

        // COD Reminder
        const isCOD = order?.paymentMethod && ['COD', 'cod', 'Cash on Delivery', 'Cash', 'CASH', 'Cash On Delivery'].includes(order.paymentMethod);
        if (isCOD) {
            const confirmCash = window.confirm(`This is a COD order. Have you collected ₹${order.totalAmount} from the customer?`);
            if (!confirmCash) return;
        }

        try {
            setOtpVerifying(true);
            const result = await verifyDeliveryOtp(id, otpValue);
            alert(result.message || 'OTP verified successfully. Order marked as delivered.');
            await fetchOrder(); // Refresh order data
            setShowOtpInput(false);
            setOtpValue('');
        } catch (err: any) {
            alert(err.message || 'Failed to verify OTP');
        } finally {
            setOtpVerifying(false);
        }
    };

    // Handle seller pickup confirmation
    const handleSellerPickup = async (sellerId: string) => {
        if (!id || !deliveryBoyLocation) {
            alert('Location not available');
            return;
        }

        try {
            setPickupLoading(prev => ({ ...prev, [sellerId]: true }));
            const result = await confirmSellerPickup(id, sellerId, deliveryBoyLocation.lat, deliveryBoyLocation.lng);
            alert(result.message || 'Pickup confirmed successfully');
            await fetchOrder(); // Refresh order data
        } catch (err: any) {
            alert(err.message || 'Failed to confirm pickup');
        } finally {
            setPickupLoading(prev => ({ ...prev, [sellerId]: false }));
        }
    };

    // Handle customer pickup confirmation for returns
    const handleCustomerPickupConfirm = async () => {
        if (!id) return;
        
        let imageUrls = ['https://klydokart.com/assets/deliveryboy/return-pickup.png']; // Fallback placeholder
        
        try {
            setLoading(true);
            if (pickupPhoto) {
                setUploadingPhoto(true);
                const { uploadImage } = await import('../../../services/api/uploadService');
                const result = await uploadImage(pickupPhoto, 'return-pickups');
                imageUrls = [result.secureUrl || result.url];
            }
            
            await confirmReturnPickup(id, imageUrls);
            alert('Pickup confirmed successfully! Please return the package to the seller.');
            setPickupPhoto(null);
            setPhotoPreview(null);
            await fetchOrder();
        } catch (err: any) {
            alert(err.message || 'Failed to confirm pickup');
        } finally {
            setLoading(false);
            setUploadingPhoto(false);
        }
    };

    // Handle return drop-off to seller
    const handleReturnDropoff = async () => {
        if (!id) return;
        if (!dropoffPhoto) {
            alert('Please capture a photo to confirm drop-off to the seller');
            return;
        }

        try {
            setLoading(true);
            setUploadingDropoffPhoto(true);
            let imageUrls = ['https://klydokart.com/assets/deliveryboy/return-dropoff.png']; // Fallback placeholder

            const { uploadImage } = await import('../../../services/api/uploadService');
            const result = await uploadImage(dropoffPhoto, 'return-dropoffs');
            imageUrls = [result.secureUrl || result.url];

            const resultDropoff = await confirmReturnDropoff(id, imageUrls);
            alert(resultDropoff.message || 'Drop-off confirmed successfully! Refund is pending admin approval.');
            setDropoffPhoto(null);
            setDropoffPhotoPreview(null);
            await fetchOrder();
        } catch (err: any) {
            alert(err.message || 'Failed to confirm drop-off');
        } finally {
            setLoading(false);
            setUploadingDropoffPhoto(false);
        }
    };

    // Check proximity to sellers (runs periodically)
    useEffect(() => {
        const checkSellersProximity = async () => {
            if (!id || !deliveryBoyLocation || !sellerLocations.length) return;
            if (order?.status === 'Out for Delivery' || order?.status === 'Delivered') return;

            const proximityChecks: Record<string, { withinRange: boolean; distance: number }> = {};

            for (const seller of sellerLocations) {
                try {
                    const response = await checkSellerProximity(
                        id,
                        seller.sellerId,
                        deliveryBoyLocation.lat,
                        deliveryBoyLocation.lng
                    );
                    if (response.success && response.data) {
                        proximityChecks[seller.sellerId] = {
                            withinRange: response.data.withinRange,
                            distance: response.data.distanceMeters
                        };
                    }
                } catch (error) {
                    console.error(`Failed to check proximity for seller ${seller.sellerId}:`, error);
                }
            }

            setSellerProximity(proximityChecks);
        };

        if (sellerLocations.length > 0 && deliveryBoyLocation) {
            checkSellersProximity();
            const interval = setInterval(checkSellersProximity, 4000); // Check every 4 seconds
            return () => clearInterval(interval);
        }
    }, [id, deliveryBoyLocation, sellerLocations, order?.status]);

    // Check proximity to customer (runs periodically)
    useEffect(() => {
        const checkCustomerProx = async () => {
            if (!id || !deliveryBoyLocation) return;
            if (order?.status !== 'Out for Delivery') return;

            try {
                const response = await checkCustomerProximity(id, deliveryBoyLocation.lat, deliveryBoyLocation.lng);
                if (response.success && response.data) {
                    setCustomerProximity({
                        withinRange: response.data.withinRange,
                        distance: response.data.distanceMeters
                    });
                    setGetOtpEnabled(response.data.withinRange);
                }
            } catch (error) {
                console.error('Failed to check customer proximity:', error);
            }
        };

        if (deliveryBoyLocation && order?.status === 'Out for Delivery') {
            checkCustomerProx();
            const interval = setInterval(checkCustomerProx, 4000); // Check every 4 seconds
            return () => clearInterval(interval);
        }
    }, [id, deliveryBoyLocation, order?.status]);

    // Track if location permission was denied
    const locationPermissionDeniedRef = useRef<boolean>(false);

    // Get delivery boy's current location
    useEffect(() => {
        const getCurrentLocation = () => {
            if (!navigator.geolocation) {
                console.warn('Geolocation is not supported by this browser');
                return;
            }

            if (locationPermissionDeniedRef.current) {
                // Don't retry if permission was denied
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setDeliveryBoyLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                    locationPermissionDeniedRef.current = false; // Reset on success
                    setLocationError(null);
                },
                (error: GeolocationPositionError) => {
                    // Handle different error types
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            locationPermissionDeniedRef.current = true;
                            setLocationError('Location permission denied. Please enable location access in your browser settings to track delivery.');
                            console.warn('Location permission denied. Please enable location access in your browser settings.');
                            break;
                        case error.POSITION_UNAVAILABLE:
                            setLocationError('Location information unavailable. Please check your device settings.');
                            console.warn('Location information unavailable. Please check your device settings.');
                            break;
                        case error.TIMEOUT:
                            setLocationError('Location request timed out. Please try again.');
                            console.warn('Location request timed out. Please try again.');
                            break;
                        default:
                            setLocationError(`Error getting location: ${error.message}`);
                            console.warn('Error getting location:', error.message);
                            break;
                    }
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        };

        getCurrentLocation();
    }, []);



    // Socket.io connection
    const socketRef = useRef<any>(null);
    const [socketConnected, setSocketConnected] = useState(false);

    // Initialize Socket
    useEffect(() => {
        let isMounted = true;
        let socket: any = null;

        const initializeSocket = async () => {
            try {
                const [{ io }, { getSocketBaseURL, getAuthToken }] = await Promise.all([
                    import('socket.io-client'),
                    import('../../../services/api/config')
                ]);

                if (!isMounted) return;

                const baseURL = getSocketBaseURL();
                const token = getAuthToken();

                socket = io(baseURL, {
                    auth: { token },
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 2000
                });

                socket.on('connect', () => {
                    if (isMounted) {
                        console.log('✅ Delivery Socket Connected:', socket.id);
                        setSocketConnected(true);
                    }
                });

                socket.on('disconnect', (reason: string) => {
                    if (isMounted) {
                        console.log('❌ Delivery Socket Disconnected:', reason);
                        setSocketConnected(false);
                    }
                });

                socket.on('connect_error', (error: any) => {
                    if (isMounted) {
                        console.error('❌ Delivery Socket Connection Error:', error.message);
                    }
                });

                // Listen for order cancellation
                socket.on('order-cancelled', (data: any) => {
                    if (isMounted && data.orderId === id) {
                        console.log('Order cancelled event received:', data);
                        alert(data.message || 'Order has been cancelled');
                        // Update order status locally
                        setOrder((prev: any) => prev ? { ...prev, status: 'Cancelled' } : null);
                        // Optional: Navigate back or force re-fetch
                        fetchOrder();
                    }
                });

                socketRef.current = socket;
            } catch (err) {
                console.error('Failed to initialize socket:', err);
            }
        };

        initializeSocket();

        return () => {
            isMounted = false;
            if (socket) {
                console.log('🔌 Disconnecting delivery socket...');
                socket.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    // Helper to get socket (for use in other effects)
    const getSocket = useCallback(() => socketRef.current, []);


    // Update delivery boy location from geolocation updates (Socket)
    useEffect(() => {
        if (!id || !order) return;

        const shouldTrack = order.status && order.status !== 'Delivered' && order.status !== 'Cancelled' && order.status !== 'Returned';
        const socket = socketRef.current;

        if (shouldTrack && socketConnected && socket) {
            const updateLocation = async () => {
                if (!navigator.geolocation) return;
                if (locationPermissionDeniedRef.current) return;

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const newLocation = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };
                        setDeliveryBoyLocation(newLocation);
                        setLastUpdate(new Date());

                        // Emit via Socket
                        socket.emit('update-location', {
                            orderId: id,
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        });

                        locationPermissionDeniedRef.current = false;
                    },
                    (error: GeolocationPositionError) => {
                        // ... error handling ...
                        if (error.code === error.PERMISSION_DENIED) {
                            if (!locationPermissionDeniedRef.current) {
                                locationPermissionDeniedRef.current = true;
                                console.warn('Location permission denied.');
                            }
                        }
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            };

            // Initial update
            updateLocation();

            // Interval (4 seconds)
            locationIntervalRef.current = setInterval(updateLocation, 4000);

            return () => {
                if (locationIntervalRef.current) {
                    clearInterval(locationIntervalRef.current);
                    locationIntervalRef.current = null;
                }
            };
        } else {
            if (locationIntervalRef.current) {
                clearInterval(locationIntervalRef.current);
                locationIntervalRef.current = null;
            }
        }
    }, [id, order?.status, socketConnected]);


    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
                <p className="text-neutral-500">Loading order...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-neutral-100 flex items-center justify-center flex-col">
                <p className="text-red-500 mb-4">{error || 'Order not found'}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 bg-neutral-200 rounded-lg text-neutral-700 font-medium"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const isReturn = order?.isReturn === true;
    const statusFlow: DeliveryOrderStatus[] = isReturn
        ? ['Assigned', 'Picked Up', 'Completed']
        : ['Processed', 'Out for Delivery', 'Delivered'];

    let currentStatusIndex = statusFlow.indexOf(order.status as DeliveryOrderStatus);
    // Handle cases where status might not be in the flow (e.g. Cancelled)
    if (currentStatusIndex === -1 && (order.status === 'Cancelled' || order.status === 'Returned' || order.status === 'Completed')) {
        // Maybe show a different UI for cancelled/returned orders
        currentStatusIndex = -1;
    }

    const handleStatusChange = async (newStatus: DeliveryOrderStatus) => {
        if (!id) return;
        try {
            setLoading(true); // Or use a separate loading state for the action
            const updatedOrder = await updateOrderStatus(id, newStatus);
            // Verify the update was successful and update local state
            if (updatedOrder && updatedOrder.data) {
                setOrder(updatedOrder.data);
            } else {
                // Fallback - re-fetch everything
                await fetchOrder();
            }
        } catch (err: any) {
            alert(err.message || "Failed to update status");
        } finally {
            // Ensure loading is cleared regardless of success/failure so UI doesn't stay stuck
            setLoading(false);
        }
    };

    const getNextStatus = () => {
        if (currentStatusIndex !== -1 && currentStatusIndex < statusFlow.length - 1) {
            return statusFlow[currentStatusIndex + 1];
        }
        return null;
    };

    const nextStatus = getNextStatus();
    const isMapVisible = isReturn 
        ? (order.status !== 'Completed') 
        : (order.status === 'Out for Delivery' || order.status === 'Processed' || (sellerLocations.length > 0 && order.status !== 'Delivered'));
    const showSellerLocations = !isReturn && sellerLocations.length > 0 && order.status !== 'Out for Delivery' && order.status !== 'Delivered';
    const showCustomerLocation = isReturn
        ? (order.status === 'Assigned')
        : (order.status === 'Out for Delivery');

    // Check if we have valid customer coordinates
    const customerLat = order.deliveryAddress?.latitude || order.address?.latitude;
    const customerLng = order.deliveryAddress?.longitude || order.address?.longitude;
    const hasValidCustomerLocation = !!(customerLat && customerLng && customerLat !== 0 && customerLng !== 0);

    return (
        <div className="min-h-screen bg-neutral-50 pb-32 relative">

            {/* Top Bar with Back Button */}
            <div className="sticky top-0 z-20 bg-white border-b border-neutral-100 px-4 py-3 flex items-center shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
                >
                    <Icons.ChevronLeft size={24} />
                </button>
                <span className="ml-2 font-semibold text-lg text-neutral-800">
                    {isReturn ? "Return Request Details" : "Order Details"}
                </span>

                <div className="ml-auto">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        order.status === 'Delivered' || order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        order.status === 'Out for Delivery' || order.status === 'Picked up' || order.status === 'Picked Up' ? 'bg-indigo-100 text-indigo-700' :
                        order.status === 'Processed' || order.status === 'Assigned' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-orange-100 text-orange-700'
                    }`}>
                        {order.status === 'Processed' ? 'Preparing' : order.status}
                    </span>
                </div>
            </div>

            {/* Location Error Warning */}
            {locationError && (
                <div className="mx-4 mt-4 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                    <Icons.AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-800">Location Access Required</p>
                        <p className="text-xs text-red-600 mt-0.5">{locationError}</p>
                    </div>
                </div>
            )}

            {/* Google Maps View - Shared Component for Parity */}
            {isMapVisible && (
                <GoogleMapsTracking
                    sellerLocations={
                        isReturn
                            ? (order.status === 'Picked Up' && order.seller
                                ? [{ lat: order.seller.latitude, lng: order.seller.longitude, name: order.seller.storeName }]
                                : [])
                            : ((order.status === 'Out for Delivery' || order.status === 'Picked up')
                                ? []  // Hide seller markers when delivering to customer
                                : sellerLocations.map(s => ({
                                    lat: s.latitude,
                                    lng: s.longitude,
                                    name: s.storeName
                                })))
                    }
                    customerLocation={{
                        lat: order.deliveryAddress?.latitude || order.address?.latitude || 0,
                        lng: order.deliveryAddress?.longitude || order.address?.longitude || 0
                    }}
                    deliveryLocation={deliveryBoyLocation || undefined}
                    isTracking={!!deliveryBoyLocation}
                    showRoute={!!deliveryBoyLocation && (
                        isReturn
                            ? (order.status === 'Assigned' || order.status === 'Picked Up')
                            : (((order.status === 'Picked up' || order.status === 'Out for Delivery') && hasValidCustomerLocation) ||
                               (sellerLocations.length > 0 && order.status !== 'Delivered' && order.status !== 'Picked up' && order.status !== 'Out for Delivery'))
                    )}
                    routeOrigin={deliveryBoyLocation || undefined}
                    routeDestination={
                        isReturn
                            ? (order.status === 'Assigned'
                                ? (hasValidCustomerLocation ? { lat: customerLat!, lng: customerLng! } : undefined)
                                : (order.seller ? { lat: order.seller.latitude, lng: order.seller.longitude } : undefined))
                            : (order.status === 'Picked up' || order.status === 'Out for Delivery'
                                ? (hasValidCustomerLocation ? { lat: customerLat!, lng: customerLng! } : undefined)
                                : sellerLocations.length > 0
                                    ? { lat: sellerLocations[sellerLocations.length - 1].latitude, lng: sellerLocations[sellerLocations.length - 1].longitude }
                                    : undefined)
                    }
                    routeWaypoints={
                        isReturn
                            ? []
                            : (order.status === 'Picked up' || order.status === 'Out for Delivery'
                                ? []
                                : sellerLocations.length > 1
                                    ? sellerLocations.slice(0, -1).map(s => ({ lat: s.latitude, lng: s.longitude }))
                                    : [])
                    }
                    destinationName={
                        isReturn
                            ? (order.status === 'Assigned'
                                ? order.address?.split(',')[0]
                                : (order.seller?.storeName || 'Seller Store'))
                            : (order.status === 'Picked up' || order.status === 'Out for Delivery'
                                ? order.address?.split(',')[0]
                                : sellerLocations.length > 0
                                    ? sellerLocations[0].storeName
                                    : undefined)
                    }
                    onRouteInfoUpdate={setRouteInfo}
                    lastUpdate={lastUpdate}
                />
            )}

            {/* Seller Locations Card with Pickup Buttons (before all sellers picked up) */}
            {showSellerLocations && sellerLocations.length > 0 && (
                <div className="p-4">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
                        <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                            <Icons.Store size={18} className="text-neutral-500" />
                            Seller Pickup Locations
                        </h3>
                        <div className="space-y-3">
                            {sellerLocations.map((seller: any, idx: number) => {
                                const isPickedUp = order?.sellerPickups?.some(
                                    (p: any) => p.seller === seller.sellerId && p.pickedUpAt
                                );
                                const proximity = sellerProximity[seller.sellerId];
                                const withinRange = proximity?.withinRange || false;
                                const distance = proximity?.distance;
                                const isLoading = pickupLoading[seller.sellerId] || false;

                                return (
                                    <div key={idx} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-semibold text-neutral-900">{seller.storeName}</p>
                                                    {isPickedUp && (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                            <Icons.CheckCircle size={12} />
                                                            Picked Up
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-neutral-600">{seller.address}, {seller.city}</p>
                                                {distance !== undefined && (
                                                    <p className={`text-xs mt-1 font-medium ${withinRange ? 'text-green-600' :
                                                        distance < 1000 ? 'text-yellow-600' : 'text-red-600'
                                                        }`}>
                                                        {distance < 1000 ? `${distance}m away` : `${(distance / 1000).toFixed(1)}km away`}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {!isPickedUp && (
                                            <button
                                                onClick={() => handleSellerPickup(seller.sellerId)}
                                                disabled={!withinRange || isLoading}
                                                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all ${withinRange && !isLoading
                                                    ? 'bg-green-600 text-white hover:bg-green-700 active:scale-[0.98]'
                                                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                {isLoading ? 'Confirming...' : withinRange ? 'Confirm Pickup' : 'Move within 500m to pickup'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* COD Banner */}
            {order.paymentMethod && ['COD', 'cod', 'Cash on Delivery', 'Cash', 'CASH', 'Cash On Delivery'].includes(order.paymentMethod) && order.status !== 'Delivered' && (
                <div className="mx-4 mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700">
                            <Icons.ShoppingBag size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-yellow-800 uppercase tracking-wider">Cash to Collect</p>
                            <p className="text-lg font-black text-yellow-900">₹{order.totalAmount}</p>
                        </div>
                    </div>
                    <span className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-lg text-[10px] font-bold uppercase tracking-tight">COD Order</span>
                </div>
            )}

            {/* Earnings Card */}
            <div className="mx-4 mt-4 bg-green-50 border border-green-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="6" width="20" height="12" rx="2" />
                            <circle cx="12" cy="12" r="2" />
                            <path d="M6 12h.01M18 12h.01" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Your Earning</p>
                        <p className="text-xl font-black text-green-800">₹{order.deliveryFare || '0'}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-tight mb-1">Status</p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${order.status === 'Delivered' ? 'bg-green-600 text-white' : 'bg-green-200 text-green-800'}`}>
                        {order.status === 'Delivered' ? 'Earned' : 'Estimated'}
                    </span>
                </div>
            </div>

            <div className="p-4 space-y-4 max-w-lg mx-auto">

                {/* Status Stepper Card */}
                {currentStatusIndex !== -1 && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-neutral-500 text-xs font-medium uppercase tracking-wider mb-1">Process</p>
                                <h2 className="text-lg font-bold text-neutral-900">
                                    {isReturn ? "Return Progress" : "Order Progress"}
                                </h2>
                            </div>
                        </div>

                        {/* Status Progress Bar */}
                        <div className="relative">
                            <div className="flex justify-between mb-2 relative z-10">
                                {statusFlow.map((step, idx) => (
                                    <div key={idx} className="flex flex-col items-center flex-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${idx <= currentStatusIndex
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'bg-white border-neutral-200 text-neutral-300'
                                            }`}>
                                            {idx <= currentStatusIndex ? <Icons.CheckCircle size={14} /> : idx + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Connecting Line */}
                            <div className="absolute top-4 left-0 w-full h-0.5 bg-neutral-100 -z-0">
                                <div
                                    className="h-full bg-blue-600 transition-all duration-500"
                                    style={{ width: `${(currentStatusIndex / (statusFlow.length - 1)) * 100}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-[10px] text-neutral-500 font-medium mt-2">
                                {statusFlow.map((step, idx) => (
                                    <span key={idx} className={`text-center flex-1 transition-colors ${idx === currentStatusIndex ? 'text-blue-600 font-bold' : ''}`}>
                                        {step === 'Processed' ? 'Preparing' : step}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}


                {/* Customer Details */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
                    <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                        <Icons.User size={18} className="text-neutral-500" />
                        {isReturn ? "Customer Pickup Details" : "Customer Details"}
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
                                <Icons.User size={20} />
                            </div>
                            <div>
                                <p className="font-medium text-neutral-900">{order.customerName}</p>
                                <p className="text-sm text-neutral-500">Customer</p>
                            </div>
                            <button
                                onClick={() => window.open(`tel:${order.customerPhone}`, '_system')}
                                className="ml-auto p-3 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-md transition-transform hover:scale-105 active:scale-95"
                            >
                                <Icons.Phone size={20} />
                            </button>
                        </div>
                        <div className="flex items-start gap-3 pt-3 border-t border-neutral-50">
                            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0 text-orange-600">
                                <Icons.MapPin size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-neutral-600 leading-relaxed font-medium">{order.address}</p>
                                {order.distance && (
                                    <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-md">
                                        {order.distance} away
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Custom Return Pickup Action area */}
                        {isReturn && order.status === 'Assigned' && (
                            <div className="pt-4 border-t border-dashed border-neutral-200">
                                <p className="text-sm font-semibold text-neutral-800 mb-3">Product Return Verification</p>
                                
                                {/* Photo uploader component */}
                                <div className="mt-3">
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Take product photo to confirm pickup</label>
                                    {photoPreview ? (
                                        <div className="relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 max-h-48 mb-3">
                                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover max-h-48" />
                                            <button
                                                onClick={() => {
                                                    setPickupPhoto(null);
                                                    setPhotoPreview(null);
                                                }}
                                                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 shadow-md hover:bg-red-700 transition-colors"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 hover:border-blue-500 rounded-xl p-6 bg-neutral-50 cursor-pointer transition-colors mb-3 group">
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400 group-hover:text-blue-500 transition-colors mb-2">
                                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                                <circle cx="12" cy="13" r="4" />
                                            </svg>
                                            <span className="text-sm font-semibold text-neutral-700 group-hover:text-blue-600 transition-colors">Capture or Upload Photo</span>
                                            <span className="text-[10px] text-neutral-400 mt-1">Image size under 5MB</span>
                                            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
                                        </label>
                                    )}
                                </div>

                                <button
                                    onClick={handleCustomerPickupConfirm}
                                    disabled={loading || uploadingPhoto}
                                    className={`w-full py-3.5 rounded-xl font-bold text-base transition-all ${!uploadingPhoto && !loading
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
                                        : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                        }`}
                                >
                                    {uploadingPhoto ? 'Uploading Photo...' : loading ? 'Confirming...' : 'Confirm Pickup from Customer'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Seller Drop-off Location (for Return requests when picked up from customer) */}
                {isReturn && order.status === 'Picked Up' && order.seller && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
                        <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                            <Icons.Store size={18} className="text-neutral-500" />
                            Seller Drop-off Location
                        </h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                                <p className="font-bold text-neutral-900 mb-1">{order.seller.storeName}</p>
                                <p className="text-sm text-neutral-600">
                                    {order.seller.address}{!order.seller.address.includes(order.seller.city) && `, ${order.seller.city}`}
                                </p>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-blue-800 text-sm font-medium leading-relaxed">
                                <p className="font-semibold mb-1">Return Items Picked Up!</p>
                                Please return the package to the Seller at the above location. Once handed over, capture a drop-off photo and confirm drop-off below.
                            </div>

                            {/* Dropoff Photo uploader component */}
                            <div className="mt-3">
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Take product photo to confirm drop-off</label>
                                {dropoffPhotoPreview ? (
                                    <div className="relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 max-h-48 mb-3">
                                        <img src={dropoffPhotoPreview} alt="Preview" className="w-full h-full object-cover max-h-48" />
                                        <button
                                            onClick={() => {
                                                setDropoffPhoto(null);
                                                setDropoffPhotoPreview(null);
                                            }}
                                            className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 shadow-md hover:bg-red-700 transition-colors"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 hover:border-blue-500 rounded-xl p-6 bg-neutral-50 cursor-pointer transition-colors mb-3 group">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400 group-hover:text-blue-500 transition-colors mb-2">
                                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                            <circle cx="12" cy="13" r="4" />
                                        </svg>
                                        <span className="text-sm font-semibold text-neutral-700 group-hover:text-blue-600 transition-colors">Capture or Upload Photo</span>
                                        <span className="text-[10px] text-neutral-400 mt-1">Image size under 5MB</span>
                                        <input type="file" accept="image/*" capture="environment" onChange={handleDropoffPhotoChange} className="hidden" />
                                    </label>
                                )}
                            </div>
                            
                            <button
                                onClick={handleReturnDropoff}
                                disabled={loading || uploadingDropoffPhoto}
                                className={`w-full py-3.5 mt-2 rounded-xl font-bold text-base transition-all ${!loading && !uploadingDropoffPhoto
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md active:scale-[0.98]'
                                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                    }`}
                            >
                                {uploadingDropoffPhoto ? 'Uploading Photo...' : loading ? 'Processing...' : 'Confirm Drop-off to Seller'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Order Items */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                            <Icons.ShoppingBag size={18} className="text-neutral-500" />
                            Order Summary
                        </h3>
                        <span className="text-xs font-medium text-neutral-500 px-2 py-1 bg-neutral-100 rounded-md">
                            {order.items?.length || 0} Items
                        </span>
                    </div>

                    <div className="space-y-3">
                        {order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center py-2 border-b border-neutral-50 last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-600">{item.quantity}x</span>
                                    <span className="text-sm text-neutral-700 font-medium">{item.name}</span>
                                </div>
                                <span className="text-sm font-semibold text-neutral-900">₹{item.price * item.quantity}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-dashed border-neutral-200 flex justify-between items-center">
                        <span className="font-semibold text-neutral-700">Total Amount</span>
                        <span className="text-xl font-bold text-neutral-900">₹{order.totalAmount}</span>
                    </div>
                </div>

                {/* Order Info */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100 mb-20">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-neutral-50 rounded-lg overflow-hidden">
                            <p className="text-xs text-neutral-500 mb-1">Order ID</p>
                            <p className="text-sm font-bold text-neutral-900 break-all">{order.orderId}</p>
                        </div>
                        <div className="p-3 bg-neutral-50 rounded-lg">
                            <p className="text-xs text-neutral-500 mb-1">Order Date</p>
                            <p className="text-sm font-bold text-neutral-900">
                                {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>

            </div>

            {/* Customer Delivery OTP Section (only when order is Out for Delivery) */}
            {order.status === 'Out for Delivery' && (
                <div className="sticky bottom-[72px] z-30 mx-4 mb-4">
                    <div className="bg-white rounded-2xl p-4 shadow-xl border border-neutral-200">
                        <p className="text-sm font-semibold text-neutral-900 mb-3">Customer Delivery OTP</p>

                        {/* Distance indicator */}
                        {customerProximity && (
                            <p className={`text-xs mb-2 font-medium ${customerProximity.withinRange ? 'text-green-600' :
                                customerProximity.distance < 1000 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                {customerProximity.distance < 1000
                                    ? `${customerProximity.distance}m from customer`
                                    : `${(customerProximity.distance / 1000).toFixed(1)}km from customer`}
                            </p>
                        )}

                        {/* 4-digit OTP Input - Always visible but disabled until OTP is sent */}
                        <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={otpValue}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                if (val.length <= 4) {
                                    setOtpValue(val);
                                }
                            }}
                            placeholder="Enter 4-digit OTP"
                            disabled={!showOtpInput}
                            autoFocus={showOtpInput}
                            className={`w-full px-4 py-3 border rounded-xl text-lg font-semibold text-center mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${showOtpInput ? 'border-neutral-300 bg-white' : 'border-neutral-200 bg-neutral-100 text-neutral-400'
                                }`}
                            maxLength={4}
                        />

                        <div className="flex gap-3">
                            {!showOtpInput ? (
                                <button
                                    onClick={handleSendOtp}
                                    disabled={!getOtpEnabled || otpSending}
                                    className={`flex-1 py-3 rounded-xl font-semibold transition-all ${getOtpEnabled && !otpSending
                                        ? 'bg-green-600 text-white hover:bg-green-700 active:scale-[0.98]'
                                        : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                        }`}
                                >
                                    {otpSending ? 'Sending...' : getOtpEnabled ? 'Get OTP' : 'Move within 5km to get OTP'}
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            setShowOtpInput(false);
                                            setOtpValue('');
                                        }}
                                        className="flex-1 py-3 rounded-xl bg-neutral-200 text-neutral-700 font-semibold hover:bg-neutral-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleVerifyOtp}
                                        className={`flex-1 py-3 rounded-xl font-semibold transition-all ${otpVerifying || otpValue.length !== 4
                                            ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                            : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
                                            }`}
                                        disabled={otpVerifying || otpValue.length !== 4}
                                    >
                                        {otpVerifying ? 'Verifying...' : 'Verify OTP'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Glassmorphic Action Button Dock - Order Taken button or status update */}
            {/* Hide this button when order is "Out for Delivery" because OTP section is shown instead */}
            {nextStatus && order.status !== 'Out for Delivery' && !showOtpInput && !isReturn && (
                <div className="sticky bottom-[72px] z-30 mx-4 mb-4">
                    <button
                        onClick={() => handleStatusChange(nextStatus)}
                        className="w-full py-4 rounded-2xl bg-black/75 backdrop-blur-md border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] text-white font-bold text-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-3 overflow-hidden group"
                        disabled={loading}
                    >
                        <span className="relative z-10">
                            {loading ? 'Updating...' : nextStatus === 'Out for Delivery' ? 'Mark Out for Delivery' : `Mark as ${nextStatus}`}
                        </span>
                        {!loading && <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center relative z-10 group-hover:bg-white/30 transition-colors">
                            <Icons.ChevronLeft className="rotate-180" size={18} />
                        </div>}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none"></div>
                    </button>
                </div>
            )}
        </div>
    );
}
