import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getProfile, updateProfile } from '../../../services/api/delivery/deliveryService';
import { uploadDocument } from '../../../services/api/uploadService';
import { useDeliveryUser } from '../context/DeliveryUserContext';
import DeliveryHeader from '../components/DeliveryHeader';
import DeliveryBottomNav from '../components/DeliveryBottomNav';

export default function DeliveryProfile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const { setUserName } = useDeliveryUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profileData, setProfileData] = useState<any>({
    name: '', mobile: '', alternateMobile: '', email: '', dateOfBirth: '',
    age: '', fatherName: '', address: '', permanentAddress: '', city: '',
    state: '', pincode: '', emergencyContact: '', profilePic: '',
    drivingLicense: '', nationalIdentityCard: '', aadhaarNumber: '',
    panNumber: '', marksheet: '', policeVerification: 'No', signature: '',
    vehicleType: '', vehicleNumber: '', drivingLicenseNumber: '',
    rcNumber: '', vehicleInsuranceNumber: '', insuranceValidTill: '',
    bankName: '', accountName: '', accountNumber: '', ifscCode: '',
    branchName: '', upiId: '', createdAt: '', totalDeliveries: 0, rating: 4.8
  });

  const [newFiles, setNewFiles] = useState<any>({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await getProfile();
      if (data) {
        setProfileData({
          ...data,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : '',
          insuranceValidTill: data.insuranceValidTill ? new Date(data.insuranceValidTill).toISOString().split('T')[0] : '',
          totalDeliveries: data.totalDeliveredCount || 0,
          rating: 4.8
        });
        if (data.name) setUserName(data.name);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    let val = value;
    
    // Numeric Filters
    if (["mobile", "alternateMobile", "emergencyContact", "aadhaarNumber", "pincode", "accountNumber", "age"].includes(field)) {
      val = value.replace(/\D/g, "");
      if (["mobile", "alternateMobile", "emergencyContact"].includes(field)) val = val.slice(0, 10);
      if (field === "aadhaarNumber") val = val.slice(0, 12);
      if (field === "pincode") val = val.slice(0, 6);
      if (field === "accountNumber") val = val.slice(0, 18);
    } 
    // Alphabet Filters
    else if (["name", "fatherName", "city", "state", "bankName", "accountName", "branchName"].includes(field)) {
      val = value.replace(/[^a-zA-Z\s]/g, "");
    }
    // Alphanumeric Upper Filters
    else if (["ifscCode", "panNumber", "rcNumber", "vehicleNumber", "drivingLicenseNumber", "vehicleInsuranceNumber"].includes(field)) {
      val = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    }

    setProfileData((prev: any) => ({ ...prev, [field]: val }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setNewFiles((prev: any) => ({ ...prev, [name]: files[0] }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const uploadedUrls: any = {};
      const fileEntries = Object.entries(newFiles);
      
      for (const [key, file] of fileEntries) {
        const res = await uploadDocument(file as File, `klydocart/delivery/${key}`);
        uploadedUrls[key] = res.secureUrl;
      }

      // Prepare clean data for update
      const updatePayload = { ...profileData, ...uploadedUrls };
      
      // Remove system/computed fields
      const { _id, id, __v, createdAt, updatedAt, rating, totalDeliveries, ...cleanData } = updatePayload;

      const response = await updateProfile(cleanData);
      if (response) {
        setProfileData((prev: any) => ({ ...prev, ...uploadedUrls, ...response }));
        setNewFiles({});
        setIsEditing(false);
        if (profileData.name) setUserName(profileData.name);
        alert('Profile updated successfully!');
      }
    } catch (error) {
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 pb-24 font-sans text-neutral-900">
      <DeliveryHeader />
      
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Top Navigation & Action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2.5 bg-white rounded-2xl shadow-sm border border-neutral-100 active:scale-95 transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <h1 className="text-2xl font-black tracking-tight">Profile Settings</h1>
          </div>
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={saving}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-[0.98] ${
              isEditing 
                ? 'bg-green-600 text-white shadow-green-600/20 hover:bg-green-700' 
                : 'bg-orange-600 text-white shadow-orange-600/20 hover:bg-orange-700'
            }`}
          >
            {saving ? 'Saving...' : isEditing ? 'Save Profile' : 'Edit Profile'}
          </button>
        </div>

        {/* Profile Identity Card */}
        <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-neutral-200/50 border border-neutral-100 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full -mr-32 -mt-32 opacity-40 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-full -ml-32 -mb-32 opacity-40 blur-3xl" />
          
          <div className="relative inline-block mb-6">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-orange-400 to-orange-600 p-1 shadow-2xl rotate-3">
              <div className="w-full h-full bg-white rounded-[1.25rem] overflow-hidden rotate-[-3deg] transition-transform hover:rotate-0 duration-500">
                {newFiles.profilePic ? (
                  <img src={URL.createObjectURL(newFiles.profilePic)} className="w-full h-full object-cover" />
                ) : profileData.profilePic ? (
                  <img src={profileData.profilePic} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-orange-50 text-orange-600 font-black text-4xl">
                    {profileData.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            {isEditing && (
              <label className="absolute -bottom-2 -right-2 bg-white p-3 rounded-2xl shadow-xl border border-neutral-100 cursor-pointer hover:bg-neutral-50 transition-all group active:scale-90">
                <input type="file" name="profilePic" accept="image/*" className="hidden" onChange={handleFileChange} />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-orange-600"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </label>
            )}
          </div>
          
          <h2 className="text-2xl font-black text-neutral-900 mb-1">{profileData.name || 'Set Name'}</h2>
          <p className="text-neutral-500 font-bold text-sm uppercase tracking-widest">{profileData.mobile}</p>
          
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="bg-green-50 text-green-700 px-4 py-1.5 rounded-xl text-[10px] font-black border border-green-100 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              VERIFIED PARTNER
            </div>
            <div className="bg-orange-50 text-orange-700 px-4 py-1.5 rounded-xl text-[10px] font-black border border-orange-100 flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              {profileData.rating} RATING
            </div>
          </div>
        </div>

        {/* Information Sections */}
        <div className="grid grid-cols-1 gap-6">
          <Section title="Personal Information" icon="👤">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <Field label="Full Name" value={profileData.name} editing={isEditing} onChange={(v: string) => handleInputChange('name', v)} />
              <Field label="Mobile Number" value={profileData.mobile} editing={isEditing} onChange={(v: string) => handleInputChange('mobile', v)} />
              <Field label="Alternate Mobile" value={profileData.alternateMobile} editing={isEditing} onChange={(v: string) => handleInputChange('alternateMobile', v)} />
              <Field label="Email Address" value={profileData.email} editing={isEditing} onChange={(v: string) => handleInputChange('email', v)} type="email" />
              <Field label="Date of Birth" value={profileData.dateOfBirth} editing={isEditing} onChange={(v: string) => handleInputChange('dateOfBirth', v)} type="date" />
              <Field label="Age" value={profileData.age} editing={isEditing} onChange={(v: string) => handleInputChange('age', v)} />
              <Field label="Father's Name" value={profileData.fatherName} editing={isEditing} onChange={(v: string) => handleInputChange('fatherName', v)} />
              <Field label="Emergency Contact" value={profileData.emergencyContact} editing={isEditing} onChange={(v: string) => handleInputChange('emergencyContact', v)} />
            </div>
            <div className="mt-5 space-y-5 border-t border-neutral-50 pt-5">
              <Field label="Current Address" value={profileData.address} editing={isEditing} onChange={(v: string) => handleInputChange('address', v)} />
              <Field label="Permanent Address" value={profileData.permanentAddress} editing={isEditing} onChange={(v: string) => handleInputChange('permanentAddress', v)} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <Field label="City" value={profileData.city} editing={isEditing} onChange={(v: string) => handleInputChange('city', v)} />
                <Field label="State" value={profileData.state} editing={isEditing} onChange={(v: string) => handleInputChange('state', v)} />
                <Field label="PIN Code" value={profileData.pincode} editing={isEditing} onChange={(v: string) => handleInputChange('pincode', v)} />
              </div>
            </div>
          </Section>

          <Section title="Identity & Documents" icon="🪪">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mb-8">
              <Field label="Aadhaar Number" value={profileData.aadhaarNumber} editing={isEditing} onChange={(v: string) => handleInputChange('aadhaarNumber', v)} />
              <Field label="PAN Number" value={profileData.panNumber} editing={isEditing} onChange={(v: string) => handleInputChange('panNumber', v)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <DocumentBox label="Aadhaar Card / ID" url={profileData.nationalIdentityCard} newFile={newFiles.nationalIdentityCard} editing={isEditing} name="nationalIdentityCard" onFileChange={handleFileChange} />
              <DocumentBox label="Educational Marksheet" url={profileData.marksheet} newFile={newFiles.marksheet} editing={isEditing} name="marksheet" onFileChange={handleFileChange} />
            </div>
            <div className="mt-6 p-4 bg-neutral-50 rounded-2xl flex items-center justify-between">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Police Verification</span>
              <span className={`px-4 py-1 rounded-full text-[10px] font-black border ${profileData.policeVerification === 'Yes' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                {profileData.policeVerification === 'Yes' ? 'COMPLETED' : 'PENDING'}
              </span>
            </div>
          </Section>

          <Section title="Vehicle Details" icon="🛵">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <Field label="Vehicle Type" value={profileData.vehicleType} editing={isEditing} onChange={(v: string) => handleInputChange('vehicleType', v)} />
              <Field label="Vehicle Number" value={profileData.vehicleNumber} editing={isEditing} onChange={(v: string) => handleInputChange('vehicleNumber', v)} />
              <Field label="DL Number" value={profileData.drivingLicenseNumber} editing={isEditing} onChange={(v: string) => handleInputChange('drivingLicenseNumber', v)} />
              <Field label="RC Number" value={profileData.rcNumber} editing={isEditing} onChange={(v: string) => handleInputChange('rcNumber', v)} />
              <Field label="Insurance Number" value={profileData.vehicleInsuranceNumber} editing={isEditing} onChange={(v: string) => handleInputChange('vehicleInsuranceNumber', v)} />
              <Field label="Insurance Valid Till" value={profileData.insuranceValidTill} editing={isEditing} onChange={(v: string) => handleInputChange('insuranceValidTill', v)} type="date" />
            </div>
            <div className="mt-8">
              <DocumentBox label="Driving License Copy" url={profileData.drivingLicense} newFile={newFiles.drivingLicense} editing={isEditing} name="drivingLicense" onFileChange={handleFileChange} />
            </div>
          </Section>

          <Section title="Banking Information" icon="🏦">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <Field label="Bank Name" value={profileData.bankName} editing={isEditing} onChange={(v: string) => handleInputChange('bankName', v)} />
              <Field label="Account Holder" value={profileData.accountName} editing={isEditing} onChange={(v: string) => handleInputChange('accountName', v)} />
              <Field label="Account Number" value={profileData.accountNumber} editing={isEditing} onChange={(v: string) => handleInputChange('accountNumber', v)} />
              <Field label="IFSC Code" value={profileData.ifscCode} editing={isEditing} onChange={(v: string) => handleInputChange('ifscCode', v)} />
              <Field label="Branch Name" value={profileData.branchName} editing={isEditing} onChange={(v: string) => handleInputChange('branchName', v)} />
              <Field label="UPI ID" value={profileData.upiId} editing={isEditing} onChange={(v: string) => handleInputChange('upiId', v)} />
            </div>
          </Section>

          <Section title="Final Verification" icon="🖋️">
             <DocumentBox label="Applicant Signature" url={profileData.signature} newFile={newFiles.signature} editing={isEditing} name="signature" onFileChange={handleFileChange} />
          </Section>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm text-center group hover:border-orange-200 transition-all">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-2">Member Since</p>
              <p className="text-xl font-black text-neutral-900">{profileData.createdAt ? new Date(profileData.createdAt).getFullYear() : '2024'}</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm text-center group hover:border-orange-200 transition-all">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-2">Deliveries</p>
              <p className="text-xl font-black text-neutral-900">{profileData.totalDeliveries || '0'}</p>
            </div>
          </div>
        </div>
      </div>
      
      <DeliveryBottomNav />
    </div>
  );
}

function Section({ title, icon, children }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white rounded-[2rem] shadow-xl shadow-neutral-200/40 border border-neutral-100 overflow-hidden">
      <div className="px-8 py-5 bg-neutral-50/50 border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <h3 className="text-xs font-black text-neutral-800 uppercase tracking-[0.2em]">{title}</h3>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-neutral-200" />
      </div>
      <div className="p-8">
        {children}
      </div>
    </motion.div>
  );
}

function Field({ label, value, editing, onChange, type = "text" }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">{label}</label>
      {editing ? (
        <input 
          type={type} 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-5 py-3 bg-neutral-50 border-2 border-neutral-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all"
          placeholder={`Enter ${label}`}
        />
      ) : (
        <div className="px-5 py-3 bg-neutral-50/30 rounded-2xl border border-transparent">
          <p className="text-sm font-black text-neutral-800">{value || '—'}</p>
        </div>
      )}
    </div>
  );
}

function DocumentBox({ label, url, newFile, editing, name, onFileChange }: any) {
  const displayUrl = newFile ? URL.createObjectURL(newFile) : url;
  
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group rounded-[1.5rem] overflow-hidden border-2 border-neutral-100 aspect-[16/10] bg-neutral-50 shadow-inner">
        {displayUrl ? (
          <>
            <img src={displayUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3">
              <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="bg-white text-neutral-900 px-6 py-2.5 rounded-2xl text-[10px] font-black tracking-widest uppercase shadow-2xl active:scale-95">View Document</a>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-neutral-300">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Pending Upload</span>
          </div>
        )}
      </div>
      {editing && (
        <div className="relative group">
          <input type="file" name={name} accept="image/*" onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          <div className="w-full py-3.5 bg-neutral-100 text-neutral-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-neutral-200 group-hover:border-orange-400 group-hover:text-orange-600 transition-all text-center">
            {displayUrl ? 'Replace Document' : 'Upload Document'}
          </div>
        </div>
      )}
    </div>
  );
}
