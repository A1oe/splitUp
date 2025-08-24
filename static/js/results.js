// Initialize theme when page loads
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    createDebtNetwork();
});

// toggleCollapse function is now in shared.js

// Create debt network visualization
function createDebtNetwork() {
    // Get data from hidden script tag to avoid Jinja2 syntax issues
    const dataScript = document.getElementById('transaction-data');
    if (!dataScript) {
        console.error('transaction-data script tag not found');
        return;
    }
    
    let originalTransactions = [];
    try {
        originalTransactions = JSON.parse(dataScript.textContent);
    } catch (e) {
        console.error('Error parsing transaction data:', e);
        return;
    }

    if (!originalTransactions || originalTransactions.length === 0) {
        const svg = document.getElementById('debtNetworkSvg');
        if (svg) {
            svg.innerHTML = '<text x="400" y="300" text-anchor="middle" fill="#999999" font-size="16">No transactions to display</text>';
        }
        return;
    }

    // Build debt relationships from original transactions
    const debtMap = new Map();
    const people = new Set();

    originalTransactions.forEach(transaction => {
        // Handle both old dictionary format and new named tuple format
        const payer = transaction.payer || transaction.creditor;
        const debtor = transaction.debtor;
        const amount = parseFloat(transaction.amount);

        if (!payer || !debtor || isNaN(amount)) {
            console.warn('Invalid transaction data:', transaction);
            return;
        }

        people.add(payer);
        people.add(debtor);

        const key = `${debtor}->${payer}`; // debtor owes money to payer
        if (debtMap.has(key)) {
            debtMap.set(key, debtMap.get(key) + amount);
        } else {
            debtMap.set(key, amount);
        }
    });

    const peopleArray = Array.from(people);
    const debts = Array.from(debtMap.entries()).map(([key, amount]) => {
        const [from, to] = key.split('->');
        return { from, to, amount };
    });

    // Create SVG visualization
    const svg = document.getElementById('debtNetworkSvg');
    if (!svg) {
        console.error('debtNetworkSvg element not found');
        return;
    }
    
    const svgWidth = 800;
    const svgHeight = 600;

    // Clear existing content
    svg.innerHTML = '';
    
    // Get theme-appropriate colors
    const isDarkTheme = document.documentElement.getAttribute('data-theme') !== 'light';
    const colors = {
        nodeColor: isDarkTheme ? '#4a9eff' : '#007bff',
        nodeStroke: isDarkTheme ? '#2d2d2d' : '#ffffff', 
        arrowColor: isDarkTheme ? '#ef4444' : '#dc3545',
        textColor: isDarkTheme ? '#ffffff' : '#333333',
        bgColor: isDarkTheme ? '#2d2d2d' : '#ffffff',
        borderColor: isDarkTheme ? '#555555' : '#dddddd'
    };

    // Add arrow marker definition
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');

    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');

    polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
    polygon.setAttribute('fill', colors.arrowColor);

    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Position people in a circle
    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;
    const radius = Math.min(svgWidth, svgHeight) / 3;

    const positions = new Map();
    peopleArray.forEach((person, index) => {
        const angle = (index / peopleArray.length) * 2 * Math.PI - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        positions.set(person, { x, y });
    });

    // Draw debt arrows
    debts.forEach(debt => {
        const fromPos = positions.get(debt.from);
        const toPos = positions.get(debt.to);

        if (fromPos && toPos) {
            // Calculate arrow path with curve to avoid overlapping
            const dx = toPos.x - fromPos.x;
            const dy = toPos.y - fromPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Create curved path
            const midX = (fromPos.x + toPos.x) / 2;
            const midY = (fromPos.y + toPos.y) / 2;
            const curveFactor = Math.min(distance / 4, 50);
            const perpX = -dy / distance * curveFactor;
            const perpY = dx / distance * curveFactor;

            const controlX = midX + perpX;
            const controlY = midY + perpY;

            // Adjust start and end points to node edges
            const nodeRadius = 30;
            const startX = fromPos.x + (dx / distance) * nodeRadius;
            const startY = fromPos.y + (dy / distance) * nodeRadius;
            const endX = toPos.x - (dx / distance) * nodeRadius;
            const endY = toPos.y - (dy / distance) * nodeRadius;

            // Create path
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`);
            path.setAttribute('stroke', colors.arrowColor);
            path.setAttribute('stroke-width', '2');
            path.setAttribute('fill', 'none');
            path.setAttribute('marker-end', 'url(#arrowhead)');
            svg.appendChild(path);

            // Add amount label
            const amountBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            const amountText = document.createElementNS('http://www.w3.org/2000/svg', 'text');

            amountText.setAttribute('x', controlX);
            amountText.setAttribute('y', controlY);
            amountText.setAttribute('fill', colors.textColor);
            amountText.setAttribute('font-size', '12');
            amountText.setAttribute('text-anchor', 'middle');
            amountText.setAttribute('font-weight', 'bold');
            amountText.textContent = `$${debt.amount.toFixed(2)}`;

            // Position background rectangle
            const textWidth = debt.amount.toFixed(2).length * 7 + 10;
            amountBg.setAttribute('x', controlX - textWidth / 2);
            amountBg.setAttribute('y', controlY - 8);
            amountBg.setAttribute('width', textWidth);
            amountBg.setAttribute('height', 16);
            amountBg.setAttribute('fill', colors.bgColor);
            amountBg.setAttribute('stroke', colors.borderColor);
            amountBg.setAttribute('stroke-width', '1');
            amountBg.setAttribute('rx', 3);

            svg.appendChild(amountBg);
            svg.appendChild(amountText);
        }
    });

    // Draw person nodes (on top of arrows)
    peopleArray.forEach(person => {
        const pos = positions.get(person);
        if (pos) {
            // Create group for person node
            const personGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            personGroup.setAttribute('style', 'cursor: pointer; transition: transform 0.3s ease;');
            personGroup.addEventListener('mouseenter', function() {
                this.setAttribute('transform', `scale(1.1) translate(${pos.x * 0.1}, ${pos.y * 0.1})`);
            });
            personGroup.addEventListener('mouseleave', function() {
                this.removeAttribute('transform');
            });

            // Create circle
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', pos.x);
            circle.setAttribute('cy', pos.y);
            circle.setAttribute('r', 30);
            circle.setAttribute('fill', colors.nodeColor);
            circle.setAttribute('stroke', colors.nodeStroke);
            circle.setAttribute('stroke-width', '3');

            // Create text
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', pos.x);
            text.setAttribute('y', pos.y);
            text.setAttribute('fill', 'white');
            text.setAttribute('font-size', '14');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'central');

            // Truncate long names
            const displayName = person.length > 8 ? person.substring(0, 6) + '...' : person;
            text.textContent = displayName;

            // Add tooltip
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = person;

            personGroup.appendChild(circle);
            personGroup.appendChild(text);
            personGroup.appendChild(title);
            svg.appendChild(personGroup);
        }
    });
}

// Export transactions to CSV using shared function
function exportTransactionsCSV() {
    const dataScript = document.getElementById('transaction-data');
    const originalTransactions = dataScript ? JSON.parse(dataScript.textContent) : [];
    exportCSV(originalTransactions, 'combined_transactions.csv');
}