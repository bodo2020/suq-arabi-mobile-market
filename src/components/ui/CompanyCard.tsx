
import React from 'react';
import { Building } from 'lucide-react';
import { Company } from '@/lib/supabase';
import { Link } from 'react-router-dom';

interface CompanyCardProps {
  company: Company;
}

const CompanyCard: React.FC<CompanyCardProps> = ({ company }) => {
  return (
    <Link 
      to={`/company/${company.id}`} 
      className="flex min-h-12 items-center gap-2 rounded-2xl border border-[#d8ebdf] bg-white p-3 text-[#005931] shadow-sm transition-colors hover:border-[#9acbb2] hover:bg-[#fff5d3]"
    >
      <Building className="h-4 w-4 shrink-0 text-[#005931]" />
      <span className="min-w-0 truncate text-sm font-bold">{company.name}</span>
    </Link>
  );
};

export default CompanyCard;

