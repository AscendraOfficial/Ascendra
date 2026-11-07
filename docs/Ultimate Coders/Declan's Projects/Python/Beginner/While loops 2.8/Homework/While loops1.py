divisible = [] # Empty array for divisible integers
for i in range(1, 101): # Checks every number from 1 - 100
    if i % 3 == 0: # Checks if there is no remainder if you divide it by 3
        divisible.append(i) # If you divide it by three and there is no remainder, it adds in to divisible
print(divisible) # Prints out the list of numbers from 1 - 100 that are divisible to three