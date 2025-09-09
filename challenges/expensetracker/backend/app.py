from flask import Flask, request, jsonify
from datetime import datetime
from collections import defaultdict

app = Flask(__name__)

# In-memory storage
expenses = []
next_id = 1
CATEGORIES = ["Food", "Transport", "Entertainment", "Shopping", "Bills"]
# Budget limits per category (e.g., {"Food": 200.0})
budgets = {}
# Recurring expenses (same structure as expenses, but with 'recurring': True)
recurring_expenses = []

# Helper to get current month/year
def is_current_month(date_str):
    try:
        date = datetime.strptime(date_str, "%Y-%m-%d")
        now = datetime.now()
        return date.year == now.year and date.month == now.month
    except Exception:
        return False

@app.route("/")
def home():
    return "Expense Tracker API is running!"

@app.route("/expenses", methods=["POST"])
def add_expense():
    global next_id
    data = request.json
    required = ["amount", "category", "date", "description"]
    if not all(k in data for k in required):
        return jsonify({"error": "Missing fields"}), 400
    if data["category"] not in CATEGORIES:
        return jsonify({"error": "Invalid category"}), 400
    try:
        amount = float(data["amount"])
        if amount <= 0:
            return jsonify({"error": "Amount must be positive"}), 400
    except Exception:
        return jsonify({"error": "Invalid amount"}), 400
    # New fields: tags (list), receipt_note (str), recurring (bool)
    expense = {
        "id": next_id,
        "amount": amount,
        "category": data["category"],
        "date": data["date"],
        "description": data["description"],
        "tags": data.get("tags", []),
        "receipt_note": data.get("receipt_note", ""),
        "recurring": data.get("recurring", False)
    }
    if expense["recurring"]:
        recurring_expenses.append(expense.copy())
    expenses.append(expense)
    next_id += 1
    # Budget warning
    warning = None
    cat = expense["category"]
    if cat in budgets:
        spent = sum(e["amount"] for e in expenses if e["category"] == cat and is_current_month(e["date"]))
        if spent > budgets[cat]:
            warning = f"Warning: {cat} spending exceeds budget limit!"
    resp = expense.copy()
    if warning:
        resp["warning"] = warning
    return jsonify(resp), 201

@app.route("/expenses", methods=["GET"])
def list_expenses():
    # Include recurring expenses for current month
    now = datetime.now()
    recs = [e.copy() for e in recurring_expenses if is_current_month(f"{now.year}-{now.month:02d}-01")]
    all_exp = expenses + recs
    return jsonify(all_exp)

@app.route("/expenses/<int:expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    global expenses, recurring_expenses
    before = len(expenses)
    expenses = [e for e in expenses if e["id"] != expense_id]
    recurring_expenses = [e for e in recurring_expenses if e["id"] != expense_id]
    if len(expenses) == before:
        return jsonify({"error": "Expense not found"}), 404
    return '', 204

@app.route("/expenses/total", methods=["GET"])
def total_monthly():
    # Include recurring expenses
    now = datetime.now()
    recs = [e for e in recurring_expenses if is_current_month(f"{now.year}-{now.month:02d}-01")]
    total = sum(e["amount"] for e in expenses if is_current_month(e["date"]))
    total += sum(e["amount"] for e in recs)
    return jsonify({"total": total})

@app.route("/expenses/breakdown", methods=["GET"])
def breakdown():
    breakdown = defaultdict(float)
    now = datetime.now()
    recs = [e for e in recurring_expenses if is_current_month(f"{now.year}-{now.month:02d}-01")]
    for e in expenses + recs:
        if is_current_month(e["date"]):
            breakdown[e["category"]] += e["amount"]
    return jsonify(dict(breakdown))
@app.route("/expenses/<int:expense_id>", methods=["PUT"])
def edit_expense(expense_id):
    data = request.json
    for e in expenses:
        if e["id"] == expense_id:
            for field in ["amount", "category", "date", "description", "tags", "receipt_note", "recurring"]:
                if field in data:
                    e[field] = data[field]
            return jsonify(e)
    return jsonify({"error": "Expense not found"}), 404

# Date filtering
@app.route("/expenses/filter", methods=["GET"])
def filter_expenses():
    start = request.args.get("start")
    end = request.args.get("end")
    try:
        start_dt = datetime.strptime(start, "%Y-%m-%d") if start else None
        end_dt = datetime.strptime(end, "%Y-%m-%d") if end else None
    except Exception:
        return jsonify({"error": "Invalid date format"}), 400
    filtered = []
    for e in expenses:
        dt = datetime.strptime(e["date"], "%Y-%m-%d")
        if (not start_dt or dt >= start_dt) and (not end_dt or dt <= end_dt):
            filtered.append(e)
    return jsonify(filtered)

# Search by description
@app.route("/expenses/search", methods=["GET"])
def search_expenses():
    keyword = request.args.get("keyword", "").lower()
    results = [e for e in expenses if keyword in e["description"].lower()]
    return jsonify(results)

# Export as CSV
import csv
from io import StringIO
@app.route("/expenses/export", methods=["GET"])
def export_expenses():
    si = StringIO()
    fieldnames = ["id", "amount", "category", "date", "description", "tags", "receipt_note", "recurring"]
    writer = csv.DictWriter(si, fieldnames=fieldnames)
    writer.writeheader()
    for e in expenses:
        row = e.copy()
        row["tags"] = ",".join(row.get("tags", []))
        writer.writerow(row)
    output = si.getvalue()
    return (output, 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="expenses.csv"'
    })

# Budget endpoints
@app.route("/budgets", methods=["GET"])
def get_budgets():
    return jsonify(budgets)

@app.route("/budgets", methods=["POST"])
def set_budget():
    data = request.json
    category = data.get("category")
    limit = data.get("limit")
    if category not in CATEGORIES:
        return jsonify({"error": "Invalid category"}), 400
    try:
        limit = float(limit)
        if limit <= 0:
            return jsonify({"error": "Limit must be positive"}), 400
    except Exception:
        return jsonify({"error": "Invalid limit"}), 400
    budgets[category] = limit
    return jsonify({"category": category, "limit": limit})

# Tag filtering
@app.route("/expenses/tags", methods=["GET"])
def filter_by_tag():
    tag = request.args.get("tag", "").lower()
    results = [e for e in expenses if tag in [t.lower() for t in e.get("tags", [])]]
    return jsonify(results)

@app.route("/categories", methods=["GET"])
def get_categories():
    return jsonify(CATEGORIES)

if __name__ == "__main__":
    app.run(debug=True)
