import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Phone, User, Store, Package, MapPin,
  CheckCircle, AlertCircle, Loader2, Plus, Trash2, Check,
  Search, ChevronRight, Users, Upload, X, Image as ImageIcon,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import LocationPicker, { type LocationData } from '../components/ui/LocationPicker';
import {
  useAdminCreateProviderWithUser,
  useCheckUser,
  useAdminSendOtp,
  useAdminVerifyOtp,
} from '../hooks/useAdminCreate';
import { adminCreateService } from '../services/admin-create.service';
import { useUsers } from '../hooks/useUsers';
import { useCategoryTree } from '../hooks/useCategories';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { Gender, User as UserType } from '../types';

// ── Types ────────────────────────────────────────────────
interface ProductEntry {
  name: string;
  description: string;
  price: string;
  currency: string;
  imageFiles: File[];
  imagePreviews: string[];
}

type Step = 'user' | 'provider' | 'products' | 'location' | 'review';

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'user', label: 'User Details', icon: User },
  { key: 'provider', label: 'Provider Info', icon: Store },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'location', label: 'Location', icon: MapPin },
  { key: 'review', label: 'Review & Submit', icon: Check },
];

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

const PROVIDER_STATUS_OPTIONS = [
  { label: 'Active (skip verification)', value: 'active' },
  { label: 'Pending (needs approval)', value: 'pending' },
  { label: 'Unverified (needs docs)', value: 'unverified' },
];

// ── Component ────────────────────────────────────────────
export default function CreateProviderFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createMutation = useAdminCreateProviderWithUser();
  const sendOtpMutation = useAdminSendOtp();
  const verifyOtpMutation = useAdminVerifyOtp();
  const { data: categories } = useCategoryTree();

  const [currentStep, setCurrentStep] = useState<Step>('user');

  // ── User fields ─────────────────────────────────────────
  const [userMode, setUserMode] = useState<'mobile' | 'picker'>('mobile');
  const [userMobile, setUserMobile] = useState('');
  const [userName, setUserName] = useState('');
  const [userGender, setUserGender] = useState<Gender>('female');
  const [userEmail, setUserEmail] = useState('');
  const [skipUserOtp, setSkipUserOtp] = useState(true);
  const [userOtpSent, setUserOtpSent] = useState(false);
  const [userOtp, setUserOtp] = useState('');
  const [userOtpVerified, setUserOtpVerified] = useState(false);
  const [userDevOtp, setUserDevOtp] = useState('');
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerDebouncedSearch, setPickerDebouncedSearch] = useState('');
  const [selectedExistingUser, setSelectedExistingUser] = useState<UserType | null>(null);
  const pickerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Provider fields ─────────────────────────────────────
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [isWomenLed, setIsWomenLed] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [expandedCategoryGroups, setExpandedCategoryGroups] = useState<Set<string>>(new Set());
  const [providerStatus, setProviderStatus] = useState('active');
  const [skipBusinessOtp, setSkipBusinessOtp] = useState(true);
  const [bizOtpSent, setBizOtpSent] = useState(false);
  const [bizOtp, setBizOtp] = useState('');
  const [bizOtpVerified, setBizOtpVerified] = useState(false);
  const [bizDevOtp, setBizDevOtp] = useState('');

  // ── Products ────────────────────────────────────────────
  const [products, setProducts] = useState<ProductEntry[]>([]);

  // ── Location ────────────────────────────────────────────
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [syncLocation, setSyncLocation] = useState(true);

  // ── Pre-flight ──────────────────────────────────────────
  const mobileValid = /^\d{10}$/.test(userMobile);
  const { data: checkData, isLoading: isChecking } = useCheckUser(userMobile);
  const userExists = checkData?.exists ?? false;
  const hasProvider = checkData?.hasProvider ?? false;

  // ── Existing user picker (users without providers) ─────
  const { data: nonProviderUsers, isLoading: isLoadingPicker } = useUsers({
    search: pickerDebouncedSearch || undefined,
    hasProvider: false,
    status: 'active',
    limit: 20,
    page: 1,
  });

  // Debounce picker search input
  useEffect(() => {
    if (pickerDebounceRef.current) clearTimeout(pickerDebounceRef.current);
    pickerDebounceRef.current = setTimeout(() => {
      setPickerDebouncedSearch(pickerSearch);
    }, 400);
    return () => { if (pickerDebounceRef.current) clearTimeout(pickerDebounceRef.current); };
  }, [pickerSearch]);

  const handleSelectExistingUser = useCallback((user: UserType) => {
    setSelectedExistingUser(user);
    setUserMobile(user.mobileNumber || '');
    setUserName(user.name || '');
    setUserGender((user.gender as Gender) || 'female');
    setUserEmail(user.email || '');
    if (user.city) setCity(user.city);
    if (user.area) setArea(user.area || '');
    setSkipUserOtp(true);
    setPickerSearch('');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-fill from URL params (deep-link from Users page) ──
  useEffect(() => {
    const mobile = searchParams.get('mobile');
    if (mobile && /^\d{10}$/.test(mobile)) {
      setUserMobile(mobile);
    }
  }, [searchParams]);

  // ── Auto-fill form when existing user is detected ──────
  useEffect(() => {
    if (checkData?.exists && checkData.user && !hasProvider) {
      const u = checkData.user;
      if (u.name && !userName) setUserName(u.name);
      if (u.gender && userGender === 'female') setUserGender(u.gender as Gender);
      if (u.email && !userEmail) setUserEmail(u.email);
      if (u.city && !city) setCity(u.city);
    }
  }, [checkData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── OTP helpers ─────────────────────────────────────────
  const handleSendUserOtp = async () => {
    try {
      const result = await sendOtpMutation.mutateAsync({ mobileNumber: userMobile, purpose: 'user_verification' });
      setUserOtpSent(true);
      if (result.data?.otp) setUserDevOtp(result.data.otp);
      toast.success('OTP sent to user number');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleVerifyUserOtp = async () => {
    try {
      await verifyOtpMutation.mutateAsync({ mobileNumber: userMobile, otp: userOtp, purpose: 'user_verification' });
      setUserOtpVerified(true);
      toast.success('User OTP verified');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'OTP verification failed');
    }
  };

  const handleSendBizOtp = async () => {
    const bizNum = contactNumber.replace(/\D/g, '').slice(-10);
    if (!/^\d{10}$/.test(bizNum)) { toast.error('Business phone must have 10 digits'); return; }
    try {
      const result = await sendOtpMutation.mutateAsync({ mobileNumber: bizNum, purpose: 'business_verification' });
      setBizOtpSent(true);
      if (result.data?.otp) setBizDevOtp(result.data.otp);
      toast.success('OTP sent to business number');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleVerifyBizOtp = async () => {
    const bizNum = contactNumber.replace(/\D/g, '').slice(-10);
    try {
      await verifyOtpMutation.mutateAsync({ mobileNumber: bizNum, otp: bizOtp, purpose: 'business_verification' });
      setBizOtpVerified(true);
      toast.success('Business OTP verified');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'OTP verification failed');
    }
  };

  // ── Product management ──────────────────────────────────
  const addProduct = useCallback(() => {
    setProducts((prev) => [...prev, { name: '', description: '', price: '', currency: 'INR', imageFiles: [], imagePreviews: [] }]);
  }, []);

  const updateProduct = useCallback((idx: number, field: keyof Omit<ProductEntry, 'imageFiles' | 'imagePreviews'>, value: string) => {
    setProducts((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }, []);

  const addProductImages = useCallback((idx: number, files: File[]) => {
    setProducts((prev) => prev.map((p, i) => {
      if (i !== idx) return p;
      // Revoke old blob URLs to prevent memory leaks
      p.imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      const newFiles = [...p.imageFiles, ...files].slice(0, 5); // max 5
      const previews = newFiles.map((f) => URL.createObjectURL(f));
      return { ...p, imageFiles: newFiles, imagePreviews: previews };
    }));
  }, []);

  const removeProductImage = useCallback((productIdx: number, imageIdx: number) => {
    setProducts((prev) => prev.map((p, i) => {
      if (i !== productIdx) return p;
      // Revoke removed blob URL
      if (p.imagePreviews[imageIdx]) URL.revokeObjectURL(p.imagePreviews[imageIdx]);
      const newFiles = p.imageFiles.filter((_, fi) => fi !== imageIdx);
      const newPreviews = p.imagePreviews.filter((_, pi) => pi !== imageIdx);
      return { ...p, imageFiles: newFiles, imagePreviews: newPreviews };
    }));
  }, []);

  const removeProduct = useCallback((idx: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // ── Category toggle ─────────────────────────────────────
  const toggleCategory = useCallback((catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId],
    );
  }, []);

  // ── Location from map ───────────────────────────────────
  const handleLocationChange = useCallback((data: LocationData) => {
    setCity(data.city);
    setArea(data.area);
    setPincode(data.pincode);
    setLatitude(data.latitude);
    setLongitude(data.longitude);
    setAddress(data.address);
  }, []);

  // ── Step validations ────────────────────────────────────
  const isUserStepValid = userMode === 'picker'
    ? !!selectedExistingUser && userName.trim().length > 0
    : mobileValid && userName.trim().length > 0 && !hasProvider && (skipUserOtp || userOtpVerified);
  const isProviderStepValid = brandName.trim() && contactNumber.trim() && (skipBusinessOtp || bizOtpVerified);
  const isLocationStepValid = city.trim();

  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  const goNext = () => {
    const next = STEPS[stepIndex + 1];
    if (next) setCurrentStep(next.key);
  };

  const goPrev = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setCurrentStep(prev.key);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'user': return isUserStepValid;
      case 'provider': return isProviderStepValid;
      case 'products': return true; // products are optional
      case 'location': return isLocationStepValid;
      default: return true;
    }
  };

  // ── Submit ──────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      const result = await createMutation.mutateAsync({
        userMobileNumber: userMobile,
        userName: userName.trim(),
        userGender,
        userEmail: userEmail.trim() || undefined,
        brandName: brandName.trim(),
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim(),
        area: area.trim() || undefined,
        pincode: pincode.trim() || undefined,
        latitude: latitude.trim() || undefined,
        longitude: longitude.trim() || undefined,
        contactNumber: contactNumber.trim(),
        openTime: openTime || undefined,
        closeTime: closeTime || undefined,
        isWomenLed,
        categoryIds: selectedCategories.length ? selectedCategories : undefined,
        providerStatus,
        products: products
          .filter((p) => p.name.trim())
          .map((p) => ({
            name: p.name.trim(),
            description: p.description.trim() || undefined,
            price: p.price ? parseFloat(p.price) : undefined,
            currency: p.currency || 'INR',
          })),
        syncLocation,
        skipUserOtp,
        skipBusinessOtp,
      });

      // Upload product images — match by index (same order as submitted)
      const productsWithImages = products.filter((p) => p.name.trim() && p.imageFiles.length > 0);
      if (productsWithImages.length > 0 && result.products?.length) {
        const validProducts = products.filter((p) => p.name.trim());
        await Promise.allSettled(
          validProducts.map((p, idx) => {
            const createdProduct = result.products[idx];
            if (!createdProduct?.id || p.imageFiles.length === 0) return Promise.resolve();
            return adminCreateService.uploadProductImages(createdProduct.id, p.imageFiles);
          }),
        );
      }

      toast.success('Provider created successfully!');
      navigate(ROUTES.PROVIDERS);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create provider');
    }
  };

  // ── Input helper ────────────────────────────────────────
  const inputStyle = {
    background: 'var(--surface-1)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  };
  const cardStyle = {
    background: 'var(--surface-0)',
    border: '1px solid var(--border-default)',
  };

  // ── OTP Block renderer ─────────────────────────────────
  const renderOtpBlock = (
    label: string,
    skip: boolean,
    setSkip: (v: boolean) => void,
    sent: boolean,
    devCode: string,
    code: string,
    setCode: (v: string) => void,
    verified: boolean,
    onSend: () => void,
    onVerify: () => void,
  ) => (
    <div className="mt-3 space-y-2">
      <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
        <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} className="rounded" />
        Skip {label} OTP (admin privilege)
      </label>
      {!skip && (
        <div className="p-3 rounded-lg space-y-2" style={{ background: 'var(--surface-1)' }}>
          {verified ? (
            <p className="text-xs flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" /> {label} OTP verified
            </p>
          ) : !sent ? (
            <button type="button" onClick={onSend} disabled={sendOtpMutation.isPending}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white" style={{ background: 'var(--color-primary)' }}>
              {sendOtpMutation.isPending ? 'Sending…' : `Send ${label} OTP`}
            </button>
          ) : (
            <>
              {devCode && (
                <p className="text-xs px-2 py-1 rounded" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}>
                  Dev OTP: <strong>{devCode}</strong>
                </p>
              )}
              <div className="flex gap-2">
                <input type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP" maxLength={6}
                  className="flex-1 px-3 py-2 text-sm rounded-lg focus-ring" style={{ ...inputStyle, background: 'var(--surface-0)' }} />
                <button type="button" onClick={onVerify} disabled={code.length !== 6 || verifyOtpMutation.isPending}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
                  {verifyOtpMutation.isPending ? 'Verifying…' : 'Verify'}
                </button>
              </div>
              <button type="button" onClick={onSend} className="text-xs underline" style={{ color: 'var(--text-muted)' }}>
                Resend OTP
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  // ── Step renderers ──────────────────────────────────────
  const renderUserStep = () => (
    <div className="space-y-4">
      {/* Mode toggle: Enter mobile vs Pick existing user */}
      <div className="flex gap-2 p-1 rounded-lg w-fit" style={{ background: 'var(--surface-1)' }}>
        <button
          type="button"
          onClick={() => { setUserMode('mobile'); setSelectedExistingUser(null); }}
          className="px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2"
          style={{
            background: userMode === 'mobile' ? 'var(--surface-0)' : 'transparent',
            color: userMode === 'mobile' ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow: userMode === 'mobile' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <Phone className="w-3.5 h-3.5" /> Enter Mobile
        </button>
        <button
          type="button"
          onClick={() => { setUserMode('picker'); setUserMobile(''); setUserName(''); setUserEmail(''); }}
          className="px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2"
          style={{
            background: userMode === 'picker' ? 'var(--surface-0)' : 'transparent',
            color: userMode === 'picker' ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow: userMode === 'picker' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <Users className="w-3.5 h-3.5" /> Pick Existing User
        </button>
      </div>

      {userMode === 'picker' ? (
        /* ── Existing user picker ───────────────────────── */
        <div className="rounded-xl p-6" style={cardStyle}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Users className="w-4 h-4" /> Select Existing User (without provider)
          </h3>

          {selectedExistingUser ? (
            /* Selected user card */
            <div className="p-4 rounded-lg flex items-center gap-4" style={{ background: 'var(--surface-1)', border: '2px solid var(--color-primary)' }}>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: 'var(--color-primary)' }}
              >
                {(selectedExistingUser.name || '?')[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {selectedExistingUser.name}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {selectedExistingUser.mobileNumber}{selectedExistingUser.city ? ` · ${selectedExistingUser.city}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedExistingUser(null);
                  setUserMobile('');
                  setUserName('');
                  setUserEmail('');
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)', background: 'transparent' }}
              >
                Change
              </button>
            </div>
          ) : (
            /* Search & list */
            <>
              <div className="relative mb-3">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Search by name or mobile number…"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus-ring"
                  style={inputStyle}
                />
                {isLoadingPicker && (
                  <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--text-muted)' }} />
                )}
              </div>

              <div className="max-h-[320px] overflow-y-auto rounded-lg" style={{ border: '1px solid var(--border-default)' }}>
                {(nonProviderUsers?.items ?? []).length === 0 ? (
                  <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{pickerDebouncedSearch ? 'No matching users found' : 'Search for a user to get started'}</p>
                    <p className="text-xs mt-1">Only users without a provider profile are shown</p>
                  </div>
                ) : (
                  (nonProviderUsers?.items ?? []).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectExistingUser(u)}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
                      style={{ borderBottom: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: 'var(--color-info)' }}
                      >
                        {(u.name || '?')[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.name || '—'}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                          {u.mobileNumber || '—'}{u.city ? ` · ${u.city}` : ''}{u.gender ? ` · ${u.gender}` : ''}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    </button>
                  ))
                )}
              </div>

              {(nonProviderUsers?.meta?.total ?? 0) > 0 && (
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  Showing {nonProviderUsers?.items.length} of {nonProviderUsers?.meta.total} users without provider profiles
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        /* ── Mobile number entry (original) ─────────────── */
        <div className="rounded-xl p-6" style={cardStyle}>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Phone className="w-4 h-4" /> User Mobile Number
          </h3>
          <div className="flex gap-2 items-start">
            <input type="text" value={userMobile}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                setUserMobile(v);
                setUserOtpSent(false); setUserOtpVerified(false); setUserOtp('');
                setSelectedExistingUser(null);
              }}
              placeholder="9876543210" maxLength={10} className="flex-1 px-3 py-2 text-sm rounded-lg focus-ring" style={inputStyle} />
            {isChecking && mobileValid && <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />}
          </div>
          {mobileValid && hasProvider && (
            <p className="mt-2 text-xs flex items-center gap-1 text-red-500">
              <AlertCircle className="w-3 h-3" /> This user already has a provider profile — cannot create another.
            </p>
          )}
          {mobileValid && userExists && !hasProvider && (
            <p className="mt-2 text-xs flex items-center gap-1 text-amber-600">
              <AlertCircle className="w-3 h-3" /> User exists — will link this provider to existing user.
            </p>
          )}
          {mobileValid && checkData && !userExists && (
            <p className="mt-2 text-xs flex items-center gap-1 text-green-600">
              <CheckCircle className="w-3 h-3" /> New user — will be created.
            </p>
          )}

          {renderOtpBlock('User', skipUserOtp, setSkipUserOtp, userOtpSent, userDevOtp, userOtp, setUserOtp, userOtpVerified, handleSendUserOtp, handleVerifyUserOtp)}
        </div>
      )}

      <div className="rounded-xl p-6" style={cardStyle}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <User className="w-4 h-4" /> Personal Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Full Name <span className="text-red-500">*</span>
            </label>
            <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Fatema Khan"
              className="w-full px-3 py-2 text-sm rounded-lg focus-ring" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Gender <span className="text-red-500">*</span>
            </label>
            <select value={userGender} onChange={(e) => { setUserGender(e.target.value as Gender); setIsWomenLed(e.target.value === 'female'); }}
              className="w-full px-3 py-2 text-sm rounded-lg focus-ring" style={inputStyle}>
              {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
            <input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="fatema@example.com"
              className="w-full px-3 py-2 text-sm rounded-lg focus-ring" style={inputStyle} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderProviderStep = () => (
    <div className="space-y-4">
      <div className="rounded-xl p-6" style={cardStyle}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Store className="w-4 h-4" /> Business Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Brand Name <span className="text-red-500">*</span>
            </label>
            <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Fatema Beauty Salon"
              className="w-full px-3 py-2 text-sm rounded-lg focus-ring" style={inputStyle} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Professional beauty services for women"
              rows={3} className="w-full px-3 py-2 text-sm rounded-lg focus-ring resize-none" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Business Contact <span className="text-red-500">*</span>
            </label>
            <input type="text" value={contactNumber}
              onChange={(e) => { setContactNumber(e.target.value.replace(/\D/g, '').slice(0, 10)); setBizOtpSent(false); setBizOtpVerified(false); setBizOtp(''); }}
              placeholder="9876543210" maxLength={10} className="w-full px-3 py-2 text-sm rounded-lg focus-ring" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Provider Status</label>
            <select value={providerStatus} onChange={(e) => setProviderStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg focus-ring" style={inputStyle}>
              {PROVIDER_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Open Time</label>
            <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg focus-ring" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Close Time</label>
            <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg focus-ring" style={inputStyle} />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={isWomenLed} onChange={(e) => setIsWomenLed(e.target.checked)} className="rounded" />
              Women-led business
            </label>
          </div>
        </div>

        {renderOtpBlock('Business', skipBusinessOtp, setSkipBusinessOtp, bizOtpSent, bizDevOtp, bizOtp, setBizOtp, bizOtpVerified, handleSendBizOtp, handleVerifyBizOtp)}
      </div>

      {/* Categories */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Categories</h3>
        {selectedCategories.length > 0 && (
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-primary)' }}>
            {selectedCategories.length} selected
          </p>
        )}
        {/* Search */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus-ring"
            style={inputStyle}
          />
        </div>
        {categories && categories.length > 0 ? (
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {(categorySearch.trim()
              ? categories.filter((cat: any) => {
                  const q = categorySearch.trim().toLowerCase();
                  if (cat.name.toLowerCase().includes(q)) return true;
                  return cat.children?.some((ch: any) => ch.name.toLowerCase().includes(q));
                })
              : categories
            ).map((cat: any) => {
              const hasChildren = cat.children && cat.children.length > 0;
              const isExpanded = categorySearch.trim() ? true : expandedCategoryGroups.has(cat.id);
              const childrenToShow = categorySearch.trim()
                ? (cat.children || []).filter((ch: any) =>
                    ch.name.toLowerCase().includes(categorySearch.trim().toLowerCase()) ||
                    cat.name.toLowerCase().includes(categorySearch.trim().toLowerCase()))
                : cat.children || [];
              const selectedChildCount = childrenToShow.filter((ch: any) => selectedCategories.includes(ch.id)).length;
              const parentSelected = selectedCategories.includes(cat.id);

              return (
                <div key={cat.id} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (hasChildren) {
                        setExpandedCategoryGroups((prev) => {
                          const next = new Set(prev);
                          next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id);
                          return next;
                        });
                      } else {
                        toggleCategory(cat.id);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                    style={{
                      background: parentSelected && !hasChildren ? 'var(--color-primary)' : 'transparent',
                      color: parentSelected && !hasChildren ? 'white' : 'var(--text-primary)',
                    }}
                  >
                    <span className="flex-1 text-xs font-semibold truncate">{cat.name}</span>
                    {selectedChildCount > 0 && hasChildren && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                        {selectedChildCount}
                      </span>
                    )}
                    {parentSelected && !hasChildren && <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />}
                    {hasChildren && (
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        style={{ color: 'var(--text-muted)' }} />
                    )}
                  </button>
                  {hasChildren && isExpanded && (
                    <div className="px-3 pb-2.5 pt-1 flex flex-wrap gap-1.5" style={{ borderTop: '1px solid var(--border-default)' }}>
                      {childrenToShow.map((child: any) => {
                        const sel = selectedCategories.includes(child.id);
                        return (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => toggleCategory(child.id)}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors"
                            style={{
                              background: sel ? 'var(--color-primary)' : 'var(--surface-1)',
                              color: sel ? 'white' : 'var(--text-secondary)',
                              border: `1px solid ${sel ? 'var(--color-primary)' : 'var(--border-default)'}`,
                            }}
                          >
                            {sel && <CheckCircle className="w-3 h-3 inline mr-1" />}
                            {child.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No categories available</p>
        )}
      </div>
    </div>
  );

  const renderProductsStep = () => (
    <div className="space-y-4">
      <div className="rounded-xl p-6" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Package className="w-4 h-4" /> Products / Services
          </h3>
          <button type="button" onClick={addProduct}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-white"
            style={{ background: 'var(--color-primary)' }}>
            <Plus className="w-3 h-3" /> Add Product
          </button>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No products added yet</p>
            <p className="text-xs mt-1">Products are optional — you can add them later</p>
          </div>
        ) : (
          <div className="space-y-5">
            {products.map((product, idx) => (
              <div key={idx} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                {/* Product header */}
                <div className="flex items-center justify-between px-4 py-2" style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border-default)' }}>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Product {idx + 1}{product.name.trim() ? ` — ${product.name.trim()}` : ''}
                  </span>
                  <button type="button" onClick={() => removeProduct(idx)}
                    className="p-1 rounded transition-colors" style={{ color: 'var(--color-danger)' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Text fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input type="text" value={product.name} onChange={(e) => updateProduct(idx, 'name', e.target.value)}
                        placeholder="Haircut" className="w-full px-3 py-2 text-sm rounded-lg focus-ring" style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Price (₹)</label>
                      <input type="text" value={product.price}
                        onChange={(e) => updateProduct(idx, 'price', e.target.value.replace(/[^\d.]/g, ''))}
                        placeholder="200" className="w-full px-3 py-2 text-sm rounded-lg focus-ring" style={inputStyle} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
                      <input type="text" value={product.description} onChange={(e) => updateProduct(idx, 'description', e.target.value)}
                        placeholder="Basic men's haircut" className="w-full px-3 py-2 text-sm rounded-lg focus-ring" style={inputStyle} />
                    </div>
                  </div>

                  {/* Image upload */}
                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Images <span style={{ color: 'var(--text-muted)' }}>(up to 5, uploaded after provider is created)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {/* Existing previews */}
                      {product.imagePreviews.map((preview, imgIdx) => (
                        <div key={imgIdx} className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--border-default)' }}>
                          <img src={preview} alt={`Product ${idx + 1} image ${imgIdx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeProductImage(idx, imgIdx)}
                            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white"
                            style={{ background: 'rgba(0,0,0,0.65)' }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {/* Add image button */}
                      {product.imageFiles.length < 5 && (
                        <label
                          className="w-20 h-20 flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed cursor-pointer transition-colors flex-shrink-0"
                          style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}
                        >
                          <Upload className="w-5 h-5" />
                          <span className="text-[10px] text-center leading-tight">Add<br/>image</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files ?? []);
                              if (!files.length) return;
                              const tooLarge = files.find(f => f.size > 20 * 1024 * 1024);
                              if (tooLarge) { toast.error(`${tooLarge.name} is over 20MB`); return; }
                              addProductImages(idx, files);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}

                      {/* Empty state hint */}
                      {product.imageFiles.length === 0 && (
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <ImageIcon className="w-4 h-4 opacity-40" />
                          <span>PNG, JPG, WebP — up to 20MB (auto-compressed)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderLocationStep = () => (
    <div className="space-y-4">
      <div className="rounded-xl p-6" style={cardStyle}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <MapPin className="w-4 h-4" /> Location Details
        </h3>
        <LocationPicker
          latitude={latitude}
          longitude={longitude}
          city={city}
          area={area}
          pincode={pincode}
          address={address}
          onLocationChange={handleLocationChange}
          showAddress
        />
        <div className="mt-4">
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={syncLocation} onChange={(e) => setSyncLocation(e.target.checked)} className="rounded" />
            Sync location to both user and provider profiles
          </label>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => {
    const validProducts = products.filter((p) => p.name.trim());
    const catNames = categories?.flatMap((c: any) => [
      ...(selectedCategories.includes(c.id) ? [c.name] : []),
      ...(c.children || []).filter((ch: any) => selectedCategories.includes(ch.id)).map((ch: any) => ch.name),
    ]) || [];

    return (
      <div className="space-y-4">
        <div className="rounded-xl p-6" style={cardStyle}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Review All Details</h3>

          {/* User */}
          <div className="mb-4 pb-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>User</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span style={{ color: 'var(--text-muted)' }}>Name:</span> <span style={{ color: 'var(--text-primary)' }}>{userName}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Mobile:</span> <span style={{ color: 'var(--text-primary)' }}>{userMobile}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Gender:</span> <span style={{ color: 'var(--text-primary)' }} className="capitalize">{userGender}</span></div>
              {userEmail && <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> <span style={{ color: 'var(--text-primary)' }}>{userEmail}</span></div>}
              <div><span style={{ color: 'var(--text-muted)' }}>OTP:</span> <span style={{ color: skipUserOtp ? 'var(--color-warning)' : 'var(--color-success)' }}>{skipUserOtp ? 'Skipped' : 'Verified'}</span></div>
              {userExists && <div className="col-span-2"><span className="text-amber-600 text-xs">Existing user — will be linked</span></div>}
            </div>
          </div>

          {/* Provider */}
          <div className="mb-4 pb-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Provider</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span style={{ color: 'var(--text-muted)' }}>Brand:</span> <span style={{ color: 'var(--text-primary)' }}>{brandName}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Contact:</span> <span style={{ color: 'var(--text-primary)' }}>{contactNumber}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> <span style={{ color: 'var(--text-primary)' }} className="capitalize">{providerStatus}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Women-led:</span> <span style={{ color: 'var(--text-primary)' }}>{isWomenLed ? 'Yes' : 'No'}</span></div>
              {openTime && <div><span style={{ color: 'var(--text-muted)' }}>Hours:</span> <span style={{ color: 'var(--text-primary)' }}>{openTime} – {closeTime}</span></div>}
              <div><span style={{ color: 'var(--text-muted)' }}>Biz OTP:</span> <span style={{ color: skipBusinessOtp ? 'var(--color-warning)' : 'var(--color-success)' }}>{skipBusinessOtp ? 'Skipped' : 'Verified'}</span></div>
              {catNames.length > 0 && (
                <div className="col-span-2">
                  <span style={{ color: 'var(--text-muted)' }}>Categories:</span> <span style={{ color: 'var(--text-primary)' }}>{catNames.join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Products */}
          {validProducts.length > 0 && (
            <div className="mb-4 pb-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Products ({validProducts.length})
              </h4>
              <div className="space-y-1">
                {validProducts.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                    {p.price && <span style={{ color: 'var(--text-muted)' }}>₹{p.price}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Location</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span style={{ color: 'var(--text-muted)' }}>City:</span> <span style={{ color: 'var(--text-primary)' }}>{city}</span></div>
              {area && <div><span style={{ color: 'var(--text-muted)' }}>Area:</span> <span style={{ color: 'var(--text-primary)' }}>{area}</span></div>}
              {address && <div className="col-span-2"><span style={{ color: 'var(--text-muted)' }}>Address:</span> <span style={{ color: 'var(--text-primary)' }}>{address}</span></div>}
              <div><span style={{ color: 'var(--text-muted)' }}>Sync:</span> <span style={{ color: 'var(--text-primary)' }}>{syncLocation ? 'Yes (user + provider)' : 'Provider only'}</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Main render ─────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Create Provider"
        description="End-to-end: create user, provider, products, and location"
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Providers', path: ROUTES.PROVIDERS },
          { label: 'Create Provider' },
        ]}
        actions={
          <button onClick={() => navigate(ROUTES.PROVIDERS)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)', background: 'var(--surface-0)' }}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        }
      />

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCurrent = step.key === currentStep;
          const isPast = idx < stepIndex;
          return (
            <div key={step.key} className="flex items-center">
              {idx > 0 && (
                <div className="w-8 h-px mx-1" style={{ background: isPast ? 'var(--color-primary)' : 'var(--border-default)' }} />
              )}
              <button
                type="button"
                onClick={() => isPast && setCurrentStep(step.key)}
                disabled={!isPast && !isCurrent}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
                style={{
                  background: isCurrent ? 'var(--color-primary)' : isPast ? 'var(--color-primary-light, rgba(14,165,233,0.1))' : 'var(--surface-1)',
                  color: isCurrent ? 'white' : isPast ? 'var(--color-primary)' : 'var(--text-muted)',
                  cursor: isPast ? 'pointer' : 'default',
                }}
              >
                {isPast ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="max-w-2xl">
        {currentStep === 'user' && renderUserStep()}
        {currentStep === 'provider' && renderProviderStep()}
        {currentStep === 'products' && renderProductsStep()}
        {currentStep === 'location' && renderLocationStep()}
        {currentStep === 'review' && renderReviewStep()}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button type="button" onClick={goPrev} disabled={stepIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-30"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)', background: 'var(--surface-0)' }}>
            <ArrowLeft className="w-4 h-4" /> Previous
          </button>

          {currentStep !== 'review' ? (
            <button type="button" onClick={goNext} disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}>
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={createMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50"
              style={{ background: 'var(--color-success, #22c55e)' }}>
              {createMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Create Provider</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
