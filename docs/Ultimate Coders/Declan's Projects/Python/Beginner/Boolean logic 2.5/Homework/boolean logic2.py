real_answer = 7
try:
    answer = int(input("How many books are in the Harry Potter series? "))
    if answer == 7:
        print(True)
    else:
        print(False)

except ValueError:
    print("Please only enter numbers.")
