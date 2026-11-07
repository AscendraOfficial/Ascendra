import turtle

t = turtle.Turtle()

location = 100

names = {
    "Declan": "Blue",
    "Jayden": "Blue"
}

for key, value in names.items():
    t.penup()
    t.goto(location, location)
    t.color(value)
    t.pendown
    t.write(key, font=('Arial', 50, 'normal'))
    location += 200

turtle.done()