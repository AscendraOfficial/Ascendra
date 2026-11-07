import turtle

t = turtle.Turtle()
t.speed(0)

fruits = {
    "apples": [(-212, 184), (157, -195), (-106, -278)],
    "bananas": [(181, -212), (-195, 102), (-140, -243)]
}

for i in fruits["apples"]:
    t.penup()
    t.goto(i)
    t.pendown()
    t.dot(20, "red")

for i in fruits["bananas"]:
    t.penup()
    t.goto(i)
    t.pendown()
    t.dot(20, "yellow") 

turtle.done()
