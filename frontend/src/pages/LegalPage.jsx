import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer'; // Wait, let me check if Footer is a separate component

const LegalPage = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-ethereal">
            <Navbar />
            <div className="max-w-4xl mx-auto px-8 py-32">
                <div className="animate-fade-up">
                    <span className="pill-badge mb-6">Legal Information</span>
                    <h1 className="font-display text-5xl md:text-6xl tracking-tight text-gray-900 mb-12">
                        Legal Overview
                    </h1>
                    
                    <div className="glass p-10 md:p-16 border border-white/80 shadow-2xl space-y-12 text-gray-600 leading-relaxed">
                        <section>
                            <h2 className="font-display text-3xl text-gray-900 mb-6">Introduction</h2>
                            <p>
                                Welcome to ODIN. This page serves as a central hub for all legal matters related to our AI-powered email assistant. 
                                Our goal is to be transparent about how we operate and the rules that govern the use of our platform.
                            </p>
                        </section>

                        <section>
                            <h2 className="font-display text-3xl text-gray-900 mb-6">Compliance</h2>
                            <p>
                                ODIN is committed to adhering to all relevant laws and regulations regarding data protection and artificial intelligence. 
                                We continuously monitor regulatory changes to ensure our platform remains compliant with global standards.
                            </p>
                        </section>

                        <section>
                            <h2 className="font-display text-3xl text-gray-900 mb-6">Intellectual Property</h2>
                            <p>
                                All content, tools, and algorithms provided through ODIN are the exclusive property of ODIN Systems. 
                                Users are granted a limited, non-exclusive license to use these resources for their personal or professional email management.
                            </p>
                        </section>

                        {/* <section>
                            <h2 className="font-display text-3xl text-gray-900 mb-6">Contact</h2>
                            <p>
                                If you have any legal inquiries or concerns, please reach out to our legal department at <span className="text-gray-900 font-semibold">legal@odin-ai.com</span>.
                            </p>
                        </section> */}
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default LegalPage;
