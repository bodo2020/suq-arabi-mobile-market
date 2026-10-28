import ProfileCompletionGate from './components/ProfileCompletionGate';
import AuthGate from './components/AuthGate';
import AddressGuard from './components/AddressGuard';
import CheckoutAttemptRecovery from './components/CheckoutAttemptRecovery';
import PushNotificationsBootstrap from './components/PushNotificationsBootstrap';
import CustomerNotificationRealtimeBridge from './components/CustomerNotificationRealtimeBridge';
import NetworkStatus from './components/NetworkStatus';
import CartSourceConflictNotifier from './components/CartSourceConflictNotifier';
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { UserProvider } from './contexts/UserContext';
import { BranchProvider } from './contexts/BranchContext';
import { CartProvider } from './contexts/CartProvider';
import Index from './pages/Index';
import { Toaster } from '@/components/ui/toaster';
import BrandLoader from '@/components/ui/BrandLoader';

const PhoneLogin = lazy(() => import('./pages/PhoneLogin'));
const PhoneVerify = lazy(() => import('./pages/PhoneVerify'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const UpdatePassword = lazy(() => import('./pages/UpdatePassword'));
const ChangePhone = lazy(() => import('./pages/ChangePhone'));
const Categories = lazy(() => import('./pages/Categories'));
const CategoryDetail = lazy(() => import('./pages/CategoryJourney'));
const CategoryProducts = lazy(() => import('./pages/CategoryProducts'));
const SubcategoryDetail = lazy(() => import('./pages/SubcategoryDetail'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Search = lazy(() => import('./pages/Search'));
const Offers = lazy(() => import('./pages/Offers'));
const Cart = lazy(() => import('./pages/Cart'));
const Payment = lazy(() => import('./pages/Payment'));
const MarketplacePayment = lazy(() => import('./pages/MarketplacePayment'));
const CombinedPayment = lazy(() => import('./pages/CombinedPayment'));
const MarketplaceStores = lazy(() => import('./pages/MarketplaceStores'));
const MarketplaceStore = lazy(() => import('./pages/MarketplaceStore'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const Account = lazy(() => import('./pages/Account'));
const EditAccount = lazy(() => import('./pages/EditAccount'));
const Vouchers = lazy(() => import('./pages/Vouchers'));
const Orders = lazy(() => import('./pages/PurchaseHistory'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Address = lazy(() => import('./pages/Address'));
const AddressManager = lazy(() => import('./pages/AddressManager'));
const AddressRegistration = lazy(() => import('./pages/AddressRegistration'));
const BarcodeScanner = lazy(() => import('./pages/BarcodeScanner'));
const BulkProducts = lazy(() => import('./pages/BulkProducts'));
const CompanyProducts = lazy(() => import('./pages/CompanyProducts'));
const BannerProducts = lazy(() => import('./pages/BannerProducts'));
const ReturnRequests = lazy(() => import('./pages/ReturnRequests'));
const CreateReturnRequest = lazy(() => import('./pages/CreateReturnRequest'));
const NotFound = lazy(() => import('./pages/NotFound'));

const RouteFallback = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-5" dir="rtl">
    <BrandLoader size="lg" label="جاري تحميل الصفحة" />
    <p className="text-primary text-base">جاري التحميل...</p>
  </div>
);

function CustomerRoutes() {
  const location = useLocation();
  // Preserve the catalog underneath a mobile product sheet; deep links render
  // the normal standalone product route and desktop navigation stays unchanged.
  const backgroundLocation = (location.state as { backgroundLocation?: typeof location } | null)?.backgroundLocation;
  return (
    <>
      <Routes location={backgroundLocation || location}>
                      <Route path="/phone-login" element={<PhoneLogin />} />
                      <Route path="/phone-verify" element={<PhoneVerify />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/update-password" element={<UpdatePassword />} />
                      <Route path="/change-phone" element={<ChangePhone />} />
                      <Route path="/address-registration" element={<AddressRegistration />} />
                      <Route path="/" element={<Index />} />
                      <Route path="/stores" element={<MarketplaceStores />} />
                      <Route path="/stores/:branchId" element={<MarketplaceStore />} />
                      <Route path="/offers" element={<Offers />} />
                      <Route path="/flash-sale" element={<Offers />} />
                      <Route path="/categories" element={<Categories />} />
                      <Route path="/category/:id" element={<CategoryDetail />} />
                      <Route path="/category/:id/products" element={<CategoryProducts />} />
                      <Route path="/category/:categoryId/subcategory/:subcategoryId" element={<SubcategoryDetail />} />
                      <Route path="/product/:id" element={<ProductDetail />} />
                      <Route path="/search" element={<Search />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/payment" element={<Payment />} />
                      <Route path="/marketplace-payment" element={<MarketplacePayment />} />
                      <Route path="/combined-payment" element={<CombinedPayment />} />
                      <Route path="/order-success" element={<OrderSuccess />} />
                      <Route path="/account" element={<Account />} />
                      <Route path="/edit-account" element={<EditAccount />} />
                      <Route path="/vouchers" element={<Vouchers />} />
                      <Route path="/orders" element={<Orders />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/favorites" element={<Favorites />} />
                      <Route path="/address" element={<Address />} />
                      <Route path="/add-address" element={<Address />} />
                      <Route path="/edit-address/:id" element={<Address />} />
                      <Route path="/address-manager" element={<AddressManager />} />
                      <Route path="/barcode-scanner" element={<BarcodeScanner />} />
                      <Route path="/barcode-scan" element={<BarcodeScanner />} />
                      <Route path="/bulk-products" element={<BulkProducts />} />
                      <Route path="/company/:id" element={<CompanyProducts />} />
                      <Route path="/banner/:id" element={<BannerProducts />} />
                      <Route path="/banner-products/:id" element={<BannerProducts />} />
                      <Route path="/addresses" element={<AddressManager />} />
                      <Route path="/create-return" element={<Orders />} />
                      <Route path="/create-return/:orderId" element={<CreateReturnRequest />} />
                      <Route path="/return-requests" element={<ReturnRequests />} />
                      <Route path="/create-return-request/:orderId" element={<CreateReturnRequest />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
      {backgroundLocation && (
        <Routes>
          <Route path="/product/:id" element={<ProductDetail />} />
        </Routes>
      )}
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <UserProvider>
        <BranchProvider>
          <CartProvider>
            <BrowserRouter>
              <NetworkStatus />
              <PushNotificationsBootstrap />
              <CustomerNotificationRealtimeBridge />
              <ProfileCompletionGate />
              <CheckoutAttemptRecovery />
              <CartSourceConflictNotifier />
              <Suspense fallback={<RouteFallback />}>
                <AuthGate>
                  <AddressGuard>
                    <CustomerRoutes />
                  </AddressGuard>
                </AuthGate>
              </Suspense>
              <Toaster />
            </BrowserRouter>
          </CartProvider>
        </BranchProvider>
      </UserProvider>
    </HelmetProvider>
  );
}

export default App;
