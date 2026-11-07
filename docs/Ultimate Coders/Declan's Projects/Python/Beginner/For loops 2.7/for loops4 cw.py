import turtle

t = turtle.Turtle()
t.speed(99)
rotate = 5

def draw_square():
    global rotate

    for i in range(4):
        t.forward(100)
        t.left(90)

    t.penup()
    t.right(rotate)
    rotate += 0.1
    t.pendown()

name = input("What is your name? ")

for i in name:
    draw_square()

turtle.done()