import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../hooks/useOrders";
import { useLocation as useLocationContext } from "../../hooks/useLocation";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import RazorpayCheckout from "../../components/RazorpayCheckout";

// import { products } from '../../data/products'; // Removed
import { OrderAddress, Order } from "../../types/order";
import PartyPopper from "./components/PartyPopper";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "../../components/ui/sheet";
import WishlistButton from "../../components/WishlistButton";

import {
  getCoupons,
  validateCoupon,
  Coupon as ApiCoupon,
} from "../../services/api/customerCouponService";
import { appConfig } from "../../services/configService";
import {
  getAddresses,
  updateAddress,
} from "../../services/api/customerAddressService";
import GoogleMapsLocationPicker from "../../components/GoogleMapsLocationPicker";
import { getProducts } from "../../services/api/customerProductService";
import { addToWishlist } from "../../services/api/customerWishlistService";
import { updateProfile } from "../../services/api/customerService";
import { calculateProductPrice } from "../../utils/priceUtils";

// const STORAGE_KEY = 'saved_address'; // Removed

// Similar products helper removed - using API

export default function Checkout() {
  const {
    cart,
    updateQuantity,
    clearCart,
    addToCart,
    removeFromCart,
    refreshCart,
    loading: cartLoading,
  } = useCart();
  const { addOrder } = useOrders();
  const { location: userLocation } = useLocationContext();
  const { showToast: showGlobalToast } = useToast();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [tipAmount, setTipAmount] = useState<number | null>(null);
  const [customTipAmount, setCustomTipAmount] = useState<number>(0);
  const [showCustomTipInput, setShowCustomTipInput] = useState(false);
  const [savedAddress, setSavedAddress] = useState<OrderAddress | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<OrderAddress | null>(
    null
  );

  // Recalculate delivery charges when address changes
  useEffect(() => {
    if (selectedAddress?.latitude && selectedAddress?.longitude) {
      refreshCart(selectedAddress.latitude, selectedAddress.longitude);
    }
  }, [selectedAddress?.id, selectedAddress?.latitude, selectedAddress?.longitude]);
  const [showCouponSheet, setShowCouponSheet] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<ApiCoupon | null>(null);
  const [showPartyPopper, setShowPartyPopper] = useState(false);
  const [hasAppliedCouponBefore, setHasAppliedCouponBefore] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<ApiCoupon[]>([]);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatedDiscount, setValidatedDiscount] = useState<number>(0);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [showGstinSheet, setShowGstinSheet] = useState(false);
  const [gstin, setGstin] = useState<string>("");
  const [showCancellationPolicy, setShowCancellationPolicy] = useState(false);
  const [giftPackaging, setGiftPackaging] = useState<boolean>(false);
  const [showRazorpayCheckout, setShowRazorpayCheckout] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "Online" | "UPI" | "Card" | "Wallet">("Online");

  // Profile completion modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    name: "",
    email: "",
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Map Picker State
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapLocation, setMapLocation] = useState<{
    lat: number;
    lng: number;
    address?: any;
  } | null>(null);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isMapSelected, setIsMapSelected] = useState(false);

  // Check if user has placeholder data (needs profile completion)
  const isPlaceholderUser =
    user?.name === "User" || user?.email?.endsWith("@klydocart.temp");

  // Redirect if empty
  useEffect(() => {
    if (!cartLoading && cart.items.length === 0 && !showOrderSuccess) {
      navigate("/");
    }
  }, [cart.items.length, cartLoading, navigate, showOrderSuccess]);

  // Load addresses and coupons
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [addressResponse, couponResponse] = await Promise.all([
          getAddresses(),
          getCoupons(),
        ]);

        if (
          addressResponse.success &&
          Array.isArray(addressResponse.data) &&
          addressResponse.data.length > 0
        ) {
          const defaultAddr =
            addressResponse.data.find((a: any) => a.isDefault) ||
            addressResponse.data[0];
          const mappedAddress: OrderAddress = {
            name: defaultAddr.fullName,
            phone: defaultAddr.phone,
            flat: "",
            street: defaultAddr.address,
            city: defaultAddr.city,
            state: defaultAddr.state,
            pincode: defaultAddr.pincode,
            landmark: defaultAddr.landmark || "",
            latitude: defaultAddr.latitude,
            longitude: defaultAddr.longitude,
            id: defaultAddr._id,
            _id: defaultAddr._id,
          };
          setSavedAddress(mappedAddress);
          setSelectedAddress(mappedAddress);
        }

        if (couponResponse.success) {
          setAvailableCoupons(couponResponse.data);
        }
      } catch (error) {
        console.error("Error loading checkout data:", error);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch similar products dynamically
  useEffect(() => {
    const fetchSimilar = async () => {
      const items = (cart?.items || []).filter((item) => item && item.product);
      if (items.length === 0) return;

      const cartItem = items[0];
      try {
        let response;
        if (cartItem && cartItem.product) {
          // Try to fetch by category of the first item
          let catId = "";
          const product = cartItem.product;

          if (product.categoryId) {
            catId =
              typeof product.categoryId === "string"
                ? product.categoryId
                : (product.categoryId as any)._id ||
                (product.categoryId as any).id;
          }

          if (catId) {
            response = await getProducts({ category: catId, limit: 10 });
          } else {
            response = await getProducts({ limit: 10, sort: "popular" });
          }
        } else {
          response = await getProducts({ limit: 10, sort: "popular" });
        }

        if (response && response.data) {
          // Filter out items already in cart
          const itemsInCartIds = new Set(
            (cart?.items || [])
              .map((i) => i.product?.id || i.product?._id)
              .filter(Boolean)
          );
          const filtered = response.data
            .filter((p: any) => !itemsInCartIds.has(p.id || p._id))
            .map((p: any) => {
              const { displayPrice, mrp } = calculateProductPrice(p);
              return {
                ...p,
                id: p._id || p.id,
                name: p.productName || p.name || "Product",
                imageUrl: p.mainImage || p.imageUrl || p.mainImageUrl || "",
                price: displayPrice,
                mrp: mrp,
                pack:
                  p.pack ||
                  p.variations?.[0]?.title ||
                  p.variations?.[0]?.name ||
                  "Standard",
              };
            })
            .slice(0, 6);
          setSimilarProducts(filtered);
        }
      } catch (err) {
        console.error("Failed to fetch similar products", err);
      }
    };
    fetchSimilar();
  }, [cart?.items?.length]);

  if (cartLoading || ((cart?.items?.length || 0) === 0 && !showOrderSuccess)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-medium text-neutral-600">
            {cartLoading ? "Loading checkout..." : "Redirecting..."}
          </p>
        </div>
      </div>
    );
  }

  const displayItems = (cart?.items || []).filter(
    (item) => item && item.product
  );
  const displayCart = {
    ...cart,
    items: displayItems,
    itemCount: displayItems.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    ),
    total: displayItems.reduce((sum, item) => {
      const { displayPrice } = calculateProductPrice(
        item.product,
        item.variant
      );
      return sum + displayPrice * (item.quantity || 0);
    }, 0),
  };

  const threshold = cart.freeDeliveryThreshold ?? appConfig.freeDeliveryThreshold;
  const amountNeededForFreeDelivery = Math.max(
    0,
    threshold - (displayCart.total || 0)
  );
  const cartItem = displayItems[0];

  const itemsTotal = displayItems.reduce((sum, item) => {
    if (!item?.product) return sum;
    const { mrp } = calculateProductPrice(item.product, item.variant);
    return sum + mrp * (item.quantity || 0);
  }, 0);

  const discountedTotal = displayCart.total;
  const savedAmount = itemsTotal - discountedTotal;
  const handlingCharge = cart.platformFee ?? appConfig.platformFee;
  const deliveryCharge = cart.estimatedDeliveryFee ?? (displayCart.total >= threshold ? 0 : appConfig.deliveryFee);

  // Recalculate or use validated discount
  // If we have a selected coupon, we should re-validate if cart total changes,
  // but for simplicity, we'll re-calculate locally if possible or trust the previous validation if acceptable (better to re-validate)
  const subtotalBeforeCoupon =
    discountedTotal + handlingCharge + deliveryCharge;

  // Local calculation for immediate feedback, relying on backend validation on Apply
  let currentCouponDiscount = 0;
  if (selectedCoupon) {
    // Logic mirrors backend for UI update purposes
    if (
      selectedCoupon.minOrderValue &&
      subtotalBeforeCoupon < selectedCoupon.minOrderValue
    ) {
      // Invalid now
    } else {
      if (selectedCoupon.discountType === "percentage") {
        currentCouponDiscount = Math.round(
          (subtotalBeforeCoupon * selectedCoupon.discountValue) / 100
        );
        if (
          selectedCoupon.maxDiscountAmount &&
          currentCouponDiscount > selectedCoupon.maxDiscountAmount
        ) {
          currentCouponDiscount = selectedCoupon.maxDiscountAmount;
        }
      } else {
        currentCouponDiscount = selectedCoupon.discountValue;
      }
    }
  }

  // Calculate tip amount (use custom tip if custom tip input is shown, otherwise use selected tip)
  const finalTipAmount = showCustomTipInput ? customTipAmount : tipAmount || 0;
  const giftPackagingFee = giftPackaging ? 30 : 0;
  const grandTotal = Math.max(
    0,
    discountedTotal +
    handlingCharge +
    deliveryCharge +
    finalTipAmount +
    giftPackagingFee -
    currentCouponDiscount
  );

  const handleApplyCoupon = async (coupon: ApiCoupon) => {
    setIsValidatingCoupon(true);
    setCouponError(null);
    try {
      const result = await validateCoupon(coupon.code, subtotalBeforeCoupon);
      if (result.success && result.data?.isValid) {
        const isFirstTime = !hasAppliedCouponBefore;
        setSelectedCoupon(coupon);
        setValidatedDiscount(result.data.discountAmount);
        setShowCouponSheet(false);
        if (isFirstTime) {
          setHasAppliedCouponBefore(true);
          setShowPartyPopper(true);
        }
      } else {
        setCouponError(result.message || "Invalid coupon");
      }
    } catch (err: any) {
      setCouponError(err.response?.data?.message || "Failed to apply coupon");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setSelectedCoupon(null);
    setValidatedDiscount(0);
    setCouponError(null);
  };

  const handleMoveToWishlist = async (product: any, variantId?: string, variantTitle?: string) => {
    if (!product?.id && !product?._id) return;

    const productId = product.id || product._id;

    try {
      if (!userLocation?.latitude || !userLocation?.longitude) {
        showGlobalToast(
          "Location is required to move items to wishlist",
          "error"
        );
        return;
      }

      // Add to wishlist
      await addToWishlist(
        productId,
        userLocation.latitude,
        userLocation.longitude
      );
      // Remove from cart
      await removeFromCart(productId, variantId, variantTitle);
      // Show success message
      showGlobalToast("Item moved to wishlist");
    } catch (error: any) {
      console.error("Failed to move to wishlist:", error);
      const msg =
        error.response?.data?.message || "Failed to move item to wishlist";
      showGlobalToast(msg, "error");
    }
  };

  const handlePlaceOrder = async (arg?: any) => {
    // Only bypass if explicitly passed true (handles event objects from onClick)
    const bypassProfileCheck = arg === true;

    if (!selectedAddress || cart.items.length === 0) {
      return;
    }

    // Check if user needs to complete their profile first
    if (!bypassProfileCheck && isPlaceholderUser) {
      setProfileFormData({
        name: user?.name === "User" ? "" : user?.name || "",
        email: user?.email?.endsWith("@klydocart.temp") ? "" : user?.email || "",
      });
      setShowProfileModal(true);
      return;
    }

    // Validate required address fields
    if (!selectedAddress.city || !selectedAddress.pincode) {
      console.error("Address is missing required fields (city or pincode)");
      alert("Please ensure your address has city and pincode.");
      return;
    }

    // Use user's current location as fallback if address doesn't have coordinates
    const finalLatitude = selectedAddress.latitude ?? userLocation?.latitude;
    const finalLongitude = selectedAddress.longitude ?? userLocation?.longitude;

    // Validate that we have location data (either from address or user's current location)
    if (finalLatitude == null || finalLongitude == null) {
      console.error(
        "Address is missing location data (latitude/longitude) and user location is not available"
      );
      alert(
        "Location is required for delivery. Please ensure your address has location data or enable location access."
      );
      return;
    }

    // Create address object with location data (use fallback if needed)
    const addressWithLocation: OrderAddress = {
      ...selectedAddress,
      latitude: finalLatitude,
      longitude: finalLongitude,
    };

    const orderId = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 6)
      .toUpperCase()}`;

    const order: Order = {
      id: orderId,
      items: cart.items,
      totalItems: cart.itemCount,
      subtotal: discountedTotal,
      fees: {
        platformFee: handlingCharge,
        deliveryFee: deliveryCharge,
      },
      totalAmount: grandTotal,
      address: addressWithLocation,
      paymentMethod: paymentMethod,
      status: "Placed",
      createdAt: new Date().toISOString(),
      tipAmount: finalTipAmount,
      gstin: gstin || undefined,
      couponCode: selectedCoupon?.code || undefined,
      giftPackaging: giftPackaging,
    };

    try {
      const placedId = await addOrder(order);
      if (placedId) {
        if (paymentMethod === "COD") {
          setPlacedOrderId(placedId);
          clearCart();
          setShowOrderSuccess(true);
        } else {
          setPendingOrderId(placedId);
          setShowRazorpayCheckout(true);
        }
      }
    } catch (error: any) {
      console.error("Order placement failed", error);
      // Show user-friendly error message
      const errorMessage =
        error.message ||
        error.response?.data?.message ||
        "Failed to place order. Please try again.";
      alert(errorMessage);
    }
  };

  const handleGoToOrders = () => {
    if (placedOrderId) {
      navigate(`/orders/${placedOrderId}`);
    } else {
      navigate("/orders");
    }
  };

  const handleUpdateLocation = async () => {
    if (!selectedAddress?.id || !mapLocation) return;
    setIsUpdatingLocation(true);
    try {
      // Prepare update payload
      const updatePayload: any = {
        latitude: mapLocation.lat,
        longitude: mapLocation.lng,
      };

      // If address details are available from map, update them too
      if (mapLocation.address) {
        if (mapLocation.address.street)
          updatePayload.address = mapLocation.address.street;
        if (mapLocation.address.city)
          updatePayload.city = mapLocation.address.city;
        if (mapLocation.address.state)
          updatePayload.state = mapLocation.address.state;
        if (mapLocation.address.pincode)
          updatePayload.pincode = mapLocation.address.pincode;
        if (mapLocation.address.landmark)
          updatePayload.landmark = mapLocation.address.landmark;
      }

      // Update the address in backend
      await updateAddress(selectedAddress.id, updatePayload);

      // Update local state
      const updated = {
        ...selectedAddress,
        latitude: mapLocation.lat,
        longitude: mapLocation.lng,
        street: mapLocation.address?.street || selectedAddress.street,
        city: mapLocation.address?.city || selectedAddress.city,
        state: mapLocation.address?.state || selectedAddress.state,
        pincode: mapLocation.address?.pincode || selectedAddress.pincode,
        landmark: mapLocation.address?.landmark || selectedAddress.landmark,
      };
      setSelectedAddress(updated);
      setSavedAddress(updated); // Sync
      setShowMapPicker(false);
      setIsMapSelected(true); // Mark map as selected
      showGlobalToast("Location and address updated successfully!");
    } catch (err) {
      console.error(err);
      // showGlobalToast('Failed to update location');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  // Handle profile completion submission
  const handleProfileSubmit = async () => {
    if (!profileFormData.name.trim() || !profileFormData.email.trim()) {
      setProfileError("Please enter both name and email");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileFormData.email)) {
      setProfileError("Please enter a valid email address");
      return;
    }

    setIsUpdatingProfile(true);
    setProfileError(null);

    try {
      const response = await updateProfile({
        name: profileFormData.name.trim(),
        email: profileFormData.email.trim(),
      });

      if (response.success) {
        // Update local user data
        updateUser({
          ...user,
          id: user?.id || "",
          name: response.data.name,
          email: response.data.email,
        });

        setShowProfileModal(false);
        showGlobalToast("Profile updated successfully!");

        // Directly trigger order placement, bypassing the profile check
        handlePlaceOrder(true);
      }
    } catch (error: any) {
      setProfileError(
        error.response?.data?.message ||
        "Failed to update profile. Please try again."
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <div
      className="bg-white min-h-screen flex flex-col"
      style={{ opacity: 1 }}>
      {/* Party Popper Animation */}
      <PartyPopper
        show={showPartyPopper}
        onComplete={() => setShowPartyPopper(false)}
      />

      {/* Profile Completion Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowProfileModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-neutral-900 mb-2">
                Complete Your Profile
              </h2>
              <p className="text-sm text-neutral-600 mb-4">
                Please provide your name and email to continue with your order.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileFormData.name}
                    onChange={(e) =>
                      setProfileFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                    disabled={isUpdatingProfile}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profileFormData.email}
                    onChange={(e) =>
                      setProfileFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="Enter your email"
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                    disabled={isUpdatingProfile}
                  />
                </div>

                {profileError && (
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    {profileError}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 py-2.5 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
                    disabled={isUpdatingProfile}>
                    Cancel
                  </button>
                  <button
                    onClick={handleProfileSubmit}
                    disabled={
                      isUpdatingProfile ||
                      !profileFormData.name.trim() ||
                      !profileFormData.email.trim()
                    }
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${isUpdatingProfile ||
                      !profileFormData.name.trim() ||
                      !profileFormData.email.trim()
                      ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                      }`}>
                    {isUpdatingProfile ? "Saving..." : "Save & Continue"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Picker Modal */}
      <AnimatePresence>
        {showMapPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowMapPicker(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl overflow-hidden w-full max-w-lg shadow-xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-neutral-900">
                  Pin Delivery Location
                </h3>
                <button onClick={() => setShowMapPicker(false)}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <GoogleMapsLocationPicker
                initialLat={
                  mapLocation?.lat ||
                  userLocation?.latitude ||
                  selectedAddress?.latitude ||
                  0
                }
                initialLng={
                  mapLocation?.lng ||
                  userLocation?.longitude ||
                  selectedAddress?.longitude ||
                  0
                }
                onLocationSelect={(lat, lng, address) =>
                  setMapLocation({ lat, lng, address })
                }
                height="300px"
              />

              <div className="p-4 bg-white border-t">
                <p className="text-xs text-neutral-500 mb-3 text-center">
                  Move the map to set your exact delivery location
                </p>
                <button
                  onClick={handleUpdateLocation}
                  disabled={isUpdatingLocation}
                  className="w-full py-3 bg-neutral-900 text-white font-bold rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-70 flex justify-center items-center gap-2">
                  {isUpdatingLocation ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Updating...
                    </>
                  ) : (
                    "Confirm Location"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Success Celebration Page */}
      {showOrderSuccess && (
        <div
          className="fixed inset-0 z-[70] bg-white flex flex-col items-center justify-center h-screen w-screen overflow-hidden"
          style={{ animation: "fadeIn 0.3s ease-out" }}>
          {/* Confetti Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Animated confetti pieces */}
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-sm"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-10%`,
                  backgroundColor: [
                    "#22c55e",
                    "#3b82f6",
                    "#f59e0b",
                    "#ef4444",
                    "#8b5cf6",
                    "#ec4899",
                  ][Math.floor(Math.random() * 6)],
                  animation: `confettiFall ${2 + Math.random() * 2}s linear ${Math.random() * 2
                    }s infinite`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            ))}
          </div>

          {/* Success Content */}
          <div className="relative z-10 flex flex-col items-center px-6">
            {/* Success Tick Circle */}
            <div
              className="relative mb-8"
              style={{
                animation:
                  "scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both",
              }}>
              {/* Outer ring animation */}
              <div
                className="absolute inset-0 w-32 h-32 rounded-full border-4 border-green-500"
                style={{
                  animation: "ringPulse 1.5s ease-out infinite",
                  opacity: 0.3,
                }}
              />
              {/* Main circle */}
              <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl">
                <svg
                  className="w-16 h-16 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: "checkDraw 0.5s ease-out 0.5s both" }}>
                  <path d="M5 12l5 5L19 7" className="check-path" />
                </svg>
              </div>
              {/* Sparkles */}
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                  style={{
                    top: "50%",
                    left: "50%",
                    animation: `sparkle 0.6s ease-out ${0.3 + i * 0.1}s both`,
                    transform: `rotate(${i * 60}deg) translateY(-80px)`,
                  }}
                />
              ))}
            </div>

            {/* Location Info */}
            <div
              className="text-center"
              style={{ animation: "slideUp 0.5s ease-out 0.6s both" }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-5 h-5 text-red-500">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedAddress?.city || "Your Location"}
                </h2>
              </div>
              <p className="text-gray-500 text-base">
                {selectedAddress
                  ? `${selectedAddress.street}, ${selectedAddress.city}`
                  : "Delivery Address"}
              </p>
            </div>

            {/* Order Placed Message */}
            <div
              className="mt-12 text-center"
              style={{ animation: "slideUp 0.5s ease-out 0.8s both" }}>
              <h3 className="text-3xl font-bold text-green-600 mb-2">
                Order Placed!
              </h3>
              <p className="text-gray-600">Your order is on the way</p>
            </div>

            {/* Action Button */}
            <button
              onClick={handleGoToOrders}
              className="mt-10 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-12 rounded-xl shadow-lg transition-all hover:shadow-xl hover:scale-105"
              style={{ animation: "slideUp 0.5s ease-out 1s both" }}>
              Track Your Order
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-2 md:py-3 flex items-center justify-between">
          {/* Back Arrow */}
          <button
            onClick={() => navigate(-1)}
            className="w-7 h-7 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
            aria-label="Go back">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Title - Center on mobile, left-aligned with products on desktop */}
          <h1 className="text-base font-bold text-neutral-900 lg:flex-1 lg:ml-8">Checkout</h1>

          {/* Spacer to maintain layout or additional desktop actions */}
          <div className="w-7 h-7 lg:hidden"></div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 bg-neutral-50/30">
        <div className="max-w-7xl mx-auto lg:p-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-10 lg:items-start">
            
            {/* Left Column: Items, Recommendations, and Options */}
            <div className="lg:col-span-8 space-y-4">
              
              {/* Ordering for someone else */}
              <div className="px-4 md:px-0 py-2 md:py-3 bg-white lg:rounded-2xl lg:shadow-sm border-b lg:border border-neutral-200 overflow-hidden">
                <div className="px-4 flex items-center justify-between">
                  <span className="text-xs text-neutral-700">
                    Ordering for someone else?
                  </span>
                  <button
                    onClick={() =>
                      navigate("/checkout/address", {
                        state: {
                          editAddress: savedAddress,
                        },
                      })
                    }
                    className="text-xs text-green-600 font-medium hover:text-green-700 transition-colors">
                    Add details
                  </button>
                </div>
              </div>

              {/* Main Product Card */}
              <div className="px-4 md:px-0 py-2 md:py-3 bg-white lg:rounded-2xl lg:shadow-sm border-b lg:border border-neutral-200 overflow-hidden">
                <div className="px-4 bg-white p-2.5">
                  <p className="text-[10px] text-neutral-600 mb-2.5 uppercase tracking-wider font-bold">
                    Cart Items ({displayCart.itemCount || 0})
                  </p>

                  <div className="space-y-4">
                    {displayItems
                      .filter((item) => item.product)
                      .map((item) => (
                        <div
                          key={item.product?.id || Math.random()}
                          className="flex gap-4 items-start pb-4 border-b border-neutral-50 last:border-0 last:pb-0">
                          {/* Product Image */}
                          <div className="w-16 h-16 bg-neutral-100 rounded-xl flex-shrink-0 overflow-hidden border border-neutral-100">
                            {item.product?.imageUrl ? (
                              <img
                                src={item.product?.imageUrl}
                                alt={item.product?.name}
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                {(item.product?.name || "").charAt(0)}
                              </div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-neutral-900 mb-1 line-clamp-2">
                                  {item.product?.name}
                                </h3>
                                <p className="text-xs text-neutral-500 mb-2">
                                  {item.quantity} × {item.product?.pack}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const variantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id || item.variant;
                                    const variantTitle = (item.product as any).variantTitle || item.product.pack;
                                    handleMoveToWishlist(item.product, variantId, variantTitle);
                                  }}
                                  className="text-[11px] text-green-600 font-bold flex items-center gap-1.5 hover:text-green-700 transition-colors">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                  </svg>
                                  Move to wishlist
                                </button>
                              </div>

                              <div className="flex flex-col items-end gap-2 flex-shrink-0 pt-0.5">
                                <div className="flex items-center gap-2 bg-green-50/50 border border-green-200 rounded-full px-2 py-1 shadow-sm">
                                  <button
                                    onClick={() => {
                                      const variantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id || item.variant;
                                      const variantTitle = (item.product as any).variantTitle || item.product.pack;
                                      updateQuantity(item.product?.id, item.quantity - 1, variantId, variantTitle);
                                    }}
                                    className="w-6 h-6 flex items-center justify-center text-green-600 font-black hover:bg-green-100 rounded-full transition-colors leading-none">
                                    <span className="relative top-[-1px]">−</span>
                                  </button>
                                  <span className="text-green-700 font-black min-w-[1rem] text-center text-xs">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => {
                                      const variantId = (item.product as any).variantId || (item.product as any).selectedVariant?._id || item.variant;
                                      const variantTitle = (item.product as any).variantTitle || item.product.pack;
                                      updateQuantity(item.product?.id, item.quantity + 1, variantId, variantTitle);
                                    }}
                                    className="w-6 h-6 flex items-center justify-center text-green-600 font-black hover:bg-green-100 rounded-full transition-colors leading-none">
                                    <span className="relative top-[-1px]">+</span>
                                  </button>
                                </div>

                                {(() => {
                                  const { displayPrice, mrp, hasDiscount } = calculateProductPrice(item.product, item.variant);
                                  return (
                                    <div className="flex flex-col items-end leading-tight">
                                      {hasDiscount && (
                                        <span className="text-[10px] text-neutral-400 line-through">
                                          ₹{(mrp * item.quantity).toLocaleString("en-IN")}
                                        </span>
                                      )}
                                      <span className="text-sm font-bold text-neutral-900 italic">
                                        ₹{(displayPrice * item.quantity).toLocaleString("en-IN")}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    
                    <button 
                      onClick={() => navigate('/')}
                      className="w-full flex items-center justify-center gap-2 py-3 mt-2 border-2 border-dashed border-green-200 rounded-2xl text-green-600 hover:bg-green-50 transition-all font-bold text-sm active:scale-[0.98]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Add more items from store
                    </button>
                  </div>
                </div>
              </div>

              {/* You might also like */}
              <div className="px-4 md:px-0 py-3 bg-white lg:rounded-2xl lg:shadow-sm border-b lg:border border-neutral-200 overflow-hidden">
                <div className="px-4">
                  <h2 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    You might also like
                  </h2>
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                    {similarProducts.map((product) => {
                      const { displayPrice, mrp, discount, hasDiscount } = calculateProductPrice(product);
                      const productId = product.id || product._id;
                      const inCartQty = (cart?.items || []).find((item) => (item.product?.id || item.product?._id) === productId)?.quantity || 0;

                      return (
                        <div key={product.id} className="flex-shrink-0 w-[160px]">
                          <div className="bg-white rounded-xl overflow-hidden flex flex-col relative h-full border border-neutral-100 shadow-sm">
                            <div onClick={() => navigate(`/product/${product.id || product._id}`)} className="relative cursor-pointer">
                              <div className="w-full h-32 bg-neutral-50 flex items-center justify-center p-2">
                                <img src={product.imageUrl || product.mainImage} alt={product.name} className="w-full h-full object-contain" />
                                {discount > 0 && (
                                  <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm italic">
                                    {discount}% OFF
                                  </div>
                                )}
                                <WishlistButton productId={product.id || product._id} size="sm" className="top-2 right-2" />
                              </div>
                            </div>
                            <div className="p-2 flex-1 flex flex-col">
                              <h3 className="text-xs font-bold text-neutral-900 line-clamp-2 leading-tight mb-1">{product.name}</h3>
                              <div className="text-[10px] text-neutral-500 mb-1">{product.pack}</div>
                              <div className="flex items-baseline gap-1.5 mt-auto">
                                <span className="text-sm font-black text-neutral-900 italic">₹{displayPrice}</span>
                                {hasDiscount && <span className="text-[10px] text-neutral-400 line-through">₹{mrp}</span>}
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); addToCart(product, e.currentTarget); }}
                                className="mt-2 w-full py-1.5 bg-green-600 text-white text-[10px] font-bold rounded-lg hover:bg-green-700 transition-colors shadow-sm italic">
                                ADD TO CART
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Options Section (Tip, GSTIN, Gift) */}
              <div className="lg:grid lg:grid-cols-2 lg:gap-4">
                {/* Tip your delivery partner */}
                <div className="px-4 md:px-0 py-4 bg-white lg:rounded-2xl lg:shadow-sm border-b lg:border border-neutral-200 overflow-hidden">
                  <div className="px-4">
                    <h3 className="text-sm font-bold text-neutral-900 mb-1">Tip your delivery partner</h3>
                    <p className="text-[11px] text-neutral-500 mb-4">100% of your tip goes to the partner.</p>
                    <div className="flex gap-2 flex-wrap">
                      {[20, 30, 50].map(amt => (
                        <button
                          key={amt}
                          onClick={() => { setTipAmount(amt); setShowCustomTipInput(false); }}
                          className={`px-4 py-2 rounded-xl border-2 font-bold text-xs transition-all ${tipAmount === amt && !showCustomTipInput ? "border-green-600 bg-green-50 text-green-700" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"}`}>
                          ₹{amt}
                        </button>
                      ))}
                      <button
                        onClick={() => { setShowCustomTipInput(true); setTipAmount(null); }}
                        className={`px-4 py-2 rounded-xl border-2 font-bold text-xs transition-all ${showCustomTipInput ? "border-green-600 bg-green-50 text-green-700" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"}`}>
                        Custom
                      </button>
                    </div>
                    {showCustomTipInput && (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="number"
                          value={customTipAmount || ""}
                          onChange={(e) => setCustomTipAmount(Math.max(0, Number(e.target.value)))}
                          placeholder="Amount"
                          className="w-24 px-3 py-2 bg-white border-2 border-green-600 rounded-xl text-sm font-bold focus:outline-none"
                        />
                        <button onClick={() => { setShowCustomTipInput(false); setCustomTipAmount(0); }} className="text-xs font-bold text-neutral-400">Cancel</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Other Options Wrapper */}
                <div className="space-y-4">
                  {/* GSTIN */}
                  <div className="px-4 md:px-0 py-4 bg-white lg:rounded-2xl lg:shadow-sm border-b lg:border border-neutral-200 overflow-hidden">
                    <div className="px-4">
                      <button onClick={() => setShowGstinSheet(true)} className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold italic">%</div>
                          <div className="text-left">
                            <p className="text-xs font-bold text-neutral-900">Add GSTIN</p>
                            <p className="text-[10px] text-neutral-500">{gstin ? `Active: ${gstin}` : "Claim GST input credit"}</p>
                          </div>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Gift Packaging */}
                  <div className="px-4 md:px-0 py-4 bg-white lg:rounded-2xl lg:shadow-sm border-b lg:border border-neutral-200 overflow-hidden">
                    <div className="px-4">
                      <button onClick={() => setGiftPackaging(!giftPackaging)} className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${giftPackaging ? "bg-green-600 text-white" : "bg-neutral-100 text-neutral-400"}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z" /></svg>
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-bold text-neutral-900">Gift Packaging</p>
                            <p className="text-[10px] text-neutral-500">Elegant wrapping for ₹30</p>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${giftPackaging ? "bg-green-600 border-green-600" : "border-neutral-200"}`}>
                          {giftPackaging && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Policy and Branding */}
              <div className="px-4 md:px-0 flex flex-col items-center gap-6 py-8">
                <button onClick={() => setShowCancellationPolicy(true)} className="text-[11px] font-bold text-neutral-400 hover:text-neutral-600 border-b border-dashed border-neutral-200 pb-1 uppercase tracking-widest transition-colors">
                  View Cancellation Policy
                </button>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 bg-green-50/50 px-4 py-2 rounded-xl border border-green-100 italic">
                    <span className="text-[9px] font-black text-neutral-300 uppercase">Premium Service by</span>
                    <span className="text-sm font-black text-green-600 tracking-tighter">KlydoCart</span>
                  </div>
                  <p className="mt-2 text-[9px] text-neutral-400 font-bold uppercase tracking-[0.2em]">Fastest Delivery in City</p>
                </div>
              </div>

            </div>

            {/* Right Column: Address, Billing, and Payment Selection as a Sidebar */}
            <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24 pb-32 lg:pb-0">
              
              {/* Delivery Address Card */}
              <div className="px-4 md:px-0 py-4 bg-white lg:rounded-2xl lg:shadow-md border-b lg:border-2 lg:border-green-600/10 overflow-hidden">
                <div className="px-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Delivery Details</h3>
                    <button onClick={() => navigate("/checkout/address", { state: { editAddress: savedAddress } })} className="text-xs font-black text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase italic">Change</button>
                  </div>

                  {savedAddress ? (
                    <div className="space-y-4">
                      <div 
                        className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${selectedAddress?.id === savedAddress.id && !isMapSelected ? "border-green-600 bg-green-50" : "bg-neutral-50 border-neutral-100"}`}
                        onClick={() => {
                          setSelectedAddress(savedAddress);
                          setIsMapSelected(false);
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${selectedAddress?.id === savedAddress.id && !isMapSelected ? "bg-green-600 text-white" : "bg-neutral-200 text-neutral-500"}`}>
                            {selectedAddress?.id === savedAddress.id && !isMapSelected ? (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-black text-neutral-900">{savedAddress.name}</p>
                            <p className="text-[10px] font-bold text-neutral-500 italic">{savedAddress.phone}</p>
                          </div>
                        </div>
                        <p className="text-[11px] font-medium text-neutral-600 leading-relaxed pl-10">
                          {savedAddress.flat ? `${savedAddress.flat}, ` : ""}{savedAddress.street}
                          {savedAddress.landmark && <span className="block text-green-700 italic mt-1 underline decoration-green-200 font-bold">Near {savedAddress.landmark}</span>}
                          <span className="block mt-1 uppercase font-black text-neutral-400">{savedAddress.city} - {savedAddress.pincode}</span>
                        </p>
                      </div>
                      
                      <button onClick={() => { setMapLocation({ lat: userLocation?.latitude || selectedAddress?.latitude || 0, lng: userLocation?.longitude || selectedAddress?.longitude || 0 }); setShowMapPicker(true); }}
                        className={`w-full py-3 rounded-xl border-2 font-black text-[11px] uppercase tracking-widest transition-all italic flex items-center justify-center gap-2 ${isMapSelected ? "bg-green-600 border-green-600 text-white shadow-lg" : "bg-white border-neutral-100 text-neutral-400 shadow-sm hover:border-green-200"}`}>
                        {isMapSelected ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>}
                        {isMapSelected ? "Precise Map Location set" : "Pin precise location on map"}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => navigate("/checkout/address")} className="w-full py-6 bg-neutral-100 rounded-2xl border-2 border-dashed border-neutral-300 text-neutral-500 font-black italic uppercase tracking-widest">ADD ADDRESS TO CONTINUE</button>
                  )}
                </div>
              </div>

              {/* Coupons Secondary Entry */}
              {!selectedCoupon && (
                <div className="px-4 md:px-0">
                  <button onClick={() => setShowCouponSheet(true)} 
                    className="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-2xl shadow-lg shadow-teal-500/20 flex items-center justify-between px-6 transition-transform active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center italic font-black text-sm">%</div>
                      <div className="text-left leading-tight">
                        <p className="text-xs font-black uppercase tracking-wider">Apply Coupon</p>
                        <p className="text-[10px] text-teal-100 font-bold italic">Unlock mega savings!</p>
                      </div>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6" /></svg>
                  </button>
                </div>
              )}

              {/* Billing Summary */}
              <div className="px-4 md:px-0 py-6 bg-neutral-900 text-white lg:rounded-3xl lg:shadow-2xl border-b border-neutral-800 overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-green-500/20 transition-colors"></div>
                <div className="px-6 relative z-10">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500 mb-6 italic">Payment Summary</h3>
                  
                  {/* Delivery charge progress banner inside billing summary */}
                  {deliveryCharge > 0 && (
                    <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">FREE Delivery Goal</span>
                        <span className="text-[10px] font-black text-blue-200 italic">₹{amountNeededForFreeDelivery} more</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, ((199 - amountNeededForFreeDelivery) / 199) * 100)}%` }}
                          className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-neutral-400">Products Subtotal</span>
                      <span className="text-xs font-black italic">₹{discountedTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center text-teal-400">
                      <span className="text-xs font-bold">Shipping & Logistics</span>
                      <span className="text-xs font-black italic uppercase">{deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-neutral-400">Platform Handling</span>
                      <span className="text-xs font-black italic">₹{handlingCharge}</span>
                    </div>
                    {selectedCoupon && (
                      <div className="flex justify-between items-center p-2.5 bg-green-500/10 rounded-xl border border-green-500/20 shadow-inner">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black bg-green-500 text-black px-2 py-0.5 rounded italic">SAVED</span>
                          <span className="text-[10px] font-black text-green-400 uppercase">{selectedCoupon.code}</span>
                        </div>
                        <span className="text-xs font-black text-green-400 italic">-₹{currentCouponDiscount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {(finalTipAmount > 0 || giftPackaging) && (
                      <div className="pt-4 border-t border-neutral-800 space-y-3">
                        {finalTipAmount > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Gratitude Tip</span>
                            <span className="text-xs font-black italic text-yellow-400">₹{finalTipAmount}</span>
                          </div>
                        )}
                        {giftPackaging && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Premium Gift Wrap</span>
                            <span className="text-xs font-black italic">₹{giftPackagingFee}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="pt-6 border-t border-neutral-700 flex justify-between items-end">
                      <div>
                        <p className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-1">Grand Total</p>
                        <p className="text-3xl font-black italic tracking-tighter text-white">₹{Math.max(0, grandTotal).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-green-500 uppercase italic mb-1">Net Savings</p>
                        <p className="text-lg font-black text-green-400 italic tracking-tight">₹{((savedAmount || 0) + (currentCouponDiscount || 0)).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection - Integrated into sidebar */}
              <div className="px-4 md:px-0 py-6 bg-white lg:rounded-3xl lg:shadow-md lg:border border-neutral-100 overflow-hidden">
                <div className="px-6">
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 mb-4">Payment Method</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: "Online", label: "Online Pay", sub: "Fast & Secure", icon: "🌐" },
                      { id: "COD", label: "Cash on Delivery", sub: "Pay at door", icon: "🏠" }
                    ].map(method => (
                      <div key={method.id} onClick={() => setPaymentMethod(method.id as any)}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === method.id ? "border-green-600 bg-green-50 shadow-inner" : "border-neutral-50 bg-neutral-100/50 hover:bg-neutral-100"}`}>
                        <div className="text-xl flex-shrink-0">{method.icon}</div>
                        <div className="flex-1">
                          <p className={`text-xs font-black uppercase tracking-tight ${paymentMethod === method.id ? "text-green-700" : "text-neutral-900"}`}>{method.label}</p>
                          <p className="text-[9px] font-bold text-neutral-400 italic uppercase">{method.sub}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === method.id ? "bg-green-600 border-green-600" : "border-neutral-300"}`}>
                          {paymentMethod === method.id && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6L9 17l-5-5" /></svg>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop Place Order Button */}
                <div className="hidden lg:block px-6 mt-8">
                  <button
                    onClick={() => handlePlaceOrder()}
                    disabled={cart.items.length === 0 || !selectedAddress}
                    className="w-full py-5 bg-green-600 text-white font-black uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-green-600/30 hover:bg-green-700 hover:shadow-green-600/40 transition-all active:scale-[0.98] disabled:bg-neutral-200 disabled:shadow-none italic">
                    Place Final Order
                  </button>
                  <p className="mt-4 text-[9px] text-center text-neutral-400 font-bold uppercase tracking-widest">Secured by KlydoTrust</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* GSTIN Sheet Modal */}
      <Sheet open={showGstinSheet} onOpenChange={setShowGstinSheet}>
        <SheetContent side="bottom" className="max-h-[50vh]">
          <SheetHeader className="text-left">
            <div className="flex items-center justify-between mb-2">
              <SheetTitle className="text-base font-bold text-neutral-900">
                Add GSTIN
              </SheetTitle>
              <SheetClose onClick={() => setShowGstinSheet(false)}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </SheetClose>
            </div>
          </SheetHeader>

          <div className="px-4 pb-4 mt-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                GSTIN Number
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => {
                  const value = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "");
                  if (value.length <= 15) {
                    setGstin(value);
                  }
                }}
                placeholder="Enter 15-character GSTIN"
                className="w-full px-4 py-3 bg-white border-2 border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                maxLength={15}
              />
              <p className="text-xs text-neutral-500 mt-1">
                Format: 15 characters (e.g., 27AAAAA0000A1Z5)
              </p>
            </div>
            <button
              onClick={() => {
                if (gstin.length === 15) {
                  setShowGstinSheet(false);
                } else {
                  alert("Please enter a valid 15-character GSTIN");
                }
              }}
              className="w-full bg-green-600 text-white py-3 px-4 font-bold text-sm uppercase tracking-wide hover:bg-green-700 transition-colors rounded-lg">
              Save GSTIN
            </button>
            {gstin && (
              <button
                onClick={() => {
                  setGstin("");
                  setShowGstinSheet(false);
                }}
                className="w-full mt-2 bg-neutral-100 text-neutral-700 py-2 px-4 font-medium text-sm hover:bg-neutral-200 transition-colors rounded-lg">
                Remove GSTIN
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Cancellation Policy Sheet Modal */}
      <Sheet
        open={showCancellationPolicy}
        onOpenChange={setShowCancellationPolicy}>
        <SheetContent side="bottom" className="max-h-[85vh]">
          <SheetHeader className="text-left">
            <div className="flex items-center justify-between mb-2">
              <SheetTitle className="text-base font-bold text-neutral-900">
                Cancellation Policy
              </SheetTitle>
              <SheetClose onClick={() => setShowCancellationPolicy(false)}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </SheetClose>
            </div>
          </SheetHeader>

          <div className="px-4 pb-4 overflow-y-auto max-h-[calc(85vh-80px)]">
            <div className="space-y-4 mt-4 text-sm text-neutral-700">
              <div>
                <h3 className="font-bold text-neutral-900 mb-2">
                  Order Cancellation
                </h3>
                <p className="mb-2">
                  You can cancel your order before it is confirmed by the
                  seller. Once confirmed, cancellation may not be possible.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-neutral-900 mb-2">
                  Refund Policy
                </h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Refunds will be processed within 5-7 business days</li>
                  <li>
                    Refund amount will be credited to your original payment
                    method
                  </li>
                  <li>Delivery charges are non-refundable</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-neutral-900 mb-2">
                  Partial Cancellation
                </h3>
                <p>
                  Partial cancellation of items in an order is not allowed. You
                  can cancel the entire order or contact customer support for
                  assistance.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-neutral-900 mb-2">
                  Contact Support
                </h3>
                <p>
                  For any cancellation requests or queries, please contact our
                  customer support team at support@klydocart.com or call
                  +91-XXXXX-XXXXX
                </p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      {/* Coupon Sheet Modal */}
      <Sheet open={showCouponSheet} onOpenChange={setShowCouponSheet}>
        <SheetContent side="bottom" className="max-h-[85vh]">
          <SheetHeader className="text-left">
            <div className="flex items-center justify-between mb-2">
              <SheetTitle className="text-base font-bold text-neutral-900">
                Available Coupons
              </SheetTitle>
              <SheetClose onClick={() => setShowCouponSheet(false)}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </SheetClose>
            </div>
          </SheetHeader>

          <div className="px-4 pb-4 overflow-y-auto max-h-[calc(85vh-80px)]">
            <div className="space-y-2.5 mt-2">
              {availableCoupons.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <p>No coupons available at the moment.</p>
                </div>
              ) : (
                availableCoupons.map((coupon) => {
                  const subtotalBeforeCoupon =
                    discountedTotal + handlingCharge + deliveryCharge;
                  const meetsMinOrder =
                    !coupon.minOrderValue ||
                    subtotalBeforeCoupon >= coupon.minOrderValue;
                  const isSelected = selectedCoupon?._id === coupon._id;

                  return (
                    <div
                      key={coupon._id}
                      className={`border-2 rounded-lg p-2.5 transition-all ${isSelected
                        ? "border-green-600 bg-green-50"
                        : meetsMinOrder
                          ? "border-neutral-200 bg-white"
                          : "border-neutral-200 bg-neutral-50 opacity-60"
                        }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-green-600">
                              {coupon.code}
                            </span>
                            <span className="text-xs font-semibold text-neutral-900">
                              {coupon.title}
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-600 mb-1">
                            {coupon.description}
                          </p>
                          {coupon.minOrderValue && (
                            <p className="text-[10px] text-neutral-500">
                              Min. order: ₹{coupon.minOrderValue}
                            </p>
                          )}
                        </div>
                        {isSelected ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M20 6L9 17l-5-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <span className="text-xs font-medium">Applied</span>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              meetsMinOrder && handleApplyCoupon(coupon)
                            }
                            disabled={!meetsMinOrder || isValidatingCoupon}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${meetsMinOrder
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                              }`}>
                            {isValidatingCoupon ? "..." : "Apply"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bottom Sticky Button (Mobile Only) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-[60] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-safe lg:hidden">
        {selectedAddress ? (
          <div className="px-4 py-3">
            <button
              onClick={handlePlaceOrder}
              disabled={cart.items.length === 0}
              className={`w-full py-4 px-4 font-bold text-sm uppercase tracking-widest transition-all rounded-xl shadow-lg active:scale-[0.98] ${cart.items.length > 0
                ? "bg-green-600 text-white hover:bg-green-700 shadow-green-600/20"
                : "bg-neutral-300 text-neutral-500 cursor-not-allowed shadow-none"
                }`}>
              Place Order
            </button>
          </div>
        ) : (
          <div className="px-4 py-3">
            <button
              onClick={() =>
                navigate("/checkout/address", {
                  state: {
                    editAddress: savedAddress,
                  },
                })
              }
              className="w-full bg-green-600 text-white py-4 px-4 font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all active:scale-[0.98]">
              Choose address at next step
            </button>
          </div>
        )}
      </div>

      {/* Razorpay Checkout Modal */}
      {
        showRazorpayCheckout && pendingOrderId && user && (
          <RazorpayCheckout
            orderId={pendingOrderId}
            amount={grandTotal}
            customerDetails={{
              name: user.name || "Customer",
              email: user.email || "",
              phone: user.phone || "",
            }}
            onSuccess={(paymentId) => {
              setShowRazorpayCheckout(false);
              setPlacedOrderId(pendingOrderId);
              setPendingOrderId(null);
              clearCart();
              setShowOrderSuccess(true);
              showGlobalToast("Payment successful!", "success");
            }}
            onFailure={(error) => {
              setShowRazorpayCheckout(false);
              setPendingOrderId(null);
              showGlobalToast(error || "Payment failed. Please try again.", "error");
            }}
          />
        )
      }
      {/* Animation Styles */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes checkDraw {
          0% {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dasharray: 100;
            stroke-dashoffset: 0;
          }
        }

        @keyframes ringPulse {
          0% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.3);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }

        @keyframes sparkle {
          0% {
            transform: rotate(var(--rotation, 0deg)) translateY(0) scale(0);
            opacity: 1;
          }
          100% {
            transform: rotate(var(--rotation, 0deg)) translateY(-80px) scale(1);
            opacity: 0;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes confettiFall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }

        .check-path {
          stroke-dasharray: 100;
          stroke-dashoffset: 0;
        }
      `}</style>
    </div >
  );
}
