import turtle

t = turtle.Turtle()
colors = ["red", "blue", "purple", "green", "orange"]
t.pensize(5)

for i in range(5):
    t.color(colors[i])
    t.forward(100)
    t.left(144)

turtle.done()