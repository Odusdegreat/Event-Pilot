import Link from "next/link";

const steps = [
  ["01", "Research understands the brief", "Finds the useful signals: goals, audience, constraints, location, and budget."],
  ["02", "Memory makes it durable", "Each fact is saved once into a project memory agents can retrieve later."],
  ["03", "Specialists build together", "Planning and marketing make informed decisions without asking for context again."],
];

export default function LandingPage() {
  return (
    <main className="site">
      <div className="site-grain" />
      <header className="site-nav">
        <Link className="brand" href="/"><span className="brand-mark">E</span><span>eventpilot</span></Link>
        <nav className="site-links" aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#memory">Memory layer</a><a href="#built-for">Use cases</a></nav>
        <Link className="site-nav-cta" href="/dashboard">Open dashboard </Link>
      </header>

      <section className="site-hero">
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-orbit orbit-three" />
        <div className="site-hero-copy">
          <div className="site-eyebrow"><span /> SHARED MEMORY FOR AI TEAMS</div>
          <h1>Events take a <em>team.</em><br />So should your AI.</h1>
          <p>EventPilot gives specialized agents a shared memory, so every useful decision survives from the first brief to the final guest experience.</p>
          <div className="hero-actions"><Link className="primary-cta" href="/dashboard">Start planning <span>→</span></Link><a className="text-cta" href="#how-it-works">See the system <span>↓</span></a></div>
        </div>
        <div className="hero-machine" aria-label="Agent memory visualization">
          <div className="machine-caption top-caption">ONE SHARED PROJECT MEMORY</div>
          <div className="memory-core"><span className="core-ring" /><div><i>✦</i><b>Memory</b><small>18 live notes</small></div></div>
          <div className="machine-agent researcher"><b>R</b><span>Research<br /><small>signals</small></span></div>
          <div className="machine-agent planner"><b>P</b><span>Planning<br /><small>operations</small></span></div>
          <div className="machine-agent marketer"><b>M</b><span>Marketing<br /><small>momentum</small></span></div>
          <span className="connection c-one" /><span className="connection c-two" /><span className="connection c-three" />
          <div className="machine-caption bottom-caption">AGENTS CONTRIBUTE. AGENTS RECALL.</div>
        </div>
      </section>

      <section className="proof-band"><p>Built around decisions that <i>should not</i> disappear.</p><div><span>Research</span><b>+</b><span>Planning</span><b>+</b><span>Marketing</span><b>=</b><strong>One aligned event</strong></div></section>

      <section className="story-section" id="how-it-works">
        <div className="section-intro"><span className="small-label">The EventPilot way</span><h2>One brief in.<br /><em>Complete alignment</em> out.</h2></div>
        <div className="story-list">{steps.map(([number, title, description]) => <article className="story-step" key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div>
      </section>

      <section className="memory-story" id="memory">
        <div className="memory-art"><div className="memory-art-card card-a"><small>RESEARCH</small><b>500 developers</b><span>Audience target</span></div><div className="memory-art-card card-b"><small>PLANNING</small><b>Developer communities</b><span>Acquisition choice</span></div><div className="memory-art-card card-c"><small>MARKETING</small><b>Build what lasts</b><span>Campaign narrative</span></div><span className="memory-line line-a" /><span className="memory-line line-b" /></div>
        <div className="memory-copy"><span className="small-label">The memory layer</span><h2>Context is no longer a handoff problem.</h2><p>When an agent discovers something worth keeping, EventPilot stores it with its source and purpose. The next agent recalls it when it matters.</p><ul><li><span>✓</span> Provenance for every important decision</li><li><span>✓</span> A visible memory trail for the whole team</li><li><span>✓</span> Better answers, grounded in the project</li></ul></div>
      </section>

      <section className="uses-section" id="built-for"><div className="section-intro"><span className="small-label">Built for the moment before it matters</span><h2>Make a better room.</h2></div><div className="use-grid"><article><span>01</span><h3>Conferences</h3><p>Align programming, logistics, partnerships, and campaigns around the same audience.</p></article><article><span>02</span><h3>Brand events</h3><p>Turn an ambitious launch brief into an experience with every detail connected.</p></article><article><span>03</span><h3>Community gatherings</h3><p>Build momentum with a team that remembers what your people care about.</p></article></div></section>

      <section className="closing"><span className="small-label">Your next event is waiting</span><h2>Give your agents<br />something to <em>remember.</em></h2><Link className="primary-cta" href="/dashboard">Open EventPilot </Link></section>
      <footer><Link className="brand" href="/"><span className="brand-mark">E</span><span>eventpilot</span></Link><span>Shared memory for event-making teams.</span><span>2026</span></footer>
    </main>
  );
}
