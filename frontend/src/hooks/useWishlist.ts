import { useWishlistContext } from '../context/WishlistContext';

/**
 * Custom hook for managing wishlist state and toggle functionality
 * @param productId - The product ID to check/manage in wishlist
 * @returns Object with isWishlisted state and toggleWishlist function
 */
export function useWishlist(productId?: string) {
  const { isWishlisted: checkIsWishlisted, toggleWishlist: toggleWishlistItem } = useWishlistContext();

  const isWishlisted = productId ? checkIsWishlisted(productId) : false;

  const toggleWishlist = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      if ('preventDefault' in e) e.preventDefault();
      if ('stopPropagation' in e) e.stopPropagation();
    }

    if (!productId) return;
    await toggleWishlistItem(productId);
  };

  return { isWishlisted, toggleWishlist };
}

