import turtle as t

# House 1

# Constants
# Screen
screen = t.Screen()
screen.setup(width=1.0, height=1.0)
screen.tracer(0)

# House
house = t.Turtle()
house.penup()

# Roof
roof = t.Turtle()
roof.penup()

# Window
window = t.Turtle()
window.penup()

# Door
door = t.Turtle()
door.penup()

# Speed
house.speed(1)
roof.speed(1)
window.speed(1)
door.speed(1)

# Yeeting turtles to their locations

# House
house.goto(-600, -200)

# Door
door.goto(-400, -200)

# Window
window.goto(-520, 40)

# Roof
roof.goto(-600, 200)

# Functions
def draw_house():
    house.pendown()
    house.left(90)
    house.forward(400)

    for i in range(3):
        house.right(90)
        house.forward(400)

    house.hideturtle()


def draw_door():
    door.pendown()
    door.left(90)
    door.forward(200)
    door.right(90)
    door.forward(100)
    door.right(90)
    door.forward(200)
    door.hideturtle()


def draw_window():
    window.pendown()

    for i in range(4):
        window.forward(100)
        window.right(90)

    window.hideturtle()


def draw_roof():
    roof.pendown()
    roof.goto(-400, 400)
    roof.goto(-200, 200)
    roof.goto(-600, 200)
    roof.hideturtle()



# House 2

house2 = t.Turtle()
house2.penup()
house2.goto(-100, -200)

roof2 = t.Turtle()
roof2.penup()
roof2.goto(-100, 200)

window2 = t.Turtle()
window2.penup()
window2.goto(-20, 40)

door2 = t.Turtle()
door2.penup()
door2.goto(100, -200)


def draw_house2():
    house2.pendown()
    house2.left(90)
    house2.forward(400)

    for i in range(3):
        house2.right(90)
        house2.forward(400)

    house2.hideturtle()


def draw_door2():
    door2.pendown()
    door2.left(90)
    door2.forward(200)
    door2.right(90)
    door2.forward(100)
    door2.right(90)
    door2.forward(200)
    door2.hideturtle()


def draw_window2():
    window2.pendown()

    for i in range(4):
        window2.forward(100)
        window2.right(90)

    window2.hideturtle()


def draw_roof2():
    roof2.pendown()
    roof2.goto(100, 400)
    roof2.goto(300, 200)
    roof2.goto(-100, 200)
    roof2.hideturtle()


draw_house()
draw_door()
draw_window()
draw_roof()
draw_house2()
draw_door2()
draw_window2()
draw_roof2()

screen.update()

t.done()