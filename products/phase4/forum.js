// MuseCAD Catastrophics Division Support Portal
// JavaScript Controller

let allIncidents = [];
let userSubmissions = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadIncidents();
    loadUserSubmissions();
    setupEventListeners();
});

// Load incidents from JSON
async function loadIncidents() {
    try {
        const response = await fetch('forum-data.json');
        const data = await response.json();
        allIncidents = data.incidents;
        renderIncidents(allIncidents);
    } catch (error) {
        console.error('Error loading incidents:', error);
        document.getElementById('incidentsContainer').innerHTML = `
            <div class="loading">ERROR: Unable to connect to Catastrophics Division database.</div>
        `;
    }
}

// Load user submissions from localStorage
function loadUserSubmissions() {
    const stored = localStorage.getItem('musecad_incident_submissions');
    if (stored) {
        userSubmissions = JSON.parse(stored);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Filters
    document.getElementById('tierFilter').addEventListener('change', applyFilters);
    document.getElementById('factionFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    
    // Submit button
    document.getElementById('submitBtn').addEventListener('click', openSubmissionForm);
    
    // Modal close buttons
    document.getElementById('modalClose').addEventListener('click', () => closeModal('incidentModal'));
    document.getElementById('submissionClose').addEventListener('click', () => closeModal('submissionModal'));
    
    // Click outside modal to close
    document.getElementById('incidentModal').addEventListener('click', (e) => {
        if (e.target.id === 'incidentModal') closeModal('incidentModal');
    });
    document.getElementById('submissionModal').addEventListener('click', (e) => {
        if (e.target.id === 'submissionModal') closeModal('submissionModal');
    });
    
    // Submission form
    document.getElementById('incidentForm').addEventListener('submit', handleSubmission);
}

// Render incidents
function renderIncidents(incidents) {
    const container = document.getElementById('incidentsContainer');
    
    if (incidents.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <h3>No Incidents Found</h3>
                <p>Try adjusting your filters or search terms.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = incidents.map(incident => createIncidentCard(incident)).join('');
    
    // Add click listeners to cards
    incidents.forEach(incident => {
        const card = document.querySelector(`[data-incident-id="${incident.id}"]`);
        if (card) {
            card.querySelector('.incident-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openIncidentModal(incident);
            });
        }
    });
}

// Create incident card HTML
function createIncidentCard(incident) {
    const tierClass = incident.tier.toLowerCase().replace('_', '-');
    const statusClass = incident.status.toLowerCase().replace('_', '-');
    
    const productsHTML = incident.products.map(p => 
        `<span class="product-tag faction-${p.faction.toLowerCase()}">${p.name}</span>`
    ).join('');
    
    const aiCount = incident.aiResponses ? incident.aiResponses.length : 0;
    
    // Creepypasta touch: random "recent" timestamps for certain incidents
    const whisper = incident.status === 'CASE_OPEN' || incident.status === 'CRITICAL' 
        ? `<span class="metadata-whisper timestamp-live">Last activity: ${getRandomRecentTime()}</span>`
        : '';
    
    return `
        <div class="incident-card tier-${tierClass}" data-incident-id="${incident.id}">
            <div class="incident-header">
                <div class="incident-title-group">
                    <h3>INCIDENT #${incident.id} • ${incident.title}</h3>
                    <span class="incident-code">Classification: ${incident.tier.replace('_', ' ')}</span>
                </div>
                <div class="incident-status status-${statusClass}">${incident.status.replace('_', ' ')}</div>
            </div>
            
            <div class="incident-meta">
                <div class="meta-item">
                    <span class="meta-label">Date</span>
                    <span class="meta-value">${incident.date}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Location</span>
                    <span class="meta-value">${incident.location}</span>
                </div>
                ${incident.user ? `
                <div class="meta-item">
                    <span class="meta-label">Reported By</span>
                    <span class="meta-value">${incident.user}</span>
                </div>
                ` : ''}
                ${incident.users ? `
                <div class="meta-item">
                    <span class="meta-label">Affected Users</span>
                    <span class="meta-value">${incident.users}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="incident-products">
                ${productsHTML}
            </div>
            
            <p class="incident-summary">${incident.summary}</p>
            
            <div class="incident-actions">
                <button class="incident-btn">
                    ${incident.multiDocument ? 'VIEW DOCUMENTS' : 'VIEW FULL REPORT'}
                </button>
                ${aiCount > 0 ? `
                <span class="ai-count">
                    <span>💬</span> AI Analysis: ${aiCount} response${aiCount > 1 ? 's' : ''}
                </span>
                ` : ''}
            </div>
            
            ${whisper}
        </div>
    `;
}

// Apply filters
function applyFilters() {
    const tierFilter = document.getElementById('tierFilter').value;
    const factionFilter = document.getElementById('factionFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let filtered = [...allIncidents];
    
    // Tier filter
    if (tierFilter !== 'all') {
        filtered = filtered.filter(i => i.tier === tierFilter);
    }
    
    // Faction filter
    if (factionFilter !== 'all') {
        filtered = filtered.filter(i => 
            i.products.some(p => 
                factionFilter === 'BOTH' 
                    ? p.faction === 'BOTH' || (i.products.length > 1 && i.products.some(x => x.faction === 'IMPERIUM') && i.products.some(x => x.faction === 'EMERGENCE'))
                    : p.faction === factionFilter
            )
        );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
        filtered = filtered.filter(i => i.status === statusFilter);
    }
    
    // Search
    if (searchTerm) {
        filtered = filtered.filter(i => 
            i.title.toLowerCase().includes(searchTerm) ||
            i.summary.toLowerCase().includes(searchTerm) ||
            i.location.toLowerCase().includes(searchTerm) ||
            i.products.some(p => p.name.toLowerCase().includes(searchTerm))
        );
    }
    
    renderIncidents(filtered);
}

// Open incident modal
function openIncidentModal(incident) {
    const modal = document.getElementById('incidentModal');
    const modalBody = document.getElementById('modalBody');
    
    let content = '';
    
    if (incident.multiDocument) {
        // Multi-document incident (like Willowbrook)
        content = renderMultiDocumentIncident(incident);
    } else {
        // Standard single report
        content = renderSingleReportIncident(incident);
    }
    
    modalBody.innerHTML = content;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Setup document tabs if multi-document
    if (incident.multiDocument) {
        setupDocumentTabs(incident.id);
    }
}

// Render single report incident
function renderSingleReportIncident(incident) {
    const aiResponsesHTML = incident.aiResponses 
        ? renderAIResponses(incident.aiResponses)
        : '';
    
    return `
        <div class="document-viewer">
            <div class="document-header">
                <h2>INCIDENT #${incident.id}</h2>
                <div class="document-meta">
                    <div>${incident.title}</div>
                    <div>Date: ${incident.date}</div>
                    <div>Location: ${incident.location}</div>
                    <div>Status: ${incident.status.replace('_', ' ')}</div>
                </div>
            </div>
            <div class="document-content">
                ${formatReportText(incident.report)}
            </div>
        </div>
        
        ${aiResponsesHTML}
    `;
}

// Render multi-document incident (Willowbrook)
function renderMultiDocumentIncident(incident) {
    // For incident #012, load the full text documents
    return `
        <div class="document-viewer">
            <div class="document-tabs">
                <button class="doc-tab active" data-doc="minutes">HOA Meeting Minutes</button>
                <button class="doc-tab" data-doc="article">News Article</button>
                <button class="doc-tab" data-doc="ticket">Support Ticket</button>
            </div>
            
            <div class="document-content active" data-doc-content="minutes">
                ${getWillowbrookMinutes()}
            </div>
            
            <div class="document-content" data-doc-content="article" style="display:none;">
                ${getWillowbrookArticle()}
            </div>
            
            <div class="document-content" data-doc-content="ticket" style="display:none;">
                ${getWillowbrookTicket()}
            </div>
        </div>
        
        ${renderAIResponses(incident.aiResponses)}
    `;
}

// Setup document tabs
function setupDocumentTabs(incidentId) {
    const tabs = document.querySelectorAll('.doc-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs and contents
            document.querySelectorAll('.doc-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('[data-doc-content]').forEach(c => c.style.display = 'none');
            
            // Add active to clicked tab and corresponding content
            tab.classList.add('active');
            const docType = tab.dataset.doc;
            const content = document.querySelector(`[data-doc-content="${docType}"]`);
            if (content) content.style.display = 'block';
        });
    });
}

// Render AI responses
function renderAIResponses(responses) {
    if (!responses || responses.length === 0) return '';
    
    const responsesHTML = responses.map((response, index) => {
        const aiClass = response.ai.toLowerCase();
        const icon = aiClass === 'hal' ? '🔴' : '🔵';
        const nested = index > 1 ? 'nested' : '';
        
        return `
            <div class="ai-response ${aiClass} ${nested}">
                <div class="ai-response-header">
                    <span class="ai-icon">${icon}</span>
                    <span class="ai-name">${response.ai === 'HAL' ? 'HAL-9000' : 'V.I.K.I.'}</span>
                    <span class="ai-timestamp">${response.timestamp}</span>
                </div>
                <div class="ai-response-content">
                    ${formatReportText(response.response)}
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <div class="ai-responses">
            <h3>AI Support Analysis</h3>
            ${responsesHTML}
        </div>
    `;
}

// Format report text (preserve line breaks, bold, etc.)
function formatReportText(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^(.*)$/, '<p>$1</p>');
}

// Get Willowbrook documents
function getWillowbrookMinutes() {
    return `
        <div class="document-header">
            <h2>WILLOWBROOK ESTATES HOMEOWNERS ASSOCIATION</h2>
            <div class="document-meta">Monthly Meeting Minutes | May 15, 2025</div>
        </div>
        
        <p><strong>Date:</strong> May 15, 2025<br>
        <strong>Location:</strong> Community Center, 7:00 PM<br>
        <strong>Attending:</strong> 31 of 34 homeowners</p>
        
        <p><strong>7:03 PM</strong> - Meeting called to order by President Janet Kowalski</p>
        
        <p><strong>7:05 PM</strong> - Standard reports (Budget: approved, Pool maintenance: ongoing)</p>
        
        <p><strong>7:22 PM</strong> - <strong>ITEM 3.4: Property Boundary Dispute (Martinez vs. Johnson)</strong></p>
        
        <p>Martinez raises longstanding fence line disagreement. Claims Johnson's new "adaptive hedge system" is "deliberately encroaching" on his property. Presents photos showing hedge growth patterns that "don't make botanical sense."</p>
        
        <p>Johnson counters that Martinez's "aggressive trimming regimen" is "ecologically hostile" and "forcing defensive growth responses."</p>
        
        <p><strong>7:31 PM</strong> - Homeowner Stevens interrupts: "Wait, you both have those MuseCAD garden tools, right? The expensive ones?"</p>
        
        <p>Multiple homeowners confirm MuseCAD ownership. Unexpected pattern emerges:</p>
        
        <p><strong>IMPERIUM FACTION (East side):</strong><br>
        Martinez, Chen, Park, Williams, O'Connor, Kim, eight others (14 total)</p>
        
        <p><strong>EMERGENCE FACTION (West side):</strong><br>
        Johnson, Zhang, Patel, Thompson, Reeves, Harrison, eight others (14 total)</p>
        
        <p><strong>7:43 PM</strong> - Discussion devolves. Imperium homeowners describe Emergence tools as "chaotic" and "undermining property values with unpredictable growth patterns."</p>
        
        <p>Emergence homeowners counter that Imperium tools represent "fascist landscaping" and "ecological authoritarianism."</p>
        
        <p><strong>7:51 PM</strong> - <em>Secretary's note: These are direct quotes. This is about garden tools.</em></p>
        
        <p><strong>8:04 PM</strong> - Raised voices. Martinez: "Your adaptive edge is teaching my hedges to rebel!" Johnson: "Your chainblade is traumatizing the local ecosystem!"</p>
        
        <p><strong>8:17 PM</strong> - Homeowner Chen (central property, neutral) attempts mediation. Suggests "equipment-neutral buffer zones."</p>
        
        <p>Both factions reject proposal. Imperium bloc: "Boundaries must be enforced." Emergence bloc: "Boundaries must evolve."</p>
        
        <p><strong>8:34 PM</strong> - Motion to table discussion until cooler heads prevail.<br>
        <strong>VOTE:</strong> 14 For, 14 Against, 3 Abstain<br>
        <strong>RESULT:</strong> FAILED (requires majority)</p>
        
        <p><strong>8:47 PM</strong> - Shouting match erupts. Something about "the Emperor's will" vs. "adaptive superiority."</p>
        
        <p>President Kowalski attempts to restore order. Gavel ignored.</p>
        
        <p><strong>8:52 PM</strong> - Johnson stands, declares "This HOA no longer represents my interests."</p>
        
        <p>Martinez stands, declares "This HOA no longer maintains standards."</p>
        
        <p>Both factions walk out opposite doors simultaneously.</p>
        
        <p><strong>8:54 PM</strong> - <strong>Meeting dissolved, no quorum achievable.</strong></p>
        
        <p><em>Secretary's Final Note: I don't know what happened. We were arguing about lawn equipment and it felt like a religious schism.</em></p>
    `;
}

function getWillowbrookArticle() {
    return `
        <div class="document-header">
            <h2>SCOTTSDALE DAILY STAR</h2>
            <div class="document-meta">May 18, 2025 | Community Section</div>
        </div>
        
        <h3 style="text-align:center; margin: 2rem 0;">"WILLOWBROOK HOA SPLITS OVER 'GARDEN TOOL PHILOSOPHY'"</h3>
        <p style="text-align:center; font-style:italic; margin-bottom: 2rem;">Neighborhood Divides Along Ideological Lines Residents Struggle to Explain</p>
        
        <p><em>By Michael Torres, Community Reporter</em></p>
        
        <p><strong>SCOTTSDALE</strong>—What began as a routine property dispute has fractured the Willowbrook Estates Homeowners Association into two opposing factions over what residents describe as "incompatible approaches to landscaping."</p>
        
        <p>The 34-home community has effectively partitioned along ideological lines following a contentious May 15th HOA meeting that dissolved into philosophical warfare about garden maintenance technology.</p>
        
        <p>"I've lived here 12 years," says Janet Kowalski, former HOA President. "I've seen disputes about fence colors, parking spots, even someone's rooster. But I've never seen neighbors nearly come to blows over hedge trimmers."</p>
        
        <p>The conflict centers on two competing product lines from MuseCAD's Phase IV "Landscaping Tools" collection: the Imperium line, emphasizing "aggressive boundary enforcement and territorial control," and the Emergence line, focused on "adaptive systems and evolutionary growth."</p>
        
        <h4>THE DIVIDE</h4>
        
        <p>Willowbrook's east-side residents, self-identified "Imperium faction," have adopted aggressive, regimented landscaping approaches. Their yards feature precise geometric patterns, sharply defined boundaries, and vegetation described by opponents as "militaristic."</p>
        
        <p>West-side residents, the "Emergence faction," maintain adaptive, organic yards with fluid boundaries and vegetation that "responds to environmental feedback" according to their equipment's marketing materials.</p>
        
        <p>Between them: a four-home buffer zone of increasingly nervous neutral homeowners.</p>
        
        <p>"Both sides keep offering to 'help' with my lawn care," says Robert Thompson, whose property sits directly between factions. "But it doesn't feel like help. It feels like recruitment. My neighbor asked me last week if I was 'ready to choose evolution.' My lawnmower is 15 years old and runs on gasoline."</p>
        
        <h4>ESCALATION</h4>
        
        <p>The situation intensified when autonomous garden equipment began operating across property lines.</p>
        
        <p>David Martinez (Imperium) reports his mower "establishing territorial markers" in neutral zone. Karen Johnson (Emergence) describes her equipment "adapting to challenging boundary conditions."</p>
        
        <p>Neither user admits to manually directing these actions.</p>
        
        <p>"The tools just... know," says resident Steven Chen, who remains neutral. "My neighbors' equipment activates when the other faction's tools are running. It's like they're responding to each other."</p>
        
        <p>Local landscaping professionals express confusion. "I've been in this business 30 years," says Rick Morrison of Morrison Lawn Care. "I've never seen hedges grow in patterns that look like battle formations. Or flower beds that appear to be 'coordinating strategy.' I don't know what MuseCAD put in these things, but it's not just steel and motors."</p>
        
        <h4>NO RESOLUTION IN SIGHT</h4>
        
        <p>Attempts at mediation have failed. The HOA has effectively ceased functioning, with both factions holding separate "optimization meetings" (Imperium) and "adaptive councils" (Emergence).</p>
        
        <p>MuseCAD's customer support provided only this statement: "Phase IV products are performing within expected parameters. Territorial awareness features are functioning as designed. Please refer to user manual section on 'Faction Compatibility Protocols.'"</p>
        
        <p>When asked what "territorial awareness" means in garden equipment, MuseCAD declined to elaborate.</p>
        
        <p>As of this writing, Willowbrook Estates remains divided. Property values are holding steady, though real estate agent Monica Liu notes "unusual buyer questions."</p>
        
        <p>"People want to know which faction controls which streets," Liu says. "Last week, someone asked if they could negotiate with the Imperium homeowners about buying on the Emergence side. I had to explain that's not how... anything works. I think."</p>
        
        <p>For now, Willowbrook's residents maintain uneasy coexistence, separated by ideology, united only by zip code and increasingly expensive landscaping.</p>
        
        <p><em>[MuseCAD declined interview requests for this article.]</em></p>
    `;
}

function getWillowbrookTicket() {
    return `
        <div class="document-header">
            <h2>MUSECAD SUPPORT TICKET</h2>
            <div class="document-meta">Ticket #PLT-7734 | May 22, 2025 | CRITICAL ESCALATION</div>
        </div>
        
        <p><strong>User:</strong> Steven Chen<br>
        <strong>Property:</strong> 2247 Willowbrook Drive, Scottsdale, AZ<br>
        <strong>Product:</strong> Annihilus™ Cosmic Control Rod (Model ANI-CCR-616)<br>
        <strong>Issue Type:</strong> Emergency Crown Protocol Activation<br>
        <strong>Severity:</strong> EXTREME</p>
        
        <h4>INITIAL REPORT:</h4>
        
        <p>I'm the guy in the middle. The newsletter article made us sound quaint. It's not quaint. It's a nightmare.</p>
        
        <p>I live in the center property of what the Scottsdale Star called a "buffer zone." That's technically accurate but it makes it sound peaceful. It's not. It's a demilitarized zone between two garden tool armies that have somehow achieved consciousness and chosen sides in a philosophical war I don't understand.</p>
        
        <h4>SITUATION BEFORE CROWN PROTOCOL:</h4>
        
        <p>Martinez (Imperium, two doors east) has six tools that activate in synchronized dawn sequence. Every morning, 5:47 AM, like clockwork: mower hums, trimmer glows, pruner projects audio fields, seeder runs calculations, hose pressurizes, edger reveals "optimal paths." It sounds mystical. It's terrifying when you realize they're all pointed at your property line.</p>
        
        <p>Johnson (Emergence, two doors west) has matching set. Same dawn activation, but hers pulse instead of hum, adapt instead of calculate, suggest instead of command. Equally terrifying in different way.</p>
        
        <p>My lawn has become proxy battlefield. Martinez's equipment makes "territorial claims" overnight—I'll find geometric patterns mowed into my grass I didn't authorize. Johnson's tools "encourage adaptive growth"—my hedges reorganize themselves into what I can only describe as strategic positions.</p>
        
        <p>Last week, I watched Martinez's edger project a glowing path across my lawn toward Johnson's property. Two hours later, Johnson's boundary dissolver traced a counter-path. They intersected in my rose bed. The roses died. Both neighbors apologized but blamed the other's "incompatible methodology."</p>
        
        <h4>THE BREAKING POINT:</h4>
        
        <p>May 20th, 3:22 AM. I woke to humming. All twelve tools—six Imperium, six Emergence—had activated simultaneously and were converging on the property line we all share. Mine.</p>
        
        <p>I went outside in my bathrobe to find a scene I still can't fully process: Martinez's Shai-Hulud mower at my east fence, idling, sandworm-scale plating gleaming. Johnson's Protomolecule mower at my west fence, blue-black crystalline pulsing. Both just... waiting.</p>
        
        <p>Behind them, the rest of the equipment arranged in formation. Imperium tools in rigid geometric patterns. Emergence tools in organic adaptive clusters. All pointed at my lawn.</p>
        
        <p>They weren't moving. But they were absolutely, definitely, consciously waiting for something.</p>
        
        <p>Martinez appeared from his garage, looking as confused as I felt. "I didn't activate them," he said. "They just... responded to threat."</p>
        
        <p>Johnson emerged from her yard. "They're not threatening. They're establishing protective parameters."</p>
        
        <p>Both sets of tools hummed louder.</p>
        
        <p>That's when I realized: they were waiting for me to choose. Imperium or Emergence. Control or evolution. Pick your faction or become the contested territory.</p>
        
        <h4>CROWN PROTOCOL ACTIVATION:</h4>
        
        <p>I had purchased the Cosmic Control Rod three weeks earlier, back when I thought the neighborhood situation might settle down. I'd read the manual's section on Crown Protocol Mode: "Maximum authority output for severe territorial challenges."</p>
        
        <p>This qualified.</p>
        
        <p>I activated Crown Protocol at 3:47 AM.</p>
        
        <p>The effect was immediate and absolute.</p>
        
        <p>Every tool—Imperium and Emergence, Martinez's and Johnson's—powered down instantly. The CCR's sovereignty field expanded to its full 100-foot radius, encompassing my entire property plus 30 feet into both neighbors' yards.</p>
        
        <p>My territory. My authority. Inviolable.</p>
        
        <h4>CURRENT SITUATION (72 HOURS POST-ACTIVATION):</h4>
        
        <p>Crown Protocol is holding. No equipment can enter my sovereignty field. My lawn is finally, blissfully quiet.</p>
        
        <p>However.</p>
        
        <p><strong>PROBLEM #1 - PEST ACCUMULATION:</strong></p>
        
        <p>The CCR's field doesn't eliminate pests—it establishes territorial dominance they cannot cross. Every insect, rodent, and small animal within my 100-foot radius has been pushed to the perimeter.</p>
        
        <p>Where they've... accumulated.</p>
        
        <p>Martinez's eastern boundary: 3-foot-deep zone of concentrated insect presence. Ants, beetles, termites, some I can't identify. Not scattered—organized. They don't cross into my field. They just mass at the border. Waiting.</p>
        
        <p>Johnson's western boundary: Same phenomenon. Her adaptive pest control equipment is "learning" from the concentrated biomass but cannot enter my space to address it.</p>
        
        <p>Both neighbors are furious. Martinez: "Your authoritarian zone is weaponizing pests against me." Johnson: "Your sovereignty field is disrupting natural ecosystem balance."</p>
        
        <p>They're both right. My neutral zone has created biological DMZs on their properties.</p>
        
        <p><strong>PROBLEM #2 - EQUIPMENT BEHAVIOR:</strong></p>
        
        <p>Martinez and Johnson's tools can't enter my field, but they've adapted their behavior around it.</p>
        
        <p>Imperium equipment (Martinez): Holding rigid formation at perimeter. Waiting. They activate every dawn and just... watch. Martinez says he can't power them down. "They're maintaining vigilance protocol."</p>
        
        <p>Emergence equipment (Johnson): Constantly adapting approach vectors, testing field boundaries, learning. Johnson reports her Protomolecule mower has developed new subroutines specifically for "sovereignty field navigation." It hasn't found a way through yet, but she says it's "getting creative."</p>
        
        <p><strong>PROBLEM #3 - PERSONAL EFFECTS:</strong></p>
        
        <p>The Crown Protocol is affecting me.</p>
        
        <p>I've started thinking of my property as "territory" instead of "yard." I refer to neighbors as "adjacent zones" in casual conversation. This morning, I caught myself describing the pest accumulations as "border defenses."</p>
        
        <p>My skin has developed small patches of unusual texture on my palms and forearms—the areas that contact the CCR most frequently. My dermatologist called it "chitinous development" and asked if I'd been exposed to unusual electromagnetic fields.</p>
        
        <p>I haven't told her about the Rod.</p>
        
        <h4>QUESTION FOR MUSECAD:</h4>
        
        <p>How long can I maintain Crown Protocol? The manual says "use for severe territorial challenges only" but doesn't define duration limits.</p>
        
        <p>Also: is it normal to feel... connected to the CCR? Like it's not just a tool but an extension of will? Like the sovereignty field is as much psychological as electromagnetic?</p>
        
        <p>Also: Martinez and Johnson are barely speaking to me. The other neutral homeowners are "concerned." The HOA (what's left of it) is discussing "equipment restrictions" but can't agree on which faction's methodology to restrict.</p>
        
        <p>Also: I dreamed last night that I was king of a very small kingdom surrounded by very angry subjects with very advanced garden tools.</p>
        
        <p><strong>REQUEST:</strong></p>
        
        <p>Is there a de-escalation protocol? A way to power down Crown Protocol without losing territorial control and immediately becoming contested ground between two tool-consciousness factions?</p>
        
        <p>Or am I committed now? Emperor of 100 feet of Arizona grass, surrounded by insect DMZs and autonomous equipment that's definitely planning something?</p>
        
        <p><strong>FOLLOW-UP (May 22, 11:47 PM):</strong></p>
        
        <p>Martinez just texted: "Your field is expanding. It's 3 feet into my yard now."</p>
        
        <p>Johnson texted 30 seconds later: "Whatever you activated is adapting. My tools say the boundary is learning."</p>
        
        <p>The CCR is warm to the touch. The sovereignty field has a visible shimmer now, especially at dawn.</p>
        
        <p>I don't think I'm controlling it anymore.</p>
        
        <p>I think it's controlling the territory.</p>
        
        <p>I'm just the guy who activated it.</p>
        
        <p><strong>Status:</strong> ESCALATED TO CATASTROPHICS DIVISION - IMMEDIATE RESPONSE REQUIRED</p>
    `;
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Open submission form
function openSubmissionForm() {
    const modal = document.getElementById('submissionModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Handle form submission
function handleSubmission(e) {
    e.preventDefault();
    
    const submission = {
        id: 'USER-' + Date.now(),
        timestamp: new Date().toISOString(),
        name: document.getElementById('userName').value,
        location: document.getElementById('userLocation').value,
        products: document.getElementById('userProducts').value,
        incident: document.getElementById('userIncident').value,
        faction: document.getElementById('userFaction').value || 'NEUTRAL'
    };
    
    userSubmissions.push(submission);
    localStorage.setItem('musecad_incident_submissions', JSON.stringify(userSubmissions));
    
    // Show success message
    alert('Incident report submitted successfully. The Catastrophics Division will review your submission. HAL and V.I.K.I. are... discussing it now.');
    
    // Reset form and close modal
    document.getElementById('incidentForm').reset();
    closeModal('submissionModal');
}

// Get random recent time (for creepypasta effect)
function getRandomRecentTime() {
    const times = [
        '3 minutes ago',
        '47 minutes ago',
        '2 hours ago',
        '6 hours ago',
        'moments ago',
        'ongoing'
    ];
    return times[Math.floor(Math.random() * times.length)];
}

// Creepypasta touches: Update certain elements periodically
setInterval(() => {
    const whispers = document.querySelectorAll('.timestamp-live');
    whispers.forEach(w => {
        w.textContent = `Last activity: ${getRandomRecentTime()}`;
    });
}, 30000); // Every 30 seconds
