// Currency conversion rates and utility functions
const conversionRates = {
    '$': 1.00,    // USD (base currency)
    '€': 0.92,    // EUR
    '£': 0.79,    // GBP
    '₹': 83.12,   // INR
    'zł': 4.00,   // PLN
    'RM': 4.72,   // MYR
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

export const currencies = {
    '$': { name: 'US Dollar', code: 'USD', symbol: '$', rate: 1.00 },
    '€': { name: 'Euro', code: 'EUR', symbol: '€', rate: 0.92 },
    '£': { name: 'British Pound', code: 'GBP', symbol: '£', rate: 0.79 },
    '¥': { name: 'Japanese Yen', code: 'JPY', symbol: '¥', rate: 151.50 },
    '₹': { name: 'Indian Rupee', code: 'INR', symbol: '₹', rate: 83.12 },
    'A$': { name: 'Australian Dollar', code: 'AUD', symbol: 'A$', rate: 1.53 },
    'C$': { name: 'Canadian Dollar', code: 'CAD', symbol: 'C$', rate: 1.36 },
    'CHF': { name: 'Swiss Franc', code: 'CHF', symbol: 'CHF', rate: 0.91 },
    '元': { name: 'Chinese Yuan', code: 'CNY', symbol: '元', rate: 7.23 },
    '₩': { name: 'Korean Won', code: 'KRW', symbol: '₩', rate: 1348.76 },
    'kr': { name: 'Swedish Krona', code: 'SEK', symbol: 'kr', rate: 10.57 },
    '₪': { name: 'Israeli Shekel', code: 'ILS', symbol: '₪', rate: 3.71 },
    'S$': { name: 'Singapore Dollar', code: 'SGD', symbol: 'S$', rate: 1.35 },
    '฿': { name: 'Thai Baht', code: 'THB', symbol: '฿', rate: 36.45 },
    'R$': { name: 'Brazilian Real', code: 'BRL', symbol: 'R$', rate: 5.03 },
    '₱': { name: 'Philippine Peso', code: 'PHP', symbol: '₱', rate: 56.50 },
    'zł': { name: 'Polish Złoty', code: 'PLN', symbol: 'zł', rate: 4.00 },
    'RM': { name: 'Malaysian Ringgit', code: 'MYR', symbol: 'RM', rate: 4.72 },
    '﷼': { name: 'Saudi Riyal', code: 'SAR', symbol: '﷼', rate: 3.75 },
    'HK$': { name: 'Hong Kong Dollar', code: 'HKD', symbol: 'HK$', rate: 7.83 },
    '₺': { name: 'Turkish Lira', code: 'TRY', symbol: '₺', rate: 32.15 }
};

function formatCurrency(amount, currency) {
    const postSymbolCurrencies = ['zł', '元', '﷼', 'kr'];
    const formattedAmount = amount.toFixed(2);
    return postSymbolCurrencies.includes(currency) 
        ? `${formattedAmount} ${currency}`
        : `${currency}${formattedAmount}`;
}

function convertCurrency(amount, fromCurrency, toCurrency) {
    const fromRate = conversionRates[fromCurrency] || 1;
    const toRate = conversionRates[toCurrency] || 1;
    return (amount / fromRate) * toRate;
}

function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggle(savedTheme);

    // Add theme toggle listener
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeToggle(newTheme);
        });
    }
}

function updateThemeToggle(theme) {
    const themeToggleText = document.querySelector('.theme-toggle-text');
    if (themeToggleText) {
        themeToggleText.textContent = theme === 'light' ? '🌙' : '☀️';
    }
}

export function populateCurrencySelect(selectElement) {
    // Create array of currency objects with symbol and full name
    const currencyOptions = Object.entries(currencies).map(([symbol, data]) => ({
        symbol,
        fullName: `${data.name} (${symbol})`
    }));

    // Sort by currency name
    currencyOptions.sort((a, b) => a.fullName.localeCompare(b.fullName));

    // Generate HTML
    const optionsHTML = `
        <option value="">Select Currency</option>
        ${currencyOptions.map(curr => `
            <option value="${curr.symbol}">${curr.fullName}</option>
        `).join('')}
    `;

    selectElement.innerHTML = optionsHTML;
}

export function selectActivity(activityId) {
    const activities = JSON.parse(localStorage.getItem('activities')) || [];
    const activity = activities.find(a => a.id === Number(activityId));
    
    if (!activity) {
        showError('Activity not found');
        return null;
    }
    
    return activity;
}

export function getCurrentActivity() {
    const urlParams = new URLSearchParams(window.location.search);
    const activityId = urlParams.get('activity');
    
    if (!activityId) {
        return null;
    }
    
    return selectActivity(activityId);
}

// Export utilities
export {
    conversionRates,
    formatCurrency,
    convertCurrency,
    showSuccessMessage,
    initializeTheme,
    updateThemeToggle
};