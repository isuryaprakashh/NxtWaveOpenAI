import { Link } from 'react-router-dom';
import Badge from './Badge';

export default function EmailCard({ email }) {
    const { id, from, subject, snippet, date, is_spam, has_attachments, attachments = [] } = email;

    return (
        <Link
            to={`/message/${id}`}
            className="block bg-white border-b border-gray-100 px-6 py-4 hover:bg-gray-50 transition-colors"
        >
            <div className="flex gap-4 items-start">
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-800 text-sm truncate max-w-xs">
                                {from}
                            </span>
                            <Badge variant={is_spam ? 'spam' : 'inbox'} className="text-[10px] py-0">
                                {is_spam ? 'spam' : 'inbox'}
                            </Badge>
                            {has_attachments && (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                    {attachments.length}
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{date}</span>
                    </div>

                    {/* Subject */}
                    <h3 className="font-medium text-gray-700 text-sm mb-1 truncate">{subject}</h3>

                    {/* Snippet */}
                    <p className="text-gray-500 text-xs line-clamp-1">{snippet}</p>

                    {/* Attachment chips */}
                    {has_attachments && attachments.length > 0 && (
                        <div className="flex gap-2 flex-wrap mt-2">
                            {attachments.slice(0, 3).map((att, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    {att.filename.length > 20 ? att.filename.slice(0, 20) + '...' : att.filename}
                                </span>
                            ))}
                            {attachments.length > 3 && (
                                <span className="text-xs text-gray-400">+{attachments.length - 3} more</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}
