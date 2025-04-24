
import React from 'react';
import { Building } from 'lucide-react';
import { Company } from '@/lib/supabase';
import { Link } from 'react-router-dom';

interface CompanyCardProps {
  company: Company;
}

const CompanyCard: React.FC<CompanyCardProps> = ({ company }) => {
  return (
    <Link to={`/company-products/${company.id}`} className="flex items-center space-x-2 space-x-reverse bg-gray-100 rounded-md p-2 hover:bg-gray-200 transition-colors">
      {company.logo_url ? (
        <img src={company.logo_url} alt={company.name} className="w-8 h-8 rounded-full object-cover" />
      ) : (
        <Building className="w-8 h-8 text-gray-500" />
      )}
      <span className="text-sm font-medium">{company.name}</span>
    </Link>
  );
};

export default CompanyCard;
