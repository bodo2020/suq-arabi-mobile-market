
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { UserProvider } from './contexts/UserContext';
import { CartProvider } from './contexts/CartProvider';
import Index from './pages/Index';
import PhoneLogin from './pages/PhoneLogin';
import PhoneVerify from './pages/PhoneVerify';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Categories from './pages/Categories';
import CategoryDetail from './pages/CategoryDetail';
import CategoryProducts from './pages/CategoryProducts';
import SubcategoryDetail from './pages/SubcategoryDetail';
import ProductDetail from './pages/ProductDetail';
import Search from './pages/Search';
import Cart from './pages/Cart';

import Payment from './pages/Payment';
import OrderSuccess from './pages/OrderSuccess';
import Account from './pages/Account';
import EditAccount from './pages/EditAccount';
import Orders from './pages/Orders';
import Favorites from './pages/Favorites';
import Address from './pages/Address';
import AddressManager from './pages/AddressManager';

import BarcodeScanner from './pages/BarcodeScanner';
import BulkProducts from './pages/BulkProducts';
import CompanyProducts from './pages/CompanyProducts';
import BannerProducts from './pages/BannerProducts';
import ReturnRequests from './pages/ReturnRequests';
import CreateReturnRequest from './pages/CreateReturnRequest';
import NotFound from './pages/NotFound';
import { Toaster } from '@/components/ui/toaster';

import AddressRegistration from "./pages/AddressRegistration";

function App() {
  return (
    <HelmetProvider>
      <UserProvider>
        <CartProvider>
          <BrowserRouter>
          <Routes>
            {/* Authentication routes - no address guard needed */}
            <Route path="/phone-login" element={<PhoneLogin />} />
            <Route path="/phone-verify" element={<PhoneVerify />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Address registration - no guard needed */}
            <Route path="/address-registration" element={<AddressRegistration />} />
            
            {/* All other routes */}
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
          <Toaster />
          </BrowserRouter>
        </CartProvider>
      </UserProvider>
    </HelmetProvider>
  );
}

export default App;
