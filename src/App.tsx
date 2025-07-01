import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { UserProvider } from './contexts/UserContext';
import { CartProvider } from './contexts/CartContext';
import Index from './pages/Index';
import PhoneLogin from './pages/PhoneLogin';
import PhoneVerify from './pages/PhoneVerify';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Categories from './pages/Categories';
import CategoryDetail from './pages/CategoryDetail';
import ProductDetail from './pages/ProductDetail';
import Search from './pages/Search';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Payment from './pages/Payment';
import OrderSuccess from './pages/OrderSuccess';
import Account from './pages/Account';
import EditAccount from './pages/EditAccount';
import Orders from './pages/Orders';
import Favorites from './pages/Favorites';
import Address from './pages/Address';
import AddressManager from './pages/AddressManager';
import Map from './pages/Map';
import BarcodeScanner from './pages/BarcodeScanner';
import BulkProducts from './pages/BulkProducts';
import CompanyProducts from './pages/CompanyProducts';
import BannerProducts from './pages/BannerProducts';
import ReturnRequests from './pages/ReturnRequests';
import CreateReturnRequest from './pages/CreateReturnRequest';
import NotFound from './pages/NotFound';
import { Toaster } from '@/components/ui/toaster';

import AddressRegistration from "./pages/AddressRegistration";
import AddressGuard from "./components/AddressGuard";

function App() {
  return (
    <UserProvider>
      <CartProvider>
        <QueryClient>
          <BrowserRouter>
            <Routes>
              {/* Authentication routes - no address guard needed */}
              <Route path="/phone-login" element={<PhoneLogin />} />
              <Route path="/phone-verify" element={<PhoneVerify />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              {/* Address registration - no guard needed */}
              <Route path="/address-registration" element={<AddressRegistration />} />
              
              {/* All other routes require address registration */}
              <Route path="/" element={
                <AddressGuard>
                  <Index />
                </AddressGuard>
              } />
              <Route path="/categories" element={
                <AddressGuard>
                  <Categories />
                </AddressGuard>
              } />
              <Route path="/category/:id" element={
                <AddressGuard>
                  <CategoryDetail />
                </AddressGuard>
              } />
              <Route path="/product/:id" element={
                <AddressGuard>
                  <ProductDetail />
                </AddressGuard>
              } />
              <Route path="/search" element={
                <AddressGuard>
                  <Search />
                </AddressGuard>
              } />
              <Route path="/cart" element={
                <AddressGuard>
                  <Cart />
                </AddressGuard>
              } />
              <Route path="/checkout" element={
                <AddressGuard>
                  <Checkout />
                </AddressGuard>
              } />
              <Route path="/payment" element={
                <AddressGuard>
                  <Payment />
                </AddressGuard>
              } />
              <Route path="/order-success" element={
                <AddressGuard>
                  <OrderSuccess />
                </AddressGuard>
              } />
              <Route path="/account" element={
                <AddressGuard>
                  <Account />
                </AddressGuard>
              } />
              <Route path="/edit-account" element={
                <AddressGuard>
                  <EditAccount />
                </AddressGuard>
              } />
              <Route path="/orders" element={
                <AddressGuard>
                  <Orders />
                </AddressGuard>
              } />
              <Route path="/favorites" element={
                <AddressGuard>
                  <Favorites />
                </AddressGuard>
              } />
              <Route path="/address" element={
                <AddressGuard>
                  <Address />
                </AddressGuard>
              } />
              <Route path="/address/:id" element={
                <AddressGuard>
                  <Address />
                </AddressGuard>
              } />
              <Route path="/address-manager" element={
                <AddressGuard>
                  <AddressManager />
                </AddressGuard>
              } />
              <Route path="/map" element={
                <AddressGuard>
                  <Map />
                </AddressGuard>
              } />
              <Route path="/barcode-scanner" element={
                <AddressGuard>
                  <BarcodeScanner />
                </AddressGuard>
              } />
              <Route path="/bulk-products" element={
                <AddressGuard>
                  <BulkProducts />
                </AddressGuard>
              } />
              <Route path="/company/:id" element={
                <AddressGuard>
                  <CompanyProducts />
                </AddressGuard>
              } />
              <Route path="/banner/:id" element={
                <AddressGuard>
                  <BannerProducts />
                </AddressGuard>
              } />
              <Route path="/return-requests" element={
                <AddressGuard>
                  <ReturnRequests />
                </AddressGuard>
              } />
              <Route path="/create-return-request/:orderId" element={
                <AddressGuard>
                  <CreateReturnRequest />
                </AddressGuard>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </BrowserRouter>
        </QueryClient>
      </CartProvider>
    </UserProvider>
  );
}

export default App;
