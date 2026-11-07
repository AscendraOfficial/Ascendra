def maxRebuilt(*nums):

    biggest_number = nums[0]
    for i in nums:
        if i > biggest_number:
            biggest_number = i
        
    return biggest_number

print(maxRebuilt(3455, 3454, 2453, 3495))

def minRebuilt(*nums):
    smallest_number = nums[0]
    for i in nums:
        if i < smallest_number:
            smallest_number = i
    return smallest_number

print(minRebuilt(3455, 3454, 2453, 3495))


def nameOrganizer(x=None, y=None, z=None, n=None):
    output = f"{x}\t{y}\t{z}\t{n}\t"
    return output

name1 = input("Enter your first name ")
name2 = input("Enter your second name ")
name3 = input("Enter your third name ")
name4 = input("Enter your fourth name ")

print(nameOrganizer(name1, name2, name3, name4))

def phoneNumberThingy(pn="N/A", n="N/A"):
    if not pn:
        pn = "N/A"
    if not n:
        n = "N/A"
    output = f"\nPhone number: {pn}\nName: {n}"
    return output

number = input("Enter your phone number ")
name = input("Enter your name ")

print(phoneNumberThingy(number, name), "\n")

def areaCalculator(x=0, y=0):
    if x == 0:
        output = x * x
    if y == 0:
        output = y * y

    output = y * x

    return output

firstNumber = int(input("Enter your first number "))
secondNumber = int(input("Enter your second number "))

print(f"The area of the square is {areaCalculator(firstNumber, secondNumber)}")       


def sum_or_product(*numbers, add=True):
    result = 0 if add else 1

    for num in numbers:
        if add:
            result += num
        else:
            result *= num

    return result

firstNumber = int(input("Enter your first number "))
secondNumber = int(input("Enter your second number "))
thirdNumber = int(input("Enter your third number "))
fourthNumber = int(input("Enter your fourth number "))

print(f"The sum of the numbers is {sum_or_product(firstNumber, secondNumber, thirdNumber, fourthNumber, add=True)}")
print(f"The product of the numbers is {sum_or_product(firstNumber, secondNumber, thirdNumber, fourthNumber, add=False)}")
