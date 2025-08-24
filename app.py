#!/usr/bin/env python3
"""
Flask web application for the splitUp debt simplification tool
"""

import csv
from collections import namedtuple
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, make_response
import io
from werkzeug.utils import secure_filename
from splitUp import readDataFromUpload, simplifyDebts2, PersonNode, splitUpGroups, Transaction

def serializeNamedtupleList(namedtupleList):
    """Convert a list of named tuples to a list of dictionaries for JSON serialization"""
    return [item._asdict() if hasattr(item, '_asdict') else item for item in namedtupleList]

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
def uploadFile():
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
            allGroups, originalTransactionsList = readDataFromUpload(file)
            transactionCount = len(originalTransactionsList)

            # Calculate simplified transactions
            allPeople = []
            for group in allGroups:
                simplified_group = simplifyDebts2(list(group))
                allPeople.extend(simplified_group)

            # Extract transaction data for template
            transactions = []
            simplifiedTransactions = 0

            for person in allPeople:
                for creditor, amount in person.getOwersAndCreditors().items():
                    if amount < 0:  # This person owes money
                        transactions.append(Transaction(
                            debtor=person.getName(),
                            creditor=creditor.getName(),
                            amount=abs(amount)
                        ))
                        simplifiedTransactions += 1

            # Calculate people details for display
            peopleDetails = []
            for person in allPeople:
                peopleDetails.append({
                    'name': person.getName(),
                    'total': person.getTotalMoney()
                })

            # Calculate reduction percentage
            if transactionCount > 0:
                reduction = round(((transactionCount - simplifiedTransactions) / transactionCount) * 100, 1)
            else:
                reduction = 0

            return render_template('results.html',
                                 transactions=serializeNamedtupleList(transactions),
                                 original_transactions=transactionCount,
                                 original_transactions_list=serializeNamedtupleList(originalTransactionsList),
                                 simplified_transactions=simplifiedTransactions,
                                 reduction=reduction,
                                 people_details=peopleDetails)

        except Exception as e:
            flash(f'Error processing file: {str(e)}')
            return redirect(url_for('home'))
    else:
        flash('Please upload a CSV file')
        return redirect(url_for('home'))

@app.route('/process_manual', methods=['POST'])
def processManual():
    """
    Processes manually entered transactions from the manual input form

    Receives JSON data containing a list of transactions, creates PersonNode objects,
    simplifies debts using the core algorithm, and returns results similar to file upload
    """
    try:
        data = request.get_json()
        transactionsData = data.get('transactions', [])

        if not transactionsData:
            return jsonify({'error': 'No transactions provided'}), 400

        # Create PersonNode objects from manual input
        people = {}
        originalTransactions = []

        for transaction in transactionsData:
            payer = transaction['payer'].strip()
            debtor = transaction['debtor'].strip()
            amount = float(transaction['amount'])

            # Store original transaction for display
            originalTransactions.append(Transaction(
                debtor=debtor,
                creditor=payer,
                amount=amount
            ))

            # Create PersonNodes for each person
            if payer not in people:
                people[payer] = PersonNode(payer)
            if debtor not in people:
                people[debtor] = PersonNode(debtor)

            people[payer].addDebt(people[debtor], amount)

        # Process the transactions using existing logic
        allGroups = splitUpGroups(list(people.values()))
        transactionCount = len(transactionsData)

        # Calculate simplified transactions
        allPeople = []
        for group in allGroups:
            simplified_group = simplifyDebts2(list(group))
            allPeople.extend(simplified_group)

        # Extract transaction data for template
        transactions = []
        simplifiedTransactions = 0

        for person in allPeople:
            for creditor, amount in person.getOwersAndCreditors().items():
                if amount < 0:  # This person owes money
                    transactions.append(Transaction(
                        debtor=person.getName(),
                        creditor=creditor.getName(),
                        amount=abs(amount)
                    ))
                    simplifiedTransactions += 1

        # Calculate people details for display
        peopleDetails = []
        for person in allPeople:
            peopleDetails.append({
                'name': person.getName(),
                'total': person.getTotalMoney()
            })

        # Calculate reduction percentage
        if transactionCount > 0:
            reduction = round(((transactionCount - simplifiedTransactions) / transactionCount) * 100, 1)
        else:
            reduction = 0

        return render_template('results.html',
                             transactions=serializeNamedtupleList(transactions),
                             original_transactions=transactionCount,
                             original_transactions_list=serializeNamedtupleList(originalTransactions),
                             simplified_transactions=simplifiedTransactions,
                             reduction=reduction,
                             people_details=peopleDetails)

    except Exception as e:
        return jsonify({'error': f'Error processing transactions: {str(e)}'}), 500

@app.route('/export_csv', methods=['POST'])
def exportCsv():
    """
    Handles CSV export of combined transactions

    Receives JSON data containing transactions and generates a downloadable CSV file
    with the same format as input CSV files: payer,debtor,amount (no header)
    """
    try:
        data = request.get_json()
        transactionsData = data.get('transactions', [])

        if not transactionsData:
            return jsonify({'error': 'No transactions to export'}), 400

        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)

        # Write transaction data (no header, same format as input)
        for transaction in transactionsData:
            # Handle both dictionary and named tuple formats for backward compatibility
            if hasattr(transaction, '_asdict'):
                # Named tuple - convert back to payer,debtor,amount format for CSV
                writer.writerow([
                    getattr(transaction, 'creditor', ''),  # creditor is the payer
                    getattr(transaction, 'debtor', ''),
                    getattr(transaction, 'amount', 0)
                ])
            else:
                # Dictionary (backward compatibility)
                writer.writerow([
                    transaction.get('payer', ''),
                    transaction.get('debtor', ''),
                    transaction.get('amount', 0)
                ])

        # Create response with CSV data
        csvContent = output.getvalue()
        output.close()

        response = make_response(csvContent)
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = 'attachment; filename=combined_transactions.csv'

        return response

    except Exception as e:
        return jsonify({'error': f'Error exporting CSV: {str(e)}'}), 500

if __name__ == '__main__':
    """
    Application entry point - starts the Flask web server
    """
    app.run(debug=True, host='127.0.0.1', port=5000)