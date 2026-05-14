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
  const [errors, setErrors] = useState<any>({});
  const [expandedSections, setExpandedSections] = useState<string[]>(['Personal Information']);
  
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

  const toggleSection = (title: string) => {
    setExpandedSections(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

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
    // Alphanumeric Upper Filters (Allow spaces in vehicleNumber)
    else if (["ifscCode", "panNumber", "rcNumber", "vehicleNumber", "drivingLicenseNumber", "vehicleInsuranceNumber"].includes(field)) {
      val = value.toUpperCase().replace(/[^A-Z0-9\s]/g, "");
    }

    setProfileData((prev: any) => ({ ...prev, [field]: val }));

    // Real-time Validation
    if (field === 'email') {
      const isValid = !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      setErrors((prev: any) => ({ ...prev, email: isValid ? '' : 'Correct format: name@example.com' }));
    }
    if (field === 'vehicleNumber') {
      const isValid = !val || /^[A-Z]{2}\s[0-9]{2}\s[A-Z]{1,2}\s[0-9]{4}$/.test(val);
      setErrors((prev: any) => ({ ...prev, vehicleNumber: isValid ? '' : 'Correct format: KA 01 AB 1234' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setNewFiles((prev: any) => ({ ...prev, [name]: files[0] }));
    }
  };

  const handleSave = async () => {
    // Check for existing validation errors
    const errorList = Object.values(errors).filter(e => e !== '');
    if (errorList.length > 0) {
      alert("Please fix the errors before saving.");
      return;
    }

    if (profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      setErrors((prev: any) => ({ ...prev, email: 'Correct format: name@example.com' }));
      return;
    }

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
    } catch (error: any) {
      console.error('Update Profile Error:', error);
      alert(error.message || 'Failed to update profile. Please try again.');
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
      <div className="max-w-2xl mx-auto px-3 py-4 space-y-4">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-neutral-100 active:scale-95">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <h1 className="text-xl font-black tracking-tight text-neutral-800">Profile</h1>
          </div>
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={saving}
            className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md ${
              isEditing 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            {saving ? 'Saving...' : isEditing ? 'Save' : 'Edit'}
          </button>
        </div>

        {/* Compact Identity Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-neutral-100 text-center relative overflow-hidden">
          <div className="relative inline-block mb-3">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 p-0.5 shadow-lg">
              <div className="w-full h-full bg-white rounded-[0.9rem] overflow-hidden">
                {newFiles.profilePic ? (
                  <img src={URL.createObjectURL(newFiles.profilePic)} className="w-full h-full object-cover" />
                ) : profileData.profilePic ? (
                  <img src={profileData.profilePic} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-orange-50 text-orange-600 font-black text-3xl">
                    {profileData.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            {isEditing && (
              <label className="absolute -bottom-1 -right-1 bg-white p-2 rounded-xl shadow-lg border border-neutral-100 cursor-pointer active:scale-90">
                <input type="file" name="profilePic" accept="image/*" className="hidden" onChange={handleFileChange} />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-orange-600"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </label>
            )}
          </div>
          <h2 className="text-lg font-black text-neutral-900">{profileData.name || 'Partner Name'}</h2>
          <p className="text-neutral-500 font-bold text-xs">{profileData.mobile}</p>
          
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-[8px] font-black border border-green-100">VERIFIED</div>
            <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded-lg text-[8px] font-black border border-orange-100 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              {profileData.rating}
            </div>
          </div>
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-3">
          <Section 
            title="Personal Information" 
            icon="👤" 
            expanded={expandedSections.includes('Personal Information')}
            onToggle={() => toggleSection('Personal Information')}
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="col-span-2"><Field label="Full Name" value={profileData.name} editing={isEditing} onChange={(v: string) => handleInputChange('name', v)} /></div>
              <Field label="Mobile" value={profileData.mobile} editing={isEditing} onChange={(v: string) => handleInputChange('mobile', v)} />
              <Field label="Alternate" value={profileData.alternateMobile} editing={isEditing} onChange={(v: string) => handleInputChange('alternateMobile', v)} />
              <div className="col-span-2"><Field label="Email" value={profileData.email} editing={isEditing} onChange={(v: string) => handleInputChange('email', v)} type="email" error={errors.email} /></div>
              <Field label="DOB" value={profileData.dateOfBirth} editing={isEditing} onChange={(v: string) => handleInputChange('dateOfBirth', v)} type="date" />
              <Field label="Age" value={profileData.age} editing={isEditing} onChange={(v: string) => handleInputChange('age', v)} />
              <Field label="Father's Name" value={profileData.fatherName} editing={isEditing} onChange={(v: string) => handleInputChange('fatherName', v)} />
              <Field label="Emergency" value={profileData.emergencyContact} editing={isEditing} onChange={(v: string) => handleInputChange('emergencyContact', v)} />
              <div className="col-span-2"><Field label="Current Address" value={profileData.address} editing={isEditing} onChange={(v: string) => handleInputChange('address', v)} /></div>
              <div className="col-span-2"><Field label="Permanent Address" value={profileData.permanentAddress} editing={isEditing} onChange={(v: string) => handleInputChange('permanentAddress', v)} /></div>
              <Field label="City" value={profileData.city} editing={isEditing} onChange={(v: string) => handleInputChange('city', v)} />
              <Field label="State" value={profileData.state} editing={isEditing} onChange={(v: string) => handleInputChange('state', v)} />
              <Field label="PIN Code" value={profileData.pincode} editing={isEditing} onChange={(v: string) => handleInputChange('pincode', v)} />
            </div>
          </Section>

          <Section 
            title="Identity & Documents" 
            icon="🪪"
            expanded={expandedSections.includes('Identity & Documents')}
            onToggle={() => toggleSection('Identity & Documents')}
          >
            <div className="grid grid-cols-2 gap-4">
              <Field label="Aadhaar" value={profileData.aadhaarNumber} editing={isEditing} onChange={(v: string) => handleInputChange('aadhaarNumber', v)} />
              <Field label="PAN" value={profileData.panNumber} editing={isEditing} onChange={(v: string) => handleInputChange('panNumber', v)} />
              <DocumentBox label="ID Proof" url={profileData.nationalIdentityCard} newFile={newFiles.nationalIdentityCard} editing={isEditing} name="nationalIdentityCard" onFileChange={handleFileChange} />
              <DocumentBox label="Marksheet" url={profileData.marksheet} newFile={newFiles.marksheet} editing={isEditing} name="marksheet" onFileChange={handleFileChange} />
            </div>
          </Section>

          <Section 
            title="Vehicle Details" 
            icon="🛵"
            expanded={expandedSections.includes('Vehicle Details')}
            onToggle={() => toggleSection('Vehicle Details')}
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Type" value={profileData.vehicleType} editing={isEditing} onChange={(v: string) => handleInputChange('vehicleType', v)} />
              <Field label="Number" value={profileData.vehicleNumber} editing={isEditing} onChange={(v: string) => handleInputChange('vehicleNumber', v)} error={errors.vehicleNumber} />
              <Field label="DL No." value={profileData.drivingLicenseNumber} editing={isEditing} onChange={(v: string) => handleInputChange('drivingLicenseNumber', v)} />
              <Field label="RC No." value={profileData.rcNumber} editing={isEditing} onChange={(v: string) => handleInputChange('rcNumber', v)} />
              <div className="col-span-2"><Field label="Insurance No." value={profileData.vehicleInsuranceNumber} editing={isEditing} onChange={(v: string) => handleInputChange('vehicleInsuranceNumber', v)} /></div>
              <div className="col-span-2"><Field label="Valid Till" value={profileData.insuranceValidTill} editing={isEditing} onChange={(v: string) => handleInputChange('insuranceValidTill', v)} type="date" /></div>
              <div className="col-span-2"><DocumentBox label="DL Copy" url={profileData.drivingLicense} newFile={newFiles.drivingLicense} editing={isEditing} name="drivingLicense" onFileChange={handleFileChange} /></div>
            </div>
          </Section>

          <Section 
            title="Banking" 
            icon="🏦"
            expanded={expandedSections.includes('Banking')}
            onToggle={() => toggleSection('Banking')}
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="col-span-2"><Field label="Bank Name" value={profileData.bankName} editing={isEditing} onChange={(v: string) => handleInputChange('bankName', v)} /></div>
              <div className="col-span-2"><Field label="Account Holder" value={profileData.accountName} editing={isEditing} onChange={(v: string) => handleInputChange('accountName', v)} /></div>
              <div className="col-span-2"><Field label="Account Number" value={profileData.accountNumber} editing={isEditing} onChange={(v: string) => handleInputChange('accountNumber', v)} /></div>
              <Field label="IFSC" value={profileData.ifscCode} editing={isEditing} onChange={(v: string) => handleInputChange('ifscCode', v)} />
              <Field label="Branch" value={profileData.branchName} editing={isEditing} onChange={(v: string) => handleInputChange('branchName', v)} />
              <div className="col-span-2"><Field label="UPI ID" value={profileData.upiId} editing={isEditing} onChange={(v: string) => handleInputChange('upiId', v)} /></div>
            </div>
          </Section>

          <Section 
            title="Verification & Summary" 
            icon="✅"
            expanded={expandedSections.includes('Verification & Summary')}
            onToggle={() => toggleSection('Verification & Summary')}
          >
             <div className="space-y-4">
               <DocumentBox label="Signature" url={profileData.signature} newFile={newFiles.signature} editing={isEditing} name="signature" onFileChange={handleFileChange} />
               <div className="grid grid-cols-2 gap-3">
                 <div className="bg-neutral-50 p-3 rounded-2xl text-center border border-neutral-100">
                   <p className="text-[8px] font-black text-neutral-400 uppercase mb-1">Joined</p>
                   <p className="text-sm font-black text-neutral-800">{profileData.createdAt ? new Date(profileData.createdAt).getFullYear() : '2024'}</p>
                 </div>
                 <div className="bg-neutral-50 p-3 rounded-2xl text-center border border-neutral-100">
                   <p className="text-[8px] font-black text-neutral-400 uppercase mb-1">Deliveries</p>
                   <p className="text-sm font-black text-neutral-800">{profileData.totalDeliveries || '0'}</p>
                 </div>
               </div>
             </div>
          </Section>
        </div>
      </div>
      <DeliveryBottomNav />
    </div>
  );
}

function Section({ title, icon, children, expanded, onToggle }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
      <button 
        onClick={onToggle}
        className="w-full px-5 py-3 bg-neutral-50/50 flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <h3 className="text-[10px] font-black text-neutral-700 uppercase tracking-widest">{title}</h3>
        </div>
        <svg 
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" 
          className={`text-neutral-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 border-t border-neutral-100">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, value, editing, onChange, type = "text", error }: any) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest ml-1">{label}</label>
        {editing && error && <span className="text-[9px] font-black text-red-600 animate-pulse">{error}</span>}
      </div>
      {editing ? (
        <input 
          type={type} 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3 py-2 bg-neutral-50 border-2 rounded-xl text-xs font-bold outline-none transition-all ${
            error ? 'border-red-500 bg-red-50/30' : 'border-neutral-100 focus:border-orange-500'
          }`}
        />
      ) : (
        <div className="px-3 py-2 bg-neutral-50/30 rounded-xl border border-transparent">
          <p className="text-xs font-black text-neutral-800 break-words">{value || '—'}</p>
        </div>
      )}
    </div>
  );
}

function DocumentBox({ label, url, newFile, editing, name, onFileChange }: any) {
  const displayUrl = newFile ? URL.createObjectURL(newFile) : url;
  
  return (
    <div className="space-y-2">
      <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group rounded-xl overflow-hidden border border-neutral-100 aspect-[16/10] bg-neutral-50 shadow-inner">
        {displayUrl ? (
          <>
            <img src={displayUrl} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
              <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="bg-white text-neutral-900 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest">View</a>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-neutral-300">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            <span className="text-[8px] font-black uppercase">Pending</span>
          </div>
        )}
      </div>
      {editing && (
        <div className="relative">
          <input type="file" name={name} accept="image/*" onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          <div className="w-full py-1.5 bg-neutral-100 text-neutral-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-dashed border-neutral-200 text-center">
            Upload
          </div>
        </div>
      )}
    </div>
  );
}

