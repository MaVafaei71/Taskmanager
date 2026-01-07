
import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  src?: string;
  name?: string;
  className?: string;
  iconSize?: number;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ src, name, className = "", iconSize }) => {
  const [error, setError] = useState(false);

  // Reset error state if src changes
  useEffect(() => {
    setError(false);
  }, [src]);

  const effectiveIconSize = iconSize || 16;

  // Render Icon if no source or if an error occurred loading the image
  if (!src || src.trim() === '' || error) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden border border-gray-200`}>
        <User size={effectiveIconSize} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || 'User'}
      className={`${className} object-cover`}
      onError={() => setError(true)}
    />
  );
};

export default UserAvatar;
