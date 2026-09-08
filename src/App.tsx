import ProfileCompletionGate from './components/ProfileCompletionGate';
import AddressGuard from './components/AddressGuard';
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
const CategoryDetail = lazy(() => import('./pages/CategoryDetail'));
const CategoryProducts = lazy(() => import('./pages/CategoryProducts'));
const SubcategoryDetail = lazy(() => import('./pages/SubcategoryDetail'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Search = lazy(() => import('./pages/Search'));
const Cart = lazy(() => import('./pages/Cart'));
const Payment = lazy(() => import('./pages/Payment'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const Account = lazy(() => import('./pages/Account'));
const EditAccount = lazy(() => import('./pages/EditAccount'));
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

function App() {
  return (
    <HelmetProvider>
      <UserProvider>
        <BranchProvider>
          <CartProvider>
            <BrowserRouter>
              <ProfileCompletionGate />
              <Suspense fallback={<RouteFallback />}>
                <AddressGuard>
                  <Routes>
                    <Route path="/phone-login" element={<PhoneLogin />} />
                    <Route path="/phone-verify" element={<PhoneVerify />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/update-password" element={<UpdatePassword />} />
                    <Route path="/change-phone" element={<ChangePhone />} />
                    <Route path="/address-registration" element={<AddressRegistration />} />
                    <Route path="/" element={<Index />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/category/:id" element={<CategoryDetail />} />
                    <Route path="/category/:id/products" element={<CategoryProducts />} />
                    <Route path="/category/:categoryId/subcategory/:subcategoryId" element={<SubcategoryDetail />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/payment" element={<Payment />} />
                    <Route path="/order-success" element={<OrderSuccess />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="/edit-account" element={<EditAccount />} />
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
                </AddressGuard>
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
