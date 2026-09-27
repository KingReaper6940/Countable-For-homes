import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import "./globals.css";
import "./readability.css";

export const metadata: Metadata = {
  title: "COUNTABLE | Every housing count has a receipt",
  description: "Countable helps housing-data analysts connect overlapping permit and occupancy records to a reviewed, evidence-backed count of new homes. Explore the working Pittsburgh prototype.",
  openGraph: {
    title: "COUNTABLE | Every housing count has a receipt",
    description: "From overlapping public records to a reviewed housing event with its source, passage, and decision attached.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "COUNTABLE | Every housing count has a receipt",
    description: "An evidence-backed housing count, with a working review app.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <div className="app-shell">
          <SiteHeader/>
          <main id="main-content">{children}</main>
          <footer className="site-footer">
            <span>COUNTABLE <span aria-hidden="true">/</span> Every housing count has a receipt.</span>
            <span>Independent analyst prototype · Human approval required</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
