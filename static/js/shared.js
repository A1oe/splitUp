// Shared JavaScript functions used across multiple pages

// Theme management
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    const themeToggle = document.getElementById('themeToggle');

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    if (newTheme === 'light') {
        themeToggle.innerHTML = '🌙 Dark Mode';
    } else {
        themeToggle.innerHTML = '🌞 Light Mode';
    }

    // Update debt network visualization if it exists
    if (typeof createDebtNetwork === 'function') {
        createDebtNetwork();
    }
}

// Initialize theme on page load
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('themeToggle');

    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.innerHTML = '🌙 Dark Mode';
    } else {
        // Default to dark mode
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '🌞 Light Mode';
    }
}

// Generalized CSV export function
function exportCSV(transactionsData, filename = 'combined_transactions.csv') {
    if (!transactionsData || transactionsData.length === 0) {
        alert('No transactions to export');
        return;
    }
    
    fetch('/export_csv', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            transactions: transactionsData
        })
    })
    .then(response => {
        if (response.ok) {
            return response.blob();
        } else {
            throw new Error('Export failed');
        }
    })
    .then(blob => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    })
    .catch(error => {
        alert('Error exporting CSV. Please try again.');
        console.error('Export error:', error);
    });
}

// Collapsible content functionality (useful for any expandable sections)
function toggleCollapse(contentId, headerElement) {
    const content = document.getElementById(contentId);
    const arrow = headerElement.querySelector('.collapse-arrow');

    if (content.classList.contains('show')) {
        // Collapse
        content.classList.remove('show');
        arrow.classList.remove('expanded');
        arrow.textContent = '▶';
    } else {
        // Expand
        content.classList.add('show');
        arrow.classList.add('expanded');
        arrow.textContent = '▼';
    }
}

// Utility function to show error messages (can be used on any page)
function showError(message, errorElementId = 'errorMessage') {
    const errorDiv = document.getElementById(errorElementId);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    } else {
        // Fallback to alert if no error element found
        alert(message);
    }
}

// Utility function to hide error messages
function hideError(errorElementId = 'errorMessage') {
    const errorDiv = document.getElementById(errorElementId);
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}