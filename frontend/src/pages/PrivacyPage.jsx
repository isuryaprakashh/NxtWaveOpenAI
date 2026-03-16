import { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const PrivacyPage = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-ethereal">
            <Navbar />
            <div className="max-w-4xl mx-auto px-8 py-32">
                <div className="animate-fade-up">
                    <span className="pill-badge mb-6">Data Stewardship</span>
                    <h1 className="font-display text-5xl md:text-6xl tracking-tight text-gray-900 mb-12">
                        Privacy Policy
                    </h1>
                    
                    <div className="glass p-10 md:p-16 border border-white/80 shadow-2xl space-y-12 text-gray-600 leading-relaxed">
                        <section>
                            <h2 className="font-display text-3xl text-gray-900 mb-6 font-medium">1. Information We Collect</h2>
                            <p>
                                ODIN only accesses your email data through secure OAuth channels explicitly authorized by you. 
                                We fetch message content temporarily for analysis and generation of summaries or replies.
                            </p>
                        </section>

                        <section>
                            <h2 className="font-display text-3xl text-gray-900 mb-6 font-medium">2. How We Use Data</h2>
                            <p>
                                Your data is used exclusively to provide the AI features of the platform. We do not sell your 
                                personal information or use your email content to train our general AI models.
                            </p>
                        </section>

                        <section>
                            <h2 className="font-display text-3xl text-gray-900 mb-6 font-medium">3. Data Security</h2>
                            <p>
                                We implement industry-leading encryption and security protocols to ensure your data is protected 
                                at all times. Analysis results are stored in an isolated database environment encrypted at rest.
                            </p>
                        </section>

                        <section>
                            <h2 className="font-display text-3xl text-gray-900 mb-6 font-medium">4. Your Control</h2>
                            <p>
                                You have full control over your data. You can disconnect your account and request local data 
                                deletion at any time through the platform settings or by contacting our support.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default PrivacyPage;
