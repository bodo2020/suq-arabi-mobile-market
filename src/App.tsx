
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Index from './pages/Index';
import Categories from './pages/Categories';
import CategoryDetail from './pages/CategoryDetail';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Payment from './pages/Payment';
import OrderSuccess from './pages/OrderSuccess';
import CompanyProducts from './pages/CompanyProducts';
import BannerProducts from './pages/BannerProducts';
import Account from './pages/Account';
import Register from './pages/Register';
import AddressManager from './pages/AddressManager';
import EditAccount from './pages/EditAccount';
import Address from './pages/Address';
import Orders from './pages/Orders';
import Search from './pages/Search';
import BulkProducts from './pages/BulkProducts';
import Favorites from './pages/Favorites';
import NotFound from './pages/NotFound';
import PhoneVerify from './pages/PhoneVerify';
import PhoneLogin from './pages/PhoneLogin';
import BarcodeScanner from './pages/BarcodeScanner';
import FullMapView from './pages/FullMapView';
import { Toaster } from "@/components/ui/toaster"
import { CartProvider } from '@/contexts/CartProvider';
import { UserProvider } from '@/contexts/UserContext';

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);
  
  return (
    <UserProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/category/:id" element={<CategoryDetail />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/company/:id" element={<CompanyProducts />} />
            <Route path="/banner/:id" element={<BannerProducts />} />
            <Route path="/account" element={<Account />} />
            <Route path="/register" element={<Register />} />
            <Route path="/phone-verify" element={<PhoneVerify />} />
            <Route path="/phone-login" element={<PhoneLogin />} />
            <Route path="/address-manager" element={<AddressManager />} />
            <Route path="/addresses" element={<Navigate to="/address-manager" replace />} />
            <Route path="/edit-account" element={<EditAccount />} />
            <Route path="/add-address" element={<Address />} />
            <Route path="/edit-address/:id" element={<Address />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/search" element={<Search />} />
            <Route path="/bulk-products" element={<BulkProducts />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/barcode-scan" element={<BarcodeScanner />} />
            <Route path="/scanner" element={<BarcodeScanner />} />
            <Route path="/map-view" element={<FullMapView />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </CartProvider>
    </UserProvider>
  );
}

export default App;
