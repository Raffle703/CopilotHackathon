from flask import Flask, request, jsonify
from datetime import datetime
from collections import defaultdict

app = Flask(__name__)

# In-memory storage
expenses = []
next_id = 1
CATEGORIES = ["Food", "Transport", "Entertainment", "Shopping", "Bills"]

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
    expense = {
        "id": next_id,
        "amount": amount,
        "category": data["category"],
        "date": data["date"],
        "description": data["description"]
    }
    expenses.append(expense)
    next_id += 1
    return jsonify(expense), 201

@app.route("/expenses", methods=["GET"])
def list_expenses():
    return jsonify(expenses)

@app.route("/expenses/<int:expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    global expenses
    before = len(expenses)
    expenses = [e for e in expenses if e["id"] != expense_id]
    if len(expenses) == before:
        return jsonify({"error": "Expense not found"}), 404
    return '', 204

@app.route("/expenses/total", methods=["GET"])
def total_monthly():
    total = sum(e["amount"] for e in expenses if is_current_month(e["date"]))
    return jsonify({"total": total})

@app.route("/expenses/breakdown", methods=["GET"])
def breakdown():
    breakdown = defaultdict(float)
    for e in expenses:
        if is_current_month(e["date"]):
            breakdown[e["category"]] += e["amount"]
    return jsonify(breakdown)

@app.route("/categories", methods=["GET"])
def get_categories():
    return jsonify(CATEGORIES)

if __name__ == "__main__":
    app.run(debug=True)
