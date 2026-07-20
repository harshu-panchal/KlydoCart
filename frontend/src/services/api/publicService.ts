import api from "./config";
import { ApiResponse } from "./admin/types";

export interface FAQ {
    _id: string;
    question: string;
    answer: string;
    category?: string;
    order: number;
}

export interface PublicSettings {
    appName: string;
    supportEmail: string;
    supportPhone: string;
    contactEmail: string;
    contactPhone: string;
    companyWebsite: string;
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

/**
 * Get Public App Settings
 */
export const getPublicSettings = async (): Promise<ApiResponse<PublicSettings>> => {
    const response = await api.get<ApiResponse<PublicSettings>>("/public/settings");
    return response.data;
};
