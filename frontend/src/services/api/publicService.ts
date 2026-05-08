import api from "./config";
import { ApiResponse } from "./admin/types";

export interface FAQ {
    _id: string;
    question: string;
    answer: string;
    category?: string;
    order: number;
}

/**
 * Get FAQs by category (Public)
 */
export const getPublicFAQs = async (category?: string): Promise<ApiResponse<FAQ[]>> => {
    const response = await api.get<ApiResponse<FAQ[]>>("/public/faqs", {
        params: { category }
    });
    return response.data;
};
