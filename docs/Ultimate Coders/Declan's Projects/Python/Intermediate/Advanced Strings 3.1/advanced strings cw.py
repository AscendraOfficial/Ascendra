import turtle
t = turtle.Turtle()
t.penup()
txt = "aH1be72lA3lD4oE5TA6hG7e98riIejJ"
txt_lower = txt.lower()
numbers_sum = 0
lowercase_letters = ""
counter = 2

print(txt[1:-1:3])

a_in_txt = txt_lower.count("a")
print("a" * a_in_txt)

for num in txt:
    if num.isdigit():
        num = int(num)
        numbers_sum += num

for char in txt:
    if char.islower():
        char = char.upper()
        lowercase_letters += char

for i in txt:
    print(i, end="")
print("\n")
for i in range(1, len(txt) - 1, 3):
    print(txt[i], end="")

print("\n", lowercase_letters)
        
print(numbers_sum)

x = int(txt[5:7])
y = int(txt[-8:-6])
t.penup()
t.goto(x, y)
t.pendown()
t.dot(5)
t.hideturtle()
print(f"X: {x}, Y: {y}")

turtle.done()

