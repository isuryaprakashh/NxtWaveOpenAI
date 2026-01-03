import { attachmentAPI } from '../services/api';

// Icons for different file types
const FileIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
);

const PdfIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
);

const ImageIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const DownloadIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

function getIcon(mimeType) {
    if (!mimeType) return <FileIcon />;
    const lower = mimeType.toLowerCase();
    if (lower.includes('pdf')) return <PdfIcon />;
    if (lower.includes('image')) return <ImageIcon />;
    return <FileIcon />;
}

function formatSize(bytes) {
    if (!bytes) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
}

export default function AttachmentCard({ attachment, messageId }) {
    const { filename, mimeType, size, attachmentId } = attachment;
    const url = attachmentAPI.getAttachmentUrl(messageId, attachmentId, filename, mimeType);

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-colors group"
            title={`Click to preview/download ${filename}`}
        >
            <div className="flex items-center justify-center w-8 h-8 bg-blue-50 rounded-lg text-blue-600">
                {getIcon(mimeType)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-800 truncate">{filename}</div>
                <div className="text-xs text-gray-500">
                    {mimeType?.split('/').pop()?.toUpperCase() || 'FILE'}
                    {size ? ` · ${formatSize(size)}` : ''}
                </div>
            </div>
            <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                <DownloadIcon />
            </div>
        </a>
    );
}
