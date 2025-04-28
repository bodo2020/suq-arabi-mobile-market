
import React from 'react';
import { UserIcon } from 'lucide-react';

interface UserProps {
  size?: number;
  className?: string;
}

const User = ({ size = 24, className = '' }: UserProps) => {
  return <UserIcon size={size} className={className} />;
};

export default User;
