import { useParams, Link, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../components/ui/button";
import { useOrders } from "../../hooks/useOrders";
import { useAuth } from "../../context/AuthContext";
import { OrderStatus } from "../../types/order";
import GoogleMapsTracking from "../../components/GoogleMapsTracking";
import { useDeliveryTracking } from "../../hooks/useDeliveryTracking";
import DeliveryPartnerCard from "../../components/DeliveryPartnerCard";
import {
  cancelOrder,
  updateOrderNotes,
  getSellerLocationsForOrder,
  refreshDeliveryOtp,
} from "../../services/api/customerOrderService";
import RazorpayCheckout from "../../components/RazorpayCheckout";

// Icon Components
const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const Share2Icon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const RefreshCwIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.48L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const PhoneIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const MapPinIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const HomeIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const MessageSquareIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const HelpCircleIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
  </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ChefHatIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M6 13h12M6 13c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2M6 13v5c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-5" />
    <path d="M9 9V7a3 3 0 0 1 6 0v2" />
  </svg>
);

const ReceiptIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
    <line x1="8" y1="7" x2="16" y2="7" />
    <line x1="8" y1="11" x2="16" y2="11" />
    <line x1="8" y1="15" x2="16" y2="15" />
  </svg>
);

const CircleSlashIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);

// Animated checkmark component
const AnimatedCheckmark = ({ delay = 0 }) => (
  <motion.svg
    width="80"
    height="80"
    viewBox="0 0 80 80"
    initial="hidden"
    animate="visible"
    className="mx-auto">
    <motion.circle
      cx="40"
      cy="40"
      r="36"
      fill="none"
      stroke="#22c55e"
      strokeWidth="4"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    />
    <motion.path
      d="M24 40 L35 51 L56 30"
      fill="none"
      stroke="#22c55e"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.4, delay: delay + 0.4, ease: "easeOut" }}
    />
  </motion.svg>
);

// Promotional banner carousel
const PromoCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const promos = [
    {
      bank: "HDFC BANK",
      offer: "10% cashback on all orders",
      subtext: "Extraordinary Rewards | Zero Joining Fee | T&C apply",
      color: "from-blue-50 to-indigo-50",
    },
    {
      bank: "ICICI BANK",
      offer: "15% instant discount",
      subtext: "Valid on orders above ₹299 | Use code ICICI15",
      color: "from-orange-50 to-red-50",
    },
    {
      bank: "SBI CARD",
      offer: "Flat ₹75 off",
      subtext: "On all orders | No minimum order value",
      color: "from-purple-50 to-pink-50",
    },
    {
      bank: "AXIS BANK",
      offer: "20% cashback up to ₹100",
      subtext: "Valid on first order | T&C apply",
      color: "from-teal-50 to-cyan-50",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % promos.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      className="bg-white rounded-xl p-4 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}>
      <div className="overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className={`flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r ${promos[currentSlide].color}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold bg-blue-900 text-white px-2 py-0.5 rounded">
                  {promos[currentSlide].bank}
                </span>
              </div>
              <p className="font-semibold text-gray-900">
                {promos[currentSlide].offer}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {promos[currentSlide].subtext}
              </p>
              <button className="text-green-700 font-medium text-sm mt-2 flex items-center gap-1">
                Apply now <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💳</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-2 mt-3">
        {promos.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentSlide ? "bg-green-600 w-4" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
};

// Tip selection component
const TipSection = () => {
  const [selectedTip, setSelectedTip] = useState<number | "other" | null>(null);
  const [customTip, setCustomTip] = useState("");
  const tips = [20, 30, 50];

  return (
    <motion.div
      className="bg-white rounded-xl p-4 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}>
      <p className="text-gray-700 text-sm mb-3">
        Make their day by leaving a tip. 100% of the amount will go to them
        after delivery
      </p>
      <div className="flex gap-3">
        {tips.map((tip) => (
          <motion.button
            key={tip}
            onClick={() => {
              setSelectedTip(tip);
              setCustomTip("");
            }}
            className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
              selectedTip === tip
                ? "border-green-600 bg-green-50 text-green-700"
                : "border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
            whileTap={{ scale: 0.95 }}>
            ₹{tip}
          </motion.button>
        ))}
        <motion.button
          onClick={() => {
            setSelectedTip("other");
          }}
          className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
            selectedTip === "other"
              ? "border-green-600 bg-green-50 text-green-700"
              : "border-gray-200 text-gray-700 hover:border-gray-300"
          }`}
          whileTap={{ scale: 0.95 }}>
          Other
        </motion.button>
      </div>

      <AnimatePresence>
        {selectedTip === "other" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <input
              type="number"
              placeholder="Enter custom amount"
              value={customTip}
              onChange={(e) => setCustomTip(e.target.value)}
              className="mt-3 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Section item component
const SectionItem = ({
  icon: Icon,
  title,
  subtitle,
  onClick,
  showArrow = true,
  rightContent,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  showArrow?: boolean;
  rightContent?: React.ReactNode;
}) => (
  <motion.button
    onClick={onClick}
    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left border-b border-dashed border-gray-200 last:border-0"
    whileTap={{ scale: 0.99 }}>
    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-gray-600" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900 truncate">{title}</p>
      {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
    </div>
    {rightContent ||
      (showArrow && <ChevronRightIcon className="w-5 h-5 text-gray-400" />)}
  </motion.button>
);

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const confirmed = searchParams.get("confirmed") === "true";
  const { getOrderById, fetchOrderById, loading: contextLoading } = useOrders();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(id ? getOrderById(id) : undefined);
  const [loading, setLoading] = useState(!order);

  const [showConfirmation, setShowConfirmation] = useState(confirmed);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(
    order?.status || "Placed"
  );
  const [estimatedTime, setEstimatedTime] = useState(29);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
    durationValue: number;
    distanceValue: number;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [showSpecialRequestsModal, setShowSpecialRequestsModal] =
    useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showRazorpayCheckout, setShowRazorpayCheckout] = useState(false);

  // Form states
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [selectedTip, setSelectedTip] = useState<number | "other" | null>(null);
  const [customTip, setCustomTip] = useState("");

  // Real-time delivery tracking via WebSocket
  const {
    deliveryLocation,
    eta,
    distance,
    status: trackingStatus,
    orderStatus: socketOrderStatus, // Real-time order status from socket
    isConnected,
    lastUpdate,
    error: trackingError,
    reconnectAttempts,
    reconnect,
  } = useDeliveryTracking(id);

  // Seller locations for the order
  const [sellerLocations, setSellerLocations] = useState<any[]>([]);
  const [loadingSellerLocations, setLoadingSellerLocations] = useState(false);

  // Fetch order if not in context
  useEffect(() => {
    const loadOrder = async () => {
      if (!id) return;

      const existingOrder = getOrderById(id);
      if (existingOrder) {
        setOrder(existingOrder);
        setOrderStatus(existingOrder.status);
        setLoading(false);
        return;
      }

      setLoading(true);
      const fetchedOrder = await fetchOrderById(id);
      if (fetchedOrder) {
        setOrder(fetchedOrder);
        setOrderStatus(fetchedOrder.status);
      }
      setLoading(false);
    };

    loadOrder();
  }, [id, getOrderById, fetchOrderById]);

  // Fetch seller locations when order is loaded
  useEffect(() => {
    const fetchSellerLocations = async () => {
      if (!id || !order) return;

      // Only fetch if order has delivery boy assigned and status is before "Picked up" or "Out for Delivery"
      const shouldFetch =
        order.status &&
        order.status !== "Delivered" &&
        order.status !== "Cancelled" &&
        order.status !== "Picked up" &&
        order.status !== "Out for Delivery";

      if (shouldFetch) {
        try {
          setLoadingSellerLocations(true);
          const response = await getSellerLocationsForOrder(id);
          if (response.success && response.data) {
            setSellerLocations(response.data || []);
          }
        } catch (err) {
          console.error("Failed to fetch seller locations:", err);
        } finally {
          setLoadingSellerLocations(false);
        }
      }
    };

    fetchSellerLocations();
  }, [id, order?.status]);

  // Update orderStatus when order state changes
  useEffect(() => {
    if (order) {
      setOrderStatus(order.status);
    }
  }, [order]);

  // Real-time order status updates from socket
  useEffect(() => {
    if (socketOrderStatus && socketOrderStatus !== orderStatus) {
      console.log("🔄 Real-time status update:", socketOrderStatus);
      setOrderStatus(socketOrderStatus as OrderStatus);

      // Re-fetch order to get complete updated data
      if (id) {
        fetchOrderById(id).then((fetchedOrder) => {
          if (fetchedOrder) {
            setOrder(fetchedOrder);
          }
        });
      }
    }
  }, [socketOrderStatus, orderStatus, id, fetchOrderById]);

  // Simulate order status progression
  useEffect(() => {
    if (confirmed && order) {
      const timer1 = setTimeout(() => {
        setShowConfirmation(false);
        setOrderStatus("Accepted");
      }, 3000);
      return () => clearTimeout(timer1);
    }
  }, [confirmed, order]);

  // Synchronize estimatedTime with real-time data
  useEffect(() => {
    if (routeInfo?.durationValue) {
      // Priority 1: Google Maps Route Duration
      setEstimatedTime(Math.ceil(routeInfo.durationValue / 60));
    } else if (eta) {
      // Priority 2: Socket ETA (calculated on backend)
      setEstimatedTime(eta);
    }
  }, [routeInfo?.durationValue, eta]);

  // Fallback Countdown timer - only runs if no real-time data is available
  useEffect(() => {
    if ((orderStatus === "Accepted" || orderStatus === "On the way") && !eta && !routeInfo) {
      const timer = setInterval(() => {
        setEstimatedTime((prev) => Math.max(1, prev - 1));
      }, 60000);
      return () => clearInterval(timer);
    }
  }, [orderStatus, eta, routeInfo]);

  // Fallback Polling for order status updates
  useEffect(() => {
    // Stop polling if the order is in a final state or if ID is missing
    if (!id || !orderStatus || ["Delivered", "Cancelled", "Rejected", "Returned"].includes(orderStatus)) {
      return;
    }

    const pollInterval = setInterval(() => {
      // Refresh order data if not already performing a refresh
      if (!isRefreshing) {
        console.log("⏱️ Fallback polling order update...");
        handleRefresh();
      }
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(pollInterval);
  }, [id, orderStatus, isRefreshing]);

  // Handler functions
  const handleRefresh = async () => {
    if (!id) return;
    setIsRefreshing(true);
    const fetchedOrder = await fetchOrderById(id);
    if (fetchedOrder) {
      setOrder(fetchedOrder);
      setOrderStatus(fetchedOrder.status);
    }
    // Add a small delay for the animation
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleRefreshOtp = async () => {
    if (!id || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshDeliveryOtp(id);
      // Re-fetch order to get updated OTP and expiry
      const fetchedOrder = await fetchOrderById(id);
      if (fetchedOrder) {
        setOrder(fetchedOrder);
        setOrderStatus(fetchedOrder.status);
      }
    } catch (error) {
      console.error("Failed to refresh OTP:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleShare = async () => {
    // Use production URL from env, fallback to current origin
    const appBaseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const orderId = order?.id || order?._id;
    const orderUrl = `${appBaseUrl}/orders/${orderId}`;
    const orderNumber = order?.id?.split("-").slice(-1)[0] || orderId;

    const shareData = {
      title: `Order #${orderNumber} - KlydoCart`,
      text: `Track my KlydoCart order #${orderNumber}`,
      url: orderUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(orderUrl);
        alert("Order link copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleCallStore = () => {
    // Default store number, should be from order/seller data
    const storeNumber = order?.seller?.phone || "1234567890";
    window.location.href = `tel:${storeNumber}`;
  };

  const handleCancelOrder = async () => {
    if (!cancellationReason.trim()) {
      alert("Please provide a cancellation reason");
      return;
    }

    if (!id) return;

    try {
      // TODO: Call backend API to cancel order
      await cancelOrder(id, cancellationReason);
      setOrderStatus("Cancelled" as any);
      setShowCancelModal(false);
      alert("Order cancelled successfully");
      // Refresh order to get updated status
      handleRefresh();
    } catch (error) {
      console.error("Error cancelling order:", error);
      alert("Failed to cancel order");
    }
  };

  const handleSaveInstructions = async () => {
    try {
      if (!id) return;
      await updateOrderNotes(id, { deliveryInstructions });
      setShowInstructionsModal(false);
      // alert("Delivery instructions saved!");
      handleRefresh();
    } catch (error) {
      console.error("Failed to save instructions:", error);
      alert("Failed to save instructions");
    }
  };

  const handleSaveSpecialRequests = async () => {
    try {
      if (!id) return;
      await updateOrderNotes(id, { specialRequests });
      setShowSpecialRequestsModal(false);
      // alert("Special requests saved!");
      handleRefresh();
    } catch (error) {
      console.error("Failed to save special requests:", error);
      alert("Failed to save special requests");
    }
  };

  if (loading && !order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="text-sm text-neutral-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto text-center py-20">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-4">
            Order Not Found
          </h1>
          <Link to="/orders">
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig: Record<
    string,
    { title: string; subtitle: string; color: string }
  > = {
    Placed: {
      title: "Order placed",
      subtitle: "Order will reach you shortly",
      color: "bg-green-700",
    },
    Accepted: {
      title: "Preparing your order",
      subtitle: `Arriving in ${estimatedTime} mins`,
      color: "bg-green-700",
    },
    "On the way": {
      title: "Order picked up",
      subtitle: `Arriving in ${estimatedTime} mins`,
      color: "bg-green-700",
    },
    Delivered: {
      title: "Order delivered",
      subtitle: "Enjoy your meal!",
      color: "bg-green-600",
    },
    // Backend status mappings
    Received: {
      title: "Order received",
      subtitle: "Processing your order",
      color: "bg-green-700",
    },
    Pending: {
      title: "Order pending",
      subtitle: "Waiting for confirmation",
      color: "bg-yellow-600",
    },
    Processed: {
      title: "Order processed",
      subtitle: "Preparing for delivery",
      color: "bg-green-700",
    },
    Shipped: {
      title: "Order shipped",
      subtitle: "On the way to you",
      color: "bg-blue-600",
    },
    "Out for Delivery": {
      title: "Out for delivery",
      subtitle: `Arriving in ${estimatedTime} mins`,
      color: "bg-green-700",
    },
    Cancelled: {
      title: "Order cancelled",
      subtitle: "This order has been cancelled",
      color: "bg-red-600",
    },
    Rejected: {
      title: "Order rejected",
      subtitle: "The seller has rejected this order",
      color: "bg-red-700",
    },
    Returned: {
      title: "Order returned",
      subtitle: "This order has been returned",
      color: "bg-gray-600",
    },
  };

  const currentStatus = statusConfig[orderStatus] || statusConfig["Received"];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation for Mobile (Sticky) */}
      <div className={`${currentStatus.color} text-white sticky top-0 z-40 lg:hidden shadow-md transition-colors duration-500`}>
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/orders">
            <motion.button
              className="w-10 h-10 flex items-center justify-center rounded-none hover:bg-white/10"
              whileTap={{ scale: 0.9 }}>
              <ArrowLeftIcon className="w-6 h-6" />
            </motion.button>
          </Link>
          <h2 className="font-bold text-lg tracking-tight uppercase">Order Details</h2>
          <motion.button
            className="w-10 h-10 flex items-center justify-center rounded-none hover:bg-white/10"
            whileTap={{ scale: 0.9 }}
            onClick={handleShare}>
            <Share2Icon className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2 lg:py-4">
          {/* Desktop Breadcrumbs and Header */}
          <div className="hidden lg:flex items-center justify-between mb-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Link to="/" className="hover:text-green-600 transition-colors">Home</Link>
                <ChevronRightIcon className="w-3 h-3" />
                <Link to="/orders" className="hover:text-green-600 transition-colors">My Orders</Link>
                <ChevronRightIcon className="w-3 h-3" />
                <span className="text-gray-900 font-medium">Order #{id?.split("-").slice(-1)[0]}</span>
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-1">
                Order <span className="text-green-600">Details</span>
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={handleShare}
                className="rounded-none px-6 border-gray-200 hover:bg-gray-50">
                <Share2Icon className="w-4 h-4 mr-2" />
                Share Tracking
              </Button>
              <motion.button
                onClick={handleRefresh}
                className="w-11 h-11 flex items-center justify-center rounded-none bg-white border border-gray-200 shadow-sm hover:border-green-600 group transition-all"
                whileTap={{ scale: 0.95 }}
                animate={{ rotate: isRefreshing ? 360 : 0 }}
                transition={{ duration: 0.5 }}>
                <RefreshCwIcon className="w-5 h-5 text-gray-600 group-hover:text-green-600" />
              </motion.button>
            </div>
          </div>

          <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
            {/* Main Content (Status & Tracking) */}
            <div className="lg:col-span-8 space-y-3">
              {/* Order Status Hero Card */}
              <motion.div
                className="bg-white rounded-none overflow-hidden shadow-sm border border-gray-100"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}>
                <div className={`${currentStatus.color} p-3 lg:p-4 text-white relative overflow-hidden`}>
                  {/* Decorative background circle */}
                  <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-white/10 rounded-none blur-3xl -mr-32 pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-white/80 text-sm font-bold uppercase tracking-widest mb-1">Current Status</p>
                      <h2 className="text-2xl lg:text-3xl font-black tracking-tight">{currentStatus.title}</h2>
                      <p className="mt-2 text-white/90 font-medium flex items-center gap-2">
                        {currentStatus.subtitle}
                        {(orderStatus === "Accepted" || orderStatus === "On the way") && (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white/20 rounded-none text-xs backdrop-blur-md">
                            <span className="w-1.5 h-1.5 rounded-none bg-white animate-pulse" />
                            On time
                          </span>
                        )}
                      </p>
                    </div>
                    {["Accepted", "On the way", "Out for Delivery"].includes(orderStatus) && (
                      <div className="flex flex-col items-center sm:items-end">
                        <div className="text-4xl font-black tracking-tighter">{estimatedTime}</div>
                        <div className="text-xs font-bold uppercase tracking-widest opacity-80">Minutes Left</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tracking Map - Expanded on Desktop */}
                {!["Delivered", "Cancelled", "Rejected", "Returned"].includes(orderStatus) && (
                  <div className="h-[300px] lg:h-[450px] relative">
                    <GoogleMapsTracking
                      sellerLocations={sellerLocations.map((s) => ({
                        lat: s.latitude,
                        lng: s.longitude,
                        name: s.storeName,
                      }))}
                      customerLocation={{
                        lat: order?.deliveryAddress?.latitude || order?.address?.latitude || 0,
                        lng: order?.deliveryAddress?.longitude || order?.address?.longitude || 0,
                      }}
                      deliveryLocation={deliveryLocation || undefined}
                      isTracking={isConnected && !!deliveryLocation}
                      showRoute={isConnected && !!deliveryLocation && order?.status !== "Delivered"}
                      routeOrigin={deliveryLocation || undefined}
                      routeDestination={{
                        lat: order?.deliveryAddress?.latitude || order?.address?.latitude || 0,
                        lng: order?.deliveryAddress?.longitude || order?.address?.longitude || 0,
                      }}
                      routeWaypoints={
                        order?.status === "Picked up" || order?.status === "Out for Delivery"
                          ? []
                          : sellerLocations.map((s) => ({ lat: s.latitude, lng: s.longitude }))
                      }
                      onRouteInfoUpdate={setRouteInfo}
                      lastUpdate={lastUpdate}
                    />
                  </div>
                )}
              </motion.div>

              {/* Delivery Partner Details */}
              {(order?.deliveryPartner || order?.deliveryOtp) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}>
                  <DeliveryPartnerCard
                    partner={{
                      name: order?.deliveryPartner?.name || "Delivery Partner",
                      phone: order?.deliveryPartner?.phone,
                      profileImage: order?.deliveryPartner?.profileImage,
                      vehicleNumber: order?.deliveryPartner?.vehicleNumber,
                    }}
                    eta={routeInfo ? Math.ceil(routeInfo.durationValue / 60) : eta}
                    distance={routeInfo ? routeInfo.distanceValue : distance}
                    isTracking={isConnected && !!deliveryLocation}
                    deliveryOtp={order?.deliveryOtp}
                    onCall={() => {
                      const phone = order?.deliveryPartner?.phone || "9031275861";
                      window.location.href = `tel:${phone}`;
                    }}
                  />
                </motion.div>
              )}

              {/* Order Items Desktop List */}
              <div className="bg-white rounded-none shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <ReceiptIcon className="w-5 h-5 text-green-600" />
                    Order Summary
                  </h3>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-none">
                    {order.items?.length || 0} Items
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {order.items?.map((item: any, index: number) => (
                    <div key={index} className="px-3 py-2 flex gap-4 hover:bg-gray-50/50 transition-colors group">
                      <div className="w-14 h-14 bg-gray-100 rounded-none overflow-hidden flex-shrink-0 border border-gray-100">
                        {item.product?.mainImage ? (
                          <img 
                            src={item.product.mainImage} 
                            alt={item.product.name} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <ReceiptIcon className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-gray-900 leading-tight">
                              {item.product?.name || item.productName}
                            </p>
                            <p className="text-sm text-gray-500 mt-1 font-medium">
                              Qty: {item.quantity} × ₹{item.unitPrice?.toFixed(0) || "0"}
                            </p>
                            {item.variant && (
                              <p className="text-xs text-green-600 bg-green-50 w-max px-2 py-0.5 rounded-none mt-1.5 font-bold uppercase tracking-wider">
                                {item.variant}
                              </p>
                            )}
                          </div>
                          <p className="font-black text-gray-900 text-lg">
                            ₹{(item.total || item.unitPrice * item.quantity).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                  <p className="text-sm text-gray-600 font-medium">Order Subtotal</p>
                  <p className="font-bold text-gray-900">₹{order.totalAmount?.toFixed(0)}</p>
                </div>
              </div>

              {/* Seller Information (Desktop Only) */}
              <div className="hidden lg:grid grid-cols-2 gap-3">
                <div className="bg-white rounded-none p-3 shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-none bg-orange-100 flex items-center justify-center text-xl shadow-inner">
                    🛒
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">Store Information</p>
                    <p className="font-bold text-gray-900 text-base leading-tight">KlydoCart Managed Store</p>
                    <p className="text-xs text-gray-500 mt-1">{order.address?.city || "Local Hub"}</p>
                  </div>
                  <motion.button
                    onClick={handleCallStore}
                    className="w-10 h-10 rounded-none bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-600 hover:text-white transition-all shadow-sm"
                    whileTap={{ scale: 0.9 }}>
                    <PhoneIcon className="w-5 h-5" />
                  </motion.button>
                </div>
                
                <div className="bg-white rounded-none p-3 shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-none bg-red-100 flex items-center justify-center shadow-inner">
                    <HelpCircleIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">Need Assistance?</p>
                    <p className="font-bold text-gray-900 text-base leading-tight">Priority Support</p>
                    <p className="text-xs text-gray-500 mt-1">Available 24/7 for this order</p>
                  </div>
                  <Link to="/help">
                    <motion.button
                      className="w-10 h-10 rounded-none bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                      whileTap={{ scale: 0.9 }}>
                      <ChevronRightIcon className="w-5 h-5" />
                    </motion.button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Sticky Sidebar (Payment & Details) */}
            <div className="lg:col-span-4 mt-4 lg:mt-0 space-y-3 lg:sticky lg:top-24">
              {/* Payment Summary Box */}
              <motion.div
                className="bg-gray-900 rounded-none p-4 text-white shadow-xl shadow-gray-200"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}>
                <h3 className="text-base font-bold mb-4 flex items-center justify-between uppercase tracking-widest opacity-80 decoration-green-500 decoration-2">
                  Payment Detail
                  <span className="text-xs px-2 py-0.5 bg-white/10 rounded uppercase tracking-normal">Receipt</span>
                </h3>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center text-gray-400">
                    <span className="text-sm font-medium">Grand Total</span>
                    <span className="text-xl font-black text-white">₹{order.totalAmount?.toFixed(0)}</span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-1">
                      {order.paymentStatus === 'Paid' ? 'Payment Completed' : 'Payment Remaining'}
                    </p>
                    <p className="text-xs text-white/60 leading-relaxed">
                      {order.paymentStatus === 'Paid' 
                        ? 'Successfully processed via Digital Payment' 
                        : 'Choose to pay online now or pay to the delivery partner upon arrival.'}
                    </p>
                  </div>
                </div>

                {!order.paymentStatus?.toLowerCase().includes('paid') && (
                  <Button 
                    onClick={() => setShowRazorpayCheckout(true)}
                    className="w-full bg-green-600 hover:bg-green-500 h-12 rounded-none text-lg font-bold shadow-lg shadow-green-900/40 group">
                    PAY NOW
                    <ChevronRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                )}
              </motion.div>

              {/* Address & Contact Card */}
              <motion.div
                className="bg-white rounded-none shadow-sm border border-gray-100 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}>
                <div className="p-4 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-none bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <HomeIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Delivery Address</h4>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                        {order.address?.address}, {order.address?.city}
                      </p>
                      <p className="text-xs font-bold text-blue-600 mt-2 uppercase tracking-widest">At {order.address?.addressType || "Home"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 pt-4 border-t border-gray-50">
                    <div className="w-10 h-10 rounded-none bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <PhoneIcon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">Contact Details</h4>
                      <p className="text-sm text-gray-900 mt-1 font-bold">{order.address?.name || "Customer"}</p>
                      <p className="text-sm text-gray-500">{order.address?.phone || "+91 9XXXX XXXXX"}</p>
                    </div>
                    <motion.button
                      onClick={() => setShowContactModal(true)}
                      className="text-gray-400 hover:text-purple-600"
                      whileTap={{ scale: 0.9 }}>
                      <ChevronRightIcon className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* Tip Section for Sidebar */}
              <TipSection />

              {/* Delivery Safety Banner */}
              <motion.button
                className="w-full bg-white rounded-none p-4 shadow-sm border border-gray-100 flex items-center gap-4 hover:border-green-600 hover:shadow-md transition-all group"
                onClick={() => setShowSafetyModal(true)}
                whileTap={{ scale: 0.98 }}>
                <div className="w-10 h-10 rounded-none bg-green-50 flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors">
                  <ShieldIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-gray-900 text-sm">Super Safety Measures</p>
                  <p className="text-[10px] text-gray-500 font-medium">100% contactless & sanitized</p>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-gray-300 group-hover:text-green-600" />
              </motion.button>

              {/* Quick Actions Footer Box */}
              <div className="grid grid-cols-2 gap-3">
                <Link to={`/invoice/${id}`} className="col-span-2">
                  <Button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 h-10 rounded-none border border-gray-200 transition-all font-bold text-sm">
                    <ReceiptIcon className="w-4 h-4 mr-2 text-gray-500" />
                    View Invoice
                  </Button>
                </Link>
                <Button 
                  onClick={() => setShowCancelModal(true)}
                  variant="outline" 
                  className="col-span-2 flex-1 h-10 rounded-none border-red-50 text-red-500 hover:bg-red-50 font-bold text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Confirmed Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="text-center px-8">
              <AnimatedCheckmark delay={0.3} />
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="text-4xl font-black text-gray-900 mt-6 tracking-tight">
                Order Confirmed!
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="text-gray-600 mt-2 text-lg">
                Your luxury shopping experience has begun
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="mt-12">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto shadow-sm" />
                <p className="text-sm font-bold text-gray-400 mt-4 uppercase tracking-widest">
                  Initializing Real-time Tracking...
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Modals */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowCancelModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <CircleSlashIcon className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">
                Cancel Order?
              </h2>
              <p className="text-gray-500 mb-6 leading-relaxed">
                We're sorry to see you go. Please tell us why you're cancelling so we can improve.
              </p>
              <textarea
                className="w-full border border-gray-200 rounded-2xl p-4 mb-6 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-gray-700"
                rows={3}
                placeholder="Reason for cancellation..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-gray-200 font-bold"
                  onClick={() => setShowCancelModal(false)}>
                  Go Back
                </Button>
                <Button
                  className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-200"
                  onClick={handleCancelOrder}>
                  Confirm Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInstructionsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowInstructionsModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">
                Delivery Instructions
              </h2>
              <p className="text-gray-500 mb-6">
                Help our partner find your location faster.
              </p>
              <textarea
                className="w-full border border-gray-200 rounded-2xl p-4 mb-2 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 transition-all"
                rows={4}
                maxLength={200}
                placeholder="e.g., Near the red gate, 2nd floor, etc."
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
              />
              <div className="flex justify-end mb-6">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded">
                  {deliveryInstructions.length}/200
                </span>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl font-bold"
                  onClick={() => setShowInstructionsModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-100"
                  onClick={handleSaveInstructions}>
                  Save Note
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Razorpay Integration */}
      <AnimatePresence>
        {showRazorpayCheckout && (
          <RazorpayCheckout
            orderId={order.id}
            amount={order.totalAmount}
            customerDetails={{
              name: order.address?.name || user?.name || "Customer",
              email: user?.email || "customer@klydocart.com",
              phone: order.address?.phone || user?.phone || "9031275861",
            }}
            onSuccess={() => {
              setShowRazorpayCheckout(false);
              handleRefresh();
            }}
            onFailure={() => setShowRazorpayCheckout(false)}
          />
        )}
      </AnimatePresence>

      {/* Contact Details Modal */}
      <AnimatePresence>
        {showContactModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowContactModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
              <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-6">
                <PhoneIcon className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">
                Customer Contact
              </h2>
              <p className="text-gray-500 mb-6 leading-relaxed">
                Reach out to the customer for any delivery updates.
              </p>
              <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                <p className="text-sm font-bold text-gray-900 mb-1">{order?.address?.name || "Customer"}</p>
                <p className="text-sm text-gray-600">{order?.address?.phone || "+91 9XXXX XXXXX"}</p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-gray-200 font-bold"
                  onClick={() => setShowContactModal(false)}>
                  Close
                </Button>
                <Button
                  className="flex-1 h-12 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-200"
                  onClick={() => {
                    window.location.href = `tel:${order?.address?.phone || ''}`;
                  }}>
                  Call Now
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Super Safety Measures Modal */}
      <AnimatePresence>
        {showSafetyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowSafetyModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-6">
                <ShieldIcon className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">
                Super Safety Measures
              </h2>
              <p className="text-gray-500 mb-6 leading-relaxed">
                Your safety is our priority. Here's what we're doing:
              </p>
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">100% Contactless Delivery</p>
                    <p className="text-xs text-gray-500 mt-0.5">Your order will be left at your doorstep</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Sanitized Packaging</p>
                    <p className="text-xs text-gray-500 mt-0.5">All packages are sanitized before dispatch</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Temperature Checks</p>
                    <p className="text-xs text-gray-500 mt-0.5">All delivery partners undergo daily health checks</p>
                  </div>
                </div>
              </div>
              <Button
                className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-200"
                onClick={() => setShowSafetyModal(false)}>
                Got It
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
