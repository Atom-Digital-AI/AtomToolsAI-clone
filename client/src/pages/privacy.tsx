import Section from "@/components/ui/section";

export default function Privacy() {
  return (
    <Section>
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-3xl lg:text-4xl font-bold mb-8 text-text-primary">
          Privacy Policy
        </h1>
        <div className="prose prose-invert max-w-none">
          <p className="text-text-secondary mb-4">
            <strong>Last updated:</strong> 8 August 2025
          </p>
          
          <div className="space-y-8 text-text-primary">
            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">1. Information We Collect</h2>
              <div className="text-text-secondary space-y-4">
                <p>We collect information you provide directly to us, such as:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Account information (email, name, password)</li>
                  <li>Payment information (processed by secure third-party providers)</li>
                  <li>Communications with our support team</li>
                  <li>Marketing automation data you upload or connect</li>
                </ul>
                
                <p>We also automatically collect certain information when you use our service:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Usage data and analytics</li>
                  <li>Device information and IP addresses</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
              <div className="text-text-secondary space-y-4">
                <p>We use the information we collect to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process payments and manage your account</li>
                  <li>Send service-related communications</li>
                  <li>Provide customer support</li>
                  <li>Analyse usage patterns and improve our tools</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">3. Information Sharing</h2>
              <div className="text-text-secondary space-y-4">
                <p>We do not sell, trade, or rent your personal information. We may share information in these limited circumstances:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>With service providers who help us operate our business</li>
                  <li>When required by law or legal process</li>
                  <li>To protect our rights, property, or safety</li>
                  <li>With your explicit consent</li>
                  <li>In connection with a business transfer or acquisition</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">4. Data Security</h2>
              <p className="text-text-secondary mb-4">
                We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction. This includes encryption, secure servers, and regular security audits.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">5. Data Retention</h2>
              <p className="text-text-secondary mb-4">
                We retain your information for as long as necessary to provide our services and comply with legal obligations. Account data is retained for 30 days after account deletion to allow for account recovery.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">6. Your Rights</h2>
              <div className="text-text-secondary space-y-4">
                <p>Under GDPR and UK data protection laws, you have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate information</li>
                  <li>Delete your information</li>
                  <li>Port your data to another service</li>
                  <li>Object to processing</li>
                  <li>Restrict processing</li>
                  <li>Withdraw consent</li>
                </ul>
                <p>To exercise these rights, contact us at hello@atomtools.ai</p>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">7. Cookies</h2>
              <div className="text-text-secondary space-y-4">
                <p>We use cookies and similar technologies to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Remember your preferences and settings</li>
                  <li>Analyse site usage and performance</li>
                  <li>Provide security features</li>
                  <li>Deliver relevant content</li>
                </ul>
                <p>You can control cookie settings through your browser preferences.</p>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">8. Third-Party Services</h2>
              <p className="text-text-secondary mb-4">
                Our service integrates with third-party platforms (Facebook Ads, Google Ads, etc.). When you connect these services, their privacy policies also apply to the data they collect and process.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">9. International Transfers</h2>
              <p className="text-text-secondary mb-4">
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data during international transfers.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">10. Children's Privacy</h2>
              <p className="text-text-secondary mb-4">
                Our service is not intended for children under 16. We do not knowingly collect personal information from children under 16. If we become aware of such collection, we will delete the information immediately.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
              <p className="text-text-secondary mb-4">
                We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through our service. The updated policy will be effective when posted.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">12. Contact Us</h2>
              <div className="text-text-secondary space-y-2">
                <p>If you have questions about this Privacy Policy or our data practices, contact us at:</p>
                <p>
                  <strong>Email:</strong> hello@atomtools.ai<br />
                  <strong>Address:</strong> atomtools.ai Ltd, 123 Tech Street, London EC2A 4NE, United Kingdom<br />
                  <strong>DPO:</strong> dpo@atomtools.ai
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Section>
  );
}
