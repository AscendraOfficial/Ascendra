import turtle
t = turtle.Turtle()
def red_circle():
    t.pencolor("red")
    t.circle(50)
    turtle.done()


def green_circle():
    t.pencolor("green")
    t.circle(50)
    turtle.done()


try:
    answer = int(input("Enter your first number: "))
    answer1 = int(input("Enter your second number: "))

    if answer + answer1 == 10:
        green_circle()
    else:
        red_circle()

except ValueError:
    print("Please enter numbers only!")