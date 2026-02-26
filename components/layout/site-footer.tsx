import Link from "next/link";

import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  WhatsAppIcon,
  YouTubeIcon,
} from "@/components/ui/icons";

const socialLinks = [
  { href: "https://facebook.com", label: "Facebook", Icon: FacebookIcon },
  { href: "https://instagram.com", label: "Instagram", Icon: InstagramIcon },
  { href: "https://wa.me/923001112222", label: "WhatsApp", Icon: WhatsAppIcon },
  { href: "https://youtube.com", label: "YouTube", Icon: YouTubeIcon },
  { href: "https://linkedin.com", label: "LinkedIn", Icon: LinkedInIcon },
];

const policyLinks = [
  { label: "Privacy Policy", href: "#" },
  { label: "Shipping Policy", href: "#" },
  { label: "Returns & Refunds", href: "#" },
  { label: "Terms & Conditions", href: "#" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <section className="social-prominent">
          <h3>Follow Equinemates</h3>
          <div className="social-links prominent">
            {socialLinks.map(({ href, label, Icon }) => (
              <Link
                aria-label={label}
                href={href}
                key={label}
                rel="noreferrer"
                target="_blank"
              >
                <Icon height={24} width={24} />
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h3>Customer Care</h3>
          <ul>
            <li>
              <Link href="/contact">Contact Us</Link>
            </li>
            <li>
              <Link href="/account/orders">Track Your Order</Link>
            </li>
            <li>
              <Link href="/catalog-request">Catalog Request</Link>
            </li>
            <li>
              <Link href="/wholesale">Wholesale Inquiry</Link>
            </li>
          </ul>
        </section>

        <section>
          <h3>About Equinemates</h3>
          <ul>
            <li>
              <Link href="/about">Our Story</Link>
            </li>
            <li>
              <Link href="/products">Shop Collections</Link>
            </li>
            <li>
              <Link href="/admin">Admin Panel</Link>
            </li>
            <li>
              <Link href="/wholesale/dashboard">Wholesale Dashboard</Link>
            </li>
          </ul>
        </section>

        <section>
          <h3>Newsletter Signup</h3>
          <p>
            Sign up for product launches, promotions, and stable supply updates.
          </p>
          <form className="newsletter-form">
            <input placeholder="Email address" type="email" />
            <button className="btn-primary" type="button">
              Join
            </button>
          </form>
          {/* social icons moved to prominent location */}
        </section>

        {/* Removed App Download / future mobile app section per request */}
      </div>

      <div className="footer-policy-strip">
        <div className="container">
          {policyLinks.map((item) => (
            <Link href={item.href} key={item.label}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <p className="footer-bottom">
        {new Date().getFullYear()} Equinemates. All rights reserved.
      </p>
    </footer>
  );
}
