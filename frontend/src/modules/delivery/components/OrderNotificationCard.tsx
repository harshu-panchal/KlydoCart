import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DeliveryNotificationData } from '../../../services/api/delivery/deliveryOrderNotificationService';
import { getProfile } from '../../../services/api/delivery/deliveryService';

interface OrderNotificationCardProps {
    notification: DeliveryNotificationData;
    onAccept: (orderId: string) => Promise<{ success: boolean; message: string }>;
    onReject: (orderId: string) => Promise<{ success: boolean; message: string; allRejected: boolean }>;
}

export default function OrderNotificationCard({
    notification,
    onAccept,
    onReject,
}: OrderNotificationCardProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [audioError, setAudioError] = useState<string | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const vibrationPatternRef = useRef<number[]>([200, 100, 200, 100, 200]);

    // Vibrate on notification (if supported)
    const vibrate = useCallback((pattern?: number | number[]) => {
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate(pattern || vibrationPatternRef.current);
            } catch (error) {
                console.log('Vibration not supported or blocked:', error);
            }
        }
    }, []);

    // Initialize audio with better error handling and settings check
    useEffect(() => {
        let audio: HTMLAudioElement | null = null;
        
        const initAudio = async () => {
            try {
                // Check user settings first
                const profile = await getProfile();
                const isEnabled = profile.settings?.sound ?? true;
                setSoundEnabled(isEnabled);

                if (!isEnabled) {
                    console.log('Sound is disabled in user settings');
                    return;
                }

                audio = new Audio('/assets/sound/delivery-alert.mp3');
                audio.loop = true;
                audio.volume = 1.0; // Max volume for better visibility

        // Set up error handlers
        const handleAudioError = (error: Event) => {
            console.error('Audio error:', error);
            setAudioError('Audio file could not be loaded');
        };

        const handleAudioAbort = () => {
            console.log('Audio playback aborted');
        };

        const handleAudioStalled = () => {
            console.log('Audio playback stalled');
        };

        audio.addEventListener('error', handleAudioError);
        audio.addEventListener('abort', handleAudioAbort);
        audio.addEventListener('stalled', handleAudioStalled);

                audioRef.current = audio;

                // Try to play audio with better permission handling
                try {
                    await audio.play();
                    setHasUserInteracted(true);
                    setAudioError(null);
                } catch (playError: any) {
                    console.log('Audio autoplay blocked or failed:', playError);
                    if (playError.name === 'NotAllowedError') {
                        setAudioError('Tap to enable sound');
                    } else {
                        // Try loading explicitly if first attempt failed
                        audio.load();
                        setAudioError('Tap to play sound');
                    }
                }
            } catch (error) {
                console.error('Failed to initialize audio:', error);
            }
        };

        initAudio();
        vibrate();

        return () => {
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
            audioRef.current = null;
        };
    }, [vibrate]);

    // Play audio on user interaction with better error handling
    const handleUserInteraction = async () => {
        if (!hasUserInteracted && audioRef.current) {
            try {
                // Ensure audio is loaded
                if (audioRef.current.readyState < 2) {
                    audioRef.current.load();
                }
                await audioRef.current.play();
                setHasUserInteracted(true);
                setAudioError(null);
            } catch (error: any) {
                console.error('Failed to play audio:', error);
                if (error.name === 'NotAllowedError') {
                    setAudioError('Audio permission denied');
                } else if (error.name === 'NotSupportedError') {
                    setAudioError('Audio not supported on this device');
                } else {
                    setAudioError('Failed to play audio');
                }
            }
        }
    };

    // Stop audio when component unmounts or notification is dismissed
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        };
    }, []);

    const handleAccept = async () => {
        if (isProcessing) return;

        // Stop audio and vibration IMMEDIATELY
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null; // Prevent any further interaction
        }
        if ('vibrate' in navigator) {
            navigator.vibrate(0);
        }

        setIsProcessing(true);

        const targetId = notification.isReturn ? notification.returnId : notification.orderId;

        try {
            const result = await onAccept(targetId);
            if (!result.success) {
                // Suppress alert for "Order notification not found" as it's handled by the hook clearing the notification
                if (result.message !== 'Order notification not found') {
                    alert(result.message || 'Failed to accept order');
                }
                setIsProcessing(false);
                // Resume audio if accept failed
                if (audioRef.current && hasUserInteracted) {
                    (audioRef.current as any).play().catch(console.error);
                    vibrate(); // Resume vibration
                }
            }
        } catch (error) {
            console.error('Error accepting order:', error);
            alert('Failed to accept order');
            setIsProcessing(false);
            // Resume audio if accept failed
            if (audioRef.current && hasUserInteracted) {
                (audioRef.current as any).play().catch(console.error);
                vibrate(); // Resume vibration
            }
        }
    };

    const handleReject = async () => {
        if (isProcessing) return;

        // Stop audio and vibration IMMEDIATELY
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null; // Prevent any further interaction
        }
        if ('vibrate' in navigator) {
            navigator.vibrate(0);
        }

        setIsProcessing(true);

        const targetId = notification.isReturn ? notification.returnId : notification.orderId;

        try {
            const result = await onReject(targetId);
            if (!result.success) {
                // Suppress alert for "Order notification not found"
                if (result.message !== 'Order notification not found') {
                    alert(result.message || 'Failed to reject order');
                }
                // Resume audio if reject failed
                if (audioRef.current && hasUserInteracted) {
                    (audioRef.current as any).play().catch(console.error);
                    vibrate(); // Resume vibration
                }
            }
        } catch (error) {
            console.error('Error rejecting order:', error);
            alert('Failed to reject order');
            // Resume audio if reject failed
            if (audioRef.current && hasUserInteracted) {
                (audioRef.current as any).play().catch(console.error);
                vibrate(); // Resume vibration
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const formatAddress = () => {
        if (notification.isReturn) {
            return notification.customerAddress || 'N/A';
        }
        const deliveryAddress = (notification as any).deliveryAddress;
        if (!deliveryAddress) return 'N/A';
        const { address, city, state, pincode, landmark } = deliveryAddress;
        return `${address}${landmark ? `, Near ${landmark}` : ''}, ${city}${state ? `, ${state}` : ''} - ${pincode}`;
    };

    const isReturn = notification.isReturn === true;

    return (
        <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="fixed top-4 left-4 right-4 sm:top-4 sm:left-auto sm:right-4 sm:w-auto sm:max-w-md z-50"
            onClick={handleUserInteraction}
            onMouseEnter={handleUserInteraction}
            onTouchStart={handleUserInteraction}
            style={{
                // Support for safe area insets (iOS notches, etc.)
                paddingTop: 'env(safe-area-inset-top, 0)',
            }}
        >
            <div className={`bg-white rounded-xl shadow-2xl border-2 ${isReturn ? 'border-orange-500' : 'border-teal-500'} p-4 sm:p-6`}>
                {/* Header with pulsing indicator */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className={`w-3 h-3 ${isReturn ? 'bg-orange-500' : 'bg-red-500'} rounded-full animate-pulse`}></div>
                            <div className={`absolute inset-0 w-3 h-3 ${isReturn ? 'bg-orange-500' : 'bg-red-500'} rounded-full animate-ping opacity-75`}></div>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-neutral-900">
                            {isReturn ? '🔄 New Return Request!' : 'New Order!'}
                        </h3>
                    </div>
                    {(audioError || !hasUserInteracted || !soundEnabled) && (
                        <div className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded whitespace-nowrap">
                            {!soundEnabled ? 'Sound Muted' : (audioError || 'Tap to enable sound')}
                        </div>
                    )}
                </div>

                {/* Information */}
                <div className="space-y-3 mb-4">
                    {isReturn ? (
                        <>
                            <div>
                                <p className="text-xs sm:text-sm text-neutral-600">Return ID</p>
                                <p className="text-base sm:text-lg font-semibold text-neutral-900 break-all">{notification.returnId}</p>
                            </div>

                            <div>
                                <p className="text-xs sm:text-sm text-neutral-600">Customer (Pick-up)</p>
                                <p className="text-sm sm:text-base font-medium text-neutral-900 break-words">{notification.customerName}</p>
                                <p className="text-xs sm:text-sm text-neutral-500 break-all">{notification.customerPhone}</p>
                            </div>

                            <div>
                                <p className="text-xs sm:text-sm text-neutral-600">Pick-up Address</p>
                                <p className="text-xs sm:text-sm text-neutral-900 break-words leading-relaxed">{formatAddress()}</p>
                            </div>

                            <div>
                                <p className="text-xs sm:text-sm text-neutral-600">Drop-off Store</p>
                                <p className="text-sm sm:text-base font-medium text-neutral-900 break-words">{notification.storeName}</p>
                                <p className="text-xs sm:text-sm text-neutral-500 break-words leading-relaxed">{notification.pickupAddress}</p>
                            </div>

                            <div className="bg-orange-50 border border-orange-100 rounded-lg p-2.5 space-y-1">
                                <p className="text-xs font-semibold text-orange-800">Return Details:</p>
                                <p className="text-xs text-neutral-700">Reason: {notification.reason}</p>
                                <p className="text-xs text-neutral-700">Quantity: {notification.quantity} Item(s)</p>
                            </div>

                            <div>
                                <p className="text-xs sm:text-sm text-neutral-600">Earnings</p>
                                <p className="text-lg sm:text-xl font-bold text-orange-600">Platform pickup fare (tax-funded)</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <p className="text-xs sm:text-sm text-neutral-600">Order Number</p>
                                <p className="text-base sm:text-lg font-semibold text-neutral-900 break-all">{notification.orderNumber}</p>
                            </div>

                            <div>
                                <p className="text-xs sm:text-sm text-neutral-600">Customer</p>
                                <p className="text-sm sm:text-base font-medium text-neutral-900 break-words">{notification.customerName}</p>
                                <p className="text-xs sm:text-sm text-neutral-500 break-all">{notification.customerPhone}</p>
                            </div>

                            <div>
                                <p className="text-xs sm:text-sm text-neutral-600">Delivery Address</p>
                                <p className="text-xs sm:text-sm text-neutral-900 break-words leading-relaxed">{formatAddress()}</p>
                            </div>

                            <div>
                                <p className="text-xs sm:text-sm text-neutral-600">Order Amount</p>
                                <p className="text-lg sm:text-xl font-bold text-teal-600">₹{notification.total.toFixed(2)}</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleReject}
                        disabled={isProcessing}
                        className="flex-1 px-4 py-3 sm:py-3 bg-neutral-100 active:bg-neutral-200 text-neutral-700 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        {isProcessing ? 'Processing...' : 'Reject'}
                    </button>
                    <button
                        onClick={handleAccept}
                        disabled={isProcessing}
                        className={`flex-1 px-4 py-3 sm:py-3 ${isReturn ? 'bg-orange-600 active:bg-orange-700' : 'bg-teal-600 active:bg-teal-700'} text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation`}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        {isProcessing ? 'Processing...' : 'Accept'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

