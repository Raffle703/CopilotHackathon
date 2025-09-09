// Mock data for initial UI testing
const CATEGORIES = ["Food", "Transport", "Entertainment", "Shopping", "Bills"];
let expenses = [
    { id: 1, amount: 12.5, category: "Food", date: "2025-09-09", description: "Lunch" },
    { id: 2, amount: 30, category: "Transport", date: "2025-09-08", description: "Taxi" },
    { id: 3, amount: 50, category: "Shopping", date: "2025-09-01", description: "Groceries" }
];

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

function renderExpenses() {
    const list = document.getElementById('expense-list');
    list.innerHTML = '';
    expenses.forEach(exp => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>$${exp.amount.toFixed(2)} - ${exp.category} - ${exp.date} - ${exp.description}</span>
            <button class="delete-btn" onclick="deleteExpense(${exp.id})">Delete</button>
        `;
        list.appendChild(li);
    });
    renderTotal();
    renderBreakdown();
}

function renderTotal() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const total = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
    }).reduce((sum, e) => sum + e.amount, 0);
    document.getElementById('total-month').textContent = total.toFixed(2);
}

function renderBreakdown() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const breakdown = {};
    CATEGORIES.forEach(cat => breakdown[cat] = 0);
    expenses.forEach(e => {
        const d = new Date(e.date);
        if (d.getMonth() + 1 === month && d.getFullYear() === year) {
            breakdown[e.category] += e.amount;
        }
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
    const newExpense = {
        id: expenses.length ? Math.max(...expenses.map(e => e.id)) + 1 : 1,
        amount, category, date, description
    };
    expenses.push(newExpense);
    renderExpenses();
    this.reset();
    document.getElementById('date').value = new Date().toISOString().slice(0,10);
});

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
