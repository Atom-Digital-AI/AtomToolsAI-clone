import Section from "@/components/ui/section";

export default function Terms() {
  return (
    <Section>
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-3xl lg:text-4xl font-bold mb-8 text-text-primary">
          Terms of Service
        </h1>
        <div className="prose prose-invert max-w-none">
          <p className="text-text-secondary mb-4">
            <strong>Last updated:</strong> 8 August 2025
          </p>
          
          <div className="space-y-8 text-text-primary">
            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-text-secondary mb-4">
                By accessing and using atomtools.ai (the "Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-text-secondary mb-4">
                atomtools.ai provides AI-powered marketing automation tools including connectors, generators, and reporting helpers. Our service includes both free and paid tiers with different usage limits and features.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">3. User Account</h2>
              <div className="text-text-secondary space-y-4">
                <p>
                  To access certain features of the Service, you must register for an account. You agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate, current, and complete information during registration</li>
                  <li>Maintain and update your account information</li>
                  <li>Keep your password secure and confidential</li>
                  <li>Accept responsibility for all activities under your account</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">4. Acceptable Use</h2>
              <div className="text-text-secondary space-y-4">
                <p>You agree not to use the Service to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Transmit harmful, abusive, or spam content</li>
                  <li>Attempt to gain unauthorised access to our systems</li>
                  <li>Use automated tools to access the service beyond API limits</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">5. Billing and Payments</h2>
              <div className="text-text-secondary space-y-4">
                <p>
                  Paid plans are billed monthly or annually in advance. You agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide current, complete, and accurate billing information</li>
                  <li>Pay all charges when due</li>
                  <li>Accept responsibility for all charges under your account</li>
                </ul>
                <p>
                  We offer a 14-day money-back guarantee on all paid plans.
                </p>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">6. Data and Privacy</h2>
              <p className="text-text-secondary mb-4">
                Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your information. You retain ownership of your data, and we will not access or use it except as necessary to provide the Service.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">7. Intellectual Property</h2>
              <p className="text-text-secondary mb-4">
                The Service and its original content, features, and functionality are owned by atomtools.ai Ltd and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
              <p className="text-text-secondary mb-4">
                In no event shall atomtools.ai Ltd be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, or business interruption.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">9. Termination</h2>
              <p className="text-text-secondary mb-4">
                We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">10. Changes to Terms</h2>
              <p className="text-text-secondary mb-4">
                We reserve the right to modify these terms at any time. We will notify users of significant changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">11. Governing Law</h2>
              <p className="text-text-secondary mb-4">
                These terms are governed by the laws of England and Wales. Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">12. Contact Information</h2>
              <div className="text-text-secondary space-y-2">
                <p>If you have any questions about these Terms, please contact us at:</p>
                <p>
                  <strong>Email:</strong> hello@atomtools.ai<br />
                  <strong>Address:</strong> atomtools.ai Ltd, 123 Tech Street, London EC2A 4NE, United Kingdom
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Section>
  );
}
