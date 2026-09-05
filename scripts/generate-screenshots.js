import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const docsDir = path.resolve('docs/screenshots');
const assetsDir = path.resolve('assets/screenshots');

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 1. Desktop SVG Mockup matching Screenshot 2026-09-05 at 11.28.26 AM.png
const desktopSvg = `
<svg width="1560" height="1100" viewBox="0 0 1560 1100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E2C9A5"/>
      <stop offset="100%" stop-color="#C5A47E"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <rect width="1560" height="1100" fill="#0D0D0D"/>

  <!-- Top Navbar -->
  <rect x="0" y="0" width="1560" height="74" fill="#141414" stroke="#262626" stroke-width="1"/>
  
  <!-- Logo -->
  <circle cx="56" cy="37" r="18" fill="#1E1E1E" stroke="#C5A47E" stroke-width="1.5"/>
  <polygon points="56,26 62,37 56,48 50,37" fill="#C5A47E"/>
  <text x="86" y="44" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="700">GTD App</text>

  <!-- Search Bar -->
  <rect x="420" y="19" width="460" height="38" rx="10" fill="#1A1A1A" stroke="#2E2E2E" stroke-width="1"/>
  <text x="442" y="43" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13">Search actions, projects, horizons...</text>
  <rect x="838" y="27" width="28" height="22" rx="4" fill="#262626"/>
  <text x="844" y="42" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600">⌘K</text>

  <!-- Mind Sweep Button -->
  <rect x="900" y="19" width="140" height="38" rx="10" fill="#1A1A1A" stroke="#2E2E2E" stroke-width="1"/>
  <text x="942" y="43" fill="#D1D5DB" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600">Mind Sweep</text>

  <!-- Quick Capture + Button -->
  <rect x="1440" y="19" width="38" height="38" rx="10" fill="url(#goldGrad)"/>
  <text x="1454" y="44" fill="#000000" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="700">+</text>

  <!-- User Profile Button -->
  <rect x="1490" y="19" width="46" height="38" rx="10" fill="#1A1A1A" stroke="#2E2E2E" stroke-width="1"/>
  <circle cx="1508" cy="38" r="8" fill="#374151"/>

  <!-- Sub Navigation Row -->
  <rect x="0" y="74" width="1560" height="52" fill="#111111" stroke="#222222" stroke-width="1"/>
  
  <!-- Tabs -->
  <text x="64" y="105" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500">Cockpit</text>
  
  <rect x="156" y="84" width="180" height="34" rx="8" fill="#24221E" stroke="#C5A47E" stroke-width="1.2"/>
  <circle cx="178" cy="101" r="5" fill="#C5A47E"/>
  <text x="194" y="106" fill="#C5A47E" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600">Horizons of Focus</text>

  <text x="368" y="105" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500">Projects</text>
  <rect x="428" y="93" width="18" height="18" rx="9" fill="#262626"/>
  <text x="434" y="106" fill="#D1D5DB" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600">5</text>
  <circle cx="456" cy="102" r="3.5" fill="#F59E0B"/>

  <text x="496" y="105" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500">Actions &amp; Lists</text>
  <rect x="598" y="93" width="18" height="18" rx="9" fill="#262626"/>
  <text x="604" y="106" fill="#D1D5DB" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600">9</text>

  <text x="646" y="105" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500">Weekly Review</text>
  <circle cx="754" cy="102" r="3.5" fill="#F59E0B"/>

  <!-- 4 COLUMNS GRID -->

  <!-- Column 1: H5 PURPOSE & H4 VISION -->
  <g transform="translate(36, 144)">
    <rect width="350" height="910" rx="14" fill="#131313" stroke="#242424" stroke-width="1"/>
    
    <!-- Col Header -->
    <rect x="16" y="16" width="318" height="84" rx="10" fill="#1A1917" stroke="#332B20" stroke-width="1"/>
    <circle cx="42" cy="46" r="14" fill="#262118"/>
    <text x="70" y="44" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" letter-spacing="0.5">H5 PURPOSE &amp; H4 VISION</text>
    <text x="70" y="66" fill="#C5A47E" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500">50k+ &amp; 40k ft</text>
    <text x="306" y="52" fill="#6B7280" font-size="18">+</text>

    <!-- Card 1 -->
    <rect x="16" y="116" width="318" height="175" rx="10" fill="#181818" stroke="#292929" stroke-width="1"/>
    <text x="32" y="142" fill="#C5A47E" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" letter-spacing="1">H5  PURPOSE</text>
    <text x="32" y="168" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700">Live with Deep Curiosity,</text>
    <text x="32" y="188" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700">Intentional Presence, and Craft</text>
    <text x="32" y="208" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700">Mastery</text>
    <text x="32" y="235" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12">Act with uncompromising craftsmanship in</text>
    <text x="32" y="251" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12">engineering, maintain high standards of...</text>
    <text x="32" y="278" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Click to isolate children →</text>

    <!-- Card 2 -->
    <rect x="16" y="303" width="318" height="175" rx="10" fill="#181818" stroke="#292929" stroke-width="1"/>
    <text x="32" y="329" fill="#C5A47E" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" letter-spacing="1">H5  PURPOSE</text>
    <text x="32" y="355" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700">Generational Stewardship &amp;</text>
    <text x="32" y="375" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700">Community Uplift</text>
    <text x="32" y="405" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12">Build sustainable wealth, resilient</text>
    <text x="32" y="421" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12">homestead systems, and mentor early-...</text>
    <text x="32" y="465" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Click to isolate children →</text>

    <!-- Card 3: H4 Vision -->
    <rect x="16" y="490" width="318" height="150" rx="10" fill="#181818" stroke="#292929" stroke-width="1"/>
    <text x="32" y="516" fill="#818CF8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" letter-spacing="1">H4  VISION</text>
    <text x="32" y="542" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700">Principal Architecture Lead &amp;</text>
    <text x="32" y="562" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700">Author of Modern Systems Manual</text>
    <text x="32" y="590" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12">Target: 2029-12-31</text>
    <text x="32" y="625" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Click to isolate children →</text>

    <!-- Card 4: H4 Vision -->
    <rect x="16" y="652" width="318" height="135" rx="10" fill="#181818" stroke="#292929" stroke-width="1"/>
    <text x="32" y="678" fill="#818CF8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" letter-spacing="1">H4  VISION</text>
    <text x="32" y="704" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700">Autonomous Solar Homestead &amp;</text>
    <text x="32" y="724" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700">Off-Grid Workshop</text>
    <text x="32" y="750" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12">Target: 2029-06-30</text>
  </g>

  <!-- Column 2: H2 AREAS OF FOCUS -->
  <g transform="translate(414, 144)">
    <rect width="350" height="910" rx="14" fill="#131313" stroke="#242424" stroke-width="1"/>
    
    <!-- Col Header -->
    <rect x="16" y="16" width="318" height="84" rx="10" fill="#141F1A" stroke="#1F3D30" stroke-width="1"/>
    <circle cx="42" cy="46" r="14" fill="#183327"/>
    <text x="70" y="44" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" letter-spacing="0.5">H2 • AREAS OF FOCUS</text>
    <text x="70" y="66" fill="#34D399" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500">20,000 ft Roles</text>
    <text x="306" y="52" fill="#6B7280" font-size="18">+</text>

    <!-- Card 1 -->
    <rect x="16" y="116" width="318" height="150" rx="10" fill="#181818" stroke="#292929" stroke-width="1"/>
    <text x="32" y="142" fill="#34D399" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" letter-spacing="1">HORIZON 2  AREA</text>
    <text x="32" y="170" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700">Health &amp; Physical Vitality</text>
    <text x="32" y="204" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12">General Area</text>
    <rect x="110" y="190" width="70" height="22" rx="6" fill="#1E293B"/>
    <text x="120" y="206" fill="#38BDF8" font-size="11" font-weight="600">◎ 0 Goals</text>
    <rect x="188" y="190" width="62" height="22" rx="6" fill="#271F15"/>
    <text x="198" y="206" fill="#F59E0B" font-size="11" font-weight="600">📁 1 Proj</text>
    <text x="32" y="245" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Click to isolate children →</text>

    <!-- Card 2 -->
    <rect x="16" y="278" width="318" height="155" rx="10" fill="#181818" stroke="#292929" stroke-width="1"/>
    <text x="32" y="304" fill="#34D399" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" letter-spacing="1">HORIZON 2  AREA</text>
    <text x="32" y="332" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700">Craft &amp; Engineering Excellence</text>
    <text x="32" y="366" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12">General Area</text>
    <rect x="110" y="352" width="70" height="22" rx="6" fill="#1E293B"/>
    <text x="120" y="368" fill="#38BDF8" font-size="11" font-weight="600">◎ 0 Goals</text>
    <rect x="188" y="352" width="68" height="22" rx="6" fill="#271F15"/>
    <text x="198" y="368" fill="#F59E0B" font-size="11" font-weight="600">📁 2 Projs</text>
    <text x="32" y="410" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Click to isolate children →</text>

    <!-- Card 3 -->
    <rect x="16" y="445" width="318" height="165" rx="10" fill="#181818" stroke="#292929" stroke-width="1"/>
    <text x="32" y="471" fill="#34D399" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" letter-spacing="1">HORIZON 2  AREA</text>
    <text x="32" y="497" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700">Financial Independence &amp; Asset</text>
    <text x="32" y="517" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700">Stewardship</text>
    <text x="32" y="550" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12">General Area</text>
    <rect x="110" y="536" width="70" height="22" rx="6" fill="#1E293B"/>
    <text x="120" y="552" fill="#38BDF8" font-size="11" font-weight="600">◎ 0 Goals</text>
    <rect x="188" y="536" width="62" height="22" rx="6" fill="#271F15"/>
    <text x="198" y="552" fill="#F59E0B" font-size="11" font-weight="600">📁 1 Proj</text>
    <text x="32" y="592" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Click to isolate children →</text>

    <!-- Card 4 -->
    <rect x="16" y="622" width="318" height="150" rx="10" fill="#181818" stroke="#292929" stroke-width="1"/>
    <text x="32" y="648" fill="#34D399" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" letter-spacing="1">HORIZON 2  AREA</text>
    <text x="32" y="674" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700">Home Sanctuary &amp; Operations</text>
    <text x="32" y="708" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12">General Area</text>
    <rect x="110" y="694" width="70" height="22" rx="6" fill="#1E293B"/>
    <text x="120" y="710" fill="#38BDF8" font-size="11" font-weight="600">◎ 0 Goals</text>
    <rect x="188" y="694" width="68" height="22" rx="6" fill="#271F15"/>
    <text x="198" y="710" fill="#F59E0B" font-size="11" font-weight="600">📁 2 Projs</text>
  </g>

  <!-- Column 3: H3 1-2Y GOALS -->
  <g transform="translate(792, 144)">
    <rect width="350" height="910" rx="14" fill="#131313" stroke="#242424" stroke-width="1"/>
    
    <!-- Col Header -->
    <rect x="16" y="16" width="318" height="84" rx="10" fill="#141E26" stroke="#1D384D" stroke-width="1"/>
    <circle cx="42" cy="46" r="14" fill="#182E3E"/>
    <text x="70" y="44" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" letter-spacing="0.5">H3 • 1-2Y GOALS</text>
    <text x="70" y="66" fill="#38BDF8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500">30,000 ft Targets</text>
    <text x="306" y="52" fill="#6B7280" font-size="18">+</text>

    <!-- Card 1 -->
    <rect x="16" y="116" width="318" height="175" rx="10" fill="#181818" stroke="#292929" stroke-width="1"/>
    <text x="32" y="142" fill="#38BDF8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" letter-spacing="1">H3  GOAL</text>
    <text x="32" y="168" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700">Publish Distributed Systems</text>
    <text x="32" y="188" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700">Performance Handbook (v1.0)</text>
    <text x="32" y="222" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12">2026-11-30</text>
    <text x="240" y="222" fill="#F59E0B" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">1 Project</text>
    <text x="32" y="265" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Click to isolate children →</text>

    <!-- Card 2 -->
    <rect x="16" y="303" width="318" height="175" rx="10" fill="#181818" stroke="#292929" stroke-width="1"/>
    <text x="32" y="329" fill="#38BDF8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" letter-spacing="1">H3  GOAL</text>
    <text x="32" y="355" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700">Run First Sub-4:00 Official</text>
    <text x="32" y="375" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700">Marathon</text>
    <text x="32" y="415" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12">2026-10-18</text>
    <text x="240" y="415" fill="#F59E0B" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">1 Project</text>
    <text x="32" y="455" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Click to isolate children →</text>

    <!-- Card 3 -->
    <rect x="16" y="490" width="318" height="175" rx="10" fill="#181818" stroke="#292929" stroke-width="1"/>
    <text x="32" y="516" fill="#38BDF8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" letter-spacing="1">H3  GOAL</text>
    <text x="32" y="542" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700">Deploy 12kW Rooftop Solar Array &amp;</text>
    <text x="32" y="562" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700">Smart Storage System</text>
    <text x="32" y="602" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12">2026-09-15</text>
    <text x="240" y="602" fill="#F59E0B" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">1 Project</text>
    <text x="32" y="642" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Click to isolate children →</text>
  </g>

  <!-- Column 4: H1 PROJECTS & RUNWAY -->
  <g transform="translate(1170, 144)">
    <rect width="350" height="910" rx="14" fill="#131313" stroke="#242424" stroke-width="1"/>
    
    <!-- Col Header -->
    <rect x="16" y="16" width="318" height="84" rx="10" fill="#241E15" stroke="#4D3B20" stroke-width="1"/>
    <circle cx="42" cy="46" r="14" fill="#362916"/>
    <text x="70" y="44" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" letter-spacing="0.5">H1 PROJECTS &amp; RUNWAY</text>
    <text x="70" y="66" fill="#F59E0B" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500">10k ft &amp; Ground</text>
    <text x="306" y="52" fill="#6B7280" font-size="18">+</text>

    <!-- Project Card 1 -->
    <rect x="16" y="116" width="318" height="82" rx="10" fill="#181818" stroke="#292929" stroke-width="1"/>
    <text x="32" y="142" fill="#F59E0B" font-size="14">📁</text>
    <text x="54" y="142" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Publish Distributed Systems Pe...</text>
    <text x="302" y="142" fill="#9CA3AF" font-size="13">→</text>
    <circle cx="40" cy="172" r="6" stroke="#4B5563" stroke-width="1.5" fill="none"/>
    <text x="56" y="176" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Synthesize benchmark latency charts ...</text>

    <!-- Project Card 2 -->
    <rect x="16" y="210" width="318" height="114" rx="10" fill="#181818" stroke="#292929" stroke-width="1"/>
    <text x="32" y="236" fill="#F59E0B" font-size="14">📁</text>
    <text x="54" y="236" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Marathon Base Training Phase...</text>
    <text x="302" y="236" fill="#9CA3AF" font-size="13">→</text>
    <circle cx="40" cy="266" r="6" stroke="#4B5563" stroke-width="1.5" fill="none"/>
    <text x="56" y="270" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Order Maurten Gel 100 hydrogel 24-p...</text>
    <circle cx="40" cy="296" r="6" stroke="#4B5563" stroke-width="1.5" fill="none"/>
    <text x="56" y="300" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Map out 16-mile gravel trail route on S...</text>

    <!-- Project Card 3 -->
    <rect x="16" y="336" width="318" height="82" rx="10" fill="#181818" stroke="#292929" stroke-width="1"/>
    <text x="32" y="362" fill="#F59E0B" font-size="14">📁</text>
    <text x="54" y="362" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Rooftop Solar Array Permittin...</text>
    <text x="302" y="362" fill="#9CA3AF" font-size="13">→</text>
    <circle cx="40" cy="392" r="6" stroke="#4B5563" stroke-width="1.5" fill="none"/>
    <text x="56" y="396" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Call Solarium Project Manager to clarif...</text>

    <!-- Project Card 4 -->
    <rect x="16" y="430" width="318" height="82" rx="10" fill="#181818" stroke="#292929" stroke-width="1"/>
    <text x="32" y="456" fill="#F59E0B" font-size="14">📁</text>
    <text x="54" y="456" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Annual Family Trust &amp; Estate P...</text>
    <text x="302" y="456" fill="#9CA3AF" font-size="13">→</text>
    <circle cx="40" cy="486" r="6" stroke="#4B5563" stroke-width="1.5" fill="none"/>
    <text x="56" y="490" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Draft list of digital key custodians and ...</text>

    <!-- Project Card 5 -->
    <rect x="16" y="524" width="318" height="60" rx="10" fill="#181818" stroke="#292929" stroke-width="1"/>
    <text x="32" y="558" fill="#F59E0B" font-size="14">📁</text>
    <text x="54" y="558" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Q4 Engineering Architecture O...</text>
    <text x="302" y="558" fill="#9CA3AF" font-size="13">→</text>

    <!-- Project Card 6 -->
    <rect x="16" y="596" width="318" height="60" rx="10" fill="#181818" stroke="#292929" stroke-width="1"/>
    <text x="32" y="630" fill="#F59E0B" font-size="14">📁</text>
    <text x="54" y="630" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Master Woodworking Joinery ...</text>
    <text x="302" y="630" fill="#9CA3AF" font-size="13">→</text>
  </g>
</svg>
`;

// 2. Mobile SVG Mockup matching Screenshot 2026-09-05 at 11.29.04 AM.png
const mobileSvg = `
<svg width="450" height="950" viewBox="0 0 450 950" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goldGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E2C9A5"/>
      <stop offset="100%" stop-color="#C5A47E"/>
    </linearGradient>
  </defs>

  <rect width="450" height="950" fill="#0F0F0F"/>

  <!-- Top Navbar -->
  <rect x="0" y="0" width="450" height="64" fill="#141414" stroke="#262626" stroke-width="1"/>
  <circle cx="34" cy="32" r="16" fill="#1E1E1E" stroke="#C5A47E" stroke-width="1.5"/>
  <polygon points="34,22 40,32 34,42 28,32" fill="#C5A47E"/>
  <text x="62" y="38" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="700">GTD App</text>

  <!-- Right Mobile Icons -->
  <rect x="238" y="16" width="32" height="32" rx="8" fill="#1E1E1E" stroke="#333333"/>
  <text x="246" y="37" fill="#9CA3AF" font-size="14">🔍</text>
  <rect x="278" y="16" width="32" height="32" rx="8" fill="#1E1E1E" stroke="#333333"/>
  <text x="286" y="37" fill="#9CA3AF" font-size="14">🧠</text>
  <rect x="318" y="16" width="32" height="32" rx="8" fill="url(#goldGradM)"/>
  <text x="328" y="38" fill="#000000" font-weight="700" font-size="16">+</text>
  <circle cx="376" cy="32" r="14" fill="#1E1E1E" stroke="#333333"/>
  <text x="370" y="36" fill="#9CA3AF" font-size="12">👤</text>

  <!-- Main Content -->
  <!-- Badge -->
  <rect x="36" y="90" width="220" height="28" rx="14" fill="#242018" stroke="#4A3D28" stroke-width="1"/>
  <text x="48" y="109" fill="#C5A47E" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">🧭 GTD Horizons of Focus System</text>

  <!-- Heading -->
  <text x="36" y="154" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800">Flight Control Cockpit</text>
  
  <!-- Subtitle -->
  <text x="36" y="184" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14">Maintain complete vertical alignment from 50,000 ft</text>
  <text x="36" y="206" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14">Purpose down to Runway Next Actions.</text>

  <!-- Weekly Review Card -->
  <rect x="36" y="240" width="378" height="92" rx="16" fill="#161616" stroke="#2B2B2B" stroke-width="1"/>
  <text x="56" y="274" fill="#F59E0B" font-size="16">📅</text>
  <text x="80" y="274" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700">Weekly Review</text>
  <rect x="194" y="258" width="44" height="22" rx="11" fill="#451A03" stroke="#B45309" stroke-width="1"/>
  <text x="204" y="273" fill="#FBBF24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700">Due</text>

  <text x="56" y="304" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13">Last review: 15d ago</text>

  <rect x="274" y="260" width="124" height="40" rx="10" fill="url(#goldGradM)"/>
  <text x="294" y="285" fill="#000000" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">✨ Review</text>

  <!-- 2x3 Grid of Horizons Cards -->
  <!-- Row 1 -->
  <!-- H5 Purpose -->
  <rect x="36" y="354" width="180" height="122" rx="14" fill="#161616" stroke="#292929" stroke-width="1"/>
  <text x="52" y="380" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700">H5</text>
  <text x="122" y="380" fill="#C5A47E" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">50,000+ ft</text>
  <text x="52" y="408" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700">Purpose</text>
  <text x="52" y="450" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800">2</text>
  <text x="160" y="448" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Items</text>

  <!-- H4 Vision -->
  <rect x="234" y="354" width="180" height="122" rx="14" fill="#161616" stroke="#292929" stroke-width="1"/>
  <text x="250" y="380" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700">H4</text>
  <text x="330" y="380" fill="#C5A47E" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">40,000 ft</text>
  <text x="250" y="408" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700">Vision</text>
  <text x="250" y="450" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800">3</text>
  <text x="358" y="448" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Items</text>

  <!-- Row 2 -->
  <!-- H3 Goals -->
  <rect x="36" y="492" width="180" height="122" rx="14" fill="#161616" stroke="#292929" stroke-width="1"/>
  <text x="52" y="518" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700">H3</text>
  <text x="122" y="518" fill="#C5A47E" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">30,000 ft</text>
  <text x="52" y="546" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700">Goals</text>
  <text x="52" y="588" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800">3</text>
  <text x="160" y="586" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Items</text>

  <!-- H2 Areas of Focus -->
  <rect x="234" y="492" width="180" height="122" rx="14" fill="#161616" stroke="#292929" stroke-width="1"/>
  <text x="250" y="518" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700">H2</text>
  <text x="330" y="518" fill="#C5A47E" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">20,000 ft</text>
  <text x="250" y="546" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700">Areas of Focus</text>
  <text x="250" y="588" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800">5</text>
  <text x="358" y="586" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Items</text>

  <!-- Row 3 -->
  <!-- H1 Projects -->
  <rect x="36" y="630" width="180" height="122" rx="14" fill="#161616" stroke="#292929" stroke-width="1"/>
  <text x="52" y="656" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700">H1</text>
  <text x="122" y="656" fill="#C5A47E" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">10,000 ft</text>
  <text x="52" y="684" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700">Projects</text>
  <text x="52" y="726" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800">5</text>
  <text x="160" y="724" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Items</text>

  <!-- H0 Next Actions -->
  <rect x="234" y="630" width="180" height="122" rx="14" fill="#161616" stroke="#292929" stroke-width="1"/>
  <text x="250" y="656" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700">H0</text>
  <text x="282" y="656" fill="#C5A47E" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">Ground / Runway</text>
  <text x="250" y="684" fill="#F3F4F6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700">Next Actions</text>
  <text x="250" y="726" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800">9</text>
  <text x="358" y="724" fill="#6B7280" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Items</text>

  <!-- Bottom Navigation Dock -->
  <rect x="0" y="874" width="450" height="76" fill="#141414" stroke="#262626" stroke-width="1"/>
  
  <!-- Nav item: Cockpit -->
  <text x="42" y="904" fill="#C5A47E" font-size="18">🎛</text>
  <text x="35" y="930" fill="#C5A47E" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700">Cockpit</text>

  <!-- Nav item: Horizons -->
  <text x="126" y="904" fill="#9CA3AF" font-size="18">📚</text>
  <text x="116" y="930" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500">Horizons</text>

  <!-- Nav item: Center + Button -->
  <circle cx="225" cy="912" r="22" fill="url(#goldGradM)"/>
  <text x="217" y="921" fill="#000000" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="700">+</text>

  <!-- Nav item: Projects -->
  <text x="306" y="904" fill="#9CA3AF" font-size="18">📁</text>
  <circle cx="324" cy="896" r="3.5" fill="#F59E0B"/>
  <text x="296" y="930" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500">Projects</text>

  <!-- Nav item: Actions -->
  <text x="388" y="904" fill="#9CA3AF" font-size="18">✓</text>
  <circle cx="406" cy="896" r="6" fill="#262626"/>
  <text x="403" y="900" fill="#D1D5DB" font-size="9" font-weight="700">9</text>
  <text x="379" y="930" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500">Actions</text>
</svg>
`;

async function render() {
  console.log('Rendering screenshot mockups to docs/screenshots and assets/screenshots...');

  // 1. Desktop
  const desktopBuffer = Buffer.from(desktopSvg);
  await sharp(desktopBuffer).png().toFile('docs/screenshots/horizons-matrix-desktop.png');
  await sharp(desktopBuffer).png().toFile('docs/screenshots/Screenshot 2026-09-05 at 11.28.26 AM.png');
  await sharp(desktopBuffer).png().toFile('assets/screenshots/horizons-matrix-desktop.png');

  // 2. Mobile
  const mobileBuffer = Buffer.from(mobileSvg);
  await sharp(mobileBuffer).png().toFile('docs/screenshots/cockpit-mobile.png');
  await sharp(mobileBuffer).png().toFile('docs/screenshots/Screenshot 2026-09-05 at 11.29.04 AM.png');
  await sharp(mobileBuffer).png().toFile('assets/screenshots/cockpit-mobile.png');

  console.log('Screenshot assets generated successfully!');
}

render().catch(err => {
  console.error(err);
  process.exit(1);
});
