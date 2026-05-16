import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  register,
  sendOTP,
  verifyOTP,
} from "../../../services/api/auth/deliveryAuthService";
import { uploadDocument } from "../../../services/api/uploadService";
import { validateDocumentFile } from "../../../utils/imageUpload";
import OTPInput from "../../../components/OTPInput";
import { useAuth } from "../../../context/AuthContext";

export default function DeliverySignUp() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    alternateMobile: "",
    email: "",
    dateOfBirth: "",
    age: "",
    fatherName: "",
    address: "",
    permanentAddress: "",
    city: "",
    state: "",
    pincode: "",
    emergencyContact: "",
    aadhaarNumber: "",
    panNumber: "",
    policeVerification: "No",
    vehicleType: "",
    vehicleNumber: "",
    drivingLicenseNumber: "",
    rcNumber: "",
    vehicleInsuranceNumber: "",
    insuranceValidTill: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
    ifscCode: "",
    branchName: "",
    upiId: "",
    password: "klydocart_partner",
  });

  const [files, setFiles] = useState<{
    profilePic: File | null;
    drivingLicense: File | null;
    nationalIdentityCard: File | null;
    marksheet: File | null;
    signature: File | null;
  }>({
    profilePic: null,
    drivingLicense: null,
    nationalIdentityCard: null,
    marksheet: null,
    signature: null,
  });

  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const vehicleTypes = ["Select Vehicle", "Bike", "Scooter", "Cycle"];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // 1. Strict Numeric Fields (Only digits allowed)
    if (["mobile", "alternateMobile", "emergencyContact", "aadhaarNumber", "pincode", "accountNumber", "age"].includes(name)) {
      let val = value.replace(/\D/g, ""); // Remove non-digits
      
      if (name === "mobile" || name === "alternateMobile" || name === "emergencyContact") val = val.slice(0, 10);
      if (name === "aadhaarNumber") val = val.slice(0, 12);
      if (name === "pincode") val = val.slice(0, 6);
      if (name === "age") val = val.slice(0, 2);
      if (name === "accountNumber") val = val.slice(0, 18);

      setFormData(prev => ({ ...prev, [name]: val }));
    } 
    // 2. Strict Alphabet Fields (Only letters and spaces allowed)
    else if (["name", "fatherName", "city", "state", "bankName", "accountName", "branchName"].includes(name)) {
      const val = value.replace(/[^a-zA-Z\s]/g, ""); // Remove non-alphabets
      setFormData(prev => ({ ...prev, [name]: val }));
    }
    // 3. Alphanumeric Fields (Uppercase and Alphanumeric only)
    else if (name === "ifscCode" || name === "panNumber" || name === "rcNumber" || name === "vehicleNumber" || name === "drivingLicenseNumber" || name === "vehicleInsuranceNumber") {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase().replace(/[^A-Z0-9]/g, "") }));
    } 
    // 4. Other Fields (Email, Addresses, etc.)
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files: inputFiles } = e.target;
    if (!inputFiles || !inputFiles[0]) return;

    const file = inputFiles[0];
    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      setError(validation.error || `Invalid ${name} file`);
      return;
    }

    setFiles(prev => ({ ...prev, [name]: file }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic required fields validation
    const requiredFields = ['name', 'mobile', 'email', 'address', 'city', 'pincode', 'bankName', 'accountName', 'accountNumber', 'ifscCode', 'aadhaarNumber', 'panNumber'];
    const missing = requiredFields.filter(f => !formData[f as keyof typeof formData]);
    
    if (missing.length > 0) {
      setError(`Please fill required fields: ${missing.join(', ')}`);
      return;
    }

    if (!formData.dateOfBirth) {
      setError("Date of Birth is required");
      return;
    }

    const birthDate = new Date(formData.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      setError("You must be at least 18 years old to register as a delivery partner");
      return;
    }

    if (!files.drivingLicense && formData.vehicleType !== 'Cycle') {
      setError("Driving License is required for motorized vehicles");
      return;
    }

    if (!files.nationalIdentityCard || !files.marksheet) {
      setError("Identity Card and Marksheet are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      setUploadingDocs(true);
      const uploadPromises = Object.entries(files).map(async ([key, file]) => {
        if (file) {
          const res = await uploadDocument(file, `klydocart/delivery/${key}`);
          return { [key]: res.secureUrl };
        }
        return { [key]: "" };
      });

      const uploadedUrlsArray = await Promise.all(uploadPromises);
      const uploadedUrls = uploadedUrlsArray.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      setUploadingDocs(false);

      const response = await register({
        ...formData,
        drivingLicense: uploadedUrls.drivingLicense,
        nationalIdentityCard: uploadedUrls.nationalIdentityCard,
        profilePic: uploadedUrls.profilePic,
        marksheet: uploadedUrls.marksheet,
        signature: uploadedUrls.signature,
      });

      if (response.success) {
        const otpRes = await sendOTP(formData.mobile);
        if (otpRes.sessionId) setSessionId(otpRes.sessionId);
        setShowOTP(true);
      }
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
      setUploadingDocs(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setLoading(true);
    try {
      const response = await verifyOTP(formData.mobile, otp, sessionId);
      if (response.success && response.data) {
        login(response.data.token, { ...response.data.user, userType: "Delivery" });
        navigate("/delivery");
      }
    } catch (err: any) {
      setError(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center p-4 sm:p-8 font-sans">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-neutral-100 overflow-hidden">
        <div className="bg-orange-600 p-8 text-white text-center">
          <h1 className="text-3xl font-black mb-2">Delivery Partner Registration</h1>
          <p className="text-orange-100 font-medium">Join KlydoCart Delivery Fleet</p>
        </div>

        <div className="p-6 sm:p-10">
          <AnimatePresence mode="wait">
            {!showOTP ? (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Details Section */}
                <section className="space-y-4">
                  <h2 className="text-sm font-black text-neutral-400 uppercase tracking-[0.2em] border-b pb-2">Personal Details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Full Name" name="name" value={formData.name} onChange={handleInputChange} required />
                    <InputField label="Mobile Number" name="mobile" value={formData.mobile} onChange={handleInputChange} required maxLength={10} />
                    <InputField label="Alternate Mobile" name="alternateMobile" value={formData.alternateMobile} onChange={handleInputChange} maxLength={10} />
                    <InputField label="Email ID" name="email" value={formData.email} onChange={handleInputChange} required type="email" />
                    <InputField 
                      label="Date of Birth" 
                      name="dateOfBirth" 
                      value={formData.dateOfBirth} 
                      onChange={handleInputChange} 
                      type="date" 
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                    />
                    <InputField label="Age" name="age" value={formData.age} onChange={handleInputChange} maxLength={2} />
                    <InputField label="Father's Name" name="fatherName" value={formData.fatherName} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-4 mt-4">
                    <InputField label="Current Address" name="address" value={formData.address} onChange={handleInputChange} required />
                    <InputField label="Permanent Address" name="permanentAddress" value={formData.permanentAddress} onChange={handleInputChange} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <InputField label="City" name="city" value={formData.city} onChange={handleInputChange} required />
                      <InputField label="State" name="state" value={formData.state} onChange={handleInputChange} />
                      <InputField label="PIN Code" name="pincode" value={formData.pincode} onChange={handleInputChange} required maxLength={6} />
                    </div>
                    <InputField label="Emergency Contact Number" name="emergencyContact" value={formData.emergencyContact} onChange={handleInputChange} maxLength={10} />
                  </div>
                </section>

                {/* Identity Details Section */}
                <section className="space-y-4">
                  <h2 className="text-sm font-black text-neutral-400 uppercase tracking-[0.2em] border-b pb-2">Identity Details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Aadhaar Number" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleInputChange} required maxLength={12} />
                    <InputField label="PAN Number" name="panNumber" value={formData.panNumber} onChange={handleInputChange} required maxLength={10} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                    <FileUpload label="Passport Size Photo" name="profilePic" onChange={handleFileChange} file={files.profilePic} />
                    <FileUpload label="National Identity Card" name="nationalIdentityCard" onChange={handleFileChange} file={files.nationalIdentityCard} required />
                    <FileUpload label="Higher Education Marksheet" name="marksheet" onChange={handleFileChange} file={files.marksheet} required />
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <span className="text-xs font-bold text-neutral-700">Police Verification:</span>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input type="radio" name="policeVerification" value="Yes" checked={formData.policeVerification === "Yes"} onChange={handleInputChange} className="accent-orange-600" /> Yes
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input type="radio" name="policeVerification" value="No" checked={formData.policeVerification === "No"} onChange={handleInputChange} className="accent-orange-600" /> No
                    </label>
                  </div>
                </section>

                {/* Vehicle Details Section */}
                <section className="space-y-4">
                  <h2 className="text-sm font-black text-neutral-400 uppercase tracking-[0.2em] border-b pb-2">Vehicle Details (Optional)</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-700">Vehicle Type</label>
                      <select name="vehicleType" value={formData.vehicleType} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 outline-none transition-all">
                        {vehicleTypes.map(v => <option key={v} value={v === "Select Vehicle" ? "" : v}>{v}</option>)}
                      </select>
                    </div>
                    <InputField label="Vehicle Number" name="vehicleNumber" value={formData.vehicleNumber} onChange={handleInputChange} />
                    <InputField label="Driving License Number" name="drivingLicenseNumber" value={formData.drivingLicenseNumber} onChange={handleInputChange} />
                    <InputField label="RC Number" name="rcNumber" value={formData.rcNumber} onChange={handleInputChange} />
                    <InputField label="Vehicle Insurance Number" name="vehicleInsuranceNumber" value={formData.vehicleInsuranceNumber} onChange={handleInputChange} />
                    <InputField label="Insurance Valid Till" name="insuranceValidTill" value={formData.insuranceValidTill} onChange={handleInputChange} type="date" />
                  </div>
                  {formData.vehicleType !== 'Cycle' && (
                    <div className="mt-4">
                      <FileUpload label="Upload Driving License" name="drivingLicense" onChange={handleFileChange} file={files.drivingLicense} required />
                    </div>
                  )}
                </section>

                {/* Bank Details Section */}
                <section className="space-y-4">
                  <h2 className="text-sm font-black text-neutral-400 uppercase tracking-[0.2em] border-b pb-2">Bank Details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Bank Name" name="bankName" value={formData.bankName} onChange={handleInputChange} required />
                    <InputField label="Account Holder Name" name="accountName" value={formData.accountName} onChange={handleInputChange} required />
                    <InputField label="Account Number" name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} required />
                    <InputField label="IFSC Code" name="ifscCode" value={formData.ifscCode} onChange={handleInputChange} required />
                    <InputField label="Branch Name" name="branchName" value={formData.branchName} onChange={handleInputChange} />
                    <InputField label="UPI ID (Optional)" name="upiId" value={formData.upiId} onChange={handleInputChange} />
                  </div>
                </section>

                {/* Verification Section */}
                <section className="space-y-4">
                  <h2 className="text-sm font-black text-neutral-400 uppercase tracking-[0.2em] border-b pb-2">Verification</h2>
                  <FileUpload label="Applicant Signature" name="signature" onChange={handleFileChange} file={files.signature} required />
                </section>

                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-xs font-bold">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || uploadingDocs}
                  className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/20 active:scale-[0.98] disabled:bg-neutral-200 disabled:text-neutral-400"
                >
                  {uploadingDocs ? "Uploading Documents..." : loading ? "Registering..." : "Submit Application"}
                </button>
              </form>
            ) : (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-black text-neutral-900 mb-2">Verify Mobile</h2>
                  <p className="text-neutral-500 text-sm font-medium">Enter OTP sent to +91 {formData.mobile}</p>
                </div>
                <OTPInput onComplete={handleOTPComplete} disabled={loading} />
                <button onClick={() => setShowOTP(false)} className="w-full py-3 text-neutral-500 font-bold text-xs uppercase tracking-widest">Edit Mobile Number</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function InputField({ label, name, value, onChange, required, type = "text", maxLength }: any) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-bold text-neutral-600 ml-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        placeholder={`Enter ${label.toLowerCase()}`}
        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 outline-none transition-all placeholder:text-neutral-300"
      />
    </div>
  );
}

function FileUpload({ label, name, onChange, file, required }: any) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-bold text-neutral-600 ml-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative group">
        <input
          type="file"
          name={name}
          onChange={onChange}
          accept="image/*"
          capture="environment"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className={`w-full py-3 px-4 border-2 border-dashed rounded-xl flex items-center justify-between transition-all ${file ? 'border-green-500 bg-green-50' : 'border-neutral-200 bg-neutral-50 hover:border-orange-400'}`}>
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={file ? "#22c55e" : "#94a3b8"} strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            <span className={`text-[10px] font-bold uppercase ${file ? 'text-green-700' : 'text-neutral-400'}`}>
              {file ? "File Selected" : "Tap to Upload"}
            </span>
          </div>
          {file && (
            <span className="text-[9px] font-medium text-green-600 bg-white px-2 py-0.5 rounded-full border border-green-100">
              {file.name.slice(0, 15)}...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
