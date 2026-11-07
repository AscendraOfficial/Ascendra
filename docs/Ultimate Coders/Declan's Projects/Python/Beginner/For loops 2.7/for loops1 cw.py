lyrics = input("What is your favourite line from your favourite song? ")
vowels = ["a","e","i","o","u"]
output = []
for i in lyrics:
    if i.lower() in vowels:
        output.append(i)
print(f'The vowels in "{lyrics}" are {output}')