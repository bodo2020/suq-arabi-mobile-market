import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { readProductBrowseState } from '@/lib/productBrowsing';
import { prepareProductBrowseImages } from '@/lib/productImagePipeline';
import {
  animateProductCardSheet, findCurrentProductCardOrigin, prefersReducedProductMotion, readProductCardOrigin,
} from '@/lib/productSheetMotion';
import ProductSwipePeek from '@/components/product/ProductSwipePeek';
import { productCardImage } from '@/lib/productCardImage';
import { useIsMobile } from '@/hooks/use-mobile';
import { Check, ImageIcon, Minus, Package, Plus, Scale, Share2, ShoppingCart, Trash2, X } from 'lucide-react';
import TopNavBar from '@/components/layout/TopNavBar';
import MainLayout from '@/components/layout/MainLayout';
import ProductStructuredData from '@/components/seo/ProductStructuredData';
import BreadcrumbStructuredData from '@/components/seo/BreadcrumbStructuredData';
import SEOHead from '@/components/seo/SEOHead';
import FavoriteButton from '@/components/ui/FavoriteButton';
import WeightSelector from '@/components/ui/WeightSelector';
import {
  detailCompanyKey, detailProductKey, detailRelatedKey, fetchDetailProduct,
  getCachedDetailProduct, prefetchAdjacentProductDetails, PRODUCT_DETAIL_GC_MS, PRODUCT_DETAIL_STALE_MS, seedProductBrowseCache, warmAdjacentProductPages,
} from '@/lib/productDetailCache';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/useCart';
import { Product, getRelatedProducts, getCompanyById, Company } from '@/lib/supabase';
import { formatWeightAmount, hasBulkPurchase, isWeightedProduct, productUnitPrice, productWeightStepGrams } from '@/lib/productPurchase';

const ProductSuggestions = React.lazy(() => import('@/components/product/ProductSuggestions'));

const money = (value: number) => Number(value || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 });

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const location = useLocation();
  const inCatalogOverlay = isMobile && Boolean((location.state as { backgroundLocation?: unknown } | null)?.backgroundLocation);
  // The underlying catalog already renders MainLayout and bottom navigation.
  // Don't mount a second layout or its fade-in animation above the catalog.
  const DetailShell = inCatalogOverlay ? React.Fragment : MainLayout;
  const browse = useMemo(() => readProductBrowseState(location.state), [location.state]);
  // Switching between retail and bulk keeps browsing anchored to the original item.
  const exactBrowseIndex = browse?.paths.indexOf(location.pathname + location.search) ?? -1;
  const browseIndex = exactBrowseIndex >= 0
    ? exactBrowseIndex
    : (browse?.paths.findIndex(path => path.split('?')[0] === location.pathname) ?? -1);
  const canSwipePrevious = browseIndex > 0;
  const canSwipeNext = browseIndex >= 0 && browseIndex < (browse?.paths.length ?? 0) - 1;
  const sheetTouch = useRef<{ x: number; y: number; at: number; gallery: boolean } | null>(null);
  const sheetStage = useRef<HTMLDivElement>(null);
  const sheetCardRef = useRef<HTMLElement>(null);
  const hasEnteredRef = useRef(false);
  const entranceAnimation = useRef<Animation | null>(null);
  const dismissGesture = useRef<{ pointerId: number; y: number; at: number } | null>(null);
  const dismissOffset = useRef(0);
  const swipeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeFrame = useRef<number | null>(null);
  const pendingSwipeNavigation = useRef<(() => void) | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingRef = useRef(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetDragging, setSheetDragging] = useState(false);
  const [swipeAnimating, setSwipeAnimating] = useState(false);
  const [swipeLocked, setSwipeLocked] = useState(false);
  const [neighborRevision, setNeighborRevision] = useState(0);
  const setSheetOffset = (x: number) => {
    sheetStage.current?.style.setProperty('--product-swipe-x', `${x}px`);
  };
  const nextCategory = !canSwipeNext ? browse?.nextCategory : undefined;
  const requestedBulk = searchParams.get('unit') === 'bulk';
  const requestedVariantId = searchParams.get('variant');
  const requestedStoreId = searchParams.get('store');

  const [loadedProduct, setProduct] = useState<Product | null>(null);
  const queryClient = useQueryClient();
  // Keep exactly the two adjacent preview cards mounted; canonical data
  // seamlessly upgrades each preview when its background prefetch finishes.
  const neighbors = useMemo(() => {
    const resolve = (direction: -1 | 1) => {
      const path = browse && browseIndex >= 0 ? browse.paths[browseIndex + direction] : undefined;
      const preview = path ? browse?.previews.find(item => item.path === path) || null : null;
      if (!path || typeof window === 'undefined') return { preview, product: null };
      try {
        const url = new URL(path, window.location.origin);
        const productId = decodeURIComponent(url.pathname.slice('/product/'.length));
        const product = getCachedDetailProduct(queryClient, productId, url.searchParams.get('store'));
        return { preview, product };
      } catch { return { preview, product: null }; }
    };
    return { previous: resolve(-1), next: resolve(1) };
  }, [browse, browseIndex, neighborRevision, queryClient]);
  // Prefetched data is available during the first render after a swipe, so no
  // in-between loading sheet is shown. Fallback to the current request's state.
  const cachedProduct = getCachedDetailProduct(queryClient, id, requestedStoreId);
  const product = cachedProduct || (
    loadedProduct?.id === id && (!requestedStoreId || loadedProduct.marketplace_branch_id === requestedStoreId)
      ? loadedProduct
      : null
  );
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [extrasForId, setExtrasForId] = useState<string | null>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const mobileExtraTriggerRef = useRef<HTMLDivElement>(null);
  const desktopExtraTriggerRef = useRef<HTMLDivElement>(null);
  const shouldLoadExtras = extrasForId === id;
  const [fullResolutionProductId, setFullResolutionProductId] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [detailWeight, setDetailWeight] = useState(0);
  const [weightOpen, setWeightOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const { addToCart, items, updateQuantity, removeFromCart, isInitialized } = useCart();
  const { toast } = useToast();

  // Lock the background document only on handheld product sheets.
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const previous = document.body.style.overflow;
    if (media.matches) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  const closeSheet = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    // Don't let a pending carousel snap navigate after the sheet is closing.
    pendingSwipeNavigation.current = null;
    if (swipeTimer.current) clearTimeout(swipeTimer.current);
    if (swipeFrame.current !== null) cancelAnimationFrame(swipeFrame.current);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = null;
      if (browse) navigate(-1);
      else navigate('/');
    };
    const path = location.pathname + location.search;
    const origin = inCatalogOverlay
      ? findCurrentProductCardOrigin(path, readProductCardOrigin(location.state, path))
      : null;
    const animation = origin && sheetCardRef.current
      ? animateProductCardSheet(sheetCardRef.current, origin, 'close')
      : null;
    if (animation) {
      sheetStage.current?.animate(
        [{ backgroundColor: 'rgba(15,23,42,0.5)' }, { backgroundColor: 'rgba(15,23,42,0)' }],
        { duration: 260, easing: 'ease-out', fill: 'forwards' },
      );
      void animation.finished.then(finish, finish);
      closeTimer.current = setTimeout(finish, 410);
    } else {
      // Deep links or catalog cards no longer on screen retain a natural
      // downward bottom-sheet exit instead of shrinking to a wrong product.
      if (sheetStage.current) sheetStage.current.style.setProperty('--product-dismiss-y', '0px');
      setSheetVisible(false);
      closeTimer.current = setTimeout(finish, prefersReducedProductMotion() ? 0 : 260);
    }
  };

  const onHeaderPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' || closingRef.current || swipeLocked || weightOpen) return;
    if ((event.target as HTMLElement).closest('button, a, input, textarea')) return;
    dismissGesture.current = { pointerId: event.pointerId, y: event.clientY, at: Date.now() };
    dismissOffset.current = 0;
    sheetCardRef.current?.style.setProperty('transition', 'none');
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onHeaderPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const gesture = dismissGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const dy = Math.max(0, Math.min(480, event.clientY - gesture.y));
    dismissOffset.current = dy;
    sheetStage.current?.style.setProperty('--product-dismiss-y', `${dy}px`);
  };

  const onHeaderPointerEnd = (event: React.PointerEvent<HTMLElement>, cancelled = false) => {
    const gesture = dismissGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    dismissGesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    sheetCardRef.current?.style.removeProperty('transition');
    const dy = dismissOffset.current;
    dismissOffset.current = 0;
    const elapsed = Math.max(1, Date.now() - gesture.at);
    if (!cancelled && (dy > 110 || (dy > 45 && dy / elapsed > .65))) {
      closeSheet();
      return;
    }
    // A short drag springs back; keep React out of individual pointer frames.
    const card = sheetCardRef.current;
    if (card) card.style.transition = 'transform 240ms cubic-bezier(0.2,0.8,0.2,1)';
    requestAnimationFrame(() => sheetStage.current?.style.setProperty('--product-dismiss-y', '0px'));
    window.setTimeout(() => { if (!closingRef.current) card?.style.removeProperty('transition'); }, 250);
  };

  // Route changes re-center the newly selected card *before the browser paints*.
  // Suppressing the reset transition avoids the old "slide back" flash.
  useLayoutEffect(() => {
    const cards = sheetStage.current?.querySelectorAll<HTMLElement>('[data-product-swipe-card], [data-product-center-card]');
    cards?.forEach(card => { card.style.transition = 'none'; });
    setSheetOffset(0);
    setSwipeAnimating(false);
    setSwipeLocked(false);
    const frame = requestAnimationFrame(() => {
      cards?.forEach(card => { card.style.removeProperty('transition'); });
    });
    return () => cancelAnimationFrame(frame);
  }, [id, location.search]);

  useEffect(() => () => {
    if (swipeTimer.current) clearTimeout(swipeTimer.current);
    if (swipeFrame.current !== null) cancelAnimationFrame(swipeFrame.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    entranceAnimation.current?.cancel();
  }, []);

  const completeSwipeNavigation = () => {
    const action = pendingSwipeNavigation.current;
    if (!action) return;
    pendingSwipeNavigation.current = null;
    if (swipeTimer.current) clearTimeout(swipeTimer.current);
    swipeTimer.current = null;
    action();
  };

  const browseProduct = (offset: -1 | 1) => {
    if (!browse || browseIndex < 0 || weightOpen || swipeLocked) return;
    const next = browse.paths[browseIndex + offset];
    const destination = next || (offset === 1 ? browse.nextCategory?.path : undefined);
    if (!destination) return;
    // Seed synchronously before the navigation so the next card never waits
    // on its own network request to show image, name or price.
    if (next) seedProductBrowseCache(queryClient, browse.paths, browseIndex + offset);
    setSwipeLocked(true);
    setSheetDragging(false);
    setSwipeAnimating(true);
    sheetTouch.current = null;
    const navigateTo = () => {
      if (next) navigate(next, { replace: true, state: location.state });
      else navigate(destination);
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigateTo();
      return;
    }
    pendingSwipeNavigation.current = navigateTo;
    // Match the actual card width + gutter so the adjacent card lands at 0,
    // rather than stopping early and appearing to jump on route update.
    const cardWidth = sheetStage.current?.querySelector<HTMLElement>('[data-product-center-card]')?.getBoundingClientRect().width
      || Math.min(window.innerWidth * .84, 560);
    const distance = cardWidth + 10;
    if (swipeFrame.current !== null) cancelAnimationFrame(swipeFrame.current);
    swipeFrame.current = requestAnimationFrame(() => {
      swipeFrame.current = null;
      setSheetOffset(offset === 1 ? -distance : distance);
    });
    // A fallback for hidden-tab and cancelled transitions; the normal path is
    // the center card's transform transitionend event.
    if (swipeTimer.current) clearTimeout(swipeTimer.current);
    swipeTimer.current = setTimeout(completeSwipeNavigation, 310);
  };

  const startSheetSwipe = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch || weightOpen || swipeLocked) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-product-recommendations]')) return;
    if (!target.closest('[data-product-gallery]') && target.closest('button,a,input,textarea,select,[role="button"]')) return;
    sheetTouch.current = {
      x: touch.clientX,
      y: touch.clientY,
      at: Date.now(),
      gallery: Boolean(target.closest('[data-product-gallery]')),
    };
    setSwipeAnimating(false);
    setSheetDragging(true);
  };

  const moveSheetSwipe = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = sheetTouch.current;
    const touch = event.touches[0];
    if (!start || !touch || (start.gallery && images.length > 1) || weightOpen || swipeLocked) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.35) return;
    const allowed = dx < 0 ? (canSwipeNext || Boolean(nextCategory)) : canSwipePrevious;
    setSheetOffset(allowed ? Math.max(-window.innerWidth * .85, Math.min(window.innerWidth * .85, dx)) : dx * .12);
  };

  const finishSheetSwipe = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = sheetTouch.current;
    sheetTouch.current = null;
    setSheetDragging(false);
    const end = event.changedTouches[0];
    if (!start || !end || weightOpen || swipeLocked) return;
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    if (start.gallery && images.length > 1) {
      if (Math.abs(dx) >= 45 && Math.abs(dx) >= Math.abs(dy) * 1.4) goToImage(dx < 0 ? 1 : -1);
      return;
    }
    const elapsed = Math.max(1, Date.now() - start.at);
    const fastFlick = Math.abs(dx) >= 26 && Math.abs(dx) / elapsed >= .55;
    if ((Math.abs(dx) >= 65 || fastFlick) && Math.abs(dx) >= Math.abs(dy) * 1.35) {
      const offset = dx < 0 ? 1 : -1;
      if ((offset === 1 && (canSwipeNext || nextCategory)) || (offset === -1 && canSwipePrevious)) {
        browseProduct(offset);
        return;
      }
    }
    setSwipeAnimating(true);
    if (swipeFrame.current !== null) cancelAnimationFrame(swipeFrame.current);
    swipeFrame.current = requestAnimationFrame(() => {
      swipeFrame.current = null;
      setSheetOffset(0);
    });
  };

  const weighted = product ? isWeightedProduct(product) : false;
  const bulkAvailable = product ? hasBulkPurchase(product) : false;
  const variantMatches = !requestedVariantId || product?.bulk_variant_id === requestedVariantId;
  const bulkMode = Boolean(product && requestedBulk && bulkAvailable && variantMatches);
  const unitPrice = product ? productUnitPrice(product) : 0;
  const pack = product ? Math.max(1, Number(product.bulk_quantity || 1)) : 1;
  const packNumber = String(Math.max(1, Math.trunc(pack)));
  const bulkImageUrl = product ? String(product.bulk_image_url || '').trim() : '';
  const bulkUnitType = product
    ? (String((product as Product & { bulk_variant_type?: string | null }).bulk_variant_type || '').trim() || 'جملة')
    : 'جملة';
  const displayName = product
    ? bulkMode
      ? (String(product.bulk_name || '').trim() || product.name)
      : product.name
    : '';
  const favoriteVariantId = bulkMode ? product?.bulk_variant_id || null : null;
  const stock = Math.max(0, Number(product?.quantity || 0));
  const maxRegularQuantity = Math.floor(stock);
  const maxBulkQuantity = Math.floor(stock / pack);
  const weightStep = product && weighted ? productWeightStepGrams(product) : 0;
  const maxWeight = weighted ? Math.floor(stock * 1000) : 0;
  const listingId = product?.marketplace_listing_id || null;
  const regularCartItem = items.find(item => item.product.id === id && (item.marketplace_listing_id || null) === listingId && !item.is_bulk && item.unit_of_measure !== 'weight');
  const weightedCartItem = items.find(item => item.product.id === id && (item.marketplace_listing_id || null) === listingId && !item.is_bulk && item.unit_of_measure === 'weight');
  const bulkCartItem = items.find(item => item.product.id === id && (item.marketplace_listing_id || null) === listingId && item.is_bulk);
  const activeCartItem = bulkMode ? bulkCartItem : weighted ? weightedCartItem : regularCartItem;
  const currentWeight = weighted && product
    ? Math.min(maxWeight || weightStep, Math.max(1, Math.round(Number(weightedCartItem?.quantity || detailWeight || weightStep))))
    : 0;
  const displayPrice = product
    ? bulkMode
      ? Number(product.bulk_price || 0)
      : weighted
        ? unitPrice * currentWeight / 1000
        : unitPrice
    : 0;
  const originalWeightedPrice = product && weighted
    ? Number(product.price || 0) * currentWeight / 1000
    : 0;
  const regularPrice = Number(product?.price || 0);
  const discount = !bulkMode && regularPrice > unitPrice && unitPrice > 0
    ? Math.round((1 - unitPrice / regularPrice) * 100)
    : 0;
  const unavailable = bulkMode ? maxBulkQuantity <= 0 : weighted ? maxWeight <= 0 : maxRegularQuantity <= 0;
  const limitedStock = !weighted && !unavailable && (bulkMode ? maxBulkQuantity : maxRegularQuantity) <= 5;

  useEffect(() => {
    if (!id) return;
    let active = true;
    const cached = getCachedDetailProduct(queryClient, id, requestedStoreId);
    setLoading(!cached);
    setLoadError(false);
    setProduct(cached);
    setSelectedImageIndex(0);
    // Restore the already-warmed supplementary sections before the route paints.
    setRelatedProducts(cached
      ? queryClient.getQueryData<Product[]>(detailRelatedKey(cached)) || []
      : []);
    setCompany(cached?.company_id
      ? queryClient.getQueryData<Company>(detailCompanyKey(cached.company_id)) || null
      : null);
    setQuantity(1);
    setDetailWeight(cached && isWeightedProduct(cached) ? productWeightStepGrams(cached) : 0);

    void queryClient.fetchQuery({
      queryKey: detailProductKey(id, requestedStoreId),
      queryFn: () => fetchDetailProduct(id, requestedStoreId),
      staleTime: PRODUCT_DETAIL_STALE_MS,
      gcTime: PRODUCT_DETAIL_GC_MS,
    }).then(data => {
      if (!active) return;
      setProduct(data);
      if (isWeightedProduct(data)) setDetailWeight(productWeightStepGrams(data));
    }).catch(error => {
      console.error('Error fetching product:', error);
      if (active) setLoadError(true);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, requestedStoreId, queryClient]);

  useEffect(() => {
    if (!browse || browseIndex < 0 || !isMobile) return;
    prepareProductBrowseImages(browse.previews, browse.paths, browseIndex);
    warmAdjacentProductPages(queryClient, browse.paths, browseIndex);
    // Give the active product and its lightweight hero first priority, then
    // upgrade only the two adjacent cards from their server-backed cache.
    let active = true;
    const timer = window.setTimeout(() => {
      void prefetchAdjacentProductDetails(queryClient, browse.paths, browseIndex, () => {
        if (active) setNeighborRevision(value => value + 1);
      });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [browse, browseIndex, queryClient, isMobile]);

  // First entrance is a shared-element FLIP from the tapped catalog tile.
  // This layout effect runs before paint so an offscreen -> center flash
  // cannot occur. Direct links retain the normal bottom-sheet entrance.
  useLayoutEffect(() => {
    if (!product || !isMobile || hasEnteredRef.current || closingRef.current) return;
    const card = sheetCardRef.current;
    if (!card) return;
    hasEnteredRef.current = true;
    const origin = inCatalogOverlay
      ? readProductCardOrigin(location.state, location.pathname + location.search)
      : null;
    const animation = origin ? animateProductCardSheet(card, origin, 'open') : null;
    if (animation) {
      entranceAnimation.current = animation;
      sheetStage.current?.animate(
        [{ backgroundColor: 'rgba(15,23,42,0)' }, { backgroundColor: 'rgba(15,23,42,0.5)' }],
        { duration: 310, easing: 'ease-out', fill: 'both' },
      );
      setSheetVisible(true);
    } else {
      const frame = requestAnimationFrame(() => setSheetVisible(true));
      return () => cancelAnimationFrame(frame);
    }
  }, [Boolean(product), isMobile]);

  // Only begin secondary network work once the user gets near the bottom of
  // the sheet (or the lower section on desktop). The hero renders independently.
  useEffect(() => {
    if (!product || !id || shouldLoadExtras) return;
    const target = isMobile ? mobileExtraTriggerRef.current : desktopExtraTriggerRef.current;
    if (!target) return;
    if (typeof IntersectionObserver === 'undefined') {
      setExtrasForId(id);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setExtrasForId(id);
        observer.disconnect();
      }
    }, {
      root: isMobile ? mobileScrollRef.current : null,
      rootMargin: '140px 0px',
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [id, product, isMobile, shouldLoadExtras]);

  useEffect(() => {
    if (!product || !shouldLoadExtras) return;
    let active = true;
    const relatedKey = detailRelatedKey(product);
    const companyKey = product.company_id ? detailCompanyKey(product.company_id) : null;
    const cachedRelated = queryClient.getQueryData<Product[]>(relatedKey);
    setRelatedProducts(cachedRelated || []);
    setRelatedLoading(!cachedRelated);
    setCompany(companyKey ? queryClient.getQueryData<Company>(companyKey) || null : null);

    // Keep networking out of the first animation frames. Every request is
    // non-blocking, and late results from a prior product are ignored.
    const timer = window.setTimeout(() => {
      void queryClient.fetchQuery({
        queryKey: relatedKey,
        queryFn: () => getRelatedProducts(product),
        staleTime: PRODUCT_DETAIL_STALE_MS,
        gcTime: PRODUCT_DETAIL_GC_MS,
      }).then(related => {
        if (active) setRelatedProducts(related);
      }).catch(() => {
        if (active) setRelatedProducts([]);
      }).finally(() => {
        if (active) setRelatedLoading(false);
      });
      if (companyKey) {
        void queryClient.fetchQuery({
          queryKey: companyKey,
          queryFn: () => getCompanyById(product.company_id),
          staleTime: PRODUCT_DETAIL_STALE_MS,
          gcTime: PRODUCT_DETAIL_GC_MS,
        }).then(data => { if (active) setCompany(data); }).catch(() => {});
      }
    }, isMobile ? 320 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [product, queryClient, isMobile, shouldLoadExtras]);

  // Use the small card image for the entrance animation; load full resolution
  // only after the sheet has settled, never before the user sees name/price.
  useEffect(() => {
    const timer = window.setTimeout(() => setFullResolutionProductId(id || null), isMobile ? 320 : 0);
    return () => window.clearTimeout(timer);
  }, [id, isMobile]);

  const images = useMemo(() => {
    if (!product) return [];
    if (bulkMode) return bulkImageUrl ? [bulkImageUrl] : [];
    return product.image_urls?.filter(Boolean) || [];
  }, [product, bulkMode, bulkImageUrl]);

  const structuredProduct = useMemo(() => {
    if (!product || !bulkMode) return product;
    return {
      ...product,
      name: displayName,
      price: Number(product.bulk_price || 0),
      offer_price: undefined,
      image_urls: bulkImageUrl ? [bulkImageUrl] : [],
    } as Product;
  }, [product, bulkMode, displayName, bulkImageUrl]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [bulkMode]);

  const notifyAdded = () => toast({ title: 'تمت الإضافة', description: `اتضاف ${displayName || 'المنتج'} للسلة.` });

  const openRegular = () => {
    if (!product) return;
    navigate(`/product/${product.id}${requestedStoreId ? `?store=${encodeURIComponent(requestedStoreId)}` : ''}`, { replace: true, state: location.state });
  };

  const openBulk = () => {
    if (!product || !bulkAvailable) return;
    const variant = product.bulk_variant_id ? `&variant=${encodeURIComponent(product.bulk_variant_id)}` : '';
    navigate(`/product/${product.id}?unit=bulk${variant}${requestedStoreId ? `&store=${encodeURIComponent(requestedStoreId)}` : ''}`, { replace: true, state: location.state });
  };

  const addRegular = () => {
    if (!product || !isInitialized || unavailable) return;
    const safeQuantity = Math.min(quantity, maxRegularQuantity);
    const result = addToCart({ ...product, price: product.price, quantity: safeQuantity, is_bulk: false });
    if (result === 'added') {
      setQuantity(1);
      notifyAdded();
    }
  };

  const addBulk = () => {
    if (!product || !isInitialized || !bulkMode || unavailable) return;
    const result = addToCart({
      ...product,
      name: displayName,
      image_urls: bulkImageUrl ? [bulkImageUrl] : product.image_urls,
      price: product.price,
      quantity: 1,
      is_bulk: true,
    });
    if (result === 'added') notifyAdded();
  };

  const changePieceQuantity = (bulk: boolean, delta: number) => {
    if (!product || !isInitialized) return;
    const item = bulk ? bulkCartItem : regularCartItem;
    if (!item) return;
    const max = bulk ? maxBulkQuantity : maxRegularQuantity;
    const next = item.quantity + delta;
    if (next <= 0) {
      removeFromCart(product.id, bulk, listingId);
      return;
    }
    updateQuantity(product.id, Math.min(max, next), bulk, listingId);
  };

  const applyWeight = (grams: number) => {
    if (!product || !weighted || !isInitialized || maxWeight <= 0) return;
    const next = Math.min(maxWeight, Math.max(1, Math.round(grams)));
    setDetailWeight(next);
    if (weightedCartItem) {
      updateQuantity(product.id, next, false, listingId);
    } else {
      const result = addToCart({
        ...product,
        quantity: next,
        price: product.price,
        unit_of_measure: 'weight',
        is_bulk: false,
      });
      if (result === 'added') notifyAdded();
    }
  };

  const changeWeight = (delta: number) => {
    if (!product || !weightedCartItem || !isInitialized) return;
    const next = currentWeight + delta * weightStep;
    if (next <= 0 || (delta < 0 && currentWeight <= weightStep)) {
      removeFromCart(product.id, false, listingId);
      return;
    }
    updateQuantity(product.id, Math.min(maxWeight, next), false, listingId);
  };

  const handleShare = async () => {
    if (!product) return;
    const { getCurrentUrl } = await import('@/utils/urlUtils');
    const shareUrl = getCurrentUrl();

    if (navigator.share) {
      try {
        await navigator.share({ title: displayName, text: product.description || '', url: shareUrl });
        return;
      } catch (error) {
        if ((error as { name?: string })?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'تم النسخ', description: 'تم نسخ رابط المنتج.' });
    } catch {
      toast({ title: 'تعذر النسخ', description: 'حاول مرة تانية.', variant: 'destructive' });
    }
  };

  const goToImage = (direction: 1 | -1) => {
    if (images.length <= 1) return;
    setSelectedImageIndex(current => (current + direction + images.length) % images.length);
  };

  const finishSwipe = (endX: number) => {
    if (touchStartX === null) return;
    const distance = endX - touchStartX;
    if (Math.abs(distance) > 45) goToImage(distance < 0 ? 1 : -1);
    setTouchStartX(null);
  };

  const pendingPreview = browse?.previews.find(preview => preview.path === location.pathname + location.search);
  if (!cachedProduct && (loading || (!loadError && loadedProduct?.id !== id))) {
    return (
      <DetailShell>
        <div className="hidden md:block">
          <TopNavBar hideLogo hideSearch pageTitle="تفاصيل المنتج" showBackButton onBack={() => navigate(-1)} />
          <div role="status" aria-label="جاري تجهيز تفاصيل المنتج" className="mx-auto max-w-5xl px-6 pt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="aspect-square animate-pulse rounded-[28px] bg-slate-100" />
              <div className="space-y-5 rounded-[28px] bg-white p-7">
                <div className="h-6 w-2/3 animate-pulse rounded-lg bg-slate-100" />
                <div className="h-4 w-1/3 animate-pulse rounded-lg bg-slate-100" />
                <div className="h-10 w-1/2 animate-pulse rounded-lg bg-slate-100" />
              </div>
            </div>
          </div>
        </div>
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 pt-5 md:hidden">
          <div role="status" aria-live="polite" aria-label="جاري تجهيز تفاصيل المنتج" dir="rtl"
            className="flex h-[calc(100dvh-20px)] w-full max-w-[600px] flex-col overflow-hidden rounded-t-[30px] bg-[#f7f9f8]">
            <div className="flex h-14 shrink-0 items-center justify-between bg-white px-5">
              <button type="button" onClick={() => { if (browse) navigate(-1); else navigate('/', { replace: true }); }} aria-label="رجوع" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700"><X size={18} /></button>
              <span className="text-sm font-bold text-slate-600">تفاصيل المنتج</span>
              <div className="h-9 w-9 rounded-full bg-slate-100" />
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-hidden p-3">
              <div className="flex h-[min(35dvh,280px)] items-center justify-center rounded-[24px] bg-white p-7">
                {pendingPreview?.image
                  ? <img src={productCardImage(pendingPreview.image)} alt="" decoding="async" className="h-full w-full object-contain" />
                  : <div className="h-44 w-44 animate-pulse rounded-3xl bg-slate-100" />}
              </div>
              <div className="space-y-3 rounded-[24px] bg-white p-5">
                {pendingPreview?.name
                  ? <h1 className="text-xl font-black text-slate-900">{pendingPreview.name}</h1>
                  : <div className="h-6 w-4/5 animate-pulse rounded-lg bg-slate-100" />}
                <div className="h-3 w-1/3 animate-pulse rounded-md bg-slate-100" />
                {pendingPreview?.price
                  ? <div className="text-2xl font-black text-[#005931]">{pendingPreview.price} ج.م</div>
                  : <div className="h-9 w-1/2 animate-pulse rounded-lg bg-slate-100" />}
                <div className="h-5 w-1/4 animate-pulse rounded-full bg-slate-100" />
              </div>
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
              <div className="h-14 animate-pulse rounded-2xl bg-emerald-100" />
            </div>
          </div>
        </div>
      </DetailShell>
    );
  }

  const invalidBulkPage = Boolean(product && requestedBulk && (!bulkAvailable || !variantMatches));

  if (!product || (loadError && !cachedProduct) || invalidBulkPage) {
    return (
      <DetailShell>
        <TopNavBar hideLogo hideSearch pageTitle={requestedBulk ? 'تفاصيل الجملة' : 'تفاصيل المنتج'} showBackButton onBack={() => navigate(-1)} />
        <section className="mx-auto mt-10 max-w-md rounded-[28px] border border-slate-100 bg-white p-7 text-center shadow-sm">
          <Package className="mx-auto text-slate-300" size={42} />
          <h1 className="mt-4 text-xl font-black text-slate-900">{requestedBulk ? 'وحدة الجملة مش متاحة دلوقتي' : 'المنتج مش متاح دلوقتي'}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">ارجع للمنتجات واختار بديل، أو جرّب فتح الصفحة تاني.</p>
          <Button className="mt-5 rounded-xl" onClick={() => navigate(-1)}>رجوع</Button>
        </section>
      </DetailShell>
    );
  }

  const currentCartQuantity = Number(activeCartItem?.quantity || 0);
  const purchaseTotal = weighted
    ? displayPrice
    : displayPrice * (activeCartItem ? currentCartQuantity : bulkMode ? 1 : quantity);
  const unitDescription = weighted
    ? `${money(unitPrice)} ج.م / كجم`
    : bulkMode
      ? `${bulkUnitType} · ${packNumber} قطعة`
      : String(product.unit_of_measure || '').trim() || 'قطعة';

  const piecePurchaseControl = (
    <div className="space-y-3">
      {activeCartItem ? (
        <div className="flex h-14 items-center justify-between overflow-hidden rounded-2xl bg-[#eef9f3] text-[#005931]">
          <button
            type="button"
            onClick={() => changePieceQuantity(bulkMode, -1)}
            className="flex h-14 w-14 items-center justify-center"
            aria-label={currentCartQuantity <= 1 ? 'حذف من السلة' : 'تقليل الكمية'}
          >
            {currentCartQuantity <= 1 ? <Trash2 size={20} /> : <Minus size={20} />}
          </button>
          <div className="text-center">
            <strong className="block text-lg font-black text-slate-950">{money(currentCartQuantity)}</strong>
            <span className="text-[11px] font-semibold text-slate-500">{bulkMode ? bulkUnitType : 'قطعة'}</span>
          </div>
          <button
            type="button"
            onClick={() => changePieceQuantity(bulkMode, 1)}
            disabled={currentCartQuantity >= (bulkMode ? maxBulkQuantity : maxRegularQuantity)}
            className="flex h-14 w-14 items-center justify-center bg-[#005931] text-white disabled:opacity-30"
            aria-label="زيادة الكمية"
          >
            <Plus size={21} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 md:flex-col md:items-stretch md:gap-3">
          {!bulkMode && (
            <div className="flex h-12 w-[104px] shrink-0 items-center justify-between rounded-2xl border border-slate-200 bg-white md:w-full">
              <button type="button" onClick={() => setQuantity(value => Math.max(1, value - 1))} className="flex h-12 w-9 shrink-0 items-center justify-center md:w-12" aria-label="تقليل الكمية"><Minus size={17} /></button>
              <strong className="text-sm font-black">{money(quantity)}</strong>
              <button type="button" onClick={() => setQuantity(value => Math.min(maxRegularQuantity, value + 1))} disabled={quantity >= maxRegularQuantity} className="flex h-12 w-9 shrink-0 items-center justify-center disabled:opacity-30 md:w-12" aria-label="زيادة الكمية"><Plus size={17} /></button>
            </div>
          )}
          <Button
            type="button"
            disabled={!isInitialized || unavailable}
            onClick={bulkMode ? addBulk : addRegular}
            className="h-12 min-w-0 flex-1 rounded-2xl bg-[#005931] px-3 text-sm font-black shadow-[0_8px_20px_rgba(0,89,49,0.14)] md:h-14 md:w-full md:flex-none md:text-base"
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className="flex shrink-0 items-center gap-1"><Plus size={17} />أضف للسلة</span>
              <span className="truncate text-xs md:text-base">{money(purchaseTotal)} ج.م</span>
            </span>
          </Button>
        </div>
      )}
    </div>
  );

  const weightedPurchaseControl = (
    <div className="space-y-3">
      {weightedCartItem ? (
        <div className="flex h-14 items-center justify-between overflow-hidden rounded-2xl bg-[#eef9f3] text-[#005931]">
          <button type="button" onClick={() => changeWeight(-1)} className="flex h-14 w-14 items-center justify-center" aria-label={currentWeight <= weightStep ? 'حذف من السلة' : 'تقليل الوزن'}>
            {currentWeight <= weightStep ? <Trash2 size={20} /> : <Minus size={20} />}
          </button>
          <button type="button" onClick={() => setWeightOpen(true)} className="min-w-0 flex-1 text-center" aria-label="تعديل الوزن">
            <strong className="block text-base font-black text-slate-950">{formatWeightAmount(currentWeight)}</strong>
            <span className="text-[11px] font-semibold text-slate-500">{money(displayPrice)} ج.م</span>
          </button>
          <button type="button" onClick={() => changeWeight(1)} disabled={currentWeight >= maxWeight} className="flex h-14 w-14 items-center justify-center bg-[#005931] text-white disabled:opacity-30" aria-label="زيادة الوزن"><Plus size={21} /></button>
        </div>
      ) : (
        <Button type="button" disabled={!isInitialized || unavailable} onClick={() => setWeightOpen(true)} className="h-14 w-full rounded-2xl bg-[#005931] text-base font-black shadow-[0_10px_24px_rgba(0,89,49,0.16)]">
          <span className="flex w-full items-center justify-between gap-3">
            <span className="flex items-center gap-2"><Scale size={18} />اختار الوزن</span>
            <span>من {money(unitPrice * weightStep / 1000)} ج.م</span>
          </span>
        </Button>
      )}
    </div>
  );

  return (
    <DetailShell>
      <SEOHead
        title={`${displayName} - سوبر ماركو`}
        description={product.description || `اشتري ${displayName} من سوبر ماركو`}
        image={images[0]}
        type="product"
      />
      {structuredProduct && <ProductStructuredData product={structuredProduct} />}
      <BreadcrumbStructuredData items={[
        { name: 'الرئيسية', url: '/' },
        { name: bulkMode ? 'منتجات الجملة' : 'المنتجات', url: bulkMode ? '/bulk-products' : '/categories' },
        { name: displayName, url: bulkMode ? `/product/${product.id}?unit=bulk` : `/product/${product.id}` },
      ]} />

      <div className="hidden md:block"><TopNavBar hideLogo hideSearch pageTitle="تفاصيل المنتج" showBackButton onBack={() => navigate(-1)} /></div>

      {/* Three-card carousel: neighbors stay mounted and follow the same GPU transform. */}
      <div ref={sheetStage} className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden bg-slate-950/50 px-0 pt-5 md:hidden" style={{ '--product-swipe-x': '0px' } as React.CSSProperties}>
        <ProductSwipePeek side="left" preview={neighbors.previous.preview} product={neighbors.previous.product}
          locked={swipeLocked} visible={sheetVisible} transitioning={!sheetDragging && swipeAnimating} onOpen={() => browseProduct(-1)} />
        <ProductSwipePeek side="right" preview={neighbors.next.preview} product={neighbors.next.product}
          locked={swipeLocked} visible={sheetVisible} transitioning={!sheetDragging && swipeAnimating} onOpen={() => browseProduct(1)} />
        <section
          ref={sheetCardRef}
          data-product-center-card
          role="dialog"
          aria-modal="true"
          aria-label={`تفاصيل ${displayName}`}
          dir="rtl"
          className={`relative z-10 flex h-[calc(100dvh-20px)] w-[78vw] max-w-[560px] flex-col overflow-hidden rounded-t-[30px] bg-[#f7f9f8] shadow-[0_18px_70px_rgba(0,0,0,.18)] will-change-transform motion-reduce:transition-none ${sheetDragging ? 'transition-none' : swipeAnimating ? 'transition-transform duration-[230ms] ease-[cubic-bezier(0.22,1,0.36,1)]' : 'transition-transform duration-[260ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]'}`}
          style={{ transform: `translate3d(var(--product-swipe-x, 0px), calc(${sheetVisible || (inCatalogOverlay && Boolean(readProductCardOrigin(location.state, location.pathname + location.search))) ? '0px' : '105dvh'} + var(--product-dismiss-y, 0px)), 0)` }}
          onTransitionEnd={event => {
            if (event.currentTarget === event.target && event.propertyName === 'transform') completeSwipeNavigation();
          }}
        >
          <header
            className="relative z-20 shrink-0 select-none rounded-t-[30px] bg-white px-4 pb-2 pt-3"
            style={{ touchAction: 'none' }}
            onPointerDown={onHeaderPointerDown}
            onPointerMove={onHeaderPointerMove}
            onPointerUp={onHeaderPointerEnd}
            onPointerCancel={event => onHeaderPointerEnd(event, true)}
            aria-label="اسحب لأسفل لإغلاق تفاصيل المنتج"
          >
            <div data-product-drag-handle className="mx-auto mb-2 flex h-4 w-20 items-center justify-center" aria-hidden="true">
              <span className="h-1 w-11 rounded-full bg-slate-300" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={closeSheet} aria-label="إغلاق تفاصيل المنتج"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-800 active:scale-95">
                <X size={19} />
              </button>
              <span className="truncate text-center text-sm font-extrabold text-slate-700">تفاصيل المنتج</span>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700" aria-label="مشاركة المنتج" onClick={handleShare}><Share2 size={19} /></button>
                <div className="flex h-10 w-10 items-center justify-center rounded-full"><FavoriteButton productId={product.id} variantId={favoriteVariantId} size="sm" /></div>
              </div>
            </div>
          </header>
          <div
            ref={mobileScrollRef}
            key={`product-sheet-${id}`}
            className="min-h-0 flex-1 touch-pan-y space-y-3 overflow-y-auto overscroll-contain px-3 pb-5 pt-3"
            onTouchStart={startSheetSwipe}
            onTouchMove={moveSheetSwipe}
            onTouchEnd={finishSheetSwipe}
            onTouchCancel={() => {
              sheetTouch.current = null;
              setSheetDragging(false);
              setSwipeAnimating(true);
              if (swipeFrame.current !== null) cancelAnimationFrame(swipeFrame.current);
              swipeFrame.current = requestAnimationFrame(() => {
                swipeFrame.current = null;
                setSheetOffset(0);
              });
            }}
          >
            <div data-product-gallery className="relative flex h-[min(34dvh,270px)] items-center justify-center overflow-hidden rounded-[24px] border border-slate-100 bg-white">
              {bulkMode && !bulkImageUrl ? (
                <div className="flex h-40 w-40 items-center justify-center rounded-[30px] bg-[#005931] text-6xl font-black text-white">{packNumber}</div>
              ) : images.length > 0 ? (
                <>
                  {productCardImage(images[selectedImageIndex]) !== images[selectedImageIndex] && (
                    <img
                      src={productCardImage(images[selectedImageIndex])}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      className="absolute inset-0 h-full w-full object-contain px-7 py-5"
                      onError={event => {
                        const fallback = images[selectedImageIndex];
                        if (event.currentTarget.src !== fallback) {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = fallback;
                        }
                      }}
                    />
                  )}
                  {(fullResolutionProductId === id || productCardImage(images[selectedImageIndex]) === images[selectedImageIndex]) && (
                    <img
                      className="relative h-full w-full object-contain px-7 py-5"
                      src={images[selectedImageIndex] || '/placeholder.svg'}
                      alt={displayName}
                      decoding="async"
                      draggable={false}
                      onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/placeholder.svg'; }}
                    />
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400"><ImageIcon size={45} /><span>لا توجد صورة</span></div>
              )}
              {discount > 0 && <span className="absolute bottom-4 right-4 rounded-xl bg-brand-yellow px-3 py-1.5 text-xs font-black text-[#005931]">خصم {discount}%</span>}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1.5">
                  {images.map((_, index) => <span key={index} className={`h-1.5 rounded-full ${index === selectedImageIndex ? 'w-5 bg-[#005931]' : 'w-1.5 bg-slate-300'}`} />)}
                </div>
              )}
            </div>
            <section className="rounded-[24px] border border-slate-100 bg-white px-4 pb-4 pt-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${unavailable ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-[#005931]'}`}>
                  {unavailable ? 'غير متوفر حاليًا' : 'متوفر للطلب'}
                </span>
                {limitedStock && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">كمية محدودة</span>}
                {bulkMode && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-[#005931]">جملة</span>}
              </div>
              <h1 className="text-[21px] font-black leading-[1.45] text-slate-950">{displayName}</h1>
              <p className="mt-1 text-xs font-medium text-slate-500">{weighted ? 'يباع بالوزن · ' : ''}{unitDescription}</p>
              <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1 border-t border-slate-100 pt-4">
                <strong className="text-[31px] font-black leading-none tracking-tight text-[#005931]">{money(displayPrice)}</strong>
                <span className="pb-0.5 text-sm font-black text-[#005931]">ج.م</span>
                {discount > 0 && <del className="mr-auto pb-0.5 text-xs font-medium text-slate-400">{money(weighted ? originalWeightedPrice : regularPrice)} ج.م</del>}
              </div>
              {product.commerce_source === 'marketplace' && product.marketplace_branch_id && (
                <button type="button" className="mt-4 flex w-full items-center justify-between rounded-xl bg-[#f1f8f4] px-3 py-2.5 text-right text-xs font-bold text-[#005931]" onClick={() => navigate(`/stores/${product.marketplace_branch_id}`)}>
                  <span className="truncate">يباع بواسطة {product.merchant_name || 'متجر شريك'}</span>
                  <span className="shrink-0 text-[11px]">عرض المتجر</span>
                </button>
              )}
              {bulkAvailable && !weighted && (
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                  <button type="button" onClick={openRegular} aria-pressed={!bulkMode}
                    className={`rounded-xl px-2 py-3 text-xs font-bold ${!bulkMode ? 'bg-white text-[#005931] shadow-sm' : 'text-slate-600'}`}>
                    قطاعي · {money(unitPrice)} ج.م
                  </button>
                  <button type="button" onClick={openBulk} aria-pressed={bulkMode}
                    className={`rounded-xl px-2 py-3 text-xs font-bold ${bulkMode ? 'bg-white text-[#005931] shadow-sm' : 'text-slate-600'}`}>
                    {bulkUnitType} · {money(Number(product.bulk_price || 0))} ج.م
                  </button>
                </div>
              )}
            </section>
            <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-white">
              {product.description && (
                <details className="group border-b border-slate-100">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4 text-sm font-extrabold text-slate-900">
                    <span>وصف المنتج</span>
                    <span className="text-lg text-slate-400 group-open:rotate-45">+</span>
                  </summary>
                  <p className="whitespace-pre-line px-4 pb-4 text-sm leading-7 text-slate-600">{product.description}</p>
                </details>
              )}
              <details className="group" onToggle={event => {
                if (event.currentTarget.open && id) setExtrasForId(id);
              }}>
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4 text-sm font-extrabold text-slate-900">
                  <span>معلومات إضافية</span>
                  <span className="text-lg text-slate-400 group-open:rotate-45">+</span>
                </summary>
                <div className="space-y-3 px-4 pb-4 text-xs leading-6 text-slate-600">
                  <p>طريقة البيع: {weighted ? 'بالوزن' : bulkMode ? bulkUnitType : 'بالقطعة'} · الوحدة: {unitDescription}</p>
                  {company && <button type="button" className="font-extrabold text-[#005931]" onClick={() => navigate(`/company/${company.id}`)}>اكتشف منتجات {company.name}</button>}
                </div>
              </details>
            </div>
            <div ref={mobileExtraTriggerRef} className="h-px" aria-hidden="true" />
            {shouldLoadExtras && (
              <React.Suspense fallback={<div className="h-40 animate-pulse rounded-[24px] bg-slate-100" />}>
                <ProductSuggestions
                  products={relatedProducts.filter(item => item.id !== product.id && (!requestedStoreId || item.marketplace_branch_id === requestedStoreId))}
                  loading={relatedLoading}
                  layout="mobile"
                />
              </React.Suspense>
            )}
          </div>
          <footer className="shrink-0 border-t border-slate-100 bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
            {weighted ? weightedPurchaseControl : piecePurchaseControl}
          </footer>
        </section>
      </div>

      {!isMobile && (
      <main className="mx-auto hidden max-w-6xl px-3 pb-40 pt-2 sm:px-5 md:block md:pb-10">
        <div className="grid gap-4 lg:grid-cols-[1.06fr_.94fr] lg:items-start lg:gap-6">
          <section className="relative overflow-hidden rounded-[28px] bg-white p-3 shadow-[0_10px_35px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.035] sm:p-5">
            <div
              className={`relative aspect-square touch-pan-y overflow-hidden rounded-[24px] ${bulkMode && !bulkImageUrl ? 'bg-emerald-50' : 'bg-[#f7f8f7]'}`}
              onTouchStart={event => setTouchStartX(event.touches[0]?.clientX ?? null)}
              onTouchEnd={event => finishSwipe(event.changedTouches[0]?.clientX ?? 0)}
            >
              {bulkMode && !bulkImageUrl ? (
                <div className="flex h-full w-full items-center justify-center p-8" aria-label={`${bulkUnitType} ${packNumber} قطعة`}>
                  <div className="flex aspect-square w-[52%] max-w-56 items-center justify-center rounded-[26%] bg-[#005931] shadow-[0_18px_44px_rgba(0,89,49,0.22)]">
                    <span className="select-none text-6xl font-black leading-none tracking-tight text-white sm:text-7xl">{packNumber}</span>
                  </div>
                </div>
              ) : images.length > 0 ? (
                <img
                  src={images[selectedImageIndex] || '/placeholder.svg'}
                  alt={displayName}
                  className="h-full w-full object-contain p-6 sm:p-8"
                  onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/placeholder.svg'; }}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-300"><ImageIcon size={42} /><span className="text-sm font-semibold">لا توجد صورة</span></div>
              )}

              <div className="absolute right-3 top-3 flex flex-col gap-2">
                <button onClick={handleShare} aria-label="مشاركة المنتج" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-[0_6px_18px_rgba(15,23,42,.12)] backdrop-blur"><Share2 size={18} className="text-slate-700" /></button>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-[0_6px_18px_rgba(15,23,42,.12)] backdrop-blur"><FavoriteButton productId={product.id} variantId={favoriteVariantId} size="sm" /></div>
              </div>

              <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
                {discount > 0 && <span className="rounded-xl bg-[#ff6767] px-2.5 py-1.5 text-xs font-black text-white shadow-sm">خصم {discount}%</span>}
                {bulkMode && <span className="rounded-xl bg-[#005931] px-2.5 py-1.5 text-xs font-black text-white">{bulkUnitType}</span>}
              </div>

              {images.length > 1 && !bulkMode && (
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-white/85 px-2.5 py-1.5 shadow-sm backdrop-blur sm:hidden">
                  {images.map((_, index) => <span key={index} className={`h-1.5 rounded-full transition-all ${selectedImageIndex === index ? 'w-5 bg-[#005931]' : 'w-1.5 bg-slate-300'}`} />)}
                </div>
              )}
            </div>

            {!bulkMode && images.length > 1 && (
              <div className="mt-3 hidden gap-2 overflow-x-auto pb-1 sm:flex">
                {images.map((url, index) => (
                  <button key={`${url}-${index}`} type="button" aria-label={`عرض صورة ${index + 1}`} aria-pressed={selectedImageIndex === index} onClick={() => setSelectedImageIndex(index)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#f7f8f7] p-1 ring-2 transition ${selectedImageIndex === index ? 'ring-[#005931]' : 'ring-transparent'}`}>
                    <img src={url} alt="" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.035] sm:p-7 lg:sticky lg:top-[calc(var(--top-nav-height,68px)+16px)]">
            <div className="flex flex-wrap items-center gap-2">
              {weighted && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-[#005931]"><Scale size={13} />بالوزن</span>}
              {limitedStock && <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">كمية محدودة</span>}
              {!unavailable && <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600"><Check size={13} />متوفر</span>}
              {unavailable && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">غير متوفر</span>}
            </div>

            <h1 className="mt-4 text-[25px] font-black leading-[1.45] text-slate-950 sm:text-3xl">{displayName}</h1>
            {product.commerce_source === 'marketplace' && product.marketplace_branch_id && <button type="button" onClick={() => navigate(`/stores/${product.marketplace_branch_id}`)} className="mt-3 w-full rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-right"><span className="block text-xs text-slate-500">يباع بواسطة</span><strong className="text-primary">{product.merchant_name || 'متجر شريك'}</strong><span className="mt-1 block text-xs text-primary">عرض جميع منتجات المتجر ←</span></button>}
            <p className="mt-1.5 text-sm font-medium text-slate-500">{unitDescription}</p>

            {bulkAvailable && !weighted && (
              <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-[#f6f8f7] p-1.5">
                <button type="button" onClick={openRegular} className={`rounded-xl px-3 py-3 text-right transition ${!bulkMode ? 'bg-white shadow-sm ring-1 ring-black/[0.04]' : 'text-slate-500'}`}>
                  <span className="block text-xs font-semibold">قطاعي</span>
                  <strong className={`mt-0.5 block text-sm ${!bulkMode ? 'text-[#005931]' : 'text-slate-700'}`}>{money(unitPrice)} ج.م</strong>
                </button>
                <button type="button" onClick={openBulk} className={`rounded-xl px-3 py-3 text-right transition ${bulkMode ? 'bg-white shadow-sm ring-1 ring-black/[0.04]' : 'text-slate-500'}`}>
                  <span className="block text-xs font-semibold">{bulkUnitType}</span>
                  <strong className={`mt-0.5 block text-sm ${bulkMode ? 'text-[#005931]' : 'text-slate-700'}`}>{money(Number(product.bulk_price || 0))} ج.م</strong>
                </button>
              </div>
            )}

            <div className="mt-5 border-y border-slate-100 py-5">
              {discount > 0 && <div className="mb-1.5 flex items-center gap-2"><del className="text-sm font-medium text-slate-400">{money(weighted ? originalWeightedPrice : regularPrice)} ج.م</del><span className="rounded-md bg-brand-cream px-2 py-1 text-xs font-black text-brand-green">وفر {discount}%</span></div>}
              <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                <strong className="text-4xl font-black tracking-tight text-slate-950">{money(displayPrice)}</strong>
                <span className="pb-1 text-sm font-black text-[#005931]">ج.م</span>
                {weighted && <span className="pb-1 text-xs font-bold text-slate-500">/ {formatWeightAmount(currentWeight)}</span>}
              </div>
              {company && <button type="button" onClick={() => navigate(`/company/${company.id}`)} className="mt-3 text-sm font-bold text-[#005931] underline decoration-emerald-200 underline-offset-4">منتجات {company.name}</button>}
            </div>

            <div className="mt-5 hidden md:block">
              {weighted ? weightedPurchaseControl : piecePurchaseControl}
              {activeCartItem && <button type="button" onClick={() => navigate('/cart')} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 text-sm font-bold text-[#005931]"><ShoppingCart size={17} />مراجعة السلة</button>}
            </div>
          </section>
        </div>

        <section className="mt-4 overflow-hidden rounded-[28px] bg-white px-5 shadow-[0_10px_35px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.035] sm:px-6">
          <Accordion type="single" collapsible defaultValue={product.description ? 'description' : undefined}>
            {product.description && (
              <AccordionItem value="description" className="border-slate-100">
                <AccordionTrigger className="py-5 text-base font-black text-slate-900 hover:no-underline">عن المنتج</AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-7 text-slate-600"><p className="whitespace-pre-line">{product.description}</p></AccordionContent>
              </AccordionItem>
            )}
            <AccordionItem value="details" className="border-slate-100">
              <AccordionTrigger className="py-5 text-base font-black text-slate-900 hover:no-underline">تفاصيل البيع</AccordionTrigger>
              <AccordionContent className="pb-5">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-2xl bg-[#f7f8f7] p-3"><span className="block text-xs text-slate-400">طريقة البيع</span><strong className="mt-1 block text-slate-800">{weighted ? 'بالوزن' : bulkMode ? bulkUnitType : 'بالقطعة'}</strong></div>
                  <div className="rounded-2xl bg-[#f7f8f7] p-3"><span className="block text-xs text-slate-400">الوحدة</span><strong className="mt-1 block text-slate-800">{unitDescription}</strong></div>
                  {bulkAvailable && <div className="col-span-2 rounded-2xl bg-emerald-50 p-3"><span className="block text-xs text-emerald-700">الجملة متاحة</span><strong className="mt-1 block text-[#005931]">{bulkUnitType} = {packNumber} قطعة · {money(Number(product.bulk_price || 0))} ج.م</strong></div>}
                </div>
              </AccordionContent>
            </AccordionItem>
            {company && (
              <AccordionItem value="brand" className="border-0">
                <AccordionTrigger className="py-5 text-base font-black text-slate-900 hover:no-underline">الشركة / البراند</AccordionTrigger>
                <AccordionContent className="pb-5"><button type="button" onClick={() => navigate(`/company/${company.id}`)} className="flex w-full items-center justify-between rounded-2xl bg-[#f7f8f7] p-4 text-right"><span><strong className="block text-slate-900">{company.name}</strong>{company.description && <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">{company.description}</span>}</span><span className="text-sm font-bold text-[#005931]">عرض المنتجات</span></button></AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </section>

        <div ref={desktopExtraTriggerRef} className="h-px" aria-hidden="true" />
        {shouldLoadExtras && (
          <React.Suspense fallback={<div className="mt-5 h-40 animate-pulse rounded-[26px] bg-slate-100" />}>
            <ProductSuggestions
              products={relatedProducts.filter(item => item.id !== product.id && (!requestedStoreId || item.marketplace_branch_id === requestedStoreId))}
              loading={relatedLoading}
              layout="desktop"
            />
          </React.Suspense>
        )}
      </main>
      )}

      {weightOpen && weighted && (
        <WeightSelector product={product} isOpen={weightOpen} onClose={() => setWeightOpen(false)} initialWeight={weightedCartItem ? currentWeight : weightStep} onSelect={applyWeight} />
      )}
    </DetailShell>
  );
};

export default ProductDetail;
