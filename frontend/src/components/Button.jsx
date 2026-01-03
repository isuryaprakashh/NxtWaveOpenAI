const variants = {
    primary: 'bg-gray-900 text-white border-gray-900 hover:bg-gray-700',
    secondary: 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50',
    success: 'bg-green-600 text-white border-green-600 hover:bg-green-700',
    danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700',
};

export default function Button({
    variant = 'primary',
    children,
    className = '',
    disabled = false,
    loading = false,
    ...props
}) {
    const baseClasses = 'px-4 py-2 border rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
    const variantClasses = variants[variant] || variants.primary;

    return (
        <button
            className={`${baseClasses} ${variantClasses} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading...
                </span>
            ) : children}
        </button>
    );
}
