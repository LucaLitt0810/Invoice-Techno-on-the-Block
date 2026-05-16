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
  CheckCircleIcon,
  LockClosedIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface CustomerData {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string;
  phone: string | null;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  customer_number: string | null;
}

export default function CustomerOnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);
  const [dataConfirmed, setDataConfirmed] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    // If already onboarded, redirect to riders
    if (user.user_metadata?.onboarding_complete === true) {
      router.push('/customer/riders');
      return;
    }

    const fetchCustomer = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('customers')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();

        if (error || !data) {
          toast.error('Kundendaten konnten nicht geladen werden');
          return;
        }

        setCustomer(data);
      } catch (error) {
        console.error('Error fetching customer:', error);
        toast.error('Fehler beim Laden der Kundendaten');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [user, authLoading, supabase, router]);

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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Onboarding fehlgeschlagen');
      }

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
      <div className="flex items-center justify-center min-h-screen bg-dark-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-900 text-white">
        <p className="text-gray-400">Kundendaten nicht gefunden.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
            Willkommen
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            Bitte schliessen Sie den Onboarding-Workflow ab, um fortzufahren.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-blue-500' : 'bg-dark-500'}`} />
          <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-dark-500'}`} />
        </div>

        {/* Step 1: Daten bestätigen */}
        {step === 1 && (
          <div className="bg-dark-800 border border-dark-500 rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-3">
              <BuildingOfficeIcon className="h-6 w-6 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Kundendaten bestätigen</h2>
            </div>

            <p className="text-sm text-gray-400">
              Bitte überprüfen Sie die folgenden Daten, die wir von Ihnen haben:
            </p>

            <div className="space-y-3">
              <DataRow icon={<BuildingOfficeIcon className="h-4 w-4" />} label="Firma" value={customer.company_name} />
              <DataRow icon={<EnvelopeIcon className="h-4 w-4" />} label="E-Mail" value={customer.email} />
              {customer.contact_person && (
                <DataRow icon={<CheckCircleIcon className="h-4 w-4" />} label="Kontaktperson" value={customer.contact_person} />
              )}
              {customer.phone && (
                <DataRow icon={<PhoneIcon className="h-4 w-4" />} label="Telefon" value={customer.phone} />
              )}
              <DataRow
                icon={<MapPinIcon className="h-4 w-4" />}
                label="Adresse"
                value={`${customer.street}, ${customer.postal_code} ${customer.city}, ${customer.country}`}
              />
              {customer.customer_number && (
                <DataRow icon={<CheckCircleIcon className="h-4 w-4" />} label="Kundennummer" value={customer.customer_number} />
              )}
            </div>

            <div className="pt-4 border-t border-dark-500">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={dataConfirmed}
                  onChange={(e) => setDataConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-dark-500 bg-dark-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-dark-800"
                />
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                  Ich bestätige, dass meine Kundendaten vollständig und korrekt sind.
                </span>
              </label>
            </div>

            <button
              onClick={handleConfirmData}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-blue-500 transition-colors"
            >
              Weiter
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Step 2: Passwort erstellen */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="bg-dark-800 border border-dark-500 rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-3">
              <LockClosedIcon className="h-6 w-6 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Passwort festlegen</h2>
            </div>

            <p className="text-sm text-gray-400">
              Legen Sie ein sicheres Passwort für Ihr Konto fest.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1">Neues Passwort</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mindestens 6 Zeichen"
                  className="w-full bg-dark-900 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1">Passwort bestätigen</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Passwort wiederholen"
                  className="w-full bg-dark-900 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 px-4 py-3 border border-dark-500 text-gray-300 rounded-lg text-sm font-medium hover:text-white hover:border-gray-400 transition-colors"
              >
                Zurück
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Wird gespeichert...' : 'Abschliessen'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function DataRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-dark-900/50 rounded-lg border border-dark-500/50">
      <div className="text-gray-500 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 uppercase">{label}</p>
        <p className="text-sm text-white">{value}</p>
      </div>
    </div>
  );
}
