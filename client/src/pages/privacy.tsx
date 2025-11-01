import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose max-w-none space-y-6">
            
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
              <p>
                At atomtools.ai ("we", "our", or "us"), we respect your privacy and are committed to protecting your personal data. 
                This privacy policy explains how we collect, use, process, and protect your information when you use our AI-powered 
                marketing tools platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. Data We Collect</h2>
              
              <h3 className="text-xl font-semibold mb-2">2.1 Information You Provide</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Email address, name, company name, password (encrypted)</li>
                <li><strong>Profile Information:</strong> Profile picture, user preferences</li>
                <li><strong>Content Data:</strong> Brand guidelines, marketing content, AI-generated outputs</li>
                <li><strong>Payment Information:</strong> Processed securely through Stripe (we do not store credit card details)</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">2.2 Automatically Collected Data</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent, interaction patterns</li>
                <li><strong>Device Information:</strong> Browser type, IP address, device type, operating system</li>
                <li><strong>Cookies:</strong> Session cookies for authentication (essential cookies only)</li>
                <li><strong>AI Usage Logs:</strong> API calls made, tokens consumed, generation timestamps</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. How We Use Your Data</h2>
              <p>We process your personal data for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Service Provision:</strong> To provide, maintain, and improve our AI marketing tools</li>
                <li><strong>Authentication:</strong> To verify your identity and secure your account</li>
                <li><strong>AI Generation:</strong> To generate marketing content using OpenAI and Anthropic APIs</li>
                <li><strong>Communication:</strong> To send service updates, security alerts, and support responses</li>
                <li><strong>Analytics:</strong> To understand usage patterns and improve user experience</li>
                <li><strong>Legal Compliance:</strong> To comply with legal obligations and prevent fraud</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Legal Basis for Processing (GDPR)</h2>
              <p>We process your personal data based on:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Contract Performance:</strong> Processing necessary to provide our services</li>
                <li><strong>Legitimate Interests:</strong> Improving our services, security, and fraud prevention</li>
                <li><strong>Consent:</strong> Optional marketing communications (you can opt-out anytime)</li>
                <li><strong>Legal Obligation:</strong> Compliance with applicable laws</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Data Sharing and Third Parties</h2>
              <p>We share your data with the following third-party processors:</p>
              
              <div className="space-y-3">
                <div>
                  <strong>OpenAI</strong> - AI content generation
                  <br />
                  <span className="text-sm text-muted-foreground">Data Processing Agreement in place</span>
                </div>
                <div>
                  <strong>Anthropic (Claude)</strong> - AI content generation
                  <br />
                  <span className="text-sm text-muted-foreground">Data Processing Agreement in place</span>
                </div>
                <div>
                  <strong>Stripe</strong> - Payment processing
                  <br />
                  <span className="text-sm text-muted-foreground">PCI DSS compliant</span>
                </div>
                <div>
                  <strong>SendGrid</strong> - Transactional emails
                  <br />
                  <span className="text-sm text-muted-foreground">Email verification, notifications</span>
                </div>
                <div>
                  <strong>Google Cloud Storage</strong> - File storage
                  <br />
                  <span className="text-sm text-muted-foreground">Secure cloud storage</span>
                </div>
                <div>
                  <strong>Neon</strong> - Database hosting
                  <br />
                  <span className="text-sm text-muted-foreground">PostgreSQL database service</span>
                </div>
              </div>

              <p className="mt-4">
                We do not sell your personal data to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. International Data Transfers</h2>
              <p>
                Your data may be transferred to and processed in countries outside your country of residence, including the United States. 
                We ensure adequate safeguards are in place through Standard Contractual Clauses (SCCs) and Data Processing Agreements with our processors.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Data Retention</h2>
              <p>We retain your personal data for:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Data:</strong> Until account deletion is requested</li>
                <li><strong>Generated Content:</strong> As long as your account is active</li>
                <li><strong>Usage Logs:</strong> 90 days for analytics and troubleshooting</li>
                <li><strong>AI Usage Logs:</strong> Retained for billing and cost monitoring</li>
                <li><strong>Error Logs:</strong> 90 days for debugging purposes</li>
                <li><strong>Backup Data:</strong> Up to 30 days in encrypted backups</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Your Rights (GDPR)</h2>
              <p>Under GDPR and UK data protection laws, you have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Rectification:</strong> Correct inaccurate data</li>
                <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
                <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
                <li><strong>Restriction:</strong> Limit how we process your data</li>
                <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
                <li><strong>Withdraw Consent:</strong> Opt-out of marketing communications</li>
                <li><strong>Lodge a Complaint:</strong> Contact your local data protection authority</li>
              </ul>
              <p className="mt-4">
                To exercise your rights, contact us at: <a href="mailto:privacy@atomtools.ai" className="text-blue-600 underline">privacy@atomtools.ai</a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Data Security</h2>
              <p>We implement industry-standard security measures:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Encryption in transit (HTTPS/TLS)</li>
                <li>Encryption at rest for sensitive data</li>
                <li>Password hashing with bcrypt (12 rounds)</li>
                <li>Secure session management with httpOnly cookies</li>
                <li>Regular security audits and vulnerability scanning</li>
                <li>Rate limiting and DDoS protection</li>
                <li>Access controls and principle of least privilege</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Cookies Policy</h2>
              <p>
                We use essential cookies only for authentication and session management. These cookies are necessary for the service to function 
                and cannot be disabled. We do not use third-party tracking cookies or advertising cookies.
              </p>
              <p className="mt-2">
                <strong>Essential Cookies:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><code>connect.sid</code> - Session authentication (httpOnly, secure)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">11. Children's Privacy</h2>
              <p>
                Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. 
                If you believe we have inadvertently collected data from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">12. Data Breach Notification</h2>
              <p>
                In the event of a data breach that affects your personal data, we will notify you and the relevant supervisory authority 
                within 72 hours as required by GDPR Article 33.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">13. Changes to This Policy</h2>
              <p>
                We may update this privacy policy from time to time. We will notify you of any material changes by email or through the platform. 
                Continued use of our services after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">14. Contact Us</h2>
              <p>
                For privacy-related questions, concerns, or to exercise your rights, contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mt-3">
                <p><strong>Email:</strong> <a href="mailto:privacy@atomtools.ai" className="text-blue-600 underline">privacy@atomtools.ai</a></p>
                <p><strong>Data Protection Officer:</strong> <a href="mailto:dpo@atomtools.ai" className="text-blue-600 underline">dpo@atomtools.ai</a></p>
                <p><strong>Address:</strong> [Your Company Address]</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">15. Supervisory Authority</h2>
              <p>
                If you are located in the EU/EEA or UK, you have the right to lodge a complaint with your local data protection authority:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>UK:</strong> Information Commissioner's Office (ICO) - <a href="https://ico.org.uk" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">ico.org.uk</a></li>
                <li><strong>EU:</strong> Find your local authority at <a href="https://edpb.europa.eu" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">edpb.europa.eu</a></li>
              </ul>
            </section>

            <div className="border-t pt-6 mt-8">
              <p className="text-sm text-muted-foreground">
                This privacy policy complies with the General Data Protection Regulation (GDPR), UK Data Protection Act 2018, 
                and other applicable data protection laws.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
