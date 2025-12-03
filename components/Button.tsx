import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  icon,
  className = '', 
  ...props 
}) => {
  const baseStyles = "relative overflow-hidden transition-all duration-300 ease-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium tracking-tight";
  
  const variants = {
    primary: "bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 shadow-lg hover:shadow-xl rounded-full px-6 py-3",
    secondary: "bg-white dark:bg-zinc-800 text-black dark:text-white border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-sm hover:shadow-md rounded-full px-6 py-3",
    ghost: "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white rounded-lg px-4 py-2",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg hover:shadow-red-500/30 rounded-full px-6 py-3"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
};