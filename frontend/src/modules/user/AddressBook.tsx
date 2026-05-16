import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Address,
  deleteAddress,
  getAddresses,
  updateAddress,
} from "../../services/api/customerAddressService";
import { useThemeContext } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";

const iconStyle = "w-5 h-5 text-amber-600 flex-shrink-0";

function buildAddressLine(address: Address) {
  const parts = [
    address.address,
    address.landmark,
    address.city,
    address.state,
    address.pincode,
  ].filter(Boolean);
  return parts.join(", ");
}

export default function AddressBook() {
  const navigate = useNavigate();
  const { currentTheme } = useThemeContext();
  const { showToast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAddresses();
      if (res.success && Array.isArray(res.data)) {
        setAddresses(res.data as Address[]);
      } else {
        setError(res.message || "Failed to load addresses");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load addresses"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleShare = async (address: Address) => {
    const text = `${address.fullName || "Address"}\n${buildAddressLine(
      address
    )}\nPhone: ${address.phone}`;
    
    // If mobile/native share is available, use it
    if (navigator.share) {
      try {
        await navigator.share({ title: "Saved address", text });
        return;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          showToast("Failed to share address", "error");
        }
        return;
      }
    }

    // Otherwise (Desktop), toggle custom menu
    setActiveShareId(activeShareId === address._id ? null : (address._id || null));
  };

  const handleWhatsAppShare = (address: Address) => {
    const text = `Saved Address from KlydoCart:\n${address.fullName || "Address"}\n${buildAddressLine(address)}\nPhone: ${address.phone}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setActiveShareId(null);
  };

  const handleCopyLink = async (address: Address) => {
    const text = `${address.fullName || "Address"}\n${buildAddressLine(address)}\nPhone: ${address.phone}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Address copied to clipboard", "success");
    } catch (err) {
      showToast("Failed to copy address", "error");
    }
    setActiveShareId(null);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm("Remove this address?")) return;
    try {
      setBusyId(id);
      await deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a._id !== id));
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to delete address"
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleMakeDefault = async (id?: string) => {
    if (!id) return;
    try {
      setBusyId(id);
      await updateAddress(id, { isDefault: true });
      // Optimistically mark default locally
      setAddresses((prev) =>
        prev.map((addr) => ({ ...addr, isDefault: addr._id === id }))
      );
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to mark as default"
      );
    } finally {
      setBusyId(null);
    }
  };

  const defaultBadge = useMemo(
    () => (
      <span className="ml-2 inline-flex items-center px-2 py-0.5 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-100 rounded-full">
        Default
      </span>
    ),
    []
  );

  return (
    <div className="min-h-screen bg-white md:bg-neutral-50 pb-24 md:pb-10">
      <div 
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3 shadow-md"
        style={{
          background: `linear-gradient(to right, ${currentTheme.primary[0]}, ${currentTheme.primary[1]})`,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18L9 12L15 6" />
          </svg>
        </button>
        <div>
          <p className="text-[10px] text-white/80 font-medium">Your saved addresses</p>
          <h1 className="text-base font-bold text-white">
            Address book
          </h1>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => navigate("/checkout/address")}
            className="px-3 py-1.5 text-sm font-bold text-teal-800 bg-white rounded-full hover:bg-neutral-50 shadow-sm"
          >
            Add new
          </button>
        </div>
      </div>

      <div className="px-4 md:px-6 pt-4 pb-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 border border-red-100 rounded-lg p-4 text-sm">
            {error}
          </div>
        ) : addresses.length === 0 ? (
          <div className="bg-white border border-dashed border-neutral-200 rounded-lg p-6 text-center">
            <p className="text-neutral-700 font-semibold mb-1">
              No addresses yet
            </p>
            <p className="text-sm text-neutral-500 mb-3">
              Save an address to checkout faster next time.
            </p>
            <button
              onClick={() => navigate("/checkout/address")}
              className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-full hover:bg-teal-700"
            >
              Add address
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => {
              const isBusy = busyId === addr._id;
              return (
                <div
                  key={addr._id || addr.phone}
                  className="bg-white border border-neutral-200 rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-3 transition hover:shadow-md"
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <svg
                        viewBox="0 0 24 24"
                        className={iconStyle}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M3 9.5 12 3l9 6.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />
                        <path d="M9 21V12h6v9" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-1">
                        <span className="text-sm font-semibold text-neutral-900">
                          {addr.type || "Home"}
                        </span>
                        {addr.isDefault && defaultBadge}
                      </div>
                      <p className="text-xs text-green-700 font-semibold mt-0.5">
                        Saved address
                      </p>
                      <p className="text-sm text-neutral-800 leading-relaxed mt-2">
                        {buildAddressLine(addr)}
                      </p>
                      <p className="text-sm text-neutral-700 mt-1">
                        Phone number: {addr.phone || "Not added"}
                      </p>
                      <div className="flex items-center gap-3 mt-3 text-teal-700">
                          <div className="relative">
                            <button
                              onClick={() => handleShare(addr)}
                              className="flex items-center gap-1 text-sm font-semibold hover:text-teal-800"
                              disabled={isBusy}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle cx="18" cy="5" r="3" />
                                <circle cx="6" cy="12" r="3" />
                                <circle cx="18" cy="19" r="3" />
                                <path d="m8.59 13.51 6.83 3.98" />
                                <path d="m15.41 6.51-6.82 3.98" />
                              </svg>
                              Share
                            </button>
                            
                            {activeShareId === addr._id && (
                              <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl shadow-2xl border border-neutral-100 py-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <button 
                                  onClick={() => handleWhatsAppShare(addr)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="currentColor"/></svg>
                                  WhatsApp
                                </button>
                                <button 
                                  onClick={() => handleCopyLink(addr)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                  Copy Text
                                </button>
                              </div>
                            )}
                          </div>
                        <button
                          onClick={() => handleMakeDefault(addr._id)}
                          className="flex items-center gap-1 text-sm font-semibold hover:text-teal-800 disabled:text-neutral-400"
                          disabled={isBusy || addr.isDefault}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m9 11 3 3L22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                          </svg>
                          {addr.isDefault ? "Default" : "Set default"}
                        </button>
                        <button
                          onClick={() => handleDelete(addr._id)}
                          className="flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700 disabled:text-neutral-400"
                          disabled={isBusy}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" />
                            <path d="M10 11h4" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

