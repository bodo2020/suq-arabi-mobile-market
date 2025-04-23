import React, { useState } from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useCart } from '@/contexts/useCart';
import { useOffers } from '@/hooks/useOffers';
import { toast } from "sonner";

const Cart = () => {
  const { items, updateQuantity, removeFromCart, getTotalPrice } = useCart();
  const { offers } = useOffers();
  const [deliveryFee] = useState(10);
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState<any>(null);

  const handleIncreaseQuantity = (productId: string) => {
    const item = items.find(item => item.product.id === productId);
    if (item) {
      updateQuantity(productId, item.quantity + 1);
    }
  };

  const handleDecreaseQuantity = (productId: string) => {
    const item = items.find(item => item.product.id === productId);
    if (item && item.quantity > 1) {
      updateQuantity(productId, item.quantity - 1);
    } else {
      removeFromCart(productId);
    }
  };

  const handleRemoveItem = (productId: string) => {
    removeFromCart(productId);
  };

  const getProductImage = (item) => {
    return item.product.image_urls && item.product.image_urls.length > 0 
      ? item.product.image_urls[0] 
      : '/placeholder.svg';
  };

  const applyCoupon = () => {
    if (!coupon) return;
    const offer = offers.find(
      offer =>
        offer.code &&
        offer.code.toLowerCase() === coupon.trim().toLowerCase() &&
        offer.active);
    if (!offer) {
      toast.error('الكوبون غير صحيح أو منتهي');
      setCouponApplied(null);
      return;
    }
    setCouponApplied(offer);
    toast.success('تم تفعيل الكوبون!');
  };

  const subtotal = getTotalPrice();
  let discount = 0;
  if (couponApplied) {
    if (couponApplied.discount_type === "percent") {
      discount = Math.min(subtotal * (couponApplied.discount_value / 100), couponApplied.max_discount || subtotal);
    } else if (couponApplied.discount_type === "fixed") {
      discount = Math.min(couponApplied.discount_value, subtotal);
    }
  }
  const total = subtotal + deliveryFee - discount;

  return (
    <MainLayout>
      <div className="py-4">
        <h1 className="text-xl font-bold text-center mb-4">سلة التسوق</h1>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-4">
              <circle cx="8" cy="21" r="1"></circle>
              <circle cx="19" cy="21" r="1"></circle>
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
            </svg>
            <h3 className="text-lg font-medium text-gray-500 mb-1">السلة فارغة</h3>
            <p className="text-sm text-gray-400 mb-4">لم تقم بإضافة أي منتجات بعد</p>
            <Link to="/" className="bg-primary text-white px-4 py-2 rounded-md">
              تسوق الآن
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg mb-4">
              {items.map((item) => (
                <div 
                  key={item.product.id} 
                  className="flex items-center p-3 border-b last:border-b-0"
                >
                  <div className="flex-1 flex items-center">
                    <div className="ml-3 flex-1">
                      <Link to={`/product/${item.product.id}`} className="font-semibold text-sm line-clamp-1">
                        {item.product.name}
                      </Link>
                      <div className="flex items-center mt-1">
                        {item.product.offer_price ? (
                          <>
                            <span className="text-sm font-bold text-primary ml-2">
                              {item.product.offer_price} ر.س
                            </span>
                            <span className="text-xs line-through text-gray-500">
                              {item.product.price} ر.س
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-bold">
                            {item.product.price} ر.س
                          </span>
                        )}
                      </div>
                    </div>
                    <img 
                      src={getProductImage(item)} 
                      alt={item.product.name} 
                      className="h-16 w-16 object-contain"
                    />
                  </div>

                  <div className="flex flex-col items-center mr-3">
                    <div className="flex items-center justify-between bg-gray-100 rounded-lg mb-2">
                      <button 
                        onClick={() => handleDecreaseQuantity(item.product.id)}
                        className="p-1"
                        aria-label="تقليل الكمية"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="mx-2 font-medium">{item.quantity}</span>
                      <button 
                        onClick={() => handleIncreaseQuantity(item.product.id)}
                        className="p-1"
                        aria-label="زيادة الكمية"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button 
                      onClick={() => handleRemoveItem(item.product.id)}
                      className="text-red-500"
                      aria-label="حذف المنتج"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="text-lg font-bold mb-3">العروض المتاحة</h3>
              {offers &&
                offers.length > 0 ? (
                  <ul className="mb-2">
                    {offers.map(offer => (
                      <li key={offer.id} className="mb-2 text-sm">
                        <span className="font-medium text-primary">{offer.name}</span>
                        {offer.code && (
                          <span className="ml-2 bg-gray-100 px-1 rounded text-xs">كود: {offer.code}</span>
                        )}
                        {offer.discount_type === "percent"
                          ? ` - خصم ${offer.discount_value}%`
                          : offer.discount_type === "fixed"
                            ? ` - خصم ${offer.discount_value} ر.س`
                            : ""}
                        {offer.expiry_date && (
                          <span className="ml-2 text-gray-400">حتى {offer.expiry_date.split('T')[0]}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : <span className="text-gray-400 text-sm">لا توجد عروض</span>
              }
              <form
                className="flex gap-2 mt-2"
                onSubmit={e => {
                  e.preventDefault();
                  applyCoupon();
                }}
              >
                <input
                  type="text"
                  placeholder="كوبون الخصم"
                  className="border rounded px-2 flex-1"
                  value={coupon}
                  onChange={e => setCoupon(e.target.value)}
                  disabled={couponApplied}
                />
                <button
                  className="bg-primary text-white py-2 px-4 rounded"
                  type="submit"
                  disabled={couponApplied}
                >
                  {couponApplied ? "تم التفعيل" : "تطبيق"}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-lg p-4 mb-4">
              <div className="flex justify-between py-2 border-b">
                <span className="font-bold">{getTotalPrice().toFixed(2)} ر.س</span>
                <span>المجموع</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-bold">{deliveryFee.toFixed(2)} ر.س</span>
                <span>التوصيل</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-bold">{discount.toFixed(2)} ر.س</span>
                <span>الخصم</span>
              </div>
              <div className="flex justify-between py-2 mt-2">
                <span className="font-bold text-lg">{total.toFixed(2)} ر.س</span>
                <span className="font-bold">الإجمالي</span>
              </div>
            </div>

            <Link
              to={{
                pathname: "/checkout",
                search: couponApplied ? `?coupon=${couponApplied.code}` : ''
              }}
              className="bg-primary text-white py-3 rounded-lg flex items-center justify-center w-full"
            >
              متابعة الطلب
            </Link>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Cart;
