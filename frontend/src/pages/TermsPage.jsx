import { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const TermsPage = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-ethereal">
            <Navbar />
            <div className="max-w-4xl mx-auto px-8 py-32">
                <div className="animate-fade-up">
                    <span className="pill-badge mb-6">User Agreement</span>
                    <h1 className="font-display text-5xl md:text-6xl tracking-tight text-gray-900 mb-12">
                        Terms of Service
                    </h1>
                    
                    <div className="glass p-10 md:p-16 border border-white/80 shadow-2xl space-y-12 text-gray-600 leading-relaxed text-[0.95rem]">
                        <section>
                            <h2 className="font-display text-3xl text-gray-900 mb-6 font-medium">1. Acceptance of Terms</h2>
                            <p>
                                By accessing or using ODIN, you agree to be bound by these Terms of Service. If you do not agree to these terms, 
                                please refrain from using the platform.
                            </p>
                        </section>

                        <section>
                            <h2 className="font-display text-3xl text-gray-900 mb-6 font-medium">2. AI Capabilities</h2>
                            <p>
                                ODIN leverages Advanced Compound Intelligence to assist with your emails. While our AI is highly capable, 
                                we do not guarantee 100% accuracy in summaries or generated replies. Users should review AI-generated content 
                                before taking critical actions.
                            </p>
                        </section>

                        <section>
                            <h2 className="font-display text-3xl text-gray-900 mb-6 font-medium">3. Prohibited Activities</h2>
                            <p>
                                You agree not to use ODIN for any unlawful purposes, including but not limited to spreading malware, 
                                phishing, or any form of harassment through email communications.
                            </p>
                        </section>

                        <section>
                            <h2 className="font-display text-3xl text-gray-900 mb-6 font-medium">4. Service Limitations</h2>
                            <p>
                                We reserve the right to modify or terminate the service at any time without prior notice. 
                                We are not liable for any service interruptions or data loss related to third-party integrations like Gmail.
                            </p>
                        </section>
                    </div>
                    <p className="mt-12 text-center text-gray-400 text-sm">Last updated: March 16, 2026</p>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default TermsPage;
