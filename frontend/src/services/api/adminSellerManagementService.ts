import api from "./config";
import { ApiResponse, Seller } from "./sellerService";

export interface AdminProduct {
    _id: string;
    productName: string;
    price: number;
    discPrice?: number;
    compareAtPrice?: number;
    stock: number;
    category: {
        _id: string;
        name: string;
    };
    mainImage?: string;
    status: string;
    publish: boolean;
}

export interface SellerDetailResponse {
    seller: Seller;
    products: AdminProduct[];
    categories: any[];
}

/**
 * Get all sellers for management
 */
export const getAllSellersForManage = async (): Promise<ApiResponse<Seller[]>> => {
    const response = await api.get<ApiResponse<Seller[]>>("/admin/sellers-manage/list");
    return response.data;
};

/**
 * Get seller details with products
 */
export const getSellerDetailsForManage = async (id: string): Promise<ApiResponse<SellerDetailResponse>> => {
    const response = await api.get<ApiResponse<SellerDetailResponse>>(`/admin/sellers-manage/${id}`);
    return response.data;
};

/**
 * Add product for a seller
 */
export const addSellerProduct = async (sellerId: string, data: any): Promise<ApiResponse<AdminProduct>> => {
    const response = await api.post<ApiResponse<AdminProduct>>(`/admin/sellers-manage/${sellerId}/product`, data);
    return response.data;
};

/**
 * Update a seller product
 */
export const updateSellerProduct = async (productId: string, data: any): Promise<ApiResponse<AdminProduct>> => {
    const response = await api.put<ApiResponse<AdminProduct>>(`/admin/sellers-manage/products/${productId}`, data);
    return response.data;
};

/**
 * Delete a seller product
 */
export const deleteSellerProduct = async (productId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/admin/sellers-manage/products/${productId}`);
    return response.data;
};
