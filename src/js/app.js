// This file contains the JavaScript code for the website. It handles user interactions, such as adding items, separating personal items, and calculating the total amounts to be split.

document.addEventListener('DOMContentLoaded', () => {
    // Show loader for minimum time
    const loaderWrapper = document.getElementById('loader-wrapper');
    const minLoadTime = 2000; // 2 seconds minimum loading time
    const startTime = Date.now();

    // Hide loader after content loads and minimum time has passed
    window.addEventListener('load', () => {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadTime - elapsedTime);

        setTimeout(() => {
            loaderWrapper.classList.add('loader-hidden');
            setTimeout(() => {
                loaderWrapper.style.display = 'none';
            }, 500);
        }, remainingTime);
    });

    // Initialize theme before loader disappears
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const setupForm = document.getElementById('setup-form');
    const itemForm = document.getElementById('item-form');
    const itemList = document.getElementById('item-list');
    const totalSplit = document.getElementById('total-split');
    const peopleNamesContainer = document.getElementById('people-names');
    const currencySelector = document.getElementById('currency');
    const personSelector = document.getElementById('person-selector');
    const specificPeopleContainer = document.getElementById('specific-people');
    const isSharedSelect = document.getElementById('is-shared');
    const toggleRatesButton = document.getElementById('toggle-rates');
    const conversionRateElement = document.getElementById('conversion-rate');
    const splitTypeSelect = document.getElementById('split-type');
    const customRatioContainer = document.getElementById('custom-ratio-container');
    const ratioInputsContainer = document.getElementById('ratio-inputs');
    const themeToggle = document.getElementById('theme-toggle');
    const themeToggleText = themeToggle.querySelector('.theme-toggle-text');
    const toggleSimplifiedButton = document.getElementById('toggle-simplified');
    const shareButton = document.getElementById('share-button');
    const shareModal = document.getElementById('share-modal');
    const exportPDF = document.getElementById('export-pdf');
    const exportCSV = document.getElementById('export-csv');
    const copyLink = document.getElementById('copy-link');
    let items = [];
    let people = [];
    let currency = '$';
    let payments = {};
    let showSimplified = false;
    let personalTotals = {}; // Add this line
    let baseCurrency = '$';
    const itemCurrencySelect = document.getElementById('item-currency');
    const itemCostInput = document.getElementById('item-cost');
    const conversionPreview = document.querySelector('.conversion-preview');

    const conversionRates = {
        // Existing rates
        '$': 1.00,    // USD (base currency)
        '€': 0.92,    // EUR
        '£': 0.79,    // GBP
        '₹': 83.12,   // INR
        'zł': 4.00,   // PLN
        'RM': 4.72,   // MYR
        
        // New rates (as of April 2024)
        '¥': 151.50,  // JPY
        'A$': 1.53,   // AUD
        'C$': 1.36,   // CAD
        'CHF': 0.91,  // CHF
        '元': 7.23,   // CNY
        'kr': 10.57,  // SEK
        '₩': 1348.76, // KRW
        '₪': 3.71,    // ILS
        'S$': 1.35,   // SGD
        '฿': 36.45,   // THB
        'R$': 5.03,   // BRL
        '₱': 56.50,   // PHP
        '﷼': 3.75,    // SAR
        'HK$': 7.83,  // HKD
        '₺': 32.15    // TRY
    };

    // Add this helper function at the top level
    function formatCurrency(amount, currency) {
        // List of currencies that place symbol after the number
        const postSymbolCurrencies = ['zł', '元', '﷼', 'kr'];
        
        const formattedAmount = amount.toFixed(2);
        return postSymbolCurrencies.includes(currency) 
            ? `${formattedAmount} ${currency}`
            : `${currency}${formattedAmount}`;
    }

    // Convert an amount from one currency to another
    function convertCurrency(amount, fromCurrency, toCurrency) {
        const fromRate = conversionRates[fromCurrency] || 1;
        const toRate = conversionRates[toCurrency] || 1;
        return (amount / fromRate) * toRate;
    }

    function updateBuyerSelector() {
        const buyerSelect = document.getElementById('item-buyer');
        buyerSelect.innerHTML = '';
        people.forEach(person => {
            const option = document.createElement('option');
            option.value = person;
            option.textContent = person;
            buyerSelect.appendChild(option);
        });
    }

    function initializeTheme() {
        // Check for saved user preference
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeToggle(savedTheme);
    }

    function updateThemeToggle(theme) {
        themeToggleText.textContent = theme === 'light' ? '🌙' : '☀️';
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeToggle(newTheme);
    });

    initializeTheme();

    setupForm.addEventListener('submit', (event) => {
        event.preventDefault();
        baseCurrency = document.getElementById('base-currency').value;
        const numPeople = parseInt(document.getElementById('num-people').value);
        people = [];

        for (let i = 0; i < numPeople; i++) {
            const nameInput = document.getElementById(`person-${i}`);
            if (nameInput) {
                people.push(nameInput.value || `Person ${i + 1}`);
            }
        }

        updatePersonSelector();
        updateBuyerSelector();
        populateCurrencySelectors(); // Populate item currency selector
        alert(`Setup saved successfully! Base currency set to ${baseCurrency}`);
    });

    document.getElementById('num-people').addEventListener('input', (event) => {
        const numPeople = parseInt(event.target.value);
        peopleNamesContainer.innerHTML = '';

        for (let i = 0; i < numPeople; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.id = `person-${i}`;
            input.placeholder = `Name of Person ${i + 1}`;
            peopleNamesContainer.appendChild(input);
        }
    });

    document.getElementById('included-people').addEventListener('change', (event) => {
        const personSelector = document.getElementById('person-selector');
        if (event.target.value === 'individual') {
            personSelector.style.display = 'block';
        } else {
            personSelector.style.display = 'none';
        }
    });

    splitTypeSelect.addEventListener('change', (event) => {
        if (event.target.value === 'custom') {
            customRatioContainer.style.display = 'block';
            updateRatioInputs();
        } else {
            customRatioContainer.style.display = 'none';
        }
    });

    document.getElementById('payment-status').addEventListener('change', function(e) {
        const buyerSection = document.getElementById('buyer-section');
        const buyerSelect = document.getElementById('item-buyer');
        
        if (e.target.value === 'paid') {
            buyerSection.style.display = 'block';
            buyerSelect.required = true;
            buyerSelect.classList.add('status-paid');
            buyerSelect.classList.remove('status-pending');
        } else {
            buyerSection.style.display = 'none';
            buyerSelect.required = false;
            buyerSelect.value = '';
            buyerSelect.classList.add('status-pending');
            buyerSelect.classList.remove('status-paid');
        }
    });

    itemForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const itemName = document.getElementById('item-name').value;
        const itemCost = parseFloat(document.getElementById('item-cost').value);
        const itemCurrency = itemCurrencySelect.value;
        const paymentStatus = document.getElementById('payment-status').value;
        const buyer = paymentStatus === 'paid' ? document.getElementById('item-buyer').value : null;
        const includedPeople = document.getElementById('included-people').value;
        const selectedPeople = Array.from(document.querySelectorAll('#specific-people input:checked')).map(input => input.value);
        const splitType = document.getElementById('split-type').value;
        
        if (itemName && !isNaN(itemCost)) {
            items.push({
                name: itemName,
                cost: itemCost,
                buyer: buyer,
                paymentStatus: paymentStatus,
                shared: includedPeople === 'everyone',
                people: includedPeople === 'everyone' ? people : selectedPeople,
                currency: itemCurrency,
                splitType: splitType,
                customRatios: splitType === 'custom' ? getCustomRatios() : null
            });
            updateItemList();
            calculateSplit();
            // Clear form fields
            document.getElementById('item-name').value = '';
            document.getElementById('item-cost').value = '';
            document.getElementById('is-shared').value = 'yes';
            
            // Uncheck all checkboxes
            document.querySelectorAll('#specific-people input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            
            personSelector.style.display = 'none';
        }
    });

    function updatePersonSelector() {
        specificPeopleContainer.innerHTML = '';
        people.forEach((person, index) => {
            const checkboxContainer = document.createElement('div');
            checkboxContainer.style.display = 'flex';
            checkboxContainer.style.alignItems = 'center';
            checkboxContainer.style.marginBottom = '5px';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `person-check-${index}`;
            checkbox.value = person;

            const label = document.createElement('label');
            label.htmlFor = `person-check-${index}`;
            label.textContent = person;
            label.style.marginLeft = '5px';

            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(label);
            specificPeopleContainer.appendChild(checkboxContainer);
        });
    }

    // Replace the updateItemList function with this updated version:

    function updateItemList() {
        itemList.innerHTML = '';
        items.forEach((item, index) => {
            const listItem = document.createElement('div');
            listItem.className = 'item-entry';
            
            const itemContent = document.createElement('div');
            itemContent.className = 'item-content';
            
            const itemText = document.createElement('span');
            const peopleInvolved = item.people.join(', ');
            const formattedCost = formatCurrency(item.cost, item.currency);
            
            // Change the display text based on payment status
            const statusText = item.paymentStatus === 'pending' ? 
                '(Pending)' : 
                `(Bought by: ${item.buyer})`;
                
            itemText.textContent = `${item.name} - ${formattedCost} ${statusText} ${item.shared ? '(Shared)' : `(For: ${peopleInvolved})`}`;
            
            const actionButtons = document.createElement('div');
            actionButtons.className = 'item-actions';
            
            const editButton = document.createElement('button');
            editButton.innerHTML = '✎';
            editButton.className = 'edit-button';
            editButton.title = 'Edit item';
            editButton.addEventListener('click', () => editItem(index));
            
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '×';
            deleteButton.className = 'delete-button';
            deleteButton.title = 'Delete item';
            deleteButton.addEventListener('click', () => confirmDelete(index));
            
            actionButtons.appendChild(editButton);
            actionButtons.appendChild(deleteButton);
            
            itemContent.appendChild(itemText);
            listItem.appendChild(itemContent);
            listItem.appendChild(actionButtons);
            itemList.appendChild(listItem);
        });
    }

    function confirmDelete(index) {
        const item = items[index];
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Confirm Deletion</h3>
                <p>Are you sure you want to delete "${item.name}"?</p>
                <div class="modal-buttons">
                    <button class="cancel-button">Cancel</button>
                    <button class="confirm-button">Delete</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.cancel-button').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.confirm-button').addEventListener('click', () => {
            items.splice(index, 1);
            modal.remove();
            updateItemList();
            calculateSplit();
        });
    }

    function editItem(index) {
        const item = items[index];
        // Store the original currency
        const originalCurrency = item.currency;
        
        // Populate form fields
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-cost').value = item.cost;
        document.getElementById('item-buyer').value = item.buyer;
        document.getElementById('is-shared').value = item.shared ? 'yes' : 'no';
        document.getElementById('split-type').value = item.splitType || 'equal';

        // Update split type related UI
        if (item.splitType === 'custom') {
            customRatioContainer.style.display = 'block';
            updateRatioInputs();
            // Restore custom ratios if they exist
            if (item.customRatios) {
                setTimeout(() => {
                    const ratioInputs = document.querySelectorAll('.ratio-input');
                    ratioInputs.forEach((input, idx) => {
                        const personName = people[idx];
                        if (item.customRatios[personName]) {
                            input.value = (item.customRatios[personName] * 100).toString();
                        }
                    });
                    updateRatioTotal();
                }, 0);
            }
        }
        
        // Show person selector and check appropriate boxes for non-shared items
        if (!item.shared) {
            personSelector.style.display = 'block';
            setTimeout(() => {
                item.people.forEach(person => {
                    const checkbox = Array.from(document.querySelectorAll('#specific-people input'))
                        .find(input => input.value === person);
                    if (checkbox) checkbox.checked = true;
                });
            }, 0);
        }
        
        // Remove the item from the array
        items.splice(index, 1);
        
        // Add event listener for form submission that preserves the original currency
        const itemForm = document.getElementById('item-form');
        const originalSubmitHandler = itemForm.onsubmit;
        
        itemForm.onsubmit = function(event) {
            event.preventDefault();
            const newItem = {
                name: document.getElementById('item-name').value,
                cost: parseFloat(document.getElementById('item-cost').value),
                buyer: document.getElementById('item-buyer').value,
                shared: document.getElementById('is-shared').value === 'yes',
                currency: originalCurrency, // Use the original currency
                splitType: document.getElementById('split-type').value,
                people: []
            };

            if (newItem.shared) {
                newItem.people = [...people];
            } else {
                newItem.people = Array.from(document.querySelectorAll('#specific-people input:checked'))
                    .map(input => input.value);
            }

            if (newItem.splitType === 'custom') {
                newItem.customRatios = {};
                const ratioInputs = document.querySelectorAll('.ratio-input');
                let total = 0;
                
                ratioInputs.forEach((input, index) => {
                    const ratio = parseFloat(input.value) || 0;
                    newItem.customRatios[people[index]] = ratio / 100;
                    total += ratio;
                });

                if (total !== 100) {
                    alert('Custom ratios must total 100%');
                    return;
                }
            }

            items.push(newItem);
            updateItemList();
            calculateSplit();
            
            // Reset form and event handler
            itemForm.reset();
            itemForm.onsubmit = originalSubmitHandler;
            personSelector.style.display = 'none';
            customRatioContainer.style.display = 'none';
        };
        
        // Focus on the name field
        document.getElementById('item-name').focus();
    }

    toggleRatesButton.addEventListener('click', () => {
        const isHidden = conversionRateElement.style.display === 'none';
        conversionRateElement.style.display = isHidden ? 'block' : 'none';
        toggleRatesButton.textContent = isHidden ? 'Hide Conversion Rates' : 'Show Conversion Rates';
        
        // Add smooth transition
        if (isHidden) {
            conversionRateElement.style.opacity = '0';
            setTimeout(() => {
                conversionRateElement.style.opacity = '1';
            }, 10);
        }
    });

    function updateConversionRates() {
        let ratesText = `Current Conversion Rates (Base: ${baseCurrency}):\n`;
        Object.entries(conversionRates).forEach(([curr, rate]) => {
            if (curr !== baseCurrency) {
                const baseRate = rate / conversionRates[baseCurrency];
                const inverseRate = conversionRates[baseCurrency] / rate;
                ratesText += `1 ${baseCurrency} = ${baseRate.toFixed(2)} ${curr}\n`;
            }
        });
        conversionRateElement.textContent = ratesText;
        conversionRateElement.style.whiteSpace = 'pre-line';
    }

    function updateRatioInputs() {
        ratioInputsContainer.innerHTML = '';
        let total = 0;

        people.forEach(person => {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'ratio-input-group';

            const label = document.createElement('label');
            label.textContent = `${person}'s share:`;

            const input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.max = '100';
            input.value = '0';
            input.className = 'ratio-input';

            input.addEventListener('input', updateRatioTotal);

            const percentSymbol = document.createElement('span');
            percentSymbol.textContent = '%';

            inputGroup.appendChild(label);
            inputGroup.appendChild(input);
            inputGroup.appendChild(percentSymbol);
            ratioInputsContainer.appendChild(inputGroup);
        });
    }

    function updateRatioTotal() {
        const inputs = document.querySelectorAll('.ratio-input');
        let total = 0;
        inputs.forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        
        document.getElementById('ratio-total').textContent = total;
        
        // Add warning if total isn't 100%
        const warningElement = document.querySelector('.ratio-warning');
        if (total !== 100) {
            if (!warningElement) {
                const warning = document.createElement('p');
                warning.className = 'ratio-warning';
                warning.textContent = 'Total must equal 100%';
                customRatioContainer.appendChild(warning);
            }
        } else if (warningElement) {
            warningElement.remove();
        }
    }

    // Replace the simplifyDebts function with this improved version:

    function simplifyDebts(payments, personalTotals) {
        const simplified = {};
        const netBalances = {};

        // Initialize data structures
        people.forEach(person => {
            simplified[person] = {};
            netBalances[person] = {};
            Object.keys(conversionRates).forEach(curr => {
                simplified[person][curr] = {};
                netBalances[person][curr] = 0;
            });
        });

        // Process each currency separately
        Object.keys(conversionRates).forEach(curr => {
            // Calculate net balances including both pending and paid amounts
            people.forEach(person => {
                // Add pending amounts (negative because they owe)
                if (personalTotals[person] && personalTotals[person][curr]) {
                    netBalances[person][curr] -= personalTotals[person][curr];
                }

                // Add paid amounts (debts and credits)
                if (payments[person] && payments[person][curr]) {
                    Object.entries(payments[person][curr]).forEach(([creditor, amount]) => {
                        netBalances[person][curr] -= amount; // Subtract what they owe
                        netBalances[creditor][curr] += amount; // Add what they're owed
                    });
                }
            });

            // Get people with non-zero balances and sort them
            const sortedPeople = people
                .filter(person => Math.abs(netBalances[person][curr]) > 0.01)
                .sort((a, b) => netBalances[a][curr] - netBalances[b][curr]);

            // Simplify debts
            while (sortedPeople.length >= 2) {
                const debtor = sortedPeople[0]; // Most negative balance (owes money)
                const creditor = sortedPeople[sortedPeople.length - 1]; // Most positive balance (is owed money)
                
                const debtorOwes = Math.abs(netBalances[debtor][curr]);
                const creditorGets = netBalances[creditor][curr];
                
                if (debtorOwes < 0.01 || creditorGets < 0.01) break;

                // Find the amount to transfer
                const transferAmount = Math.min(debtorOwes, creditorGets);
                
                if (transferAmount > 0) {
                    // Record the simplified payment
                    if (!simplified[debtor]) simplified[debtor] = {};
                    if (!simplified[debtor][curr]) simplified[debtor][curr] = {};
                    simplified[debtor][curr][creditor] = 
                        (simplified[debtor][curr][creditor] || 0) + transferAmount;

                    // Update net balances
                    netBalances[debtor][curr] += transferAmount;
                    netBalances[creditor][curr] -= transferAmount;
                }

                // Remove people with zero balances and resort the array
                const updatedPeople = sortedPeople
                    .filter(person => Math.abs(netBalances[person][curr]) > 0.01)
                    .sort((a, b) => netBalances[a][curr] - netBalances[b][curr]);
                
                // Update the sorted people array
                sortedPeople.length = 0;
                sortedPeople.push(...updatedPeople);
            }
        });

        return simplified;
    }

    // Update the toggle button text to be more descriptive
    toggleSimplifiedButton.addEventListener('click', () => {
        showSimplified = !showSimplified;
        toggleSimplifiedButton.textContent = showSimplified ? 
            'Show Original Payments' : 'Optimize Payment Routes';
        calculateSplit();
    });

    // Modify calculateSplit to include payment calculations
    function calculateSplit() {
        // Remove the const declaration since we're using the global variable
        personalTotals = {};
        payments = {};
        
        // Initialize totals and payments
        people.forEach(person => {
            personalTotals[person] = {};
            payments[person] = {};
            Object.keys(conversionRates).forEach(curr => {
                personalTotals[person][curr] = 0;
                payments[person][curr] = {};
            });
        });

        // Calculate amounts
        items.forEach(item => {
            if (item.paymentStatus === 'pending') {
                const splitCost = item.cost / (item.shared ? people.length : item.people.length);
                (item.shared ? people : item.people).forEach(person => {
                    personalTotals[person][item.currency] = 
                        (personalTotals[person][item.currency] || 0) + splitCost;
                });
            } else {
                if (item.splitType === 'custom') {
                    Object.entries(item.customRatios).forEach(([person, ratio]) => {
                        if (person !== item.buyer) {
                            payments[person][item.currency][item.buyer] = 
                                (payments[person][item.currency][item.buyer] || 0) + (item.cost * ratio);
                        }
                    });
                } else {
                    const splitCost = item.cost / (item.shared ? people.length : item.people.length);
                    (item.shared ? people : item.people).forEach(person => {
                        if (person !== item.buyer) {
                            payments[person][item.currency][item.buyer] = 
                                (payments[person][item.currency][item.buyer] || 0) + splitCost;
                        }
                    });
                }
            }
        });

        updateResults(personalTotals, payments);
    }

    // Update the updateResults function to handle simplified payments
    function updateResults(personalTotals, payments) {
        const resultsBody = document.getElementById('results-body');
        resultsBody.innerHTML = '';

        // Get simplified payments if needed
        const paymentsToShow = showSimplified ? 
            simplifyDebts(payments, personalTotals) : 
            payments;

        people.forEach(person => {
            const row = document.createElement('tr');
            const personCell = document.createElement('td');
            const amountCell = document.createElement('td');
            
            personCell.textContent = person;
            let paymentText = '';

            // Show pending amounts (these remain the same in both views)
            Object.entries(personalTotals[person] || {}).forEach(([curr, amount]) => {
                if (amount > 0) {
                    const baseAmount = convertCurrency(amount, curr, baseCurrency);
                    paymentText += `Owes ${formatCurrency(amount, curr)} (Pending)`;
                    if (curr !== baseCurrency) {
                        paymentText += ` ≈ ${formatCurrency(baseAmount, baseCurrency)}`;
                    }
                    paymentText += '\n';
                }
            });

            // Show payments based on simplified or original view
            if (paymentsToShow[person]) {
                Object.entries(paymentsToShow[person]).forEach(([curr, payees]) => {
                    Object.entries(payees).forEach(([payee, amount]) => {
                        if (amount > 0) {
                            const baseAmount = convertCurrency(amount, curr, baseCurrency);
                            paymentText += `Pay ${formatCurrency(amount, curr)} to ${payee}`;
                            if (curr !== baseCurrency) {
                                paymentText += ` ≈ ${formatCurrency(baseAmount, baseCurrency)}`;
                            }
                            paymentText += '\n';
                        }
                    });
                });
            }

            amountCell.textContent = paymentText || 'No payments needed';
            amountCell.style.whiteSpace = 'pre-line';

            row.appendChild(personCell);
            row.appendChild(amountCell);
            resultsBody.appendChild(row);
        });

        updateConversionRates();
    }

    // Helper function to count transactions
    function countTransactions(payments) {
        let count = 0;
        Object.values(payments).forEach(currencies => {
            Object.values(currencies).forEach(payees => {
                Object.values(payees).forEach(amount => {
                    if (amount > 0) count++;
                });
            });
        });
        return count;
    }

    // Add event listeners for share functionality
    shareButton.addEventListener('click', () => {
        shareModal.style.display = 'flex';
    });

    document.querySelector('.close-modal').addEventListener('click', () => {
        shareModal.style.display = 'none';
    });

    // Close modal when clicking outside
    shareModal.addEventListener('click', (e) => {
        if (e.target === shareModal) {
            shareModal.style.display = 'none';
        }
    });

    // Replace the exportPDF event listener with this updated version:

    exportPDF.addEventListener('click', () => {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Set initial y position
            let y = 20;

            // Add title
            doc.setFontSize(20);
            doc.setTextColor(255, 126, 95);
            doc.text('$plitMyChe€ks Summary', 105, y, { align: 'center' });
            y += 15;

            // Add base currency info
            doc.setFontSize(12);
            doc.setTextColor(128, 128, 128);
            doc.text(`Base Currency: ${baseCurrency}`, 20, y);
            y += 10;

            // Items Summary
            const itemsTableData = items.map(item => [
                item.name,
                formatCurrency(item.cost, item.currency),
                item.paymentStatus === 'paid' ? `Paid (${item.buyer})` : 'Pending',
                item.shared ? 'Everyone' : item.people.join(', '),
                item.currency !== baseCurrency ? 
                    `≈ ${formatCurrency(convertCurrency(item.cost, item.currency, baseCurrency), baseCurrency)}` : 
                    ''
            ]);

            doc.autoTable({
                startY: y + 10,
                head: [['Item', 'Amount', 'Status', 'Shared With', 'In Base Currency']],
                body: itemsTableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [255, 126, 95],
                    textColor: [255, 255, 255]
                }
            });

            y = doc.lastAutoTable.finalY + 20;

            // Payments Summary
            const paymentsData = [];
            people.forEach(person => {
                let paymentText = '';
                let totalInBase = 0;

                // Add pending amounts
                if (personalTotals[person]) {
                    Object.entries(personalTotals[person]).forEach(([curr, amount]) => {
                        if (amount > 0) {
                            paymentText += `Owes ${formatCurrency(amount, curr)} (Pending)\n`;
                            totalInBase += convertCurrency(amount, curr, baseCurrency);
                        }
                    });
                }

                // Add specific payments
                if (payments[person]) {
                    Object.entries(payments[person]).forEach(([curr, payees]) => {
                        Object.entries(payees).forEach(([payee, amount]) => {
                            if (amount > 0) {
                                paymentText += `Pay ${formatCurrency(amount, curr)} to ${payee}\n`;
                                totalInBase += convertCurrency(amount, curr, baseCurrency);
                            }
                        });
                    });
                }

                if (paymentText) {
                    paymentsData.push([
                        person,
                        paymentText,
                        `Total in ${baseCurrency}: ${formatCurrency(totalInBase, baseCurrency)}`
                    ]);
                }
            });

            // Add payments table
            doc.autoTable({
                startY: y + 10,
                head: [['Person', 'Payments', 'Total in Base Currency']],
                body: paymentsData,
                theme: 'grid',
                headStyles: {
                    fillColor: [255, 126, 95],
                    textColor: [255, 255, 255]
                }
            });

            // Add page numbers
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(10);
                doc.setTextColor(128, 128, 128);
                doc.text(`Page ${i} of ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
            }

            // Save the PDF
            doc.save('SplitMyChecks-Summary.pdf');
            showSuccessMessage('PDF downloaded successfully!');
            shareModal.style.display = 'none';
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Could not generate PDF: ' + error.message);
        }
    });

    // Add success message function if not already present
    function showSuccessMessage(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    // Replace the exportCSV event listener with this updated version:

    exportCSV.addEventListener('click', () => {
        try {
            let csvContent = 'Item,Cost,Currency,Base Currency Amount,Status,Buyer,Shared With\n';
            
            // Add items
            items.forEach(item => {
                const baseAmount = convertCurrency(item.cost, item.currency, baseCurrency);
                const row = [
                    item.name,
                    item.cost,
                    item.currency,
                    `${formatCurrency(baseAmount, baseCurrency)}`,
                    item.paymentStatus,
                    item.paymentStatus === 'paid' ? item.buyer : 'Pending',
                    item.shared ? 'Everyone' : item.people.join(';')
                ].join(',');
                csvContent += row + '\n';
            });
            
            // Add payments summary
            csvContent += '\nPayments Summary\n';
            csvContent += `Base Currency: ${baseCurrency}\n`;
            csvContent += 'Person,Original Amount,In Base Currency,Details\n';
            
            people.forEach(person => {
                let totalInBase = 0;
                let details = '';
                
                // Add pending amounts
                if (personalTotals[person]) {
                    Object.entries(personalTotals[person]).forEach(([curr, amount]) => {
                        if (amount > 0) {
                            const converted = convertCurrency(amount, curr, baseCurrency);
                            totalInBase += converted;
                            details += `Pending: ${formatCurrency(amount, curr)};`;
                        }
                    });
                }

                // Add specific payments
                if (payments[person]) {
                    Object.entries(payments[person]).forEach(([curr, payees]) => {
                        Object.entries(payees).forEach(([payee, amount]) => {
                            if (amount > 0) {
                                const converted = convertCurrency(amount, curr, baseCurrency);
                                totalInBase += converted;
                                details += `To ${payee}: ${formatCurrency(amount, curr)};`;
                            }
                        });
                    });
                }

                if (totalInBase > 0) {
                    csvContent += `${person},${formatCurrency(totalInBase, baseCurrency)},${details}\n`;
                }
            });
            
            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'bill-split.csv';
            link.click();
            showSuccessMessage('CSV downloaded successfully!');
            shareModal.style.display = 'none';
        } catch (error) {
            console.error('CSV Generation Error:', error);
            alert('Could not generate CSV: ' + error.message);
        }
    });

    // Populate currency selectors
    function populateCurrencySelectors() {
        // Get the currency selector
        const itemCurrencySelect = document.getElementById('item-currency');
        
        // Clear existing options
        itemCurrencySelect.innerHTML = '';
        
        // Create array of currency objects for sorting
        const currencyOptions = Object.keys(conversionRates).map(curr => ({
            symbol: curr,
            label: getCurrencyLabel(curr)
        }));

        // Sort by currency label alphabetically
        currencyOptions.sort((a, b) => a.label.localeCompare(b.label));
        
        // Add sorted currency options
        currencyOptions.forEach(({ symbol, label }) => {
            const option = document.createElement('option');
            option.value = symbol;
            option.textContent = label;
            itemCurrencySelect.appendChild(option);
        });

        // Set default value to match base currency
        itemCurrencySelect.value = baseCurrency;
    }

    // Show live conversion preview
    function updateConversionPreview() {
        const amount = parseFloat(itemCostInput.value) || 0;
        const itemCurrency = itemCurrencySelect.value;
        
        if (itemCurrency !== baseCurrency) {
            const convertedAmount = convertCurrency(amount, itemCurrency, baseCurrency);
            conversionPreview.textContent = 
                `≈ ${formatCurrency(convertedAmount, baseCurrency)} (in base currency)`;
        } else {
            conversionPreview.textContent = '';
        }
    }

    // Add event listeners for conversion preview
    itemCostInput.addEventListener('input', updateConversionPreview);
    itemCurrencySelect.addEventListener('change', updateConversionPreview);

    populateCurrencySelectors();
});

// Add the getCurrencyLabel function
function getCurrencyLabel(currencySymbol) {
    const labels = {
        'A$': 'Australian Dollar (A$)',
        'R$': 'Brazilian Real (R$)',
        'C$': 'Canadian Dollar (C$)',
        'CHF': 'Swiss Franc (CHF)',
        'HK$': 'Hong Kong Dollar (HK$)',
        'kr': 'Swedish Krona (kr)',
        'RM': 'Malaysian Ringgit (RM)',
        'S$': 'Singapore Dollar (S$)',
        '$': 'US Dollar ($)',
        '£': 'UK Pound Sterling (£)',
        '¥': 'Japanese Yen (¥)',
        '€': 'Euro (€)',
        '元': 'Chinese Yuan (元)',
        '฿': 'Thai Baht (฿)',
        '₩': 'South Korean Won (₩)',
        '₪': 'Israeli Shekel (₪)',
        '₱': 'Philippine Peso (₱)',
        '₹': 'Indian Rupee (₹)',
        '₺': 'Turkish Lira (₺)',
        '﷼': 'Saudi Riyal (﷼)',
        'zł': 'Polish Zloty (zł)'
    };
    return labels[currencySymbol] || currencySymbol;
}