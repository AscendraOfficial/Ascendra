import turtle

coors = {
    (-132, 212): "royalblue",
    (173, 241): "blueviolet",
    (0, 0): "cadetblue1",
}

t = turtle.Turtle()

t.penup()
t.color(coors[(-132, 212)])
t.goto(-132, 212)
t.pendown()
t.dot(5)

t.penup()
t.color(coors[(173, 241)])
t.goto(173, 241)
t.pendown()
t.dot(5)

t.penup()
t.color(coors[(0, 0)])
t.goto(0, 0)
t.pendown()
t.dot(5)

t.penup()
turtle.done()
