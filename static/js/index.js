// Visual Transaction Builder - Click-based Interface
let allTransactions = [];
let allNames = new Set();
let uploadedFiles = new Map();

// Transaction builder state
let transactionBuilder = {
    creditor: null,
    amount: null,
    debtors: [],
    step: 1
};

// Initialize the interface
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initializeInterface();
    loadPersonsFromExistingData();
});

function initializeInterface() {
    // Initialize with step 1 (creditor selection) - no need to call showStep since step 1 is always visible
    updatePersonChips();

    // Set up Enter key for modal
    document.getElementById('newPersonInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addNewPerson();
        }
    });

    // Set up custom amount input to trigger step advancement
    document.getElementById('customAmountInput').addEventListener('input', function() {
        selectCustomAmount();
    });
}

function loadPersonsFromExistingData() {
    // This will be called after CSV files are loaded
    updatePersonChips();
}

// Person Management
function updatePersonChips() {
    const allPersonChips = document.getElementById('allPersonChips');
    const creditorChips = document.getElementById('creditorChips');
    const debtorChips = document.getElementById('debtorChips');

    const peopleArray = Array.from(allNames).sort();

    // Update all people chips (for management section) - display only
    if (allPersonChips) {
        allPersonChips.innerHTML = '';
        peopleArray.forEach(person => {
            const chip = createPersonChip(person, 'display');
            // Add visual indicator if person is selected as creditor
            if (transactionBuilder.creditor === person) {
                chip.classList.add('is-creditor');
            }
            // Add visual indicator if person is selected as debtor
            if (transactionBuilder.debtors.some(d => d.name === person)) {
                chip.classList.add('is-debtor');
            }
            allPersonChips.appendChild(chip);
        });
    }

    // Update creditor chips
    if (creditorChips) {
        creditorChips.innerHTML = '';
        peopleArray.forEach(person => {
            const chip = createPersonChip(person, 'creditor');
            creditorChips.appendChild(chip);
        });
    }

    // Update debtor chips
    if (debtorChips) {
        debtorChips.innerHTML = '';
        peopleArray.forEach(person => {
            const chip = createPersonChip(person, 'debtor');
            // Disable if already selected as creditor
            if (transactionBuilder.creditor === person) {
                chip.classList.add('disabled');
            }
            debtorChips.appendChild(chip);
        });
    }
}

function createPersonChip(name, type) {
    const chip = document.createElement('div');
    chip.className = 'person-chip';
    chip.onclick = () => selectPerson(name, type);

    // Check if selected
    if (type === 'creditor' && transactionBuilder.creditor === name) {
        chip.classList.add('selected');
    } else if (type === 'debtor' && transactionBuilder.debtors.some(d => d.name === name)) {
        chip.classList.add('selected');
    }

    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;

    chip.appendChild(nameSpan);

    return chip;
}

function selectPerson(name, type) {
    if (type === 'creditor') {
        transactionBuilder.creditor = name;
        updatePersonChips();
        showStep(2);
    } else if (type === 'debtor') {
        // Toggle debtor selection
        const existingIndex = transactionBuilder.debtors.findIndex(d => d.name === name);
        if (existingIndex >= 0) {
            transactionBuilder.debtors.splice(existingIndex, 1);
        } else {
            // Initialize with equal percentage if this is the first debtor, otherwise 0
            const initialPercentage = transactionBuilder.debtors.length === 0 ? 100 : 0;
            transactionBuilder.debtors.push({ name: name, percentage: initialPercentage, amount: 0 });
        }

        // If we have debtors, automatically set equal split
        if (transactionBuilder.debtors.length > 0) {
            equalSplit();
        }

        updatePersonChips();
        updateSelectedDebtors();

        if (transactionBuilder.debtors.length > 0) {
            showStep(3);
        } else {
            // Hide step 3 and 4 if no debtors
            document.getElementById('amountStep').style.display = 'none';
        }
    }
}

// Amount Selection
function selectCustomAmount() {
    const input = document.getElementById('customAmountInput');
    const value = parseFloat(input.value);

    if (value && value > 0) {
        transactionBuilder.amount = value;
        updateDebtorAmounts(); // Calculate debtor amounts
        showStep(4);
    }
}

// Step Management
function showStep(stepNumber) {
    transactionBuilder.step = stepNumber;

    const steps = ['debtorStep', 'amountStep'];

    // Show/hide steps
    steps.forEach((stepId, index) => {
        const step = document.getElementById(stepId);
        if (step) {
            step.style.display = (index + 2 <= stepNumber) ? 'block' : 'none';
        }
    });

    // Update person chips when showing debtor step
    if (stepNumber >= 2) {
        updatePersonChips();
    }

    // Update transaction preview when showing confirm step
    if (stepNumber >= 4) {
        updateDebtorAmounts(); // Recalculate amounts
    }
}


function updateSelectedDebtors() {
    const container = document.getElementById('selectedDebtors');
    const list = document.getElementById('selectedDebtorsList');

    if (transactionBuilder.debtors.length > 0) {
        list.innerHTML = '';

        transactionBuilder.debtors.forEach((debtor, index) => {
            const item = document.createElement('div');
            item.className = 'selected-debtor-item';

            item.innerHTML = `
                <div class="debtor-info">
                    <span class="debtor-name">${debtor.name}</span>
                    <span class="debtor-amount">$${debtor.amount.toFixed(2)}</span>
                </div>
                <div class="percentage-controls">
                    <button class="percentage-btn" onclick="adjustPercentage(${index}, -5)">-</button>
                    <input type="number" class="percentage-input" value="${debtor.percentage.toFixed(1)}"
                           onchange="updateDebtorPercentage(${index}, this.value)" min="0" max="100" step="0.1">
                    <span>%</span>
                    <button class="percentage-btn" onclick="adjustPercentage(${index}, 5)">+</button>
                    <button class="clear-selection" onclick="removeDebtor('${debtor.name}')">&times;</button>
                </div>
            `;

            list.appendChild(item);
        });

        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

// Debtor Management
function adjustPercentage(index, change) {
    const debtor = transactionBuilder.debtors[index];
    debtor.percentage = Math.max(0, Math.min(100, debtor.percentage + change));
    updateDebtorAmounts();
}

function updateDebtorPercentage(index, value) {
    const percentage = Math.max(0, Math.min(100, parseFloat(value) || 0));
    transactionBuilder.debtors[index].percentage = percentage;
    updateDebtorAmounts();
}

function updateDebtorAmounts() {
    if (transactionBuilder.amount) {
        transactionBuilder.debtors.forEach(debtor => {
            debtor.amount = Math.round(transactionBuilder.amount * debtor.percentage) / 100;
        });
    }
    updateSelectedDebtors();
}

function removeDebtor(name) {
    const index = transactionBuilder.debtors.findIndex(d => d.name === name);
    if (index >= 0) {
        transactionBuilder.debtors.splice(index, 1);
    }
    updatePersonChips();
    updateSelectedDebtors();
}

function equalSplit() {
    const numDebtors = transactionBuilder.debtors.length;
    if (numDebtors > 0) {
        const percentage = 100 / numDebtors;
        transactionBuilder.debtors.forEach(debtor => {
            debtor.percentage = percentage;
        });
        updateDebtorAmounts();
    }
}


function startOver() {
    transactionBuilder = {
        creditor: null,
        amount: null,
        debtors: [],
        step: 1
    };

    // Hide all steps
    document.getElementById('selectedDebtors').style.display = 'none';
    document.getElementById('amountStep').style.display = 'none';
    document.getElementById('debtorStep').style.display = 'none';

    // Clear inputs
    document.getElementById('customAmountInput').value = '';

    // Update chips
    updatePersonChips();

    hideError('errorMessage');
}

// Modal Functions
function showAddPersonModal(type) {
    document.getElementById('addPersonModal').style.display = 'flex';
    document.getElementById('newPersonInput').value = '';
    document.getElementById('newPersonInput').focus();
    document.getElementById('addPersonModal').setAttribute('data-type', type);
}

function closeAddPersonModal() {
    document.getElementById('addPersonModal').style.display = 'none';
}

function addNewPerson() {
    const input = document.getElementById('newPersonInput');
    const name = input.value.trim();

    if (!name) {
        return;
    }

    if (allNames.has(name)) {
        showError('Person already exists');
        return;
    }

    allNames.add(name);

    // Get the type from modal data attribute
    const modal = document.getElementById('addPersonModal');
    const type = modal.getAttribute('data-type');

    // Auto-select the newly added person
    if (type === 'creditor') {
        selectPerson(name, 'creditor');
    } else if (type === 'debtor') {
        selectPerson(name, 'debtor');
    }

    updatePersonChips();
    closeAddPersonModal();
}

// Transaction Management
function confirmTransaction() {
    // Validation
    if (!transactionBuilder.creditor) {
        showError('Please select a creditor');
        return;
    }

    if (!transactionBuilder.amount || transactionBuilder.amount <= 0) {
        showError('Please enter a valid amount');
        return;
    }

    if (transactionBuilder.debtors.length === 0) {
        showError('Please select at least one debtor');
        return;
    }

    const totalPercentage = transactionBuilder.debtors.reduce((sum, d) => sum + d.percentage, 0);
    if (totalPercentage > 100.1) { // Allow small floating point errors
        showError('Total percentages cannot exceed 100%');
        return;
    }

    if (totalPercentage < 0.1) {
        showError('Please set percentages for debtors');
        return;
    }

    // Create transactions
    transactionBuilder.debtors.forEach(debtor => {
        if (debtor.amount > 0) {
            allTransactions.push({
                creditor: transactionBuilder.creditor,
                debtor: debtor.name,
                amount: debtor.amount,
                source: 'manual',
                splitInfo: transactionBuilder.debtors.length > 1 ?
                    `${debtor.percentage.toFixed(1)}% of $${transactionBuilder.amount.toFixed(2)}` : null
            });
        }
    });

    // Update display
    updateTransactionsList();

    // Start over for next transaction
    startOver();

    hideError('errorMessage');
}

// CSV Loading (existing functionality)
function loadCSV() {
    const fileInput = document.getElementById('csvInput');
    const files = fileInput.files;

    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
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
                            const creditor = parts[0].trim();
                            const debtor = parts[1].trim();
                            const amount = parseFloat(parts[2]);

                            if (creditor && debtor && !isNaN(amount) && amount > 0) {
                                csvTransactions.push({
                                    creditor: creditor,
                                    debtor: debtor,
                                    amount: amount,
                                    source: 'csv',
                                    filename: file.name
                                });

                                allNames.add(creditor);
                                allNames.add(debtor);
                            }
                        }
                    }
                }

                if (csvTransactions.length > 0) {
                    allTransactions.push(...csvTransactions);
                    uploadedFiles.set(file.name, csvTransactions.length);

                    updateTransactionsList();
                    updateUploadedFilesList();
                    updatePersonChips(); // Update person chips with new names

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

function removeFileTransactions(filename) {
    if (confirm(`Remove all transactions from "${filename}"?`)) {
        allTransactions = allTransactions.filter(t => t.filename !== filename);
        uploadedFiles.delete(filename);

        updateTransactionsList();
        updateUploadedFilesList();

        if (uploadedFiles.size === 0) {
            document.getElementById('csvInput').value = '';
        }
    }
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
                        <strong>${t.creditor}</strong> paid $${t.amount.toFixed(2)} to <strong>${t.debtor}</strong>
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

function removeTransaction(index) {
    allTransactions.splice(index, 1);
    updateTransactionsList();
}

function clearAllTransactions() {
    if (confirm('Are you sure you want to clear all transactions? This cannot be undone.')) {
        allTransactions = [];
        allNames.clear();
        uploadedFiles.clear();

        updateTransactionsList();
        updateUploadedFilesList();
        updatePersonChips();

        document.getElementById('csvInput').value = '';

        startOver();

        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('csvErrorMessage').style.display = 'none';
    }
}

function processAllTransactions() {
    if (allTransactions.length === 0) return;

    const processBtn = document.getElementById('processAllBtn');
    const originalText = processBtn.textContent;
    processBtn.textContent = '⏳ Processing...';
    processBtn.disabled = true;

    fetch('/process_manual', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            transactions: allTransactions.map(t => ({
                creditor: t.creditor,
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

function exportTransactionsCSV() {
    exportCSV(allTransactions, 'combined_transactions.csv');
}