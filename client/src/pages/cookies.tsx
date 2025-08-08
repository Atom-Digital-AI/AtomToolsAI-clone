import Section from "@/components/ui/section";

export default function Cookies() {
  return (
    <Section>
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-3xl lg:text-4xl font-bold mb-8 text-text-primary">
          Cookie Policy
        </h1>
        <div className="prose prose-invert max-w-none">
          <p className="text-text-secondary mb-4">
            <strong>Last updated:</strong> 8 August 2025
          </p>
          
          <div className="space-y-8 text-text-primary">
            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">What are cookies?</h2>
              <p className="text-text-secondary mb-4">
                Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently, provide information to website owners, and improve user experience.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">How we use cookies</h2>
              <p className="text-text-secondary mb-4">
                We use cookies to enhance your experience on atomtools.ai. Our cookies serve various purposes including security, functionality, performance monitoring, and user preferences.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">Types of cookies we use</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Essential Cookies</h3>
                  <p className="text-text-secondary mb-2">
                    These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and accessibility.
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-text-secondary text-sm">
                    <li>Session cookies for authentication</li>
                    <li>Security cookies for fraud prevention</li>
                    <li>Load balancing cookies</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Functional Cookies</h3>
                  <p className="text-text-secondary mb-2">
                    These cookies enable enhanced functionality and personalisation. They remember your preferences and settings.
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-text-secondary text-sm">
                    <li>User preference cookies</li>
                    <li>Language and region settings</li>
                    <li>Theme preferences (dark/light mode)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Analytics Cookies</h3>
                  <p className="text-text-secondary mb-2">
                    These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-text-secondary text-sm">
                    <li>Website analytics cookies</li>
                    <li>Page view tracking</li>
                    <li>Performance monitoring</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Marketing Cookies</h3>
                  <p className="text-text-secondary mb-2">
                    These cookies track your activity across websites to deliver more relevant advertising and measure campaign effectiveness.
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-text-secondary text-sm">
                    <li>Advertising platform cookies</li>
                    <li>Conversion tracking</li>
                    <li>Retargeting pixels</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">Cookie duration</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Session Cookies</h3>
                  <p className="text-text-secondary text-sm">
                    These cookies are deleted when you close your browser session.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Persistent Cookies</h3>
                  <p className="text-text-secondary text-sm">
                    These cookies remain on your device for a set period (ranging from minutes to years) or until you delete them manually.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">Managing your cookie preferences</h2>
              <div className="text-text-secondary space-y-4">
                <p>You can control cookies in several ways:</p>
                
                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Browser Settings</h3>
                  <p className="mb-2">Most web browsers allow you to:</p>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>View cookies stored on your device</li>
                    <li>Delete individual or all cookies</li>
                    <li>Block cookies from specific websites</li>
                    <li>Block all cookies</li>
                    <li>Set preferences for different types of cookies</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Our Cookie Banner</h3>
                  <p className="text-sm">
                    When you first visit our website, we'll show you a cookie banner where you can choose to accept or decline non-essential cookies. You can change your preferences at any time by clicking the cookie preferences link in our footer.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">Third-party cookies</h2>
              <div className="text-text-secondary space-y-4">
                <p>Some cookies on our site are set by third-party services:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Analytics Services:</strong> Help us understand website usage</li>
                  <li><strong>Payment Processors:</strong> Secure payment processing</li>
                  <li><strong>Social Media:</strong> Social sharing functionality</li>
                  <li><strong>Advertising Platforms:</strong> Deliver relevant ads</li>
                </ul>
                <p>
                  These third parties have their own privacy policies and cookie policies which govern their use of cookies.
                </p>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">Impact of disabling cookies</h2>
              <div className="text-text-secondary space-y-4">
                <p>Disabling cookies may affect your experience:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You may need to log in more frequently</li>
                  <li>Some features may not work properly</li>
                  <li>Personalised settings may not be saved</li>
                  <li>Website performance may be reduced</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">Updates to this policy</h2>
              <p className="text-text-secondary mb-4">
                We may update this Cookie Policy from time to time to reflect changes in our practices or applicable laws. We will notify you of significant changes by posting a notice on our website.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold mb-4">Contact us</h2>
              <div className="text-text-secondary space-y-2">
                <p>If you have questions about our use of cookies, please contact us at:</p>
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
