random_things = {}

while True:
    # Get user input
    try:
        num = int(input("Enter an integer: "))
    except ValueError:
        print("Please enter a valid integer.")
        continue
        
    string = str(input("Enter a string: "))
    
    # Store in the dictionary
    random_things[num] = string
    
    # Print the dictionary nicely without brackets or quotes
    print("\n--- Current Dictionary ---")
    for key, value in random_things.items():
        print(f"{key}: {value}")
    print("--------------------------\n")
