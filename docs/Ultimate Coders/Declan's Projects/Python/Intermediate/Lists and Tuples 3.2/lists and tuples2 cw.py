import turtle

t = turtle.Turtle()
turtle.colormode(255)
color = (255, 0, 100)
t.pencolor(color)

for i in range(4):
    t.forward(100)
    t.right(90)

turtle.done()
