import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useLocation } from '../hooks/useLocation';
import { getWishlist as fetchWishlistApi, addToWishlist as addToWishlistApi, removeFromWishlist as removeFromWishlistApi } from '../services/api/customerWishlistService';
import { useToast } from './ToastContext';

interface WishlistContextType {
  wishlistItems: any[];
  isLoading: boolean;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const { location } = useLocation();
  const { showToast } = useToast();

  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlistItems([]);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetchWishlistApi({
        latitude: location?.latitude,
        longitude: location?.longitude
      });
      if (res.success && res.data && res.data.products) {
        setWishlistItems(res.data.products);
      }
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, location?.latitude, location?.longitude]);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const isWishlisted = useCallback((productId: string) => {
    return wishlistItems.some(p => String(p._id || p.id) === String(productId));
  }, [wishlistItems]);

  const toggleWishlist = async (productId: string) => {
    if (!isAuthenticated) {
      showToast('Please login to manage wishlist', 'error');
      return;
    }

    const itemExists = isWishlisted(productId);
    const previousItems = [...wishlistItems];

    try {
      if (itemExists) {
        // Optimistic update
        setWishlistItems(prev => prev.filter(p => String(p._id || p.id) !== String(productId)));
        await removeFromWishlistApi(productId);
        showToast('Removed from wishlist');
      } else {
        if (!location?.latitude || !location?.longitude) {
          showToast('Location is required to add items to wishlist', 'error');
          return;
        }
        // For optimistic add, we might not have full product data, but ID is enough for the heart icon
        setWishlistItems(prev => [...prev, { _id: productId }]);
        await addToWishlistApi(productId, location.latitude, location.longitude);
        showToast('Added to wishlist');
      }
      // Re-fetch to get full product data if needed
      await refreshWishlist();
    } catch (error: any) {
      setWishlistItems(previousItems);
      const errorMessage = error.response?.data?.message || 'Failed to update wishlist';
      showToast(errorMessage, 'error');
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlistItems, isLoading, isWishlisted, toggleWishlist, refreshWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlistContext = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlistContext must be used within a WishlistProvider');
  }
  return context;
};
