"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteHeader(){
  const pathname=usePathname();
  const landing=pathname==="/";
  return <header className={`topbar ${landing?"":"product-nav"}`}>
    <Link href="/" className="brand" aria-label="Countable, story homepage"><span className="brand-mark" aria-hidden="true"><span/><span/><span/></span><span>COUNTABLE</span></Link>
    <nav className="main-nav" aria-label="Main navigation">
      {landing?<><a href="#story">The problem</a><a href="#method">How it works</a><a href="#proof">Real data</a><a className="story-demo-link" href="#demo">Live demo</a></>:<><Link href="/">← The pitch</Link><Link href="/app" aria-current={pathname==="/app"?"page":undefined}>Review queue</Link><Link href="/ledger" aria-current={pathname==="/ledger"?"page":undefined}>Reviewed ledger</Link></>}
    </nav>
    <Link className="nav-app-link" href={landing?"/app":"/projects/development-10c?showcase=1"}>{landing?"Explore app ↗":"Guided case ↗"}</Link>
  </header>;
}
