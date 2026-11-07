

countries = []

while True:
    user_input = input("Enter a country's name (or type 'Done' to finish): ")

    if user_input.strip().lower() == 'done':
        break
        
    countries.append(user_input.strip().title())

countries.sort()

while len(countries) > 0:
    removed_country = countries.pop(0)
    print(removed_country)




