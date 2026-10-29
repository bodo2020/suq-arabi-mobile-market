import { Link } from 'react-router-dom';
import { ShoppingCart, User } from 'lucide-react';

type HeaderActionsProps = {
  cartCount: number;
  signedIn: boolean;
  showCart: boolean;
};

export default function HeaderActions({ cartCount, signedIn, showCart }: HeaderActionsProps) {
  return (
    <div className="mr-auto hidden shrink-0 items-center gap-1 md:flex">
      {showCart && (
        <Link to="/cart" className="flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-[#005931] transition-colors hover:bg-emerald-50">
          <ShoppingCart size={19} aria-hidden="true" />
          السلة
          {cartCount > 0 && <span aria-label={`${cartCount} منتجات في السلة`} className="rounded-full bg-emerald-50 px-1.5 text-xs">{cartCount > 99 ? '99+' : cartCount}</span>}
        </Link>
      )}
      <Link to={signedIn ? '/account' : '/phone-login'} className="flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-[#005931] transition-colors hover:bg-emerald-50">
        <User size={19} aria-hidden="true" />
        {signedIn ? 'حسابي' : 'دخول'}
      </Link>
    </div>
  );
}
