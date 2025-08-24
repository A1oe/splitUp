let allTransactions = []; // Combined CSV and manual transactions
let allNames = new Set();
let uploadedFiles = new Map(); // Track uploaded files and their transaction counts

// Focus on first input when page loads
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    document.getElementById('payerInput').focus();
});

// Handle Enter key to add transaction
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        addTransaction();
    }
});

// Removed custom Tab key navigation to allow normal browser Tab behavior

// Autocomplete functionality
function setupAutocomplete(inputId, suggestionsId) {
    const input = document.getElementById(inputId);
    const suggestions = document.getElementById(suggestionsId);

    input.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        suggestions.innerHTML = '';

        if (value.length > 0) {
            const matches = Array.from(allNames).filter(name =>
                name.toLowerCase().includes(value)
            );

            if (matches.length > 0) {
                matches.slice(0, 5).forEach(name => {
                    const div = document.createElement('div');
                    div.className = 'autocomplete-suggestion';
                    div.textContent = name;
                    div.onclick = function() {
                        input.value = name;
                        suggestions.innerHTML = '';
                    };
                    suggestions.appendChild(div);
                });
            }
        }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.innerHTML = '';
        }
    });
}

setupAutocomplete('payerInput', 'payerSuggestions');

// Set up autocomplete for initial debtor
setupAutocompleteForDebtor(0);

// Multiple debtor functionality
let debtorCount = 1;

function setupAutocompleteForDebtor(index) {
    const debtorInput = document.querySelector(`.debtor-entry[data-index="${index}"] .debtor-name`);
    if (debtorInput) {
        setupAutocompleteForElement(debtorInput, `debtor-suggestions-${index}`);
    }
}

function setupAutocompleteForElement(input, suggestionsId) {
    // Create suggestions div if it doesn't exist
    let suggestions = document.getElementById(suggestionsId);
    if (!suggestions) {
        suggestions = document.createElement('div');
        suggestions.id = suggestionsId;
        suggestions.className = 'autocomplete-suggestions';
        input.parentNode.appendChild(suggestions);
    }

    input.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        suggestions.innerHTML = '';

        if (value.length > 0) {
            const matches = Array.from(allNames).filter(name =>
                name.toLowerCase().includes(value)
            );

            if (matches.length > 0) {
                matches.slice(0, 5).forEach(name => {
                    const div = document.createElement('div');
                    div.className = 'autocomplete-suggestion';
                    div.textContent = name;
                    div.onclick = function() {
                        input.value = name;
                        suggestions.innerHTML = '';
                    };
                    suggestions.appendChild(div);
                });
            }
        }
    });

    // Removed custom Tab key navigation to allow normal browser Tab behavior

    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.innerHTML = '';
        }
    });
}

function addDebtor() {
    const debtorsList = document.getElementById('debtorsList');

    // Calculate current total percentage before adding new debtor
    const currentEntries = document.querySelectorAll('.debtor-entry');
    let currentTotal = 0;
    currentEntries.forEach(entry => {
        const percentage = parseFloat(entry.querySelector('.debtor-percentage').value) || 0;
        currentTotal += percentage;
    });

    const newEntry = document.createElement('div');
    newEntry.className = 'debtor-entry';
    newEntry.setAttribute('data-index', debtorCount);

    // Calculate remaining percentage for new debtor
    const remainingPercentage = Math.max(0, 100 - currentTotal);

    newEntry.innerHTML = `
        <div class="form-group" style="margin-bottom: 8px;">
            <div class="input-container" style="flex: 2;">
                <input type="text" class="debtor-name" placeholder="Who received?" autocomplete="off">
            </div>
            <span style="min-width: 40px;">gets</span>
            <input type="number" class="debtor-percentage" placeholder="%" step="0.1" min="0" max="100" style="width: 70px;" onchange="updateDebtorAmounts()" value="${remainingPercentage.toFixed(1)}">
            <span style="min-width: 15px;">%</span>
            <span class="debtor-amount" style="min-width: 80px; font-weight: bold; color: var(--accent-green);">$0.00</span>
            <button class="btn-danger btn-small" onclick="removeDebtor(${debtorCount})" style="margin-left: 8px;">×</button>
        </div>
    `;

    debtorsList.appendChild(newEntry);
    setupAutocompleteForDebtor(debtorCount);
    debtorCount++;

    // Show remove buttons when there's more than one debtor
    updateRemoveButtons();

    // Update amounts to reflect the new debtor
    updateDebtorAmounts();
}

function removeDebtor(index) {
    const entry = document.querySelector(`.debtor-entry[data-index="${index}"]`);
    if (entry) {
        entry.remove();
        updateRemoveButtons();
        // Auto-fill equal percentages for remaining debtors
        autoFillPercentages();
    }
}

function updateRemoveButtons() {
    const entries = document.querySelectorAll('.debtor-entry');
    entries.forEach((entry, index) => {
        const removeBtn = entry.querySelector('.btn-danger');
        if (entries.length > 1) {
            removeBtn.style.display = 'inline-block';
        } else {
            removeBtn.style.display = 'none';
        }
    });
}

function updateDebtorAmounts() {
    const totalAmount = parseFloat(document.getElementById('amountInput').value) || 0;
    const debtorEntries = document.querySelectorAll('.debtor-entry');
    let totalPercentage = 0;

    debtorEntries.forEach(entry => {
        const percentageInput = entry.querySelector('.debtor-percentage');
        const amountSpan = entry.querySelector('.debtor-amount');
        const percentage = parseFloat(percentageInput.value) || 0;
        const amount = (totalAmount * percentage) / 100;

        amountSpan.textContent = `$${amount.toFixed(2)}`;
        totalPercentage += percentage;
    });

    // Update total percentage display
    const totalPercentageSpan = document.getElementById('totalPercentage');
    totalPercentageSpan.textContent = `Total: ${totalPercentage.toFixed(1)}%`;

    // Color code the percentage
    if (totalPercentage === 100) {
        totalPercentageSpan.style.color = 'var(--accent-green)';
    } else if (totalPercentage > 100) {
        totalPercentageSpan.style.color = 'var(--accent-red)';
    } else {
        totalPercentageSpan.style.color = 'var(--text-muted)';
    }

    // Enable/disable add button
    const addBtn = document.getElementById('addTransactionBtn');
    const payer = document.getElementById('payerInput').value.trim();
    const hasValidDebtors = Array.from(debtorEntries).some(entry => {
        const name = entry.querySelector('.debtor-name').value.trim();
        const percentage = parseFloat(entry.querySelector('.debtor-percentage').value) || 0;
        return name && percentage > 0;
    });

    addBtn.disabled = !(payer && totalAmount > 0 && hasValidDebtors && totalPercentage <= 100);
}

function autoFillPercentages() {
    const debtorEntries = document.querySelectorAll('.debtor-entry');

    if (debtorEntries.length === 0) return;

    const percentagePerDebtor = 100 / debtorEntries.length;
    debtorEntries.forEach(entry => {
        const percentageInput = entry.querySelector('.debtor-percentage');
        percentageInput.value = percentagePerDebtor.toFixed(1);
    });

    updateDebtorAmounts();
}

// CSV loading functionality for multiple files
function loadCSV() {
    const fileInput = document.getElementById('csvInput');
    const files = fileInput.files;

    if (!files || files.length === 0) return;

    // Process each file
    Array.from(files).forEach(file => {
        // Skip if file already uploaded
        if (uploadedFiles.has(file.name)) {
            showCSVError(`File "${file.name}" is already uploaded.`);
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const csvData = e.target.result;
                const lines = csvData.split('\n');
                let csvTransactions = [];

                for (let line of lines) {
                    line = line.trim();
                    if (line) {
                        const parts = line.split(',');
                        if (parts.length === 3) {
                            const payer = parts[0].trim();
                            const debtor = parts[1].trim();
                            const amount = parseFloat(parts[2].trim());

                            if (payer && debtor && !isNaN(amount) && amount > 0) {
                                csvTransactions.push({
                                    payer: payer,
                                    debtor: debtor,
                                    amount: amount,
                                    source: 'csv',
                                    filename: file.name
                                });

                                // Add names to autocomplete
                                allNames.add(payer);
                                allNames.add(debtor);
                            }
                        }
                    }
                }

                if (csvTransactions.length > 0) {
                    // Add transactions to the main array
                    allTransactions.push(...csvTransactions);

                    // Track the uploaded file
                    uploadedFiles.set(file.name, csvTransactions.length);

                    // Update displays
                    updateTransactionsList();
                    updateUploadedFilesList();

                    document.getElementById('csvErrorMessage').style.display = 'none';
                } else {
                    showCSVError(`No valid transactions found in "${file.name}".`);
                }

            } catch (error) {
                showCSVError(`Error reading "${file.name}". Please check the format.`);
            }
        };

        reader.readAsText(file);
    });
}

function showCSVError(message) {
    const errorDiv = document.getElementById('csvErrorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Update the uploaded files list display
function updateUploadedFilesList() {
    const filesList = document.getElementById('uploadedFilesList');
    const filesContainer = document.getElementById('filesContainer');

    if (uploadedFiles.size === 0) {
        filesList.style.display = 'none';
        return;
    }

    filesList.style.display = 'block';
    filesContainer.innerHTML = '';

    uploadedFiles.forEach((transactionCount, filename) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-name">📄 ${filename}</div>
                <div class="file-stats">${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}</div>
            </div>
            <button class="btn-file-remove" onclick="removeFileTransactions('${filename}')">Remove</button>
        `;
        filesContainer.appendChild(fileItem);
    });
}

// Remove all transactions from a specific file
function removeFileTransactions(filename) {
    if (confirm(`Remove all transactions from "${filename}"?`)) {
        // Remove transactions from the specific file
        allTransactions = allTransactions.filter(t => t.filename !== filename);

        // Remove file from tracking
        uploadedFiles.delete(filename);

        // Update displays
        updateTransactionsList();
        updateUploadedFilesList();

        // Clear file input if no files remain
        if (uploadedFiles.size === 0) {
            document.getElementById('csvInput').value = '';
        }
    }
}

function addTransaction() {
    const payer = document.getElementById('payerInput').value.trim();
    const totalAmount = parseFloat(document.getElementById('amountInput').value);
    const debtorEntries = document.querySelectorAll('.debtor-entry');

    // Clear error message
    hideError('errorMessage');

    // Validation
    if (!payer || !totalAmount || totalAmount <= 0) {
        showError('Please fill in payer and total amount');
        return;
    }

    // Get valid debtors with percentages
    const validDebtors = [];
    let totalPercentage = 0;

    debtorEntries.forEach(entry => {
        const name = entry.querySelector('.debtor-name').value.trim();
        const percentage = parseFloat(entry.querySelector('.debtor-percentage').value) || 0;

        if (name && percentage > 0) {
            if (name.toLowerCase() === payer.toLowerCase()) {
                showError('Payer cannot owe money to themselves');
                return;
            }
            validDebtors.push({ name, percentage });
            totalPercentage += percentage;
        }
    });

    if (validDebtors.length === 0) {
        showError('Please add at least one debtor with a valid percentage');
        return;
    }

    if (totalPercentage > 100) {
        showError('Total percentages cannot exceed 100%');
        return;
    }

    // Create individual transactions for each debtor
    validDebtors.forEach(debtor => {
        const debtorAmount = (totalAmount * debtor.percentage) / 100;

        allTransactions.push({
            payer: payer,
            debtor: debtor.name,
            amount: debtorAmount,
            source: 'manual',
            splitInfo: validDebtors.length > 1 ? `${debtor.percentage}% of $${totalAmount.toFixed(2)}` : null
        });

        // Add names to autocomplete
        allNames.add(payer);
        allNames.add(debtor.name);
    });

    // Clear form
    clearTransactionForm();

    // Update display
    updateTransactionsList();

    // Focus back to first input for quick entry
    document.getElementById('payerInput').focus();
}

function clearTransactionForm() {
    // Clear main inputs
    document.getElementById('payerInput').value = '';
    document.getElementById('amountInput').value = '';

    // Reset debtors list to single entry
    const debtorsList = document.getElementById('debtorsList');
    debtorsList.innerHTML = `
        <div class="debtor-entry" data-index="0">
            <div class="form-group" style="margin-bottom: 8px;">
                <div class="input-container" style="flex: 2;">
                    <input type="text" class="debtor-name" placeholder="Who received?" autocomplete="off">
                </div>
                <span style="min-width: 40px;">gets</span>
                <input type="number" class="debtor-percentage" placeholder="%" step="0.1" min="0" max="100" style="width: 70px;" onchange="updateDebtorAmounts()">
                <span style="min-width: 15px;">%</span>
                <span class="debtor-amount" style="min-width: 80px; font-weight: bold; color: var(--accent-green);">$0.00</span>
                <button class="btn-danger btn-small" onclick="removeDebtor(0)" style="margin-left: 8px; display: none;">×</button>
            </div>
        </div>
    `;

    // Reset debtor count
    debtorCount = 1;

    // Set up autocomplete for the reset debtor input
    setupAutocompleteForDebtor(0);

    // Auto-fill single debtor with 100%
    const firstPercentageInput = document.querySelector('.debtor-percentage');
    if (firstPercentageInput) {
        firstPercentageInput.value = '100';
    }

    // Update amounts and button state
    updateDebtorAmounts();
}

function removeTransaction(index) {
    allTransactions.splice(index, 1);
    updateTransactionsList();
}

function updateTransactionsList() {
    const list = document.getElementById('transactionsList');
    const count = document.getElementById('transactionCount');
    const processBtn = document.getElementById('processAllBtn');
    const clearBtn = document.getElementById('clearAllBtn');
    const exportBtn = document.getElementById('exportBtn');

    count.textContent = allTransactions.length;

    if (allTransactions.length === 0) {
        list.innerHTML = '<div class="empty-state">No transactions added yet. Upload a CSV file or add transactions manually.</div>';
        processBtn.disabled = true;
        clearBtn.style.display = 'none';
        exportBtn.style.display = 'none';
    } else {
        list.innerHTML = allTransactions.map((t, index) => {
            let sourceLabel = '';
            if (t.source === 'csv') {
                sourceLabel = `📄 ${t.filename}`;
            } else {
                sourceLabel = '✏️ Manual';
            }

            const splitInfoDisplay = t.splitInfo ? `<div class="split-info">Split payment: ${t.splitInfo}</div>` : '';

            return `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <strong>${t.payer}</strong> paid $${t.amount.toFixed(2)} to <strong>${t.debtor}</strong>
                        ${splitInfoDisplay}
                        <span class="transaction-source">${sourceLabel}</span>
                    </div>
                    <button class="btn-danger" onclick="removeTransaction(${index})">×</button>
                </div>
            `;
        }).join('');
        processBtn.disabled = false;
        clearBtn.style.display = 'inline-block';
        exportBtn.style.display = 'inline-block';
    }
}

function clearAllTransactions() {
    if (confirm('Are you sure you want to clear all transactions? This cannot be undone.')) {
        allTransactions = [];
        allNames.clear();
        uploadedFiles.clear(); // Clear uploaded files tracking

        updateTransactionsList();
        updateUploadedFilesList(); // Update files list display

        // Clear CSV input
        document.getElementById('csvInput').value = '';

        // Clear manual input fields
        document.getElementById('payerInput').value = '';
        document.getElementById('amountInput').value = '';
        
        // Clear debtor inputs
        const debtorInputs = document.querySelectorAll('.debtor-name');
        debtorInputs.forEach(input => input.value = '');

        // Clear error messages
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('csvErrorMessage').style.display = 'none';
    }
}

// showError function is now in shared.js

function processAllTransactions() {
    if (allTransactions.length === 0) return;

    // Show loading state
    const processBtn = document.getElementById('processAllBtn');
    const originalText = processBtn.textContent;
    processBtn.textContent = '⏳ Processing...';
    processBtn.disabled = true;

    // Send to server
    fetch('/process_manual', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            transactions: allTransactions.map(t => ({
                payer: t.payer,
                debtor: t.debtor,
                amount: t.amount
            }))
        })
    })
    .then(response => {
        if (response.ok) {
            return response.text();
        } else {
            throw new Error('Processing failed');
        }
    })
    .then(html => {
        // Replace current page with results
        document.open();
        document.write(html);
        document.close();
    })
    .catch(error => {
        showError('Error processing transactions. Please try again.');
        processBtn.textContent = originalText;
        processBtn.disabled = false;
    });
}

// Export transactions to CSV using shared function
function exportTransactionsCSV() {
    exportCSV(allTransactions, 'combined_transactions.csv');
}