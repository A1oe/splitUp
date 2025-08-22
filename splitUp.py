import csv
import itertools
import glob

from itertools import *
from flask import Flask, render_template, request
from currency_converter import CurrencyConverter

app = Flask(__name__)
c = CurrencyConverter()
CURRENCIES = c.currencies # c.convert(<amount>, <from currency>, <to currency>)


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
        """
        return self.__name + self.getTotalMoney() + str(self.__owedAndCredited)

    def __repr__(self):
        """
        The representation of the obj (e.g. print(list[PersonNode]))
        """
        return self.__name

    def getName(self):
        return self.__name

    def getOwersAndCreditors(self):
        return self.__owedAndCredited

    def getTotalMoney(self):
        return sum(self.__owedAndCredited.values())

    def clearDebts(self):
        for p in self.__owedAndCredited:
            p.removeTransaction(self)

        self.__owedAndCredited = {}

    def removeTransaction(self, person):
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

        @param debtor: PersonNode
        @param amount: float. The amount this person owes to creditor
        @param newTransaction: bool.
        """
        if creditor in self.__owedAndCredited:
            self.__owedAndCredited[creditor] -= amount
        else:
            self.__owedAndCredited[creditor] = amount * -1

        if newTransaction:
            creditor.addDebt(self, amount, False)

def readData(file):
    """
    @param file: str. Path to csv file
    @return: list[set{personNode}]. A list of sets of personNodes from the csv.
                                    These are split up based on who has
                                    transactions with who.
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

def splitUpGroups(people):
    """
    Makes groups depending on who have transactions with who
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
    Helper func for recursive BFS
    """
    tempRelatedPeeps = person.getOwersAndCreditors().keys()
    newRelatedPeeps = [p for p in tempRelatedPeeps if p not in curGroup]
    curGroup.update(newRelatedPeeps)

    for p in newRelatedPeeps:
        groupSplitHelper(p, curGroup)

def prettyPrintAllPeople(people):
    """
    Print out who should pay who
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
    Ignore all transactions and only care about totals.
    Assumes connected graph.
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
    return render_template('index.html')

@app.route('/greet', methods=['POST'])
def greet():
    name = request.form['name']
    name = name.capitalize()
    return render_template('greet.html', name=name)

if __name__ == '__main__':
    main()
    app.run(debug=True)

# *********** web app stuff end ***********