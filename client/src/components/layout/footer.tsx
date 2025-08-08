import { Link } from "wouter";

export default function Footer() {
  const footerSections = [
    {
      title: "Product",
      links: [
        { href: "/tools", label: "Tools" },
        { href: "/pricing", label: "Pricing" },
        { href: "/api", label: "API" },
        { href: "/integrations", label: "Integrations" },
      ],
    },
    {
      title: "Resources",
      links: [
        { href: "/resources#blog", label: "Blog" },
        { href: "/resources#how-tos", label: "How-tos" },
        { href: "/resources#templates", label: "Templates" },
        { href: "/contact", label: "Support" },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: "/terms", label: "Terms" },
        { href: "/privacy", label: "Privacy" },
        { href: "/cookies", label: "Cookies" },
        { href: "/contact", label: "Contact" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-surface" role="contentinfo">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo and description */}
          <div className="md:col-span-1">
            <div className="mb-4">
              <svg width="120" height="32" viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-text-primary max-w-full h-auto">
                {/* Atomic symbol */}
                <g>
                  {/* Central nucleus */}
                  <circle cx="16" cy="16" r="2.5" fill="#6366F1"/>
                  
                  {/* Electron orbits */}
                  <ellipse cx="16" cy="16" rx="12" ry="4" stroke="#6366F1" strokeWidth="1.2" fill="none" opacity="0.6" transform="rotate(0 16 16)"/>
                  <ellipse cx="16" cy="16" rx="12" ry="4" stroke="#6366F1" strokeWidth="1.2" fill="none" opacity="0.6" transform="rotate(60 16 16)"/>
                  <ellipse cx="16" cy="16" rx="12" ry="4" stroke="#6366F1" strokeWidth="1.2" fill="none" opacity="0.6" transform="rotate(120 16 16)"/>
                  
                  {/* Electrons */}
                  <circle cx="28" cy="16" r="1.5" fill="#6366F1" opacity="0.8"/>
                  <circle cx="8" cy="8" r="1.5" fill="#6366F1" opacity="0.8"/>
                  <circle cx="24" cy="24" r="1.5" fill="#6366F1" opacity="0.8"/>
                </g>
                
                {/* Typography */}
                <text x="36" y="22" fontFamily="Inter, system-ui, sans-serif" fontSize="16" fontWeight="600" fill="currentColor">
                  atom<tspan fill="#6366F1">tools</tspan>.ai
                </text>
              </svg>
            </div>
            <p className="text-text-secondary text-sm mb-4">
              Automate your marketing workflows with AI-powered tools designed for modern teams.
            </p>
          </div>
          
          {/* Footer sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-text-primary mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={`${section.title}-${linkIndex}`}>
                    <Link href={link.href}>
                      <span 
                        className="text-text-secondary hover:text-text-primary text-sm transition-colors cursor-pointer"
                        data-testid={`footer-link-${link.label.toLowerCase()}`}
                      >
                        {link.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-border pt-8 mt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-text-secondary text-sm" data-testid="copyright">
            © 2024 atomtools.ai Ltd. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a 
              href="#" 
              className="text-text-secondary hover:text-accent transition-colors" 
              aria-label="Follow us on Twitter"
              data-testid="social-twitter"
            >
              <i className="fab fa-twitter"></i>
            </a>
            <a 
              href="#" 
              className="text-text-secondary hover:text-accent transition-colors" 
              aria-label="Follow us on LinkedIn"
              data-testid="social-linkedin"
            >
              <i className="fab fa-linkedin"></i>
            </a>
            <a 
              href="#" 
              className="text-text-secondary hover:text-accent transition-colors" 
              aria-label="Follow us on GitHub"
              data-testid="social-github"
            >
              <i className="fab fa-github"></i>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
