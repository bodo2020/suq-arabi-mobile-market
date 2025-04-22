
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Plus, Minus, AlertTriangle, Bell } from 'lucide-react';
import { Product } from '@/lib/supabase';
import { useCart } from '@/contexts/useCart';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProductCardProps {
  product: Product;
  hideIfUnavailable?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, hideIfUnavailable = false }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const { items, addToCart, updateQuantity } = useCart();
  const { toast } = useToast();
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  
  const cartItem = items.find(item => item.product.id === product.id);
  const quantity = cartItem?.quantity || 0;
  const isOutOfStock = product.quantity <= 0;
  
  if (hideIfUnavailable && isOutOfStock) {
    return null;
  }
  
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        checkFavoriteStatus(session?.user || null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      checkFavoriteStatus(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkFavoriteStatus = async (currentUser: any = user) => {
    if (!currentUser) {
      try {
        const savedFavorites = localStorage.getItem('favorites');
        if (savedFavorites) {
          const favorites = JSON.parse(savedFavorites);
          setIsFavorite(favorites.includes(product.id));
        } else {
          setIsFavorite(false);
        }
      } catch (error) {
        console.error('Error parsing favorites from localStorage:', error);
        setIsFavorite(false);
      }
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('product_id', product.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking favorite status:', error);
        return;
      }
      
      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error in favorite check:', error);
    }
  };
  
  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setLoadingFavorite(true);
    
    try {
      if (user) {
        if (isFavorite) {
          const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('product_id', product.id);
            
          if (error) {
            throw error;
          }
          
          setIsFavorite(false);
          toast({
            title: "تمت إزالة المنتج من المفضلة",
            variant: "default",
          });
        } else {
          const { error } = await supabase
            .from('favorites')
            .insert({
              user_id: user.id,
              product_id: product.id
            });
            
          if (error) {
            throw error;
          }
          
          setIsFavorite(true);
          toast({
            title: "تمت إضافة المنتج إلى المفضلة",
            variant: "default",
          });
        }
      } else {
        let favorites = [];
        try {
          const savedFavorites = localStorage.getItem('favorites');
          if (savedFavorites) {
            favorites = JSON.parse(savedFavorites);
          }
        } catch (error) {
          console.error('Error parsing favorites from localStorage:', error);
        }
        
        if (isFavorite) {
          favorites = favorites.filter(id => id !== product.id);
          localStorage.setItem('favorites', JSON.stringify(favorites));
          setIsFavorite(false);
          toast({
            title: "تمت إزالة المنتج من المفضلة",
            variant: "default",
          });
        } else {
          favorites.push(product.id);
          localStorage.setItem('favorites', JSON.stringify(favorites));
          setIsFavorite(true);
          toast({
            title: "تمت إضافة المنتج إلى المفضلة",
            variant: "default",
          });
        }
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
      toast({
        title: "حدث خطأ",
        description: "لم نتمكن من تحديث المفضلة",
        variant: "destructive",
      });
    } finally {
      setLoadingFavorite(false);
    }
  };
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOutOfStock) {
      addToCart(product);
    }
  };
  
  const handleIncreaseQuantity = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(product.id, quantity + 1);
  };
  
  const handleDecreaseQuantity = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(product.id, quantity - 1);
  };
  
  const handleNotifyAvailability = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast({
      title: "سيتم إشعارك",
      description: "سنقوم بإشعارك عندما يصبح المنتج متوفراً",
      variant: "default",
    });
  };

  const productImage = product.image_urls && product.image_urls.length > 0 
    ? product.image_urls[0] 
    : '/placeholder.svg';

  return (
    <Link to={`/product/${product.id}`} className="product-card flex flex-col h-full">
      <button 
        className="favorite-btn z-20" 
        onClick={toggleFavorite}
        disabled={loadingFavorite}
        aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      >
        <Heart fill={isFavorite ? "red" : "none"} color={isFavorite ? "red" : "currentColor"} size={20} />
      </button>
      
      <div className="relative pt-[100%] mb-3">
        <img 
          src={productImage} 
          alt={product.name} 
          className="absolute top-0 right-0 w-full h-full object-contain"
        />
        {isOutOfStock && (
          <div className="absolute top-0 right-0 w-full h-full flex items-center justify-center bg-black/30 rounded">
            <div className="bg-white p-2 rounded text-red-500 text-sm font-semibold flex items-center">
              <AlertTriangle size={14} className="ml-1" />
              غير متوفر
            </div>
          </div>
        )}
      </div>
      
      <div className="text-right flex-grow flex flex-col justify-between">
        <h3 className="font-bold text-sm mb-2 line-clamp-2">{product.name}</h3>
        
        <div className="mt-auto">
          <div className="flex justify-between mb-2">
            {product.offer_price ? (
              <>
                <span className="text-xs line-through text-gray-500">{product.price} ج.م</span>
                <span className="font-bold text-primary">{product.offer_price} ج.م</span>
              </>
            ) : (
              <span className="font-bold text-left flex-grow-0">{product.price} ج.م</span>
            )}
          </div>
          
          {isOutOfStock ? (
            <button 
              onClick={handleNotifyAvailability}
              className="w-full py-2 px-3 bg-gray-200 rounded-lg text-gray-700 flex items-center justify-center text-sm"
              aria-label="أعلمني عندما يصبح متوفر"
            >
              <Bell size={16} className="ml-1" />
              إشعار عند التوفر
            </button>
          ) : quantity === 0 ? (
            <button 
              onClick={handleAddToCart}
              className="add-to-cart-btn empty w-full"
              aria-label="إضافة إلى السلة"
            >
              <Plus size={18} color="white" />
              إضافة للسلة
            </button>
          ) : (
            <div 
              className="add-to-cart-btn has-items"
              onClick={(e) => e.preventDefault()}
            >
              <div className="flex items-center justify-between w-full">
                <button 
                  onClick={handleDecreaseQuantity}
                  aria-label="تقليل الكمية"
                >
                  <Minus size={16} color="white" />
                </button>
                <span className="mx-2 text-white">{quantity}</span>
                <button 
                  onClick={handleIncreaseQuantity}
                  aria-label="زيادة الكمية"
                >
                  <Plus size={16} color="white" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
