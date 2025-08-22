import csv
import itertools
import glob
import json
import io

from itertools import *
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = 'splitup_secret_key_change_in_production'
# TODO: Add currency converter functionality later


class PersonNode():
    """
    Represents a person and their transactions.
    """
    def __init__(self, name):
        self.__name = name
        self.__owedAndCredited = {}

    def __str__(self):
        """
        What prints when you run print(PersonNode)
        Returns string representation showing name, total money, and transaction details
        """
        return self.__name + self.getTotalMoney() + str(self.__owedAndCredited)

    def __repr__(self):
        """
        The representation of the obj (e.g. print(list[PersonNode]))
        Returns just the person's name for clean list display
        """
        return self.__name

    def getName(self):
        """
        Returns the person's name
        """
        return self.__name

    def getOwersAndCreditors(self):
        """
        Returns dictionary of all people this person has transactions with
        Positive values = money owed TO this person
        Negative values = money this person owes TO others
        """
        return self.__owedAndCredited

    def getTotalMoney(self):
        """
        Calculates net balance for this person
        Positive = person should receive money overall
        Negative = person owes money overall
        Zero = person is balanced
        """
        return sum(self.__owedAndCredited.values())

    def clearDebts(self):
        """
        Clears all debts/credits for this person
        Also removes this person from other people's transaction records
        """
        for p in self.__owedAndCredited:
            p.removeTransaction(self)

        self.__owedAndCredited = {}

    def removeTransaction(self, person):
        """
        Removes a specific person from this person's transaction records
        Used when clearing debts or simplifying transactions
        """
        self.__owedAndCredited.pop(person)

    def addDebt(self, debtor, amount, newTransaction=True):
        """
        Add a debt that debtor owes to this person

        @param debtor: PersonNode
        @param amount: float. The amount debtor owes to self.name
        """
        if debtor in self.__owedAndCredited:
            self.__owedAndCredited[debtor] += amount
        else:
            self.__owedAndCredited[debtor] = amount

        if newTransaction:
            debtor.addCredit(self, amount, False)

    def addCredit(self, creditor, amount, newTransaction=True):
        """
        Add a credit that creditor gave to this person
        Records that this person owes money to the creditor

        @param creditor: PersonNode who gave money to this person
        @param amount: float. The amount this person owes to creditor
        @param newTransaction: bool. If True, also updates creditor's records
        """
        if creditor in self.__owedAndCredited:
            self.__owedAndCredited[creditor] -= amount
        else:
            self.__owedAndCredited[creditor] = amount * -1

        if newTransaction:
            creditor.addDebt(self, amount, False)

def readData(file):
    """
    Reads transaction data from a CSV file and creates PersonNode objects
    
    @param file: str. Path to csv file
    @return: list[set{personNode}]. A list of sets of personNodes from the csv.
                                    These are split up based on who has
                                    transactions with who.
    
    CSV format expected: payer,debtor,amount (one transaction per line)
    Creates PersonNode objects for each person and tracks their debts/credits
    Groups people who have transactions with each other into separate sets
    """
    people = {}
    with open(file, newline='') as csvfile:
        spamreader = csv.reader(csvfile, delimiter=' ', quotechar='|')
        numTransactions = 0
        for item in spamreader:
            line = item[0].split(",")
            payer = line[0]
            debtor = line[1]
            amount = float(line[2])

            # make PersonNodes for each person
            if not (payer in people):
                people[payer] = PersonNode(payer)
            if not (debtor in people):
                people[debtor] = PersonNode(debtor)

            numTransactions += 1
            people[payer].addDebt(people[debtor], amount)

    allGroups = splitUpGroups(list(people.values()))
    print("Original Transaction Number: {0} ".format(numTransactions))
    return allGroups

def readDataFromUpload(file_stream):
    """
    Reads transaction data from an uploaded file stream for web interface
    
    @param file_stream: file-like object from Flask file upload
    @return: tuple (allGroups, numTransactions, original_transactions_list)
    
    Similar to readData() but works with uploaded files instead of file paths
    Also returns the original transactions list for display in web interface
    Decodes file content and processes CSV data to create PersonNode objects
    """
    people = {}
    original_transactions = []
    file_stream.seek(0)
    content = file_stream.read().decode('utf-8')
    csv_file = io.StringIO(content)
    spamreader = csv.reader(csv_file, delimiter=' ', quotechar='|')
    numTransactions = 0
    
    for item in spamreader:
        line = item[0].split(",")
        payer = line[0]
        debtor = line[1]
        amount = float(line[2])

        # Store original transaction for display
        original_transactions.append({
            'payer': payer,
            'debtor': debtor,
            'amount': amount
        })

        # make PersonNodes for each person
        if not (payer in people):
            people[payer] = PersonNode(payer)
        if not (debtor in people):
            people[debtor] = PersonNode(debtor)

        numTransactions += 1
        people[payer].addDebt(people[debtor], amount)

    allGroups = splitUpGroups(list(people.values()))
    return allGroups, numTransactions, original_transactions

def splitUpGroups(people):
    """
    Groups people who have transactions with each other into separate sets
    
    Uses breadth-first search to find all connected people (people who have
    direct or indirect transactions with each other). This allows processing
    separate groups of people independently.
    
    @param people: list of PersonNode objects
    @return: list of sets, each set contains people who are connected by transactions
    """
    allGroups = []
    unrelatedPeeps = people

    while unrelatedPeeps != []:
        curGroup = {unrelatedPeeps[0]}
        groupSplitHelper(unrelatedPeeps[0], curGroup)
        unrelatedPeeps = [p for p in unrelatedPeeps if p not in curGroup]
        allGroups.append(curGroup)

    return allGroups

def groupSplitHelper(person, curGroup):
    """
    Recursive helper function for breadth-first search in splitUpGroups
    
    Finds all people connected to the given person and adds them to the current group
    Recursively explores connections to build complete transaction groups
    
    @param person: PersonNode to explore connections for
    @param curGroup: set of PersonNodes in current group (modified in place)
    """
    tempRelatedPeeps = person.getOwersAndCreditors().keys()
    newRelatedPeeps = [p for p in tempRelatedPeeps if p not in curGroup]
    curGroup.update(newRelatedPeeps)

    for p in newRelatedPeeps:
        groupSplitHelper(p, curGroup)

def prettyPrintAllPeople(people):
    """
    Prints detailed information about each person's transactions (console output)
    
    Displays each person's name, total money balance, and detailed breakdown
    of who they owe money to or who owes them money. Used for debugging
    and console-based output.
    
    @param people: list of PersonNode objects
    """
    if people == []:
        print("\nNo transactions necessary. " +
              "Everyone paid an equal amount for each other.\n")

    for person in people:
        print(person.getName())
        print("Total Money: {0}".format(person.getTotalMoney()))
        oweStr = ""
        for peep in person.getOwersAndCreditors().items():
            p = peep[0].getName()
            owe = peep[1]
            oweStr = oweStr + " " + p + " " + str(owe)
        print("owers:" + oweStr + "\n")

def printTransactions(people):
    """
    Prints the final simplified transactions that need to be made (console output)
    
    Goes through all people and prints only the transactions where someone
    owes money (negative balances). Also counts and displays the total
    number of transactions needed.
    
    @param people: list of PersonNode objects with simplified transactions
    """
    numTransactions = 0
    if people == []:
        print("\nNo transactions necessary. " +
              "Everyone paid an equal amount for each other.\n")

    for p in people:
        for peep in p.getOwersAndCreditors().items():
            if peep[1] < 0:
                numTransactions += 1

                print("{0} must pay {1} to {2}".format(p.getName(),
                                                       peep[1] * -1,
                                                       peep[0].getName()))

    print("New transactions in the group: {0}".format(numTransactions))

def simplifyDebts2(people):
    """
    Simplifies debts by focusing only on net balances, ignoring individual transactions
    
    This is the main debt simplification algorithm. It calculates each person's
    net balance (total money owed to them minus total money they owe) and then
    creates the minimum number of transactions to settle all debts.
    
    Algorithm:
    1. Separate people into creditors (net positive) and debtors (net negative)
    2. Sort creditors by amount owed (descending) and debtors by amount owed (ascending)
    3. Match debtors with creditors to minimize total number of transactions
    
    @param people: list of PersonNode objects in a connected group
    @return: list of PersonNode objects representing simplified transactions
    """
    # Sort out between creditors and debtors
    sortedPeeps = sorted(people,
                         key=lambda item: item.getTotalMoney())
    creditors = []
    debtors = []

    for person in sortedPeeps:
        if person.getTotalMoney() > 0:
            creditors.append(person)
        elif person.getTotalMoney() < 0:
            debtors.append(person)

    if len(creditors) == 0 and len(debtors) == 0:
        return []
    if bool(len(creditors) == 0) ^ bool(len(debtors) == 0):
        print(("Somehow creditors or debtors == 0, " +
               "but the other was not. Printing." +
               "\ncreditors: {0}\ndebtors: {1}").format(creditors, debtors))

    creditors.sort(reverse=True, key=lambda x: x.getTotalMoney())
    debtors.sort(key=lambda x: x.getTotalMoney())

    simplifiedGroup = []

    # Create new creditor and debtor nodes to
    # represent the simplified transactions
    i = 0
    cMoney = creditors[i].getTotalMoney()
    newCreditorNode = PersonNode(creditors[i].getName())
    simplifiedGroup.append(newCreditorNode)

    for d in debtors:
        newDebtorNode = PersonNode(d.getName())
        simplifiedGroup.append(newDebtorNode)
        dMoney = d.getTotalMoney()

        while True:
            temp = cMoney + dMoney
            if dMoney == 0:
                break

            if temp > 0:
                newCreditorNode.addDebt(newDebtorNode, dMoney * -1)
                cMoney = temp
                break
            else:
                newCreditorNode.addDebt(newDebtorNode, cMoney)
                dMoney = temp
                i += 1
                if len(creditors) > i:
                    cMoney = creditors[i].getTotalMoney()
                    newCreditorNode = PersonNode(creditors[i].getName())
                    simplifiedGroup.append(newCreditorNode)
                elif temp == 0:
                        break
                else:
                    print("Error: No more creditors left, " +
                          "yet there is still debt to be paid.")
                    break

    return simplifiedGroup

def simplifyDebts(people):
    """
    Alternative debt simplification algorithm (currently unused)
    
    This function attempts to simplify debts while preserving some transaction
    relationships. It's more complex than simplifyDebts2 and currently not used
    in the web application.
    
    @param people: dictionary of PersonNode objects
    """
    for person in people.values():
        if person.getTotalMoney() < 0:
            # Figure out who you owe and who owes you
            creditors = []
            debtors = []
            allRelatedPeeps = dict(sorted(person.getOwersAndCreditors().items(), key=lambda item: item[1]))

            for p, amount in allRelatedPeeps.items():
                if amount < 0:
                    creditors.insert(0, p)
                else:
                    debtors.append(p)

            # Actual figuring out code
            for creditor in creditors:
                owed = allRelatedPeeps[creditor]
                i = 0
                while owed < 0 and i < len(debtors):
                    debtor = debtors[i]
                    credit = allRelatedPeeps[debtor]
                    sum = owed + credit
                    if sum > 0:
                        # we have more credit than owed

                        # remove creditor from this person
                        creditor.addCredit(person, owed)
                        # add debt to debtor
                        debtor.addDebt(person, owed)
                        debtor.addCredit(creditor, owed)
                    else:
                        # we have less credit than owed
                        # remove debtor from this person and add it to creditor
                        person.addCredit(debtor, credit)
                        creditor.addDebt(debtor, credit)

                    if sum < 0:
                        # remove the little credit that was transferred
                        creditor.addCredit(person, credit)

                    owed = sum
                    i += 1

def main():
    """
    Main function for console-based operation (currently disabled for web app)
    
    Originally handled command-line interface for selecting CSV files
    and processing transactions. Now commented out since we're using
    the web interface instead.
    """
    path = "C:\\Users\\Alyssa\\splitup\\csv Test Files"
    dirList = glob.glob(r'{0}\*.csv'.format(path))
    if len(dirList) == 0:
        print("No csv files found. Exiting.")
        return

    message = "Which csv file would you like to use?\n"
    count = 1
    for dir in dirList:
        message += "{0}. {1}\n".format(count, dir)
        count += 1
    val = int(input(("{0}\n\nEnter a number corresponding "
                     "to the correct csv.\n").format(message)))

    allGroups = readData(dirList[val-1])
    allPeeps = []

    for group in allGroups:
        people = simplifyDebts2(list(group))
        allPeeps.extend(people)

    printTransactions(allPeeps)

# *********** web app stuff ***********
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

if __name__ == '__main__':
    """
    Application entry point
    
    When run directly, starts the Flask web server instead of the
    console interface. The main() function is commented out to
    prioritize web app functionality.
    """
    # Comment out main() for web app mode
    # main()
    app.run(debug=True, host='0.0.0.0', port=5000)

# *********** web app stuff end ***********