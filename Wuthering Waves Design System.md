# **Wuthering Waves Web Interface Design System Specification (DESIGN.md)**

## **Section 1: System Overview and Design Philosophy**

The *Wuthering Waves* UI design system translates the post-apocalyptic sci-fi ecosystem of Solaris-3 into a responsive, high-performance web interface1. The visual language bridges technical diagnostic telemetry, acoustic resonance monitoring, and tactical field terminals3. Built around the core visual motifs of frequency waves, soundwave analysis, and Tacet Mark energy patterns, the system balances raw functional clarity with vibrant high-energy chromatic accents3.  
The user experience relies on low-friction interactive layouts that present dense combat metrics, Echo Data Bank attributes, and Resonator development trees without visual clutter3. The overarching narrative theme interprets every web page as an active Sol3 Terminal interface1. Surface materials imitate matte composite metals and anti-glare terminal glass, while interactive elements use high-contrast neon borders and diagnostic soundwave animations to direct user focus3.

### **Core Design Principles**

> 1. **Acoustic Diagnostic Telemetry**: Interface elements mirror real-time frequency monitoring equipment and acoustic diagnostic analyzers3. Structural containers, active states, and decorative overlays integrate soundwave graphics, amplitude spikes, and telemetry line distributions3.  
> 2. **Tactical Contrast and Frictionless Navigation**: Primary interactive views utilize ultra-dark matte surfaces (\#08090C, \#12161F) to maximize contrast against vital gameplay data, minimizing visual fatigue during extended analytical sessions3.  
> 3. **High-Energy Chromatic Accents**: Background surfaces are desaturated to enable high-energy accent hues—Frequency Cyan (\#00F0FF), Resonate Gold (\#FFB800), and Tacit Crimson (\#FF2A55)—to instantly indicate state updates, rarity tiers, and critical operational thresholds5.  
> 4. **Angular Geometric Chamfering**: Components replace consumer-style rounded corners with sharp 45-degree corner cuts, diagonal clip-paths, and segmented border vectors, evoking tactical field equipment used by Resonators across Solaris-32.

## **Section 2: Design Tokens and Palette Specifications**

The color palette reflects the environmental and technological tones of Sol31. Dark void base surfaces establish visual depth, while chromatic energy accents highlight dynamic operational states, Echo Data Bank attributes, and active Resonate modes5.

| Token Identifier | Color Hex | CSS Variable Name | Semantic Role & Function |
| :---- | :---- | :---- | :---- |
| **Tacit Void Black** | \#08090C | \--color-bg-void | Primary application canvas background5. |
| **Slate Gray Container** | \#12161F | \--color-surface-base | Level-1 panel background and main container elevation5. |
| **Desaturated Ink Surface** | \#1A202C | \--color-surface-overlay | Level-2 card background, tooltip surfaces, and popups5. |
| **Tactical Panel Border** | \#2D3748 | \--color-border-subtle | Structural dividing lines and inactive card borders. |
| **Frequency Cyan** | \#00F0FF | \--color-energy-cyan | Interactive focus, active tab highlights, 4-Star Echoes5. |
| **Resonate Gold** | \#FFB800 | \--color-energy-gold | Legendary 5-Star Echoes, high-value currency, primary CTA5. |
| **Tacit Crimson** | \#FF2A55 | \--color-energy-crimson | Danger state, hostile Tacit Field markers, alert triggers5. |
| **Glacio Blue** | \#00D2FF | \--color-element-glacio | Elemental affinity badges and secondary stat metrics12. |
| **Terminal Text Main** | \#E2E8F0 | \--color-text-primary | High-contrast body copy and primary tactical headers. |
| **Telemetry Text Muted** | \#64748B | \--color-text-secondary | Labels, system metadata, and inactive menu stats. |

### **CSS Custom Variables (:root)**

CSS  
:root {  
  /\* Color Tokens \*/  
  \--color\-bg-void: \#08090C;  
  \--color\-surface-base: \#12161F;  
  \--color\-surface-overlay: \#1A202C;  
  \--color\-border\-subtle: \#2D3748;  
  \--color\-energy-cyan: \#00F0FF;  
  \--color\-energy-gold: \#FFB800;  
  \--color\-energy-crimson: \#FF2A55;  
  \--color\-element-glacio: \#00D2FF;  
  \--color\-text-primary: \#E2E8F0;  
  \--color\-text-secondary: \#64748B;

  /\* Glow and Elevation Effects \*/  
  \--glow-cyan: 0 0 12px rgba(0, 240, 255, 0.4);  
  \--glow-gold: 0 0 12px rgba(255, 184, 0, 0.4);  
  \--glow-crimson: 0 0 12px rgba(255, 42, 85, 0.4);

  /\* Geometry & Layout Specs \*/  
  \--chamfer-size: 16px;  
  \--panel-border-width: 1px;  
    
  /\* Typography Scale \*/  
  \--font\-sans: 'Lagu Sans', 'Inter', \-apple-system, BlinkMacSystemFont, sans-serif;  
  \--font\-mono: 'JetBrains Mono', 'Fira Code', monospace;  
}

### **Tailwind CSS Extension Configuration**

JavaScript  
module.exports \= {  
  theme: {  
    extend: {  
      colors: {  
        sol3: {  
          void: '\#08090C',  
          surface: '\#12161F',  
          overlay: '\#1A202C',  
          border: '\#2D3748',  
          cyan: '\#00F0FF',  
          gold: '\#FFB800',  
          crimson: '\#FF2A55',  
          glacio: '\#00D2FF',  
          textMain: '\#E2E8F0',  
          textMuted: '\#64748B',  
        },  
      },  
      backgroundImage: {  
        'grid-mesh': 'radial-gradient(circle, rgba(0, 240, 255, 0.05) 1px, transparent 1px)',  
        'scanline-pattern': 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0, 0, 0, 0.3) 50%, rgba(0, 0, 0, 0.3))',  
        'energy-gradient-cyan': 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(18, 22, 31, 0.8) 100%)',  
        'energy-gradient-gold': 'linear-gradient(135deg, rgba(255, 184, 0, 0.15) 0%, rgba(18, 22, 31, 0.8) 100%)',  
      },  
      boxShadow: {  
        'glow-cyan': '0 0 15px rgba(0, 240, 255, 0.35)',  
        'glow-gold': '0 0 15px rgba(255, 184, 0, 0.35)',  
        'glow-crimson': '0 0 15px rgba(255, 42, 85, 0.35)',  
      },  
      fontFamily: {  
        sans: \['Lagu Sans', 'Inter', 'sans-serif'\],  
        mono: \['JetBrains Mono', 'monospace'\],  
      },  
    },  
  },  
};

## **Section 3: Typography and Micro-Layout Rules**

The design system relies on a dual-font structure: a clean technical sans-serif (Lagu Sans) for navigation titles, subheaders, and narrative text, paired with a monospace font (JetBrains Mono) for numeric values, telemetry data, and stat readouts10. Decorative UI elements can also incorporate subtle stylistic glyphs derived from the fictional Solaris-3 alphabet script15.

| Typography Role | Typeface Family | Size / Line Height | Weight | Letter-Spacing | Transform |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Main HUD Header** | Lagu Sans, sans-serif15 | 24px / 32px | Bold (700) | 0.15em (tracking-widest) | Uppercase |
| **Section Header** | Lagu Sans, sans-serif15 | 18px / 24px | SemiBold (600) | 0.10em (tracking-wider) | Uppercase |
| **Card Primary Label** | Lagu Sans, sans-serif15 | 14px / 20px | Medium (500) | 0.05em | Standard |
| **Telemetry Metric** | JetBrains Mono, mono | 14px / 18px | Bold (700) | 0.02em | None |
| **Small Data Tag** | JetBrains Mono, mono | 11px / 14px | Regular (400) | 0.08em | Uppercase |

### **Micro-Layout Guidelines**

Tactical terminal navigation requires high tracking values across all section headers and category indicators, maintaining a minimum letter-spacing: 0.1em on uppercase elements. Decorative panel headers incorporate a 45-degree angle offset (-skew-x-12), aligning with the geometric chamfering of physical UI frames4. Stat readouts, coordinates, and cost counters are displayed in monospace font to ensure character width alignment across dynamically updating numbers10. Structural containers feature background grid overlays spaced at 24px intervals with fine crosshair tick marks placed at primary panel intersections.

## **Section 4: Component Blueprint Library**

### **1\. Resonate Terminal Cards**

Resonate Terminal Cards display Resonators, weapons, and Echo Data Bank records7. They feature a 45-degree diagonal corner chamfer on the top-right and bottom-left edges created using CSS clip-path.

HTML  
\<div class\="resonate-card"\>  
  \<div class\="card-header"\>  
    \<span class\="card-title"\>THRENODIAN ECHO\</span\>  
    \<span class\="card-cost"\>COST 4\</span\>  
  \</div\>  
  \<div class\="card-body"\>  
    \<p class\="stat-label"\>MAIN ATTR: \<span class\="stat-value"\>\+33.0% CRIT RATE\</span\>\</p\>  
  \</div\>  
\</div\>

CSS  
.resonate-card {  
  position: relative;  
  background: var(--color-surface-base);  
  border: 1px solid var(--color-border-subtle);  
  padding: 16px;  
  color: var(--color-text-primary);  
  clip-path: polygon(  
    0 0,   
    calc(100% \- 16px) 0,   
    100% 16px,   
    100% 100%,   
    16px 100%,   
    0 calc(100% \- 16px)  
  );  
  transition: border-color 0.2s ease, box-shadow 0.2s ease;  
}

.resonate-card:hover {  
  border-color: var(--color-energy-cyan);  
  box-shadow: var(--glow-cyan);  
}

.resonate-card .card-header {  
  display: flex;  
  justify-content: space-between;  
  font-family: var(--font-sans);  
  font-weight: 700;  
  letter-spacing: 0.1em;  
  border-bottom: 1px solid var(--color-border-subtle);  
  padding-bottom: 8px;  
  margin-bottom: 12px;  
}

.resonate-card .card-cost {  
  font-family: var(--font-mono);  
  color: var(--color-energy-cyan);  
}

### **2\. Frequency Wave Badges**

Frequency Wave Badges represent live audio diagnostics, active combat status effects, and Outro Skill readiness3. They pair an animated SVG frequency wave equalizer with uppercase tracking text.

HTML  
\<div class\="flex items-center gap-2 px-3 py-1 bg-sol3-surface border border-sol3-cyan/40 text-sol3-cyan text-xs font-mono tracking-widest uppercase rounded-none"\>  
  \<div class\="flex items-end gap-0.5 h-3"\>  
    \<span class\="w-0.5 bg-sol3-cyan animate-\[pulse\_0.6s\_ease-in-out\_infinite\] h-full"\>\</span\>  
    \<span class\="w-0.5 bg-sol3-cyan animate-\[pulse\_0.8s\_ease-in-out\_infinite\_0.2s\] h-2/3"\>\</span\>  
    \<span class\="w-0.5 bg-sol3-cyan animate-\[pulse\_0.5s\_ease-in-out\_infinite\_0.4s\] h-4/5"\>\</span\>  
    \<span class\="w-0.5 bg-sol3-cyan animate-\[pulse\_0.7s\_ease-in-out\_infinite\_0.1s\] h-1/2"\>\</span\>  
  \</div\>  
  \<span\>RESONANCE ACTIVE\</span\>  
\</div\>

### **3\. Echo Attribute Badges**

Echo Attribute Badges display capacity costs (Cost 4, Cost 3, Cost 1\) and rarity tiers (5-Star Resonate Gold vs. 4-Star Frequency Cyan)10. The total Echo loadout system strictly enforces a maximum capacity cost limit of 12 per team setup10.

HTML  
\<\!-- 5-Star Gold Cost 4 Echo Badge \--\>  
\<div class\="inline-flex items-center border border-sol3-gold bg-sol3-overlay px-2.5 py-0.5 shadow-glow-gold"\>  
  \<span class\="font-mono text-xs font-bold text-sol3-gold mr-2"\>COST 4\</span\>  
  \<span class\="font-sans text-\[10px\] tracking-widest text-sol3-textMain uppercase border-l border-sol3-gold/40 pl-2"\>  
    CALAMITY CLASS  
  \</span\>  
\</div\>

\<\!-- 4-Star Cyan Cost 3 Echo Badge \--\>  
\<div class\="inline-flex items-center border border-sol3-cyan bg-sol3-overlay px-2.5 py-0.5 shadow-glow-cyan"\>  
  \<span class\="font-mono text-xs font-bold text-sol3-cyan mr-2"\>COST 3\</span\>  
  \<span class\="font-sans text-\[10px\] tracking-widest text-sol3-textMain uppercase border-l border-sol3-cyan/40 pl-2"\>  
    ELITE CLASS  
  \</span\>  
\</div\>

### **4\. Tacit Action CTA Buttons**

Tacit Action Call-To-Action (CTA) buttons place matte dark interactive surfaces inside dynamic energy borders. Primary calls to action feature Resonate Gold accents, while technical and secondary interactions utilize Frequency Cyan5.

CSS  
.btn-tacit-primary {  
  position: relative;  
  display: inline-flex;  
  align-items: center;  
  justify-content: center;  
  background-color: var(--color-surface-base);  
  color: var(--color-energy-gold);  
  border: 1px solid var(--color-energy-gold);  
  font-family: var(--font-sans);  
  font-weight: 700;  
  font-size: 14px;  
  letter-spacing: 0.15em;  
  text-transform: uppercase;  
  padding: 12px 28px;  
  cursor: pointer;  
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% \- 8px), calc(100% \- 8px) 100%, 0 100%, 0 8px);  
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);  
}

.btn-tacit-primary:hover {  
  background-color: var(--color-energy-gold);  
  color: var(--color-bg-void);  
  box-shadow: var(--glow-gold);  
  transform: translateY(-1px);  
}

.btn-tacit-primary:active {  
  transform: translateY(1px);  
}

### **5\. HUD Header and Currency Bar**

The main header component uses a capsule layout that tracks primary account resources: Shell Credit, Astrite, and active Waveplate capacity9.

| Resource Metric | Icon Graphic Type | Color Accent | Primary Functional Context |
| :---- | :---- | :---- | :---- |
| **Shell Credit** | Geometric Coin Symbol | \#E2E8F0 (White/Silver) | Primary currency for character growth, Echo leveling, and shop purchases6. |
| **Astrite** | Star Cluster Rhombus | \#FFB800 (Resonate Gold) | Premium currency used for Convene banner draws9. |
| **Waveplate Reserve** | Diagnostic Fuel Meter | \#00F0FF (Frequency Cyan) | Stamina resource required to claim rewards from Tacet Fields and boss encounters3. |

HTML  
\<header class\="w-full bg-sol3-surface/90 backdrop-blur-md border-b border-sol3-border px-6 py-3 flex justify-between items-center"\>  
  \<\!-- Left Navigation Section \--\>  
  \<div class\="flex items-center gap-6"\>  
    \<div class\="text-sol3-cyan font-bold font-sans tracking-widest text-lg flex items-center gap-2"\>  
      \<span class\="inline-block w-2 h-4 bg-sol3-cyan"\>\</span\>  
      SOL-3 DIAGNOSTICS  
    \</div\>  
    \<nav class\="flex gap-4 font-sans text-xs tracking-wider uppercase text-sol3-textMuted"\>  
      \<a href\="\#" class\="text-sol3-cyan font-bold border-b-2 border-sol3-cyan pb-1"\>RESONATORS\</a\>  
      \<a href\="\#" class\="hover:text-sol3-textMain transition-colors pb-1"\>ECHO DATA BANK\</a\>  
      \<a href\="\#" class\="hover:text-sol3-textMain transition-colors pb-1"\>CONVENE\</a\>  
    \</nav\>  
  \</div\>

  \<\!-- Right Telemetry Currency Bar \--\>  
  \<div class\="flex items-center gap-4 font-mono text-xs"\>  
    \<\!-- Shell Credit Indicator \--\>  
    \<div class\="flex items-center gap-2 bg-sol3-overlay px-3 py-1.5 border border-sol3-border"\>  
      \<span class\="text-sol3-textMuted"\>CR\</span\>  
      \<span class\="text-sol3-textMain font-bold"\>1,245,800\</span\>  
    \</div\>

    \<\!-- Astrite Indicator \--\>  
    \<div class\="flex items-center gap-2 bg-sol3-overlay px-3 py-1.5 border border-sol3-gold/40 shadow-glow-gold"\>  
      \<span class\="text-sol3-gold"\>AST\</span\>  
      \<span class\="text-sol3-gold font-bold"\>12,450\</span\>  
    \</div\>

    \<\!-- Waveplate Indicator \--\>  
    \<div class\="flex items-center gap-2 bg-sol3-overlay px-3 py-1.5 border border-sol3-cyan/40"\>  
      \<span class\="text-sol3-cyan"\>WPV\</span\>  
      \<span class\="text-sol3-cyan font-bold"\>240 / 240\</span\>  
    \</div\>  
  \</div\>  
\</header\>

## **Section 5: Web UI Adaptation Guidance**

Adapting the game interface to responsive web applications requires converting desktop multi-panel displays into scalable layout structures3.

### **Desktop 3-Column Dashboard Configuration**

Desktop web displays adapt the in-game Resonator and Echo Data Bank menus using a three-column layout7:

* **Left Column (280px to 320px Fixed Width)**: Houses vertical filter lists, element selectors, and search fields for Resonator or Echo navigation19.  
* **Center Column (Flex-Grow Viewport)**: Displays active 3D models, inspectable Echo assets, or dynamic soundwave diagnostic graphs7.  
* **Right Column (360px to 400px Fixed Width)**: Displays detailed numerical metrics, Forte talent upgrade nodes, Echo stat allocations, and equipment management tools6.

### **Mobile Stacked Terminal Navigation**

On viewports below 768px, the three-column layout transitions into a single stacked column controlled by a top tab bar. The center viewport remains primary, while the left navigation and right stats panels convert into slide-over drawers accessible via bottom navigation shortcuts.

### **Glassmorphism and Background Mesh Patterns**

Tactical glass overlays combine semi-transparent surfaces with backdrop blurring and dynamic vector grid patterns:

CSS  
.sol3-terminal-background {  
  background-color: var(--color-bg-void);  
  background-image:   
    radial-gradient(circle at 50% 30%, rgba(0, 240, 255, 0.08) 0%, transparent 60%),  
    radial-gradient(circle at 80% 80%, rgba(255, 184, 0, 0.05) 0%, transparent 50%),  
    linear-gradient(to right, rgba(45, 55, 72, 0.15) 1px, transparent 1px),  
    linear-gradient(to bottom, rgba(45, 55, 72, 0.15) 1px, transparent 1px);  
  background-size: 100% 100%, 100% 100%, 32px 32px, 32px 32px;  
}

.glass-panel-overlay {  
  background: rgba(18, 22, 31, 0.75);  
  backdrop-filter: blur(12px) saturate(140%);  
  \-webkit-backdrop-filter: blur(12px) saturate(140%);  
  border: 1px solid rgba(0, 240, 255, 0.2);  
}

## **Section 6: Systems Integration and Interface Architecture**

Translating *Wuthering Waves*' visual identity into a responsive web application requires balancing high-density graphics with performance standards and accessibility compliance3. Modern web applications demand low layout volatility, smooth animation frames, and strict keyboard navigation support.

### **Motion Mechanics and Performance Budgets**

Interface state changes must adhere to a 150ms to 200ms duration budget using standard cubic-bezier timing functions (cubic-bezier(0.16, 1, 0.3, 1)). Hover state transitions on interactive cards, slide-in panels, and tab switches should feel instantaneous, maintaining a high-tech tactical feel. Live frequency equalizers and audio pulse meters rely on CSS transform animations (transform: scaleY()) or lightweight 2D Canvas contexts rather than heavy DOM mutations, preserving 60 FPS performance on mobile hardware. CSS properties that trigger re-layouts should be isolated using GPU acceleration flags (will-change: transform, opacity).

### **Accessibility Guidelines (WCAG 2.1 AA Compliance)**

While background telemetry labels use desaturated text (\#64748B), all actionable body copy, button labels, and main stat readings maintain a contrast ratio of at least 4.5:1 against slate container surfaces5. Interactive elements support native keyboard focus navigation, replacing default browser focus outlines with high-visibility neon cyan highlight borders using \--color-energy-cyan (\#00F0FF). Systems automatically respect OS-level reduced motion preferences (prefers-reduced-motion: reduce) by pausing ambient background grid meshes, soundwave pulses, and CRT scanline animations.

### **Implementation Handoff Matrix**

| Component Module | CSS Selector / Class Name | Render Requirements | Standard Fallback Behavior |
| :---- | :---- | :---- | :---- |
| **Resonate Card Grid** | .resonate-card | Tailwind CSS, clip-path | Standard rectangular container with subtle borders7. |
| **Acoustic Equalizer** | .frequency-badge | CSS Keyframes / WebGL | Static multi-bar graphic asset. |
| **Currency Bar HUD** | .hud-header | Flexbox, CSS Backdrop Filter | Solid \--color-surface-base panel background16. |
| **Echo Cost Badge** | .echo-badge | Monospace Typeface | System monospace fallback font (Courier New)10. |

This design system specification establishes the structural framework for building web applications inspired by *Wuthering Waves*1. By implementing these precise color tokens, typography rules, component blueprints, and responsive layout guidelines, web developers can reproduce the tactical diagnostic UI of Solaris-3 across modern desktop and mobile browser environments1.

#### **Works cited**

> 1. News Archive \- TechPowerUp, [https\://www\.techpowerup.com/news-archive?month=0724](https://www.techpowerup.com/news-archive?month=0724)  
> 2. Wuthering Waves \- Apps on Google Play, [https\://play.google.com/store/apps/details?id=com.kurogame.wutheringwaves.global](https://play.google.com/store/apps/details?id=com.kurogame.wutheringwaves.global)  
> 3. Wuthering Waves Feedback Thread — Closed Beta II \- Reddit, [https\://www\.reddit.com/r/WutheringWaves/comments/1ayimrf/wuthering\_waves\_feedback\_thread\_closed\_beta\_ii/](https://www.reddit.com/r/WutheringWaves/comments/1ayimrf/wuthering_waves_feedback_thread_closed_beta_ii/)  
> 4. Changelog \- Worm CYOA Wiki, [https\://cyoa.ltouroumov.ch/wiki/page/Changelog](https://cyoa.ltouroumov.ch/wiki/page/Changelog)  
> 5. 7 Best Color Palette Apps for iPhone and iPad \- TechWiser, [https\://techwiser.com/best-color-palette-apps-for-iphone/](https://techwiser.com/best-color-palette-apps-for-iphone/)  
> 6. Aemeath | Wuthering Waves Wiki \- Fandom, [https\://wutheringwaves.fandom.com/wiki/Aemeath](https://wutheringwaves.fandom.com/wiki/Aemeath)  
> 7. WuWaBuilds \- Wuthering Waves Builds & Leaderboards, [https\://wuwa.build/](https://wuwa.build/)  
> 8. dshthemes — every DeepSeek Harness theme, in its own colours, [https\://dshthemes.com/](https://dshthemes.com/)  
> 9. is there anything you guys feel that are still missing from WuWa in, [https\://www\.reddit.com/r/WutheringWaves/comments/1fdzj4j/the\_version\_survey\_has\_just\_dropped\_is\_there/](https://www.reddit.com/r/WutheringWaves/comments/1fdzj4j/the_version_survey_has_just_dropped_is_there/)  
> 10. A very easy guide to Echoes (Relics/Artifacts) for Union Level 20, [https\://www\.reddit.com/r/WutheringWaves/comments/1d13k38/a\_very\_easy\_guide\_to\_echoes\_relicsartifacts\_for/](https://www.reddit.com/r/WutheringWaves/comments/1d13k38/a_very_easy_guide_to_echoes_relicsartifacts_for/)  
> 11. 3.3 New Team Setup UI You can now quickly switch Resonance, [https\://www\.facebook.com/gachagamingx/posts/33-new-team-setup-ui-you-can-now-quickly-switch-resonance-modes-directly-within-/122221269164301447/](https://www.facebook.com/gachagamingx/posts/33-new-team-setup-ui-you-can-now-quickly-switch-resonance-modes-directly-within-/122221269164301447/)  
> 12. Wuthering Waves Characters List, [https\://wuthering.gg/characters](https://wuthering.gg/characters)  
> 13. Hiyuki Best Build Guide | Wuthering Waves (WuWa) \- Prydwen, [https\://www\.prydwen.gg/wuthering-waves/characters/hiyuki](https://www.prydwen.gg/wuthering-waves/characters/hiyuki)  
> 14. Chisa White Flower Wuthering Waves Live Wallpaper \- MoeWalls, [https\://moewalls.com/anime/chisa-white-flower-wuthering-waves-live-wallpaper/](https://moewalls.com/anime/chisa-white-flower-wuthering-waves-live-wallpaper/)  
> 15. Wuthering waves mail font? : r/identifythisfont \- Reddit, [https\://www\.reddit.com/r/identifythisfont/comments/1dwcaa0/wuthering\_waves\_mail\_font/](https://www.reddit.com/r/identifythisfont/comments/1dwcaa0/wuthering_waves_mail_font/)  
> 16. Release Notes \- Version 1.0.1 (December 2023\) \- Facebook, [https\://www\.facebook.com/groups/572523681304160/posts/808623624360830/](https://www.facebook.com/groups/572523681304160/posts/808623624360830/)  
> 17. Here we go, the beginning grind of the end game is here \- Reddit, [https\://www\.reddit.com/r/WutheringWaves/comments/1d1491v/here\_we\_go\_the\_beginning\_grind\_of\_the\_end\_game\_is/](https://www.reddit.com/r/WutheringWaves/comments/1d1491v/here_we_go_the_beginning_grind_of_the_end_game_is/)  
> 18. Wuthering Waves app features convene tracker and resource planner, [https\://www\.facebook.com/groups/wutheringwavescafe/posts/1070743375211233/](https://www.facebook.com/groups/wutheringwavescafe/posts/1070743375211233/)  
> 19. Patch Notes for Version 3.2: Resolution to Illuminate the Shadows, [https\://wutheringwaves.gg/patch-notes-for-version-3-2-resolution-to-illuminate-the-shadows/](https://wutheringwaves.gg/patch-notes-for-version-3-2-resolution-to-illuminate-the-shadows/)