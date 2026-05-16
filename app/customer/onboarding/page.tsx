'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  UserIcon,
  LockClosedIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

interface CustomerData {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  street: string;
  postal_code: string;
  city: string;
  country: string;
}

export default function CustomerOnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);
  const [dataConfirmed, setDataConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<CustomerData>({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    street: '',
    postal_code: '',
    city: '',
    country: '',
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.user_metadata?.onboarding_complete === true) {
      router.push('/customer/riders');
      return;
    }

    const fetchCustomer = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('customers')
          .select('company_name,contact_person,email,phone,street,postal_code,city,country')
          .eq('auth_user_id', user.id)
          .single();

        if (error || !data) {
          toast.error('Kundendaten konnten nicht geladen werden');
          return;
        }
        setFormData(data);
      } catch (error) {
        console.error('Error fetching customer:', error);
        toast.error('Fehler beim Laden der Kundendaten');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [user, authLoading, supabase, router]);

  const handleChange = (field: keyof CustomerData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfirmData = () => {
    if (!dataConfirmed) {
      toast.error('Bitte bestätigen Sie, dass Ihre Daten korrekt sind');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Passwort muss mindestens 6 Zeichen haben');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/customer/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          dataConfirmed: true,
          customerData: formData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Onboarding fehlgeschlagen');

      toast.success('Onboarding abgeschlossen!');
      router.push('/customer/riders');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 mb-5">
            <ShieldCheckIcon className="h-7 w-7 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Willkommen</h1>
          <p className="text-sm text-gray-500 mt-2">Schliessen Sie den Onboarding-Workflow ab</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center mb-10">
          <StepCircle number={1} label="Daten" active={step >= 1} done={step > 1} />
          <div className={`w-16 h-[2px] mx-2 transition-colors duration-500 ${step > 1 ? 'bg-blue-500' : 'bg-white/10'}`} />
          <StepCircle number={2} label="Passwort" active={step >= 2} done={false} />
        </div>

        {/* Card */}
        <div className="bg-black/40 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-8 shadow-2xl shadow-blue-900/10">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
              <div>
                <h2 className="text-lg font-semibold text-white">Kundendaten überprüfen</h2>
                <p className="text-sm text-gray-500 mt-1">Sie können die Daten direkt bearbeiten</p>
              </div>

              <div className="space-y-3.5">
                <Field icon={<BuildingOfficeIcon className="h-4 w-4" />} label="Firma">
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] transition-all"
                  />
                </Field>

                <Field icon={<EnvelopeIcon className="h-4 w-4" />} label="E-Mail">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] transition-all"
                  />
                </Field>

                <Field icon={<UserIcon className="h-4 w-4" />} label="Kontaktperson">
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => handleChange('contact_person', e.target.value)}
                    className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] transition-all"
                  />
                </Field>

                <Field icon={<PhoneIcon className="h-4 w-4" />} label="Telefon">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="-"
                    className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] transition-all"
                  />
                </Field>

                <Field icon={<MapPinIcon className="h-4 w-4" />} label="Strasse">
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => handleChange('street', e.target.value)}
                    className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] transition-all"
                  />
                </Field>

                <div className="grid grid-cols-3 gap-3">
                  <Field icon={null} label="PLZ">
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => handleChange('postal_code', e.target.value)}
                      className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] transition-all"
                    />
                  </Field>
                  <Field icon={null} label="Stadt">
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] transition-all"
                    />
                  </Field>
                  <Field icon={null} label="Land">
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleChange('country', e.target.value)}
                      className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] transition-all"
                    />
                  </Field>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group pt-1">
                <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${dataConfirmed ? 'bg-blue-600 border-blue-500' : 'border-white/20 bg-white/5 group-hover:border-blue-500/50'}`}>
                  {dataConfirmed && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <input type="checkbox" checked={dataConfirmed} onChange={(e) => setDataConfirmed(e.target.checked)} className="sr-only" />
                <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors leading-relaxed">
                  Ich bestätige, dass meine Kundendaten vollständig und korrekt sind.
                </span>
              </label>

              <button
                onClick={handleConfirmData}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 hover:shadow-lg hover:shadow-blue-600/25 active:scale-[0.98]"
              >
                Weiter <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
              <div>
                <h2 className="text-lg font-semibold text-white">Passwort festlegen</h2>
                <p className="text-sm text-gray-500 mt-1">Legen Sie ein sicheres Passwort für Ihr Konto fest</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Neues Passwort</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Mindestens 6 Zeichen"
                      className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Passwort bestätigen</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Passwort wiederholen"
                      className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] transition-all"
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showConfirmPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-400 mt-1.5">Passwörter stimmen nicht überein</p>
                  )}
                  {confirmPassword && password === confirmPassword && password.length >= 6 && (
                    <p className="text-xs text-green-400 mt-1.5">Passwörter stimmen überein</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
                >
                  <ArrowLeftIcon className="h-4 w-4" /> Zurück
                </button>
                <button
                  type="submit"
                  disabled={submitting || password.length < 6 || password !== confirmPassword}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold tracking-wide transition-all hover:shadow-lg hover:shadow-blue-600/25 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Wird gespeichert...</>
                  ) : (
                    <>Abschliessen <ArrowRightIcon className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-8">Techno on the Block · Workspace</p>
      </div>
    </div>
  );
}

function StepCircle({ number, label, active, done }: { number: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${done ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : active ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40' : 'bg-white/5 text-gray-600 border border-white/10'}`}>
        {done ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : number}
      </div>
      <span className={`text-xs uppercase tracking-wider transition-colors ${active ? 'text-blue-400' : 'text-gray-600'}`}>{label}</span>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode | null; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {icon && <span className="text-blue-500/70">{icon}</span>}
        <label className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</label>
      </div>
      {children}
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const score = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  const levels = [
    { label: 'Schwach', color: 'bg-red-500' },
    { label: 'Mittel', color: 'bg-yellow-500' },
    { label: 'Gut', color: 'bg-blue-500' },
    { label: 'Stark', color: 'bg-green-500' },
  ];
  const level = levels[Math.min(score, 3)];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1 h-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`flex-1 rounded-full transition-all ${i <= score + 1 ? level.color : 'bg-white/10'}`} />
        ))}
      </div>
      <p className={`text-xs ${score >= 2 ? 'text-gray-500' : 'text-red-400'}`}>{level.label}</p>
    </div>
  );
}
