
import React from "react";
import { Product } from "@/lib/supabase";
import FavoriteButton from "./FavoriteButton";
import { Link } from "react-router-dom";

interface FavouriteProductCardProps {
  product: Product;
}

const palette = {
  primary: "#9b87f5",
  secondary: "#7E69AB",
  magenta: "#D946EF",
  dark: "#1A1F2C",
  white: "#fff",
  gray: "#aaadb0"
};

const FavouriteProductCard: React.FC<FavouriteProductCardProps> = ({ product }) => {
  const imageUrl = product.image_urls?.[0] ?? "/placeholder.svg";

  return (
    <div
      className="rounded-xl shadow-lg relative overflow-hidden flex flex-col justify-between items-stretch"
      style={{
        background: `linear-gradient(120deg, ${palette.primary} 60%, ${palette.magenta} 100%)`,
        direction: 'rtl'
      }}
    >
      <div className="absolute top-3 left-3 z-10">
        <FavoriteButton productId={product.id} size={28} />
      </div>
      <Link 
        to={`/product/${product.id}`}
        className="flex flex-col items-center justify-center p-4"
      >
        <img
          src={imageUrl}
          alt={product.name}
          className="max-h-40 w-auto rounded-lg shadow bg-white/70 mb-2"
          style={{objectFit: "contain"}}
        />
        <h3 className="font-bold text-lg text-white mb-2 text-center">{product.name}</h3>
        <div className="flex items-center justify-center gap-2 mb-1">
          {product.offer_price ? (
            <>
              <span className="text-pink-200 text-lg font-bold">{product.offer_price} ر.س</span>
              <span className="line-through text-gray-200">{product.price} ر.س</span>
            </>
          ) : (
            <span className="text-white font-bold text-lg">{product.price} ر.س</span>
          )}
        </div>
      </Link>
    </div>
  );
};

export default FavouriteProductCard;
