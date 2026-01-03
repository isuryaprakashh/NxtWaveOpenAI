const variants = {
    // Priority badges
    HIGH: 'bg-red-50 text-red-600 border border-red-200',
    MEDIUM: 'bg-amber-50 text-amber-600 border border-amber-200',
    LOW: 'bg-green-50 text-green-600 border border-green-200',

    // Sentiment badges
    positive: 'bg-green-50 text-green-600 border border-green-200',
    negative: 'bg-red-50 text-red-600 border border-red-200',
    neutral: 'bg-gray-100 text-gray-600 border border-gray-200',

    // Category badge
    category: 'bg-blue-50 text-blue-600 border border-blue-200',

    // Label badges
    spam: 'border border-amber-500 text-amber-600 bg-transparent',
    inbox: 'border border-green-500 text-green-600 bg-transparent',
};

export default function Badge({ variant, children, className = '' }) {
    const baseClasses = 'inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide';
    const variantClasses = variants[variant] || variants.neutral;

    return (
        <span className={`${baseClasses} ${variantClasses} ${className}`}>
            {children}
        </span>
    );
}
