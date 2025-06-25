import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import SearchBar from '@/components/ui/SearchBar';
import { Product } from '@/lib/supabase';
import ProductCard from '@/components/ui/ProductCard';
import { getProducts } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import AddressDisplay from '@/components/ui/AddressDisplay';
import SimpleAddressDisplay from '@/components/ui/SimpleAddressDisplay';

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItemToCart } = useCart();
  const { toast } = useToast();
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const fetchedProducts = await getProducts();
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch products."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    addItemToCart(product);
    toast({
      title: "تمت الإضافة إلى السلة",
      description: `${product.name} added to cart.`,
    });
  };

  const handleEditAddress = () => {
    if (user) {
      navigate('/address-manager');
    } else {
      navigate('/map-view');
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white p-4 shadow-sm">
          <SearchBar />
          <SimpleAddressDisplay className="mt-2" />
        </div>

        <div className="container mx-auto py-6">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={() => handleAddToCart(product)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
