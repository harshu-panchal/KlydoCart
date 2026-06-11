import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy, startTransition, useEffect } from "react";

// Wrapper for React.lazy to handle chunk loading errors (like when a new version is deployed)
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        // Assume that the error is due to an outdated chunk, force refresh
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        // Return a never-resolving promise to prevent React from rendering anything while reloading
        return new Promise(() => {});
      }
      // The page has already been reloaded, so the error must be something else
      throw error;
    }
  });
import { CartProvider } from "./context/CartContext";
import { OrdersProvider } from "./context/OrdersContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LocationProvider } from "./context/LocationContext";
import { ToastProvider } from "./context/ToastContext";

import { LoadingProvider } from "./context/LoadingContext";
import { WishlistProvider } from "./context/WishlistContext";
import { AxiosLoadingInterceptor } from "./context/AxiosLoadingInterceptor";
import IconLoader from "./components/loaders/IconLoader";
import RouteLoaderTrigger from "./components/loaders/RouteLoaderTrigger";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import LoadingSpinner from "./components/LoadingSpinner";
import ErrorBoundary from "./components/ErrorBoundary";
import RouteTransition from "./components/RouteTransition";

// Critical routes - load immediately (Home, Cart, Checkout)
import Home from "./modules/user/Home";
import Cart from "./modules/user/Cart";
import Checkout from "./modules/user/Checkout";
import CheckoutAddress from "./modules/user/CheckoutAddress";
import ProductDetail from "./modules/user/ProductDetail";

// Lazy load less critical routes for code splitting
const Search = lazyWithRetry(() => import("./modules/user/Search"));
const Orders = lazyWithRetry(() => import("./modules/user/Orders"));
const OrderDetail = lazyWithRetry(() => import("./modules/user/OrderDetail"));
const OrderAgain = lazyWithRetry(() => import("./modules/user/OrderAgain"));
const Account = lazyWithRetry(() => import("./modules/user/Account"));
const Wallet = lazyWithRetry(() => import("./modules/user/Wallet"));
const Categories = lazyWithRetry(() => import("./modules/user/Categories"));
const Category = lazyWithRetry(() => import("./modules/user/Category"));
const Invoice = lazyWithRetry(() => import("./modules/user/Invoice"));
const Login = lazyWithRetry(() => import("./modules/user/Login"));

const AboutUs = lazyWithRetry(() => import("./modules/user/AboutUs"));
const FAQ = lazyWithRetry(() => import("./modules/user/FAQ"));
const PrivacyPolicy = lazyWithRetry(() => import("./modules/user/PrivacyPolicy"));
const TermsOfUse = lazyWithRetry(() => import("./modules/user/TermsOfUse"));
const Wishlist = lazyWithRetry(() => import("./modules/user/Wishlist"));
const Addresses = lazyWithRetry(() => import("./modules/user/Addresses"));
const AddressBook = lazyWithRetry(() => import("./modules/user/AddressBook"));
const SpiritualStore = lazyWithRetry(() => import("./modules/user/SpiritualStore"));
const PharmaStore = lazyWithRetry(() => import("./modules/user/PharmaStore"));
const EGiftStore = lazyWithRetry(() => import("./modules/user/EGiftStore"));
const PetStore = lazyWithRetry(() => import("./modules/user/PetStore"));
const SportsStore = lazyWithRetry(() => import("./modules/user/SportsStore"));
const FashionStore = lazyWithRetry(() => import("./modules/user/FashionStore"));
const ToyStore = lazyWithRetry(() => import("./modules/user/ToyStore"));
const HobbyStore = lazyWithRetry(() => import("./modules/user/HobbyStore"));
const StorePage = lazyWithRetry(() => import("./modules/user/StorePage"));
// Lazy load delivery routes
const DeliveryLayout = lazyWithRetry(
  () => import("./modules/delivery/components/DeliveryLayout"),
);
const DeliveryDashboard = lazyWithRetry(
  () => import("./modules/delivery/pages/DeliveryDashboard"),
);
const DeliveryOrders = lazyWithRetry(
  () => import("./modules/delivery/pages/DeliveryOrders"),
);
const DeliveryWallet = lazyWithRetry(
  () => import("./modules/delivery/pages/DeliveryWallet"),
);
const DeliveryOrderDetail = lazyWithRetry(
  () => import("./modules/delivery/pages/DeliveryOrderDetail"),
);
const DeliveryNotifications = lazyWithRetry(
  () => import("./modules/delivery/pages/DeliveryNotifications"),
);
const DeliveryMenu = lazyWithRetry(
  () => import("./modules/delivery/pages/DeliveryMenu"),
);
const DeliveryPendingOrders = lazyWithRetry(
  () => import("./modules/delivery/pages/DeliveryPendingOrders"),
);
const DeliveryAllOrders = lazyWithRetry(
  () => import("./modules/delivery/pages/DeliveryAllOrders"),
);
const DeliveryReturnOrders = lazyWithRetry(
  () => import("./modules/delivery/pages/DeliveryReturnOrders"),
);
const DeliveryProfile = lazyWithRetry(
  () => import("./modules/delivery/pages/DeliveryProfile"),
);

const AdminWithdrawals = lazyWithRetry(
  () => import("./modules/admin/pages/AdminWithdrawals"),
);
const DeliverySettings = lazyWithRetry(
  () => import("./modules/delivery/pages/DeliverySettings"),
);
const DeliveryHelp = lazyWithRetry(
  () => import("./modules/delivery/pages/DeliveryHelp"),
);
const DeliveryAbout = lazyWithRetry(
  () => import("./modules/delivery/pages/DeliveryAbout"),
);
const DeliverySellersInRange = lazyWithRetry(
  () => import("./modules/delivery/pages/DeliverySellersInRange"),
);
const DeliveryLogin = lazyWithRetry(
  () => import("./modules/delivery/pages/DeliveryLogin"),
);
const DeliverySignUp = lazyWithRetry(
  () => import("./modules/delivery/pages/DeliverySignUp"),
);

// Lazy load seller routes
const SellerLayout = lazyWithRetry(
  () => import("./modules/seller/components/SellerLayout"),
);
const SellerDashboard = lazyWithRetry(
  () => import("./modules/seller/pages/SellerDashboard"),
);
const SellerOrders = lazyWithRetry(() => import("./modules/seller/pages/SellerOrders"));
const SellerOrderDetail = lazyWithRetry(
  () => import("./modules/seller/pages/SellerOrderDetail"),
);
const SellerCategory = lazyWithRetry(
  () => import("./modules/seller/pages/SellerCategory"),
);
const SellerSubCategory = lazyWithRetry(
  () => import("./modules/seller/pages/SellerSubCategory"),
);
const SellerAddProduct = lazyWithRetry(
  () => import("./modules/seller/pages/SellerAddProduct"),
);
const SellerTaxes = lazyWithRetry(() => import("./modules/seller/pages/SellerTaxes"));
const SellerProductList = lazyWithRetry(
  () => import("./modules/seller/pages/SellerProductList"),
);
const SellerStockManagement = lazyWithRetry(
  () => import("./modules/seller/pages/SellerStockManagement"),
);
const SellerWallet = lazyWithRetry(() => import("./modules/seller/pages/SellerWallet"));
const SellerSalesReport = lazyWithRetry(
  () => import("./modules/seller/pages/SellerSalesReport"),
);
const SellerReturnRequest = lazyWithRetry(
  () => import("./modules/seller/pages/SellerReturnRequest"),
);
const SellerAccountSettings = lazyWithRetry(
  () => import("./modules/seller/pages/SellerAccountSettings"),
);
const SellerLogin = lazyWithRetry(() => import("./modules/seller/pages/SellerLogin"));
const SellerSignUp = lazyWithRetry(() => import("./modules/seller/pages/SellerSignUp"));

// Lazy load admin routes
const AdminLayout = lazyWithRetry(
  () => import("./modules/admin/components/AdminLayout"),
);
const AdminDashboard = lazyWithRetry(
  () => import("./modules/admin/pages/AdminDashboard"),
);
const AdminLogin = lazyWithRetry(() => import("./modules/admin/pages/AdminLogin"));
const AdminCategory = lazyWithRetry(() => import("./modules/admin/pages/AdminCategory"));
const AdminHeaderCategory = lazyWithRetry(
  () => import("./modules/admin/pages/AdminHeaderCategory"),
);
const AdminHeaderProducts = lazyWithRetry(
  () => import("./modules/admin/pages/AdminHeaderProducts"),
);
const AdminSubCategory = lazyWithRetry(
  () => import("./modules/admin/pages/AdminSubCategory"),
);
const AdminBrand = lazyWithRetry(() => import("./modules/admin/pages/AdminBrand"));
const AdminTaxes = lazyWithRetry(() => import("./modules/admin/pages/AdminTaxes"));
const AdminSellerTransaction = lazyWithRetry(
  () => import("./modules/admin/pages/AdminSellerTransaction"),
);
const AdminStockManagement = lazyWithRetry(
  () => import("./modules/admin/pages/AdminStockManagement"),
);
const AdminSubcategoryOrder = lazyWithRetry(
  () => import("./modules/admin/pages/AdminSubcategoryOrder"),
);
const AdminManageSellerList = lazyWithRetry(
  () => import("./modules/admin/pages/AdminManageSellerList"),
);
const AdminCoupon = lazyWithRetry(() => import("./modules/admin/pages/AdminCoupon"));
const AdminNotification = lazyWithRetry(
  () => import("./modules/admin/pages/AdminNotification"),
);
const AdminSellerLocation = lazyWithRetry(
  () => import("./modules/admin/pages/AdminSellerLocation"),
);
const AdminWallet = lazyWithRetry(() => import("./modules/admin/pages/AdminWallet"));
const AdminManageDeliveryBoy = lazyWithRetry(
  () => import("./modules/admin/pages/AdminManageDeliveryBoy"),
);
const AdminFundTransfer = lazyWithRetry(
  () => import("./modules/admin/pages/AdminFundTransfer"),
);
const AdminCashCollection = lazyWithRetry(
  () => import("./modules/admin/pages/AdminCashCollection"),
);
const AdminReturnRequest = lazyWithRetry(
  () => import("./modules/admin/pages/AdminReturnRequest"),
);
const AdminPaymentList = lazyWithRetry(
  () => import("./modules/admin/pages/AdminPaymentList"),
);
const AdminSmsGateway = lazyWithRetry(
  () => import("./modules/admin/pages/AdminSmsGateway"),
);
const AdminSystemUser = lazyWithRetry(
  () => import("./modules/admin/pages/AdminSystemUser"),
);
const AdminUsers = lazyWithRetry(() => import("./modules/admin/pages/AdminUsers"));
const AdminFAQ = lazyWithRetry(() => import("./modules/admin/pages/AdminFAQ"));
const AdminHomeSection = lazyWithRetry(
  () => import("./modules/admin/pages/AdminHomeSection"),
);
const AdminBestsellerCards = lazyWithRetry(
  () => import("./modules/admin/pages/AdminBestsellerCards"),
);
const AdminPromoStrip = lazyWithRetry(
  () => import("./modules/admin/pages/AdminPromoStrip"),
);
const AdminLowestPrices = lazyWithRetry(
  () => import("./modules/admin/pages/AdminLowestPrices"),
);
const AdminShopByStore = lazyWithRetry(
  () => import("./modules/admin/pages/AdminShopByStore"),
);
const AdminBanners = lazyWithRetry(() => import("./modules/admin/pages/AdminBanners"));
const AdminAllOrders = lazyWithRetry(
  () => import("./modules/admin/pages/AdminAllOrders"),
);
const AdminPendingOrders = lazyWithRetry(
  () => import("./modules/admin/pages/AdminPendingOrders"),
);
const AdminReceivedOrders = lazyWithRetry(
  () => import("./modules/admin/pages/AdminReceivedOrders"),
);
const AdminProcessedOrders = lazyWithRetry(
  () => import("./modules/admin/pages/AdminProcessedOrders"),
);
const AdminShippedOrders = lazyWithRetry(
  () => import("./modules/admin/pages/AdminShippedOrders"),
);
const AdminOutForDeliveryOrders = lazyWithRetry(
  () => import("./modules/admin/pages/AdminOutForDeliveryOrders"),
);
const AdminDeliveredOrders = lazyWithRetry(
  () => import("./modules/admin/pages/AdminDeliveredOrders"),
);
const AdminCancelledOrders = lazyWithRetry(
  () => import("./modules/admin/pages/AdminCancelledOrders"),
);
const AdminCustomerAppPolicy = lazyWithRetry(
  () => import("./modules/admin/pages/AdminCustomerAppPolicy"),
);
const AdminDeliveryAppPolicy = lazyWithRetry(
  () => import("./modules/admin/pages/AdminDeliveryAppPolicy"),
);
const AdminOrders = lazyWithRetry(() => import("./modules/admin/pages/AdminOrders"));
const AdminOrderDetail = lazyWithRetry(
  () => import("./modules/admin/pages/AdminOrderDetail"),
);
const AdminManageCustomer = lazyWithRetry(
  () => import("./modules/admin/pages/AdminManageCustomer"),
);
const AdminProfile = lazyWithRetry(() => import("./modules/admin/pages/AdminProfile"));
const AdminBillingSettings = lazyWithRetry(
  () => import("./modules/admin/pages/AdminBillingSettings"),
);
const SellerList = lazyWithRetry(
  () => import("./modules/admin/pages/sellers/SellerList"),
);
const SellerDetails = lazyWithRetry(
  () => import("./modules/admin/pages/sellers/SellerDetails"),
);

import { initializePushNotifications, setupForegroundNotificationHandler, registerFCMToken } from "./services/pushNotificationService";

function AppContent() {
  const { isAuthenticated } = useAuth();

  // Initialize push notifications (service worker registration only)
  useEffect(() => {
    initializePushNotifications();
    setupForegroundNotificationHandler();
  }, []);

  // Register FCM Token with backend if user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      registerFCMToken();
    }
  }, [isAuthenticated]);

  return (
    <ErrorBoundary>
      <LoadingProvider>
        <AxiosLoadingInterceptor>
          <IconLoader />
          <ThemeProvider>
            <LocationProvider>
              <ToastProvider>
                <CartProvider>
                  <OrdersProvider>
                    <WishlistProvider>
                      <BrowserRouter
                      future={{
                        v7_startTransition: true,
                        v7_relativeSplatPath: true,
                      }}>
                      <RouteLoaderTrigger />
                      <Routes>
                        {/* ... (rest of the routes) */}
                        {/* Public Routes */}
                        <Route
                          path="/login"
                          element={
                            <PublicRoute>
                              <Suspense fallback={<IconLoader forceShow />}>
                                <Login />
                              </Suspense>
                            </PublicRoute>
                          }
                        />

                        <Route
                          path="/seller/login"
                          element={
                            <PublicRoute>
                              <Suspense fallback={<IconLoader forceShow />}>
                                <SellerLogin />
                              </Suspense>
                            </PublicRoute>
                          }
                        />
                        <Route
                          path="/seller/signup"
                          element={
                            <PublicRoute>
                              <Suspense fallback={<IconLoader forceShow />}>
                                <SellerSignUp />
                              </Suspense>
                            </PublicRoute>
                          }
                        />
                        <Route
                          path="/delivery/login"
                          element={
                            <PublicRoute>
                              <Suspense fallback={<IconLoader forceShow />}>
                                <DeliveryLogin />
                              </Suspense>
                            </PublicRoute>
                          }
                        />
                        <Route
                          path="/delivery/signup"
                          element={
                            <PublicRoute>
                              <Suspense fallback={<IconLoader forceShow />}>
                                <DeliverySignUp />
                              </Suspense>
                            </PublicRoute>
                          }
                        />
                        <Route
                          path="/admin/login"
                          element={
                            <PublicRoute>
                              <Suspense fallback={<IconLoader forceShow />}>
                                <AdminLogin />
                              </Suspense>
                            </PublicRoute>
                          }
                        />

                        {/* Delivery App Routes */}
                        <Route
                          path="/delivery/*"
                          element={
                            <ProtectedRoute
                              requiredUserType="Delivery"
                              redirectTo="/delivery/login">
                              <Suspense fallback={<IconLoader forceShow />}>
                                <DeliveryLayout>
                                  <Routes>
                                    <Route
                                      path=""
                                      element={<DeliveryDashboard />}
                                    />
                                    <Route
                                      path="orders"
                                      element={<DeliveryOrders />}
                                    />
                                    <Route
                                      path="orders/:id"
                                      element={<DeliveryOrderDetail />}
                                    />
                                    <Route
                                      path="orders/pending"
                                      element={<DeliveryPendingOrders />}
                                    />
                                    <Route
                                      path="orders/all"
                                      element={<DeliveryAllOrders />}
                                    />
                                    <Route
                                      path="orders/return"
                                      element={<DeliveryReturnOrders />}
                                    />
                                    <Route
                                      path="notifications"
                                      element={<DeliveryNotifications />}
                                    />
                                    <Route
                                      path="menu"
                                      element={<DeliveryMenu />}
                                    />
                                    <Route
                                      path="profile"
                                      element={<DeliveryProfile />}
                                    />

                                    <Route
                                      path="wallet"
                                      element={<DeliveryWallet />}
                                    />
                                    <Route
                                      path="settings"
                                      element={<DeliverySettings />}
                                    />
                                    <Route
                                      path="help"
                                      element={<DeliveryHelp />}
                                    />
                                    <Route
                                      path="about"
                                      element={<DeliveryAbout />}
                                    />
                                    <Route
                                      path="sellers-in-range"
                                      element={<DeliverySellersInRange />}
                                    />
                                  </Routes>
                                </DeliveryLayout>
                              </Suspense>
                            </ProtectedRoute>
                          }
                        />

                        {/* Seller App Routes */}
                        <Route
                          path="/seller/*"
                          element={
                            <ProtectedRoute
                              requiredUserType="Seller"
                              redirectTo="/seller/login">
                              <Suspense fallback={<IconLoader forceShow />}>
                                <SellerLayout>
                                  <Routes>
                                    <Route
                                      path=""
                                      element={<SellerDashboard />}
                                    />
                                    <Route path="orders" element={<SellerOrders />} />
                                    <Route path="orders/:id" element={<SellerOrderDetail />} />
                                    <Route
                                      path="category"
                                      element={<SellerCategory />}
                                    />
                                    <Route
                                      path="subcategory"
                                      element={<SellerSubCategory />}
                                    />
                                    <Route
                                      path="product/add"
                                      element={<SellerAddProduct />}
                                    />
                                    <Route
                                      path="product/edit/:id"
                                      element={<SellerAddProduct />}
                                    />
                                    <Route
                                      path="product/taxes"
                                      element={<SellerTaxes />}
                                    />
                                    <Route
                                      path="product/list"
                                      element={<SellerProductList />}
                                    />
                                    <Route
                                      path="product/stock"
                                      element={<SellerStockManagement />}
                                    />
                                    <Route
                                      path="return"
                                      element={<SellerReturnRequest />}
                                    />
                                    <Route
                                      path="return-order"
                                      element={<SellerReturnRequest />}
                                    />
                                    <Route
                                      path="wallet"
                                      element={<SellerWallet />}
                                    />
                                    <Route
                                      path="reports/sales"
                                      element={<SellerSalesReport />}
                                    />
                                    <Route
                                      path="account-settings"
                                      element={<SellerAccountSettings />}
                                    />
                                  </Routes>
                                </SellerLayout>
                              </Suspense>
                            </ProtectedRoute>
                          }
                        />

                        {/* Admin App Routes */}
                        <Route
                          path="/admin/*"
                          element={
                            <ProtectedRoute
                              requiredUserType="Admin"
                              redirectTo="/admin/login">
                              <Suspense fallback={<IconLoader forceShow />}>
                                <AdminLayout>
                                  <Routes>
                                    <Route
                                      path=""
                                      element={<AdminDashboard />}
                                    />
                                    <Route
                                      path="profile"
                                      element={<AdminProfile />}
                                    />
                                    <Route
                                      path="category"
                                      element={<AdminCategory />}
                                    />
                                    <Route
                                      path="category/header"
                                      element={<AdminHeaderCategory />}
                                    />
                                    <Route
                                      path="category/products"
                                      element={<AdminHeaderProducts />}
                                    />
                                    <Route
                                      path="subcategory"
                                      element={<AdminSubCategory />}
                                    />
                                    <Route
                                      path="subcategory-order"
                                      element={<AdminSubcategoryOrder />}
                                    />
                                    <Route
                                      path="brand"
                                      element={<AdminBrand />}
                                    />
                                    <Route
                                      path="product/taxes"
                                      element={<AdminTaxes />}
                                    />
                                    <Route
                                      path="product/list"
                                      element={<AdminStockManagement />}
                                    />
                                    <Route
                                      path="product/edit/:id"
                                      element={<SellerAddProduct />}
                                    />
                                    <Route
                                      path="manage-seller/list"
                                      element={<AdminManageSellerList />}
                                    />
                                    <Route
                                      path="sellers"
                                      element={<SellerList />}
                                    />
                                    <Route
                                      path="sellers/:sellerId"
                                      element={<SellerDetails />}
                                    />
                                    <Route
                                      path="manage-seller/transaction"
                                      element={<AdminSellerTransaction />}
                                    />
                                    <Route
                                      path="delivery-boy/manage"
                                      element={<AdminManageDeliveryBoy />}
                                    />
                                    <Route
                                      path="delivery-boy/fund-transfer"
                                      element={<AdminFundTransfer />}
                                    />
                                    <Route
                                      path="delivery-boy/cash-collection"
                                      element={<AdminCashCollection />}
                                    />
                                    <Route
                                      path="manage-location/seller-location"
                                      element={<AdminSellerLocation />}
                                    />
                                    <Route
                                      path="wallet"
                                      element={<AdminWallet />}
                                    />
                                    <Route
                                      path="coupon"
                                      element={<AdminCoupon />}
                                    />
                                    <Route
                                      path="return"
                                      element={<AdminReturnRequest />}
                                    />
                                    <Route
                                      path="withdrawals"
                                      element={<AdminWithdrawals />}
                                    />
                                    <Route
                                      path="notification"
                                      element={<AdminNotification />}
                                    />
                                    <Route
                                      path="orders"
                                      element={<AdminOrders />}
                                    />
                                    <Route
                                      path="customers"
                                      element={<AdminManageCustomer />}
                                    />
                                    <Route
                                      path="collect-cash"
                                      element={<AdminCashCollection />}
                                    />
                                    <Route
                                      path="payment-list"
                                      element={<AdminPaymentList />}
                                    />
                                    <Route
                                      path="sms-gateway"
                                      element={<AdminSmsGateway />}
                                    />
                                    <Route
                                      path="system-user"
                                      element={<AdminSystemUser />}
                                    />
                                    <Route
                                      path="customer-app-policy"
                                      element={<AdminCustomerAppPolicy />}
                                    />
                                    <Route
                                      path="delivery-app-policy"
                                      element={<AdminDeliveryAppPolicy />}
                                    />
                                    <Route
                                      path="billing-settings"
                                      element={<AdminBillingSettings />}
                                    />
                                    <Route
                                      path="users"
                                      element={<AdminUsers />}
                                    />
                                    <Route
                                      path="faq"
                                      element={<AdminFAQ />}
                                    />
                                    <Route
                                      path="home-section"
                                      element={<AdminHomeSection />}
                                    />
                                    <Route
                                      path="bestseller-cards"
                                      element={<AdminBestsellerCards />}
                                    />
                                    <Route
                                      path="promo-strip"
                                      element={<AdminPromoStrip />}
                                    />
                                    <Route
                                      path="lowest-prices"
                                      element={<AdminLowestPrices />}
                                    />
                                    <Route
                                      path="shop-by-store"
                                      element={<AdminShopByStore />}
                                    />
                                    <Route
                                      path="banners"
                                      element={<AdminBanners />}
                                    />
                                    <Route
                                      path="orders/all"
                                      element={<AdminAllOrders />}
                                    />
                                    <Route
                                      path="orders/pending"
                                      element={<AdminPendingOrders />}
                                    />
                                    <Route
                                      path="orders/received"
                                      element={<AdminReceivedOrders />}
                                    />
                                    <Route
                                      path="orders/processed"
                                      element={<AdminProcessedOrders />}
                                    />
                                    <Route
                                      path="orders/shipped"
                                      element={<AdminShippedOrders />}
                                    />
                                    <Route
                                      path="orders/out-for-delivery"
                                      element={<AdminOutForDeliveryOrders />}
                                    />
                                    <Route
                                      path="orders/delivered"
                                      element={<AdminDeliveredOrders />}
                                    />
                                    <Route
                                      path="orders/cancelled"
                                      element={<AdminCancelledOrders />}
                                    />
                                    <Route
                                      path="orders/:id"
                                      element={<AdminOrderDetail />}
                                    />
                                  </Routes>
                                </AdminLayout>
                              </Suspense>
                            </ProtectedRoute>
                          }
                        />

                        {/* Main App Routes */}
                        <Route
                          path="/*"
                          element={
                            <AppLayout>
                              <Suspense fallback={<IconLoader forceShow />}>
                                <Routes>
                                  <Route path="/" element={<Home />} />
                                  <Route
                                    path="/user/home"
                                    element={<Home />}
                                  />
                                  <Route
                                    path="/search"
                                    element={<Search />}
                                  />
                                  <Route
                                    path="/orders"
                                    element={<Orders />}
                                  />
                                  <Route
                                    path="/orders/:id"
                                    element={<OrderDetail />}
                                  />
                                  <Route
                                    path="/order-again"
                                    element={<OrderAgain />}
                                  />
                                  <Route
                                    path="/account"
                                    element={<Account />}
                                  />
                                  <Route
                                    path="/wallet"
                                    element={<Wallet />}
                                  />
                                  <Route
                                    path="/about-us"
                                    element={<AboutUs />}
                                  />
                                  <Route path="/faq" element={<FAQ />} />
                                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                                  <Route path="/terms-of-use" element={<TermsOfUse />} />
                                  <Route
                                    path="/wishlist"
                                    element={<Wishlist />}
                                  />
                                  <Route
                                    path="/categories"
                                    element={<Categories />}
                                  />
                                  <Route
                                    path="/category/:id"
                                    element={<Category />}
                                  />
                                  <Route
                                    path="/address-book"
                                    element={<AddressBook />}
                                  />
                                  <Route
                                    path="/checkout"
                                    element={<Checkout />}
                                  />
                                  <Route
                                    path="/checkout/address"
                                    element={<CheckoutAddress />}
                                  />
                                  <Route
                                    path="/product/:id"
                                    element={<ProductDetail />}
                                  />
                                  <Route
                                    path="/invoice/:id"
                                    element={<Invoice />}
                                  />
                                  <Route path="/cart" element={<Cart />} />
                                  <Route
                                    path="/addresses"
                                    element={<Addresses />}
                                  />
                                  <Route
                                    path="/store/:slug"
                                    element={<StorePage />}
                                  />
                                  <Route
                                    path="/store/spiritual"
                                    element={<SpiritualStore />}
                                  />
                                  <Route
                                    path="/store/pharma"
                                    element={<PharmaStore />}
                                  />
                                  <Route
                                    path="/store/e-gifts"
                                    element={<EGiftStore />}
                                  />
                                  <Route
                                    path="/store/pet"
                                    element={<PetStore />}
                                  />
                                  <Route
                                    path="/store/sports"
                                    element={<SportsStore />}
                                  />
                                  <Route
                                    path="/store/fashion-basics"
                                    element={<FashionStore />}
                                  />
                                  <Route
                                    path="/store/toy"
                                    element={<ToyStore />}
                                  />
                                  <Route
                                    path="/store/hobby"
                                    element={<HobbyStore />}
                                  />
                                </Routes>
                              </Suspense>
                            </AppLayout>
                          }
                        />
                      </Routes>
                    </BrowserRouter>
                  </WishlistProvider>
                </OrdersProvider>
                </CartProvider>
              </ToastProvider>
            </LocationProvider>
          </ThemeProvider>
        </AxiosLoadingInterceptor>
      </LoadingProvider>
    </ErrorBoundary >
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
