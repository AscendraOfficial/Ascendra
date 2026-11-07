import turtle

t = turtle.Turtle()

friends_names = ["jeremy", "jason", "jaymit", "river",
"lily", "jen", "ben", "harley", "frida"]
coordinates = [(0, 0), (100, 50), (-100, 100)]
j_count = 0

friends_names += ["lisa", "prisha", "nathan"]

for name in friends_names:
    if name.startswith("j"):
        j_count += 1

for x, y in coordinates:
    t.penup()
    t.goto(x, y)
    t.pendown()
    t.dot(20)

for i in range(len(friends_names)):
    friends_names[i] = friends_names[i].capitalize()

turtle.done()
