// Mock data for initial UI testing
const CATEGORIES = ["Food", "Transport", "Entertainment", "Shopping", "Bills"];

let expenses = [
    { id: 1, amount: 12.5, category: "Food", date: "2025-09-09", description: "Lunch" },
    { id: 2, amount: 30, category: "Transport", date: "2025-09-08", description: "Taxi" },
    { id: 3, amount: 50, category: "Entertainment", date: "2025-09-07", description: "Movie night" },
    { id: 4, amount: 100, category: "Shopping", date: "2025-09-06", description: "Clothes" },
    { id: 5, amount: 75, category: "Bills", date: "2025-09-05", description: "Electricity bill" }
];

let filterStart = '';
let filterEnd = '';
let searchDesc = '';

function renderCategories() {
    const select = document.getElementById('category');
    select.innerHTML = '';
    CATEGORIES.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
    });
}

let editMode = false;
let editId = null;

function renderExpenses() {
    const list = document.getElementById('expense-list');
    list.innerHTML = '';
    let filtered = expenses;
    if (filterStart) {
        filtered = filtered.filter(e => e.date >= filterStart);
    }
    if (filterEnd) {
        filtered = filtered.filter(e => e.date <= filterEnd);
    }
    if (searchDesc) {
        filtered = filtered.filter(e => e.description.toLowerCase().includes(searchDesc.toLowerCase()));
    }
    filtered.forEach(exp => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="expense-info">$${exp.amount.toFixed(2)} - ${exp.category} - ${exp.date} - ${exp.description}</span>
            <span class="expense-actions">
                <button class="edit-btn" onclick="startEditExpense(${exp.id})">Edit</button>
                <button class="delete-btn" onclick="deleteExpense(${exp.id})">Delete</button>
            </span>
        `;
        list.appendChild(li);
    });
    renderTotal(filtered);
    renderBreakdown(filtered);
}

function renderTotal(filteredList) {
    // If filteredList is provided, show total for filtered, else for current month
    let total = 0;
    if (filteredList) {
        total = filteredList.reduce((sum, e) => sum + e.amount, 0);
    } else {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        total = expenses.filter(e => {
            const d = new Date(e.date);
            return d.getMonth() + 1 === month && d.getFullYear() === year;
        }).reduce((sum, e) => sum + e.amount, 0);
    }
    document.getElementById('total-month').textContent = total.toFixed(2);
}

function renderBreakdown(filteredList) {
    // If filteredList is provided, use it, else use current month
    let list = filteredList || expenses.filter(e => {
        const now = new Date();
        const d = new Date(e.date);
        return d.getMonth() + 1 === now.getMonth() + 1 && d.getFullYear() === now.getFullYear();
    });
    const breakdown = {};
    CATEGORIES.forEach(cat => breakdown[cat] = 0);
    list.forEach(e => {
        breakdown[e.category] += e.amount;
    });
    const ctx = document.getElementById('breakdown-chart').getContext('2d');
    if (window.breakdownChart) window.breakdownChart.destroy();
    window.breakdownChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: CATEGORIES,
            datasets: [{
                label: 'Spending by Category',
                data: CATEGORIES.map(cat => breakdown[cat]),
                backgroundColor: '#007bff',
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}
// Filtering and search handlers
document.getElementById('filter-btn').addEventListener('click', function() {
    filterStart = document.getElementById('filter-start').value;
    filterEnd = document.getElementById('filter-end').value;
    searchDesc = document.getElementById('search-desc').value.trim();
    renderExpenses();
});

document.getElementById('clear-filter-btn').addEventListener('click', function() {
    filterStart = '';
    filterEnd = '';
    searchDesc = '';
    document.getElementById('filter-start').value = '';
    document.getElementById('filter-end').value = '';
    document.getElementById('search-desc').value = '';
    renderExpenses();
});

// CSV Export
document.getElementById('export-csv-btn').addEventListener('click', function() {
    let filtered = expenses;
    if (filterStart) filtered = filtered.filter(e => e.date >= filterStart);
    if (filterEnd) filtered = filtered.filter(e => e.date <= filterEnd);
    if (searchDesc) filtered = filtered.filter(e => e.description.toLowerCase().includes(searchDesc.toLowerCase()));
    const csvRows = [
        'ID,Amount,Category,Date,Description',
        ...filtered.map(e => `${e.id},${e.amount},${e.category},${e.date},"${e.description.replace(/"/g, '""')}"`)
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

function showError(msg) {
    const err = document.getElementById('error');
    err.textContent = msg;
    err.style.display = 'block';
    setTimeout(() => err.style.display = 'none', 2500);
}

document.getElementById('expense-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value.trim();
    if (isNaN(amount) || amount <= 0) {
        showError('Amount must be positive.');
        return;
    }
    if (!category || !date || !description) {
        showError('All fields are required.');
        return;
    }
    if (editMode && editId !== null) {
        // Update existing expense
        const idx = expenses.findIndex(e => e.id === editId);
        if (idx !== -1) {
            expenses[idx] = { ...expenses[idx], amount, category, date, description };
        }
        editMode = false;
        editId = null;
        document.getElementById('submit-btn').textContent = 'Add Expense';
    } else {
        // Add new expense
        const newExpense = {
            id: expenses.length ? Math.max(...expenses.map(e => e.id)) + 1 : 1,
            amount, category, date, description
        };
        expenses.push(newExpense);
    }
    renderExpenses();
    this.reset();
    document.getElementById('date').value = new Date().toISOString().slice(0,10);
});

function startEditExpense(id) {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;
    document.getElementById('amount').value = exp.amount;
    document.getElementById('category').value = exp.category;
    document.getElementById('date').value = exp.date;
    document.getElementById('description').value = exp.description;
    editMode = true;
    editId = id;
    document.getElementById('submit-btn').textContent = 'Update Expense';
}

function deleteExpense(id) {
    expenses = expenses.filter(e => e.id !== id);
    renderExpenses();
}

function setDefaultDate() {
    document.getElementById('date').value = new Date().toISOString().slice(0,10);
}

// Initial render
renderCategories();
setDefaultDate();
renderExpenses();
