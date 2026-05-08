import api from './config';

export interface StockNotificationSubscription {
  _id: string;
  customerId: string;
  productId: any;
  variantId?: string;
  isNotified: boolean;
  notifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Subscribe to stock notification for a product
 */
export const subscribeToStockNotification = async (
  productId: string,
  variantId?: string
): Promise<{ success: boolean; message: string; data?: StockNotificationSubscription }> => {
  try {
    const response = await api.post('/customer/stock-notifications', {
      productId,
      variantId,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error subscribing to stock notification:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to subscribe to stock notification',
    };
  }
};

/**
 * Get all stock notification subscriptions
 */
export const getStockNotifications = async (): Promise<{
  success: boolean;
  data?: StockNotificationSubscription[];
  message?: string;
}> => {
  try {
    const response = await api.get('/customer/stock-notifications');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching stock notifications:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch stock notifications',
    };
  }
};

/**
 * Check if customer is subscribed to a product
 */
export const checkSubscription = async (
  productId: string,
  variantId?: string
): Promise<{
  success: boolean;
  data?: { isSubscribed: boolean; subscription: StockNotificationSubscription | null };
  message?: string;
}> => {
  try {
    const url = variantId
      ? `/customer/stock-notifications/check/${productId}?variantId=${variantId}`
      : `/customer/stock-notifications/check/${productId}`;
    const response = await api.get(url);
    return response.data;
  } catch (error: any) {
    console.error('Error checking subscription:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to check subscription',
    };
  }
};

/**
 * Unsubscribe from stock notification
 */
export const unsubscribeFromStockNotification = async (
  subscriptionId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.delete(`/customer/stock-notifications/${subscriptionId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error unsubscribing:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to unsubscribe',
    };
  }
};
