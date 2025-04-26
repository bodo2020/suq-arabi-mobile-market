
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Index from '@/pages/Index';
import Cart from '@/pages/Cart';
import Categories from '@/pages/Categories';
import CategoryDetail from '@/pages/CategoryDetail';
import ProductDetail from '@/pages/ProductDetail';
import Checkout from '@/pages/Checkout';
import OrderSuccess from '@/pages/OrderSuccess';
import Account from '@/pages/Account';
import AddressManager from '@/pages/AddressManager';
import Address from '@/pages/Address';
import Favorites from '@/pages/Favorites';
import EditAccount from '@/pages/EditAccount';
import Orders from '@/pages/Orders';
import Register from '@/pages/Register';
import Search from '@/pages/Search';
import BarcodeScanner from '@/pages/BarcodeScanner';
import BannerProducts from '@/pages/BannerProducts';
import CompanyProducts from '@/pages/CompanyProducts';
import NotFound from '@/pages/NotFound';
import { CartProvider } from '@/contexts/CartProvider';
import { UserContext, UserProvider } from '@/contexts/UserContext';
import { Toaster } from '@/components/ui/toaster';
import BulkProducts from '@/pages/BulkProducts';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CartProvider>
          <UserProvider>
            <Toaster />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/category/:id" element={<CategoryDetail />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-success" element={<OrderSuccess />} />
              <Route path="/account" element={<Account />} />
              <Route path="/addresses" element={<AddressManager />} />
              <Route path="/address/new" element={<Address />} />
              <Route path="/address/:id" element={<Address />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/edit-account" element={<EditAccount />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/register" element={<Register />} />
              <Route path="/search" element={<Search />} />
              <Route path="/scan" element={<BarcodeScanner />} />
              <Route path="/banner/:id" element={<BannerProducts />} />
              <Route path="/company/:id" element={<CompanyProducts />} />
              <Route path="/bulk-products" element={<BulkProducts />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </UserProvider>
        </CartProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
