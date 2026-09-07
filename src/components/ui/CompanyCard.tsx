
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
      className="flex items-center bg-gray-100 rounded-md p-2 hover:bg-gray-200 transition-colors w-1/2"
    >
      <Building className="w-4 h-4 text-gray-500 ml-2" />
      <span className="text-sm font-medium">{company.name}</span>
    </Link>
  );
};

export default CompanyCard;

