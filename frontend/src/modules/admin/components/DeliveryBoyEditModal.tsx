import { useState, useEffect } from 'react';
import { DeliveryBoy, UpdateDeliveryBoyData } from '../../../../src/services/api/admin/adminDeliveryService';

interface DeliveryBoyEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    deliveryBoy: DeliveryBoy | null;
    onSave: (id: string, data: UpdateDeliveryBoyData) => Promise<void>;
    processing: boolean;
}

export default function DeliveryBoyEditModal({ isOpen, onClose, deliveryBoy, onSave, processing }: DeliveryBoyEditModalProps) {
    const [formData, setFormData] = useState<UpdateDeliveryBoyData>({});

    useEffect(() => {
        if (deliveryBoy) {
            setFormData({
                name: deliveryBoy.name,
                mobile: deliveryBoy.mobile,
                dateOfBirth: deliveryBoy.dateOfBirth,
                address: deliveryBoy.address,
                city: deliveryBoy.city,
                pincode: deliveryBoy.pincode,
                bankAccountNumber: deliveryBoy.bankAccountNumber,
                bankName: deliveryBoy.bankName,
                accountName: deliveryBoy.accountName,
                ifscCode: deliveryBoy.ifscCode,
                otherPaymentInformation: deliveryBoy.otherPaymentInformation,
                bonusType: deliveryBoy.bonusType,
                commissionType: deliveryBoy.commissionType,
                commission: deliveryBoy.commission,
                minAmount: deliveryBoy.minAmount,
                maxAmount: deliveryBoy.maxAmount,
                status: deliveryBoy.status,
                available: deliveryBoy.available,
            });
        }
    }, [deliveryBoy]);

    if (!isOpen || !deliveryBoy) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(deliveryBoy._id, formData);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="bg-teal-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Edit Delivery Boy</h3>
                            <p className="text-teal-50 text-xs opacity-80 decoration-none">ID: {deliveryBoy._id}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/10 p-2 rounded-full transition-colors"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-neutral-200">
                    <form id="editDeliveryBoyForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Basic Info */}
                        <div className="col-span-1 md:col-span-2">
                            <h4 className="text-lg font-semibold border-b pb-2 mb-4">Basic Information</h4>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name || ''}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Mobile</label>
                            <input
                                type="text"
                                name="mobile"
                                value={formData.mobile || ''}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Date of Birth</label>
                            <input
                                type="date"
                                name="dateOfBirth"
                                value={formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : ''}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            />
                        </div>
                        
                        {/* Address Info */}
                        <div className="col-span-1 md:col-span-2 mt-4">
                            <h4 className="text-lg font-semibold border-b pb-2 mb-4">Address Details</h4>
                        </div>
                        
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Address</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address || ''}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">City</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city || ''}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Pincode</label>
                            <input
                                type="text"
                                name="pincode"
                                value={formData.pincode || ''}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            />
                        </div>

                        {/* Bank Details */}
                        <div className="col-span-1 md:col-span-2 mt-4">
                            <h4 className="text-lg font-semibold border-b pb-2 mb-4">Bank Details</h4>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Bank Name</label>
                            <input
                                type="text"
                                name="bankName"
                                value={formData.bankName || ''}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Account Name</label>
                            <input
                                type="text"
                                name="accountName"
                                value={formData.accountName || ''}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Account Number</label>
                            <input
                                type="text"
                                name="bankAccountNumber"
                                value={formData.bankAccountNumber || ''}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">IFSC Code</label>
                            <input
                                type="text"
                                name="ifscCode"
                                value={formData.ifscCode || ''}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            />
                        </div>

                        {/* Commission Details */}
                        <div className="col-span-1 md:col-span-2 mt-4">
                            <h4 className="text-lg font-semibold border-b pb-2 mb-4">Commission Details</h4>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Commission Type</label>
                            <select
                                name="commissionType"
                                value={formData.commissionType || 'Fixed'}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            >
                                <option value="Fixed">Fixed</option>
                                <option value="Percentage">Percentage</option>
                            </select>
                        </div>

                        {formData.commissionType === 'Percentage' && (
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Commission (%)</label>
                                <input
                                    type="number"
                                    name="commission"
                                    value={formData.commission || 0}
                                    onChange={handleChange}
                                    min="0"
                                    max="100"
                                    className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Bonus Type</label>
                            <input
                                type="text"
                                name="bonusType"
                                value={formData.bonusType || ''}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            />
                        </div>

                        {/* System Status */}
                        <div className="col-span-1 md:col-span-2 mt-4">
                            <h4 className="text-lg font-semibold border-b pb-2 mb-4">System Status</h4>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
                            <select
                                name="status"
                                value={formData.status || 'Active'}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Availability</label>
                            <select
                                name="available"
                                value={formData.available || 'Available'}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            >
                                <option value="Available">Available</option>
                                <option value="Not Available">Not Available</option>
                            </select>
                        </div>
                    </form>
                </div>

                {/* Modal Footer */}
                <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-200 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="editDeliveryBoyForm"
                        disabled={processing}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing && (
                            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                        )}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
