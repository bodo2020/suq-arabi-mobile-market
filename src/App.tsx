import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import Index from '@/pages/Index';
import Categories from '@/pages/Categories';
import CategoryDetail from '@/pages/CategoryDetail';
import ProductDetail from '@/pages/ProductDetail';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import Payment from '@/pages/Payment';
import OrderSuccess from '@/pages/OrderSuccess';
import Search from '@/pages/Search';
import Favorites from '@/pages/Favorites';
import Account from '@/pages/Account';
import EditAccount from '@/pages/EditAccount';
import Orders from '@/pages/Orders';
import AddressManager from '@/pages/AddressManager';
import Address from '@/pages/Address';
import Register from '@/pages/Register';
import PhoneLogin from '@/pages/PhoneLogin';
import PhoneVerify from '@/pages/PhoneVerify';
import ForgotPassword from '@/pages/ForgotPassword';
import ReturnRequests from '@/pages/ReturnRequests';
import CreateReturnRequest from '@/pages/CreateReturnRequest';
import BarcodeScanner from '@/pages/BarcodeScanner';
import CompanyProducts from '@/pages/CompanyProducts';
import BannerProducts from '@/pages/BannerProducts';
import BulkProducts from '@/pages/BulkProducts';
import MapView from '@/pages/MapView';
import FullMapView from '@/pages/FullMapView';
import NotFound from '@/pages/NotFound';
import { UserProvider } from '@/contexts/UserContext';
import { CartProvider } from '@/contexts/CartContext';
import SimpleMap from '@/pages/SimpleMap';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <CartProvider>
          <BrowserRouter>
            <div className="App" dir="rtl">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/category/:id" element={<CategoryDetail />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/payment" element={<Payment />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/search" element={<Search />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/account" element={<Account />} />
                <Route path="/edit-account" element={<EditAccount />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/address-manager" element={<AddressManager />} />
                <Route path="/address" element={<Address />} />
                <Route path="/edit-address/:id" element={<Address />} />
                <Route path="/simple-map" element={<SimpleMap />} />
                <Route path="/register" element={<Register />} />
                <Route path="/phone-login" element={<PhoneLogin />} />
                <Route path="/phone-verify" element={<PhoneVerify />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/return-requests" element={<ReturnRequests />} />
                <Route path="/create-return-request/:orderId" element={<CreateReturnRequest />} />
                <Route path="/barcode-scanner" element={<BarcodeScanner />} />
                <Route path="/company/:id" element={<CompanyProducts />} />
                <Route path="/banner/:id" element={<BannerProducts />} />
                <Route path="/bulk-products" element={<BulkProducts />} />
                <Route path="/map-view" element={<MapView />} />
                <Route path="/full-map-view" element={<FullMapView />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
            </div>
          </BrowserRouter>
        </CartProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
