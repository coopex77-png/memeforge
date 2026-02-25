import React from 'react';

interface ButtonProps {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  disabled, 
  children, 
  variant = 'primary',
  className = '',
  size = 'md',
  icon
}) => {
  
  const baseStyles = "inline-flex items-center justify-center font-bold tracking-tight transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#02040A] focus:ring-[#DEFD41] disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale active:translate-y-px";
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs rounded-md gap-1.5",
    md: "px-5 py-2.5 text-sm rounded-lg gap-2",
    lg: "px-8 py-3.5 text-base rounded-lg gap-2.5",
  };

  const variants = {
    // Acid Green - The Main CTA
    primary: "bg-accent text-black hover:bg-accent-hover shadow-[0_0_15px_rgba(222,253,65,0.2)] hover:shadow-[0_0_25px_rgba(222,253,65,0.4)] border border-transparent",
    
    // Dark Navy - Secondary Actions
    secondary: "bg-navy-800 text-white hover:bg-[#1e293b] border border-white/5 hover:border-white/20",
    
    // Outline - Technical Look
    outline: "bg-transparent border border-accent/30 text-accent hover:bg-accent/10 hover:border-accent",

    // Danger
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500",
    
    // Ghost
    ghost: "bg-transparent hover:bg-white/5 text-slate-400 hover:text-white"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles[size]} ${variants[variant]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};