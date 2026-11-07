# Coin values
toonie = 2.00
loonie = 1.00
quarter = 0.25
dime = 0.10
nickel = 0.05

# Amount of each coin used
toonies = 0
loonies = 0
quarters = 0
dimes = 0
nickels = 0

# Keep asking until the user enters a valid number
while True:
    try:
        main_money = float(input("Enter a decimal amount in cash: "))

        # Stop asking once the input works
        break
    except ValueError:
        print("Please enter a number!")

# Use as many toonies as possible
while main_money >= toonie:
    main_money -= toonie
    toonies += 1

# Use as many loonies as possible
while main_money >= loonie:
    main_money -= loonie
    loonies += 1

# Use as many quarters as possible
while main_money >= quarter:
    main_money -= quarter
    quarters += 1

# Use as many dimes as possible
while main_money >= dime:
    main_money -= dime
    dimes += 1

# Use as many nickels as possible
while main_money >= nickel:
    main_money -= nickel
    nickels += 1

# Print the least amount of coins
print(f"The least amount of coins you can use is {toonies} toonie(s), {loonies} loonie(s), {quarters} quarter(s), {dimes} dime(s), and {nickels} nickels")