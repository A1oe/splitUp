#!/usr/bin/env python3
"""
Flask web application for the splitUp debt simplification tool
"""

from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from werkzeug.utils import secure_filename
from splitUp import readDataFromUpload, simplifyDebts2, PersonNode, splitUpGroups

app = Flask(__name__)
app.secret_key = 'splitup_secret_key_change_in_production'

@app.route('/')
def home():
    """
    Home page route - displays the main upload interface

    Renders the index.html template which contains the file upload form
    and instructions for CSV format
    """
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    """
    Handles CSV file upload and processes transaction data

    This is the main processing route that:
    1. Validates uploaded file
    2. Parses CSV transaction data
    3. Simplifies debts using the core algorithm
    4. Calculates statistics and reduction percentage
    5. Renders results page with original and simplified transactions

    Returns results.html template with transaction data or redirects to home on error
    """
    if 'file' not in request.files:
        flash('No file selected')
        return redirect(url_for('home'))

    file = request.files['file']
    if file.filename == '':
        flash('No file selected')
        return redirect(url_for('home'))

    if file and file.filename.endswith('.csv'):
        try:
            # Process the uploaded file
            allGroups, original_transactions_count, original_transactions_list = readDataFromUpload(file)

            # Calculate simplified transactions
            all_people = []
            for group in allGroups:
                simplified_group = simplifyDebts2(list(group))
                all_people.extend(simplified_group)

            # Extract transaction data for template
            transactions = []
            simplified_transactions = 0

            for person in all_people:
                for creditor, amount in person.getOwersAndCreditors().items():
                    if amount < 0:  # This person owes money
                        transactions.append({
                            'debtor': person.getName(),
                            'creditor': creditor.getName(),
                            'amount': abs(amount)
                        })
                        simplified_transactions += 1

            # Calculate people details for display
            people_details = []
            for person in all_people:
                people_details.append({
                    'name': person.getName(),
                    'total': person.getTotalMoney()
                })

            # Calculate reduction percentage
            if original_transactions_count > 0:
                reduction = round(((original_transactions_count - simplified_transactions) / original_transactions_count) * 100, 1)
            else:
                reduction = 0

            return render_template('results.html',
                                 transactions=transactions,
                                 original_transactions=original_transactions_count,
                                 original_transactions_list=original_transactions_list,
                                 simplified_transactions=simplified_transactions,
                                 reduction=reduction,
                                 people_details=people_details)

        except Exception as e:
            flash(f'Error processing file: {str(e)}')
            return redirect(url_for('home'))
    else:
        flash('Please upload a CSV file')
        return redirect(url_for('home'))

@app.route('/process_manual', methods=['POST'])
def process_manual():
    """
    Processes manually entered transactions from the manual input form
    
    Receives JSON data containing a list of transactions, creates PersonNode objects,
    simplifies debts using the core algorithm, and returns results similar to file upload
    """
    try:
        data = request.get_json()
        transactions_data = data.get('transactions', [])
        
        if not transactions_data:
            return jsonify({'error': 'No transactions provided'}), 400
            
        # Create PersonNode objects from manual input
        people = {}
        original_transactions = []
        
        for transaction in transactions_data:
            payer = transaction['payer'].strip()
            debtor = transaction['debtor'].strip()
            amount = float(transaction['amount'])
            
            # Store original transaction for display
            original_transactions.append({
                'payer': payer,
                'debtor': debtor,
                'amount': amount
            })
            
            # Create PersonNodes for each person
            if payer not in people:
                people[payer] = PersonNode(payer)
            if debtor not in people:
                people[debtor] = PersonNode(debtor)
                
            people[payer].addDebt(people[debtor], amount)
        
        # Process the transactions using existing logic
        allGroups = splitUpGroups(list(people.values()))
        original_transactions_count = len(transactions_data)
        
        # Calculate simplified transactions
        all_people = []
        for group in allGroups:
            simplified_group = simplifyDebts2(list(group))
            all_people.extend(simplified_group)

        # Extract transaction data for template
        transactions = []
        simplified_transactions = 0

        for person in all_people:
            for creditor, amount in person.getOwersAndCreditors().items():
                if amount < 0:  # This person owes money
                    transactions.append({
                        'debtor': person.getName(),
                        'creditor': creditor.getName(),
                        'amount': abs(amount)
                    })
                    simplified_transactions += 1

        # Calculate people details for display
        people_details = []
        for person in all_people:
            people_details.append({
                'name': person.getName(),
                'total': person.getTotalMoney()
            })

        # Calculate reduction percentage
        if original_transactions_count > 0:
            reduction = round(((original_transactions_count - simplified_transactions) / original_transactions_count) * 100, 1)
        else:
            reduction = 0

        return render_template('results.html',
                             transactions=transactions,
                             original_transactions=original_transactions_count,
                             original_transactions_list=original_transactions,
                             simplified_transactions=simplified_transactions,
                             reduction=reduction,
                             people_details=people_details)

    except Exception as e:
        return jsonify({'error': f'Error processing transactions: {str(e)}'}), 500

if __name__ == '__main__':
    """
    Application entry point - starts the Flask web server
    """
    app.run(debug=True, host='127.0.0.1', port=5000)