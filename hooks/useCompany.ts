'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Company } from '@/types';

export function useCompany() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;

      setCompanies(data || []);
      
      // Restore selected company from localStorage or select first
      const savedCompanyId = localStorage.getItem('selectedCompanyId');
      if (savedCompanyId && data) {
        const saved = data.find((c) => c.id === savedCompanyId);
        if (saved) {
          setSelectedCompany(saved);
        } else if (data.length > 0) {
          setSelectedCompany(data[0]);
        }
      } else if (data && data.length > 0) {
        setSelectedCompany(data[0]);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectCompany = (company: Company) => {
    setSelectedCompany(company);
    localStorage.setItem('selectedCompanyId', company.id);
  };

  return {
    companies,
    selectedCompany,
    loading,
    selectCompany,
    refreshCompanies: fetchCompanies,
  };
}
