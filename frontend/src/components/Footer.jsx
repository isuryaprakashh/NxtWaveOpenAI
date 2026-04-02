import React from 'react';

const Footer = () => {
    return (
        <footer className="bg-white py-20 px-8 relative z-10 border-t border-black/5">
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12">
                <div className="col-span-2">
                    <div className="font-display text-2xl tracking-tighter text-gray-900 mb-6">Odin Mail</div>
                    <p className="text-gray-400 text-sm max-w-xs leading-relaxed font-medium">
                        The intelligent email layer for the next generation of productivity.
                    </p>
                </div>
                
                <div>
                    <h4 className="text-[0.6rem] font-bold tracking-[0.2em] text-gray-400 uppercase mb-6">Product</h4>
                    <ul className="space-y-3 text-gray-500 text-sm font-medium">
                        <li className="hover:text-gray-900 cursor-pointer transition-colors"><a href="/inbox">Inbox</a></li>
                        <li className="hover:text-gray-900 cursor-pointer transition-colors"><a href="/chat">AI Chat</a></li>
                        <li className="hover:text-gray-900 cursor-pointer transition-colors"><a href="#features">Features</a></li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-[0.6rem] font-bold tracking-[0.2em] text-gray-400 uppercase mb-6">Legal</h4>
                    <ul className="space-y-3 text-gray-500 text-sm font-medium">
                        <li className="hover:text-gray-900 cursor-pointer transition-colors"><a href="/terms">Terms</a></li>
                        <li className="hover:text-gray-900 cursor-pointer transition-colors"><a href="/privacy">Privacy</a></li>
                        <li className="hover:text-gray-900 cursor-pointer transition-colors"><a href="/legal">License</a></li>
                    </ul>
                </div>

                {/* Third Link Group could be "Company" or "About" if needed, keeping it minimal as requested */}
            </div>
            
            <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-black/5 flex justify-between items-center">
                <p className="text-gray-300 text-[0.7rem] font-bold uppercase tracking-widest">© 2026 ODIN Systems</p>
                <p className="text-gray-300 text-[0.7rem] font-bold uppercase tracking-widest">Built for humans</p>
            </div>
        </footer>
    );
};

export default Footer;
