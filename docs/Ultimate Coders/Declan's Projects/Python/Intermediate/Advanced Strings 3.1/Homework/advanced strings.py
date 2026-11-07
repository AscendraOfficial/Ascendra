import turtle

t = turtle.Turtle()
txt = "cC29dD9eE3.F6gG1hH7iI0.J4kK5lL48mM"
found = 0
x = int(txt[2:4])
y = int(txt[-4:-2])
t.penup()
t.goto(x, y)
t.pendown()
t.dot(5)
t.penup()
t.goto(0, 0)

for i in range(0, len(txt) - 1, 4):
    print(i)

for i in txt:

    if i == "F":
        found += 1

print("\nFound! " * found)
print(txt[11:22])
print(f"The code starts with {txt[0]}, and ends with {txt[-1]}")

for i in txt:

    if i.isdigit():
        print(i) 

turtle.done()
